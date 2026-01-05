
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
console.log('🚀 [SYSTEM] INICIANDO VERSION 4.5 - SYNC & CLEAN (AUTO-DELETE)');
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
// =================================================================================
const PRODUCT_PACK_SIZE = {
  'BUR11': 30,  'BUR13': 40,  'BUR4': 2,    'BUR5': 8,    'BUR6': 3,    
  'BUR7': 10,   'MOZ28': 8,   'MOZ30': 9,   'MOZ5': 12,   'RIC3': 6,    
  'MOZ6': 9,    'MOH1': 9,    'MOZ8': 10,   'MOH10': 3    
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
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_key TEXT UNIQUE
  );
  CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(received_at);
  CREATE INDEX IF NOT EXISTS idx_orders_key ON orders(record_key);

  CREATE TABLE IF NOT EXISTS inventory (
    product_code TEXT PRIMARY KEY,
    stock_qty NUMERIC DEFAULT 0
  );
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
    
    // MIGRACIÓN: Asegurar estructura
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='record_key') THEN 
          ALTER TABLE orders ADD COLUMN record_key TEXT UNIQUE; 
        END IF;
        
        -- Limpieza de columnas viejas si existen
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='unique_hash') THEN
           ALTER TABLE orders DROP COLUMN unique_hash;
        END IF;
      END $$;
    `);

    await client.query('DROP TABLE IF EXISTS webhook_memory'); 
    await client.query(createTablesSQL);
    console.log('✅ [DB] Tablas verificadas. Sistema Sync & Clean activo.');
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
    res.send(`<h1 style="color:green">✅ CONEXIÓN OK V4.5</h1><p>Sistema Sync & Clean Activo (Borrado automático de líneas inexistentes).</p>`);
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
    let countUpdated = 0;
    let countDeleted = 0;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; 

    // LISTAS DE CONTROL PARA LIMPIEZA
    const activeKeysThisPayload = []; // Guardaremos todas las llaves procesadas en ESTE webhook
    const affectedAgents = new Set(); // Guardaremos qué agentes se tocaron

    for (const z of zonas) {
      const agentCode = String(z.codigo_agente ?? '0').trim(); 
      affectedAgents.add(agentCode); // Marcamos este agente como "tocado" hoy

      const agentName = z.nombre_agente || 'DESCONOCIDO';
      const topLevelProductName = z.nombre || 'PRODUCTO';

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          
          let rawProductCode = String(p.codigo || 'UNKNOWN').toUpperCase();
          rawProductCode = rawProductCode.replace(/^#/, '').replace(/\s+/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
          
          const finalProductName = p.nombre || topLevelProductName;
          let rawQtyBoxes = Math.floor(Number(p.cantidad) || 0);

          // IMPORTANTE: Incluso si la cantidad es 0, lo procesamos para que cuente como "visto" 
          // y el sistema decida si borrarlo o dejarlo en 0. 
          // Si Factorsol manda 0 explícitamente, actualizamos a 0.
          
          if (rawQtyBoxes >= 0) { 
            const packSize = PRODUCT_PACK_SIZE[rawProductCode] || 1;
            const finalQtyUnits = rawQtyBoxes * packSize;

            lastCode = rawProductCode;

            // LLAVE ÚNICA DE SINCRONIZACIÓN
            const recordKey = `${agentCode}-${rawProductCode}-${todayStr}`;
            
            // Añadimos a la lista de "Vivos"
            activeKeysThisPayload.push(recordKey);

            // UPSERT (Insertar o Actualizar)
            const result = await client.query(
              `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity, record_key) 
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (record_key) 
               DO UPDATE SET 
                  quantity = EXCLUDED.quantity,
                  product_name = EXCLUDED.product_name,
                  received_at = CURRENT_TIMESTAMP
               RETURNING (xmax = 0) AS inserted`, 
              [agentCode, agentName, rawProductCode, finalProductName, finalQtyUnits, recordKey]
            );

            if (result.rows[0].inserted) {
              countInsert++;
            } else {
              countUpdated++;
            }
          }
        }
      }
    }

    // =================================================================================
    // 🧹 ZONA DE LIMPIEZA (GARBAGE COLLECTION)
    // =================================================================================
    // Si hemos procesado agentes, debemos borrar de la DB cualquier línea de ESOS agentes
    // para la fecha de HOY que NO haya venido en este payload (es decir, líneas borradas en origen).
    
    if (affectedAgents.size > 0 && activeKeysThisPayload.length > 0) {
      const agentsArray = Array.from(affectedAgents);
      
      const deleteResult = await client.query(`
        DELETE FROM orders 
        WHERE agent_code = ANY($1) 
          AND record_key LIKE '%' || $2  -- Que contenga la fecha de hoy
          AND record_key != ALL($3)      -- Que NO esté en la lista de llaves vivas
      `, [agentsArray, todayStr, activeKeysThisPayload]);
      
      countDeleted = deleteResult.rowCount;
      if (countDeleted > 0) {
        console.log(`🗑️ [CLEANUP] Eliminadas ${countDeleted} líneas obsoletas (borradas en origen).`);
      }
    } else if (affectedAgents.size > 0 && activeKeysThisPayload.length === 0) {
       // Caso extremo: El webhook manda el agente pero SIN productos (borró todo el pedido)
       const agentsArray = Array.from(affectedAgents);
       const deleteResult = await client.query(`
        DELETE FROM orders 
        WHERE agent_code = ANY($1) 
          AND record_key LIKE '%' || $2
      `, [agentsArray, todayStr]);
      countDeleted = deleteResult.rowCount;
      console.log(`🗑️ [CLEANUP TOTAL] Agente enviado vacío. Eliminadas ${countDeleted} líneas.`);
    }

    await client.query('COMMIT');
    console.log(`✅ [SYNC] Procesado. Nuevos: ${countInsert} | Actualizados: ${countUpdated} | Eliminados: ${countDeleted}`);
    
    notifyClients(lastCode, 'order');
    res.json({ ok: true, inserted: countInsert, updated: countUpdated, deleted: countDeleted });

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
      let label = period === 'month' ? d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase() : d.getFullYear().toString();
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
    // TRUNCATE RESTART IDENTITY borra todo y resetea contadores
    await client.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
    console.log('⚠️ [RESET] SYSTEM FACTORY RESET EXECUTED');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { 
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
