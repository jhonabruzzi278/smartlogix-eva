const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createPool } = require('../shared/db');
const log = require('../shared/logger');
const { validateInventoryBody, validateSaleBody } = require('../shared/validate');
const { gracefulShutdown } = require('../shared/shutdown');
const { applySecurity } = require('../shared/security');

const app = express();
applySecurity(app);
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8082;
const pool = createPool('inventory_db');

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    )
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sku ON inventory (sku)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory (stock)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL,
      sale_date TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_sku ON sales (sku)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (sale_date)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_events (
      event_type VARCHAR(64) NOT NULL,
      event_key VARCHAR(128) NOT NULL,
      processed_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (event_type, event_key)
    )
  `);
}

function sendError(res, status, logMessage, err) {
  log.warn(logMessage, { error: err?.message || String(err) });
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : (err?.message || 'Request failed') });
}

app.get('/api/inventory', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to list inventory', err);
  }
});

app.get('/api/inventory/:sku', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE sku = $1', [req.params.sku]);
    if (!result.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to get inventory', err);
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const errors = validateInventoryBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const { sku, stock } = req.body;
    const existing = await pool.query('SELECT * FROM inventory WHERE sku = $1', [sku]);
    if (existing.rows.length) return res.status(409).json({ error: 'SKU ya existe' });

    const result = await pool.query(
      'INSERT INTO inventory (sku, stock) VALUES ($1, $2) RETURNING *',
      [sku, stock || 0]
    );
    log.info('Product added', { sku, stock: stock || 0 });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to create inventory', err);
  }
});

app.put('/api/inventory/:sku', async (req, res) => {
  try {
    if (req.body.stock === undefined || isNaN(Number(req.body.stock)) || Number(req.body.stock) < 0) {
      return res.status(400).json({ error: 'stock must be a non-negative number' });
    }
    const result = await pool.query(
      'UPDATE inventory SET stock = $1 WHERE sku = $2 RETURNING *',
      [Number(req.body.stock), req.params.sku]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to update inventory', err);
  }
});

app.delete('/api/inventory/:sku', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM inventory WHERE sku = $1 RETURNING *', [req.params.sku]);
    if (!result.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    log.info('Product deleted', { sku: req.params.sku });
    res.json({ deleted: true, sku: req.params.sku });
  } catch (err) {
    sendError(res, 500, 'Failed to delete inventory', err);
  }
});

app.post('/api/inventory/:sku/adjust', async (req, res) => {
  try {
    const delta = parseInt(req.query.delta, 10);
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({ error: 'delta must be a non-zero integer' });
    }

    const result = await pool.query(
      'UPDATE inventory SET stock = stock + $1 WHERE sku = $2 AND stock + $1 >= 0 RETURNING *',
      [delta, req.params.sku]
    );

    if (!result.rows.length) {
      const exists = await pool.query('SELECT * FROM inventory WHERE sku = $1', [req.params.sku]);
      if (!exists.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    if (delta < 0) {
      await pool.query(
        'INSERT INTO sales (sku, quantity) VALUES ($1, $2)',
        [req.params.sku, Math.abs(delta)]
      );
    }

    log.info('Stock adjusted', { sku: req.params.sku, delta, newStock: result.rows[0].stock });
    res.json({ sku: req.params.sku, stock: result.rows[0].stock, delta });
  } catch (err) {
    sendError(res, 500, 'Failed to adjust stock', err);
  }
});

app.get('/api/sales', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY sale_date DESC');
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to list sales', err);
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const errors = validateSaleBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const { sku, quantity } = req.body;

    const invResult = await pool.query(
      'UPDATE inventory SET stock = stock - $1 WHERE sku = $2 AND stock >= $1 RETURNING *',
      [quantity, sku]
    );

    if (!invResult.rows.length) {
      const exists = await pool.query('SELECT * FROM inventory WHERE sku = $1', [sku]);
      if (!exists.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    const result = await pool.query(
      'INSERT INTO sales (sku, quantity) VALUES ($1, $2) RETURNING *',
      [sku, quantity]
    );
    log.info('Sale recorded', { sku, quantity });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to record sale', err);
  }
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'DEGRADED', db: 'disconnected' });
  }
});

async function start() {
  await ensureTables();
  const server = app.listen(PORT, () => log.info(`inventory-service running on port ${PORT}`));
  gracefulShutdown(server, pool, null, 'inventory-service');
}

start();
