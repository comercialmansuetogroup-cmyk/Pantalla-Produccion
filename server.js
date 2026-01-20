
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- REGLA DE UNIDADES POR CAJA (Multiplicador) ---
const PRODUCT_PACK_SIZE = {
  'BUR11': 30, 'BUR13': 40, 'BUR4': 2, 'BUR5': 8, 'BUR6': 3, 'BUR7': 10,
  'MOZ28': 8, 'MOZ30': 9, 'MOZ5': 12, 'MOZ6': 9, 'MOZ8': 10,
  'RIC3': 6,
  'MOH1': 9, 'MOH10': 3
};

const initDB = async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          agent_code TEXT NOT NULL,
          agent_name TEXT,
          product_code TEXT NOT NULL,
          product_name TEXT,
          quantity INTEGER DEFAULT 0,
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          record_key TEXT PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS inventory (
          product_code TEXT PRIMARY KEY,
          stock_qty NUMERIC DEFAULT 0
        );
      `);
      console.log('✅ [DB] Estructura Postgres verificada y lista.');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ [DB] Error inicializando DB:', err.message); }
};
initDB();

// --- SSE (Eventos en tiempo real) ---
let clients = [];
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 
  const clientId = Date.now();
  clients.push({ id: clientId, res });
  req.on('close', () => clients = clients.filter(c => c.id !== clientId));
});
const notifyClients = (code, type = 'update') => clients.forEach(c => c.res.write(`data: ${JSON.stringify({type, code})}\n\n`));

// --- WEBHOOK MAKE ---
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) return res.status(400).json({ error: 'Data format error' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const todayStr = new Date().toISOString().split('T')[0];
    let lastCode = null;

    for (const z of zonas) {
      const agentCode = String(z.codigo_agente || '0').trim();
      const agentName = String(z.nombre_agente || z.nombre_comercial || 'DESCONOCIDO').toUpperCase();

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          const prodCode = String(p.codigo || '').trim().toUpperCase();
          const prodName = String(p.nombre_producto || '').trim().toUpperCase();
          
          if (!prodCode) continue;

          // TRUNCADO Y MULTIPLICACIÓN
          const rawQtyStr = String(p.cantidad || 0).replace(',', '.');
          const boxesReceived = Math.floor(Number(rawQtyStr) || 0);
          
          const packSize = PRODUCT_PACK_SIZE[prodCode] || 1;
          const finalUnits = boxesReceived * packSize;

          const recordKey = `${agentCode}-${prodCode}-${todayStr}`;
          lastCode = prodCode;

          if (finalUnits > 0) {
            // Reflejamos en Postgres el total real de unidades
            await client.query(`
              INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity, record_key)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (record_key)
              DO UPDATE SET 
                quantity = orders.quantity + EXCLUDED.quantity,
                product_name = EXCLUDED.product_name,
                received_at = CURRENT_TIMESTAMP
            `, [agentCode, agentName, prodCode, prodName, finalUnits, recordKey]);
          }

          if (p.stock_fisico !== undefined) {
             const rawStockStr = String(p.stock_fisico).replace(',', '.');
             const stockVal = Number(rawStockStr) || 0;
             await client.query(`
               INSERT INTO inventory (product_code, stock_qty)
               VALUES ($1, $2)
               ON CONFLICT (product_code) DO UPDATE SET stock_qty = EXCLUDED.stock_qty
             `, [prodCode, stockVal]);
          }
        }
      }
    }
    await client.query('COMMIT');
    notifyClients(lastCode, 'order');
    res.json({ ok: true, status: 'multiplied_and_stored' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Webhook Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.agent_code, o.agent_name, o.product_code, o.product_name, 
        SUM(o.quantity) as total_qty,
        COALESCE(MAX(i.stock_qty), 0) as global_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      WHERE o.received_at::DATE = CURRENT_DATE
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name
      HAVING SUM(o.quantity) > 0
      ORDER BY o.agent_code ASC, o.product_name ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reset', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
    notifyClients('RESET');
    res.json({ ok: true });
  } finally { client.release(); }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`🚀 Servidor de Producción activo en puerto ${PORT}`));
