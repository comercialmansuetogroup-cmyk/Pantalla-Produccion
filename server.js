
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// --- VERSION TAG ---
console.log('----------------------------------------------------');
console.log('🚀 [SYSTEM] INICIANDO VERSION 3.4 - DEBUG & CLEANING');
console.log('----------------------------------------------------');

// Configuración de conexión DB Robustecida para Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, 
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// =================================================================================
// 📍 ZONA 1: LISTA DE PRODUCTOS Y SUS UNIDADES POR CAJA
// Aquí definimos cuántas piezas trae cada caja.
// =================================================================================
const PRODUCT_PACK_SIZE = {
  'BUR11': 30,  // BURRATA VASO 80GR (BANDEJA 30 PIEZAS)
  'BUR13': 40,  // BURRATA VASO 60g (BANDEJA 40 PIEZAS)
  'BUR4': 2,    // BURRATA 125 GR TARRINA 250 GR 2 PIEZAS
  'BUR5': 8,    // BURRATA 125 GR BANDEJA DE 1 KG 8 PIEZAS
  'BUR6': 3,    // BURRATA 100 GR TARRINA 300 GR 3 PIEZAS
  'BUR7': 10,   // BURRATA 100 GR BANDEJA DE 1 KG 10 PIEZAS
  'MOZ28': 8,   // SCAMORZA IN ACQUA 3.4 - 8 PIEZAS
  'MOZ30': 9,   // MOZZARELLA BOLA SECA
  'MOZ5': 12,   // MOZZARELLA FIORDILATTE BANDEJA 3.2 FORMATO 12X250
  'RIC3': 6,    // RICOTTA FRESCA 350 GR BANDEJA 6 PIEZAS
  'MOZ6': 9,    // MOZZARELLA FIORDILATTE BANDEJA 3.8 FORMATO 420 GR
  'MOH1': 9,    // MOZ FIORDILAT AHUMADA BANDEJA 3.8 FORMATO 420GR
  'MOZ8': 10,   // MOZZARELLA FIORDILATTE SECA BANDEJA 4 KG 10X400 GR
  'MOH10': 3    // MOZZARELLA FIORDILATTR AHUMADA BANDEJA1.2 420 APRO
};

// --- FUNCIÓN DE INICIALIZACIÓN DE TABLAS ---
const createTablesSQL = `
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    agent_code TEXT,
    agent_name TEXT,
    product_code TEXT,
    product_name TEXT,
    quantity NUMERIC DEFAULT 0,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(received_at);

  CREATE TABLE IF NOT EXISTS inventory (
    product_code TEXT PRIMARY KEY,
    stock_qty NUMERIC DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS webhook_memory (
    line_hash TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_memory_date ON webhook_memory(created_at);
`;

const initDB = async () => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ [SYSTEM] Running in MEMORY MODE (No Database URL found)');
    return;
  }
  
  console.log('🔄 [DB] Verificando tablas...');
  let client;
  try {
    client = await pool.connect();
    // Limpieza de legacy
    await client.query('DROP TABLE IF EXISTS daily_stats'); 
    await client.query('DROP TABLE IF EXISTS "DALL·E STATS"'); 
    await client.query(createTablesSQL);
    console.log('✅ [DB] Tablas verificadas correctamente.');
  } catch (err) { 
    console.error('❌ [DB ERROR] Fallo al iniciar tablas:', err.message); 
  } finally {
    if (client) client.release();
  }
};

initDB();

// --- SSE SYSTEM ---
let clients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  res.write(': connected\n\n');

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

setInterval(() => {
  clients.forEach(c => c.res.write(': keepalive\n\n'));
}, 30000);

const notifyClients = (updatedCode, type = 'update') => {
  clients.forEach(c => c.res.write(`data: ${JSON.stringify({type, code: updatedCode})}\n\n`));
};

// --- API ENDPOINTS ---

app.get('/api/test-db', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(500).send("ERROR: Variable DATABASE_URL no encontrada.");
  let client;
  try {
    client = await pool.connect();
    await client.query(createTablesSQL);
    res.send(`<h1 style="color:green">✅ CONEXIÓN OK V3.4</h1><p>Sistema de cálculo de unidades con limpieza estricta de caracteres.</p>`);
  } catch (err) {
    res.status(500).send(`<h1 style="color:red">❌ ERROR</h1><pre>${err.message}</pre>`);
  } finally {
    if (client) client.release();
  }
});

app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  
  if (!zonas || !Array.isArray(zonas)) {
    console.error('❌ [WEBHOOK] Invalid Body');
    return res.status(400).json({ error: 'Invalid data format' });
  }

  if (!process.env.DATABASE_URL) {
    notifyClients('TEST-CODE');
    return res.json({ ok: true, mode: 'no-db' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let lastCode = null;
    let countInsert = 0;
    let countSkipped = 0;
    
    const now = new Date();
    const todayHashStr = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
    const batchOccurrences = new Map();

    for (const z of zonas) {
      const agentCode = String(z.codigo_agente ?? '0').trim(); 
      const agentName = z.nombre_agente || 'DESCONOCIDO';
      const topLevelProductName = z.nombre || 'PRODUCTO';

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          
          // --- LIMPIEZA DE CÓDIGO ---
          // 1. Convertir a mayúsculas
          // 2. Quitar '#' al inicio
          // 3. Quitar todos los espacios (incluidos los internos 'BUR 11' -> 'BUR11')
          // 4. Quitar caracteres invisibles raros (Zero-width space)
          let rawProductCode = String(p.codigo || 'UNKNOWN').toUpperCase();
          rawProductCode = rawProductCode.replace(/^#/, ''); 
          rawProductCode = rawProductCode.replace(/\s+/g, '');
          rawProductCode = rawProductCode.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Limpieza profunda
          
          const finalProductName = p.nombre || topLevelProductName;
          
          let rawQtyBoxes = Math.floor(Number(p.cantidad) || 0);

          if (rawQtyBoxes > 0) {
            
            // ===============================================================================
            // 📍 ZONA 2: CÁLCULO DE MULTIPLICACIÓN
            // Buscamos el código limpio en la lista. Si existe, multiplicamos.
            // ===============================================================================
            const packSize = PRODUCT_PACK_SIZE[rawProductCode] || 1;
            const finalQtyUnits = rawQtyBoxes * packSize;

            // LOG DE AUDITORÍA: Muestra qué pasó con cada producto
            if (PRODUCT_PACK_SIZE[rawProductCode]) {
               console.log(`✅ MATCH EN LISTA: Código [${rawProductCode}] | Entran ${rawQtyBoxes} cajas | Pack ${packSize} | ==> SE GUARDAN ${finalQtyUnits} UNIDADES`);
            } else {
               // Descomentar si quieres ver los que NO coinciden
               // console.log(`ℹ️ NO MATCH: Código [${rawProductCode}] | Se guarda tal cual: ${finalQtyUnits}`);
            }

            lastCode = rawProductCode;

            // --- PREVENCIÓN DE DUPLICADOS ---
            const occurrenceKey = `${agentCode}-${rawProductCode}-${rawQtyBoxes}`;
            const currentCount = (batchOccurrences.get(occurrenceKey) || 0) + 1;
            batchOccurrences.set(occurrenceKey, currentCount);

            const rawString = `${agentCode}-${rawProductCode}-${rawQtyBoxes}-${todayHashStr}-${currentCount}`;
            const lineHash = crypto.createHash('md5').update(rawString).digest('hex');

            const checkMem = await client.query('SELECT 1 FROM webhook_memory WHERE line_hash = $1', [lineHash]);

            if (checkMem.rows.length === 0) {
                 // GUARDADO EN DB (finalQtyUnits ya tiene la multiplicación hecha)
                 await client.query(
                  `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
                   VALUES ($1, $2, $3, $4, $5)`,
                  [agentCode, agentName, rawProductCode, finalProductName, finalQtyUnits]
                 );
                 await client.query('INSERT INTO webhook_memory (line_hash) VALUES ($1)', [lineHash]);
                 countInsert++;
            } else {
              countSkipped++;
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [SYNC] Procesado. Insertados: ${countInsert} | Omitidos: ${countSkipped}`);
    
    notifyClients(lastCode, 'order');
    res.json({ ok: true, inserted: countInsert, skipped: countSkipped });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [ERROR]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/scan', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V4_KEY_2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { codigo, cantidad } = req.body;
  if (!codigo || !cantidad) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const client = await pool.connect();
  try {
    const qtyNum = Number(cantidad);
    // Aplicamos la misma normalización al scan
    let codeStr = String(codigo).toUpperCase().replace(/^#/, '').replace(/\s+/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');

    await client.query(
      `INSERT INTO inventory (product_code, stock_qty) 
       VALUES ($1, $2)
       ON CONFLICT (product_code) 
       DO UPDATE SET stock_qty = inventory.stock_qty + $2`,
      [codeStr, qtyNum]
    );

    console.log(`✅ [SCAN] ${codeStr} +${qtyNum}`);
    notifyClients(codeStr, 'scan');
    res.json({ ok: true, updated: codeStr, qty: qtyNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    const result = await pool.query(`
      WITH RankedDates AS (
        SELECT DISTINCT received_at::DATE as r_date
        FROM orders
        ORDER BY r_date DESC
        LIMIT 2
      ),
      TargetDates AS (
        SELECT 
          (SELECT r_date FROM RankedDates OFFSET 0 LIMIT 1) as date_today,
          (SELECT r_date FROM RankedDates OFFSET 1 LIMIT 1) as date_yesterday
      )
      SELECT 
        o.agent_code, 
        o.agent_name, 
        o.product_code, 
        o.product_name, 
        SUM(CASE WHEN o.received_at::DATE = (SELECT date_today FROM TargetDates) THEN o.quantity ELSE 0 END) as total_qty,
        SUM(CASE WHEN o.received_at::DATE = (SELECT date_yesterday FROM TargetDates) THEN o.quantity ELSE 0 END) as yesterday_qty,
        COALESCE(MAX(i.stock_qty), 0) as global_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      WHERE o.received_at::DATE IN (SELECT r_date FROM RankedDates)
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name
      ORDER BY o.agent_code ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/history', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  const { period } = req.query; 
  let truncType = 'week', limit = 4, interval = '1 month';

  switch (period) {
    case 'week': truncType = 'week'; limit = 5; interval = '2 month'; break;
    case 'month': truncType = 'month'; limit = 12; interval = '1 year'; break;
    case 'quarter': truncType = 'quarter'; limit = 5; interval = '2 year'; break;
    case 'year': truncType = 'year'; limit = 5; interval = '5 year'; break;
    default: truncType = 'week'; limit = 5; interval = '2 month';
  }

  try {
    const query = `
      SELECT 
        DATE_TRUNC($1, received_at) as date_period,
        SUM(quantity) as total_qty
      FROM orders 
      WHERE received_at >= NOW() - $2::INTERVAL
      GROUP BY date_period
      ORDER BY date_period ASC
      LIMIT $3
    `;
    const result = await pool.query(query, [truncType, interval, limit]);
    
    const formatted = result.rows.map(row => {
      const d = new Date(row.date_period);
      let label = '';
      if (period === 'week') {
         const onejan = new Date(d.getFullYear(), 0, 1);
         const weekNum = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
         label = `S${weekNum}`;
      } else if (period === 'month') {
         label = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
      } else if (period === 'quarter') {
         const q = Math.floor((d.getMonth() + 3) / 3);
         label = `Q${q} ${d.getFullYear().toString().substr(-2)}`;
      } else {
         label = d.getFullYear().toString();
      }
      return { date: label, fullDate: row.date_period, produccion: Number(row.total_qty) };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'History query failed' });
  }
});

app.post('/api/reset', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE orders, inventory, webhook_memory RESTART IDENTITY CASCADE');
    console.log('⚠️ [RESET] SYSTEM FACTORY RESET EXECUTED');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { 
    console.error('Reset Error:', err);
    res.status(500).json({ error: err.message }); 
  } finally {
    client.release();
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
