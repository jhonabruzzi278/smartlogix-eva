const { createApp } = require('../shared/app');
const { validateInventoryBody, validateSaleBody } = require('../shared/validate');
const log = require('../shared/logger');

const { app, pool, sendError, start } = createApp('inventory_db', process.env.PORT || 8082);

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS inventory (id SERIAL PRIMARY KEY, sku VARCHAR(100) NOT NULL, stock INTEGER DEFAULT 0)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sku ON inventory (sku)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sales (id SERIAL PRIMARY KEY, sku VARCHAR(100) NOT NULL, quantity INTEGER NOT NULL, sale_date TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS processed_events (event_type VARCHAR(64) NOT NULL, event_key VARCHAR(128) NOT NULL, processed_at TIMESTAMP DEFAULT NOW(), PRIMARY KEY (event_type, event_key))`);
}

app.get('/api/inventory', async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM inventory ORDER BY id')).rows); }
  catch (err) { sendError(res, 500, 'Failed to list inventory', err); }
});

app.get('/api/inventory/:sku', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM inventory WHERE sku=$1', [req.params.sku]);
    if (!r.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json(r.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to get inventory', err); }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const errors = validateInventoryBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    if ((await pool.query('SELECT 1 FROM inventory WHERE sku=$1', [req.body.sku])).rows.length)
      return res.status(409).json({ error: 'SKU ya existe' });
    const result = await pool.query('INSERT INTO inventory (sku, stock) VALUES ($1,$2) RETURNING *', [req.body.sku, req.body.stock || 0]);
    res.status(201).json(result.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to create inventory', err); }
});

app.put('/api/inventory/:sku', async (req, res) => {
  try {
    if (req.body.stock === undefined || isNaN(Number(req.body.stock)) || Number(req.body.stock) < 0)
      return res.status(400).json({ error: 'stock must be >= 0' });
    const r = await pool.query('UPDATE inventory SET stock=$1 WHERE sku=$2 RETURNING *', [Number(req.body.stock), req.params.sku]);
    if (!r.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json(r.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to update inventory', err); }
});

app.delete('/api/inventory/:sku', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM inventory WHERE sku=$1 RETURNING *', [req.params.sku]);
    if (!r.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json({ deleted: true, sku: req.params.sku });
  } catch (err) { sendError(res, 500, 'Failed to delete', err); }
});

app.post('/api/inventory/:sku/adjust', async (req, res) => {
  try {
    const delta = parseInt(req.query.delta, 10);
    if (isNaN(delta) || delta === 0) return res.status(400).json({ error: 'delta must be non-zero integer' });
    const r = await pool.query('UPDATE inventory SET stock=stock+$1 WHERE sku=$2 AND stock+$1>=0 RETURNING *', [delta, req.params.sku]);
    if (!r.rows.length) {
      const exists = await pool.query('SELECT 1 FROM inventory WHERE sku=$1', [req.params.sku]);
      return res.status(exists.rows.length ? 400 : 404).json({ error: exists.rows.length ? 'Stock insuficiente' : 'SKU no encontrado' });
    }
    if (delta < 0) await pool.query('INSERT INTO sales (sku, quantity) VALUES ($1,$2)', [req.params.sku, Math.abs(delta)]);
    res.json({ sku: req.params.sku, stock: r.rows[0].stock, delta });
  } catch (err) { sendError(res, 500, 'Failed to adjust stock', err); }
});

app.get('/api/sales', async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM sales ORDER BY sale_date DESC')).rows); }
  catch (err) { sendError(res, 500, 'Failed to list sales', err); }
});

app.post('/api/sales', async (req, res) => {
  try {
    const errors = validateSaleBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const r = await pool.query('UPDATE inventory SET stock=stock-$1 WHERE sku=$2 AND stock>=$1 RETURNING *', [req.body.quantity, req.body.sku]);
    if (!r.rows.length) {
      const exists = await pool.query('SELECT 1 FROM inventory WHERE sku=$1', [req.body.sku]);
      return res.status(exists.rows.length ? 400 : 404).json({ error: exists.rows.length ? 'Stock insuficiente' : 'SKU no encontrado' });
    }
    const sale = (await pool.query('INSERT INTO sales (sku, quantity) VALUES ($1,$2) RETURNING *', [req.body.sku, req.body.quantity])).rows[0];
    res.status(201).json(sale);
  } catch (err) { sendError(res, 500, 'Failed to record sale', err); }
});

if (require.main === module) {
  (async () => { await ensureTables(); start(); })();
}

module.exports = { app };
