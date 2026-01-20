
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

// MAESTRO DE PRODUCTOS (Cajas -> Unidades)
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
          stock_qty INTEGER DEFAULT 0,
          last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Base de Datos Sincronizada.');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ DB Error:', err.message); }
};
initDB();

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

const notify = (code, type = 'update') => {
    clients.forEach(c => c.res.write(`data: ${JSON.stringify({type, code})}\n\n`));
};

// WEBHOOK DE MAKE: Sincronización (Regla de Oro: NO DUPLICAR)
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) return res.status(400).json({ error: 'Data invalid' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const todayStr = new Date().toISOString().split('T')[0];
    let lastCode = null;

    for (const z of zonas) {
      const agentCode = String(z.codigo_agente || '0').trim();
      const agentName = String(z.nombre_agente || z.nombre_comercial || 'ZONA').toUpperCase();

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          const prodCode = String(p.codigo || '').trim().toUpperCase();
          const prodName = String(p.nombre_producto || p.nombre || '').trim().toUpperCase();
          if (!prodCode) continue;

          // Conversión a piezas reales
          const rawQty = String(p.cantidad || 0).replace(',', '.');
          const boxes = Math.floor(Number(rawQty) || 0);
          const packSize = PRODUCT_PACK_SIZE[prodCode] || 1;
          const totalUnits = boxes * packSize;

          const recordKey = `${agentCode}-${prodCode}-${todayStr}`;
          lastCode = prodCode;

          // Sincronización: Sobrescribe la cantidad, NO LA SUMA
          await client.query(`
            INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity, record_key)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (record_key) DO UPDATE SET 
              quantity = EXCLUDED.quantity, 
              product_name = CASE WHEN EXCLUDED.product_name <> '' THEN EXCLUDED.product_name ELSE orders.product_name END,
              received_at = CURRENT_TIMESTAMP
          `, [agentCode, agentName, prodCode, prodName, totalUnits, recordKey]);
        }
      }
    }
    await client.query('COMMIT');
    notify(lastCode, 'order');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ENDPOINT DE ESCANEO: Aumenta Stock
app.post('/api/scan', async (req, res) => {
  const { code, qty = 1 } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const prodCode = String(code).trim().toUpperCase();
  try {
    await pool.query(`
      INSERT INTO inventory (product_code, stock_qty) VALUES ($1, $2)
      ON CONFLICT (product_code) DO UPDATE SET 
        stock_qty = inventory.stock_qty + $2, 
        last_update = CURRENT_TIMESTAMP
    `, [prodCode, qty]);
    
    notify(prodCode, 'scan');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.agent_code, MAX(o.agent_name) as agent_name, 
        o.product_code, MAX(o.product_name) as product_name, 
        SUM(o.quantity) as total_qty,
        COALESCE(MAX(i.stock_qty), 0) as global_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      WHERE o.received_at::DATE = CURRENT_DATE
      GROUP BY o.agent_code, o.product_code
      HAVING SUM(o.quantity) > 0
      ORDER BY o.agent_code ASC, MAX(o.product_name) ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reset', async (req, res) => {
  await pool.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
  notify('RESET');
  res.json({ ok: true });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
