
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

// REGLA DE ORO: UNIDADES POR CAJA
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
      console.log('✅ Base de datos lista para sincronización estricta.');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ DB Error:', err.message); }
};
initDB();

// SSE para tiempo real
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

const notify = (code, type = 'order') => clients.forEach(c => c.res.write(`data: ${JSON.stringify({type, code})}\n\n`));

// WEBHOOK MAKE: Sincronización de pedidos (SOBRESCRIBE, NO SUMA)
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas) return res.status(400).send('No data');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const todayStr = new Date().toISOString().split('T')[0];
    let lastCode = null;

    for (const z of zonas) {
      const agentCode = String(z.codigo_agente || '0').trim();
      const agentName = String(z.nombre_agente || z.nombre_comercial || 'ZONA').toUpperCase();

      if (z.productos) {
        for (const p of z.productos) {
          const prodCode = String(p.codigo || '').trim().toUpperCase();
          const prodName = String(p.nombre_producto || p.nombre || '').trim().toUpperCase();
          if (!prodCode) continue;

          // Lógica de piezas reales: BUR5 (7 cajas) -> 56 piezas
          const rawQty = String(p.cantidad || 0).replace(',', '.');
          const boxes = Math.floor(Number(rawQty) || 0);
          const packSize = PRODUCT_PACK_SIZE[prodCode] || 1;
          const totalUnits = boxes * packSize;

          const recordKey = `${agentCode}-${prodCode}-${todayStr}`;
          lastCode = prodCode;

          // REGLA DE ORO: Seteamos la cantidad exacta que viene de Factusol
          await client.query(`
            INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity, record_key)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (record_key) DO UPDATE SET 
              quantity = EXCLUDED.quantity, 
              product_name = CASE WHEN EXCLUDED.product_name <> '' THEN EXCLUDED.product_name ELSE orders.product_name END,
              received_at = CURRENT_TIMESTAMP
          `, [agentCode, agentName, prodCode, prodName, totalUnits, recordKey]);
          
          // Si el webhook trae stock, lo actualizamos también
          if (p.stock_fisico !== undefined) {
            const sVal = Math.floor(Number(String(p.stock_fisico).replace(',', '.')) || 0);
            await client.query(`
              INSERT INTO inventory (product_code, stock_qty) VALUES ($1, $2)
              ON CONFLICT (product_code) DO UPDATE SET stock_qty = EXCLUDED.stock_qty, last_update = CURRENT_TIMESTAMP
            `, [prodCode, sVal]);
          }
        }
      }
    }
    await client.query('COMMIT');
    notify(lastCode);
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ENDPOINT PARA APP DE ESCANEO EAN
app.post('/api/scan', async (req, res) => {
  const { code, qty = 1 } = req.body; // Código EAN y cantidad escaneada
  if (!code) return res.status(400).json({ error: 'Code required' });

  const prodCode = String(code).trim().toUpperCase();
  try {
    await pool.query(`
      INSERT INTO inventory (product_code, stock_qty) VALUES ($1, $2)
      ON CONFLICT (product_code) DO UPDATE SET stock_qty = inventory.stock_qty + $2, last_update = CURRENT_TIMESTAMP
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

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
