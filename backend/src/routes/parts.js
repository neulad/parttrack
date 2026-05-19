const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  let where = '';
  let params = [];

  if (req.user.role === 'admin') {
    if (req.query.station_id) {
      where = 'WHERE p.station_id = $1';
      params = [req.query.station_id];
    }
  } else {
    where = 'WHERE p.station_id = $1';
    params = [req.user.station_id];
  }

  const { rows } = await pool.query(
    `SELECT p.*, sl.quantity, sl.updated_at AS stock_updated_at, s.name AS station_name
     FROM parts p
     JOIN stock_levels sl ON sl.part_id = p.id
     JOIN stations s ON s.id = p.station_id
     ${where}
     ORDER BY s.name, p.name`,
    params
  );
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const { station_id, name, sku, supplier, min_threshold } = req.body;
  if (!station_id || !name || !sku) {
    return res.status(400).json({ error: 'station_id, name, sku required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [part] } = await client.query(
      `INSERT INTO parts(station_id, name, sku, supplier, min_threshold)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [station_id, name, sku, supplier || null, min_threshold || 0]
    );
    await client.query('INSERT INTO stock_levels(part_id, quantity) VALUES($1, 0)', [part.id]);
    await client.query('COMMIT');
    res.status(201).json({ ...part, quantity: 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists for this station' });
    throw err;
  } finally {
    client.release();
  }
});

router.patch('/:id/quantity', requireAuth, async (req, res) => {
  const partId = parseInt(req.params.id);
  const { quantity, note } = req.body;

  if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
    return res.status(400).json({ error: 'quantity required' });
  }

  const newQty = Math.max(0, parseInt(quantity));

  // Scope check: delegates can only update their station's parts
  const { rows: [part] } = await pool.query('SELECT station_id FROM parts WHERE id = $1', [partId]);
  if (!part) return res.status(404).json({ error: 'Part not found' });

  if (req.user.role !== 'admin' && part.station_id !== req.user.station_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [sl] } = await client.query(
      'SELECT quantity FROM stock_levels WHERE part_id = $1 FOR UPDATE',
      [partId]
    );
    const oldQty = sl ? sl.quantity : 0;

    await client.query(
      'UPDATE stock_levels SET quantity = $1, updated_at = now() WHERE part_id = $2',
      [newQty, partId]
    );

    await client.query(
      `INSERT INTO audit_log(user_id, part_id, old_quantity, new_quantity, delta, note)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [req.user.id, partId, oldQty, newQty, newQty - oldQty, note || null]
    );

    await client.query('COMMIT');
    res.json({ part_id: partId, quantity: newQty, old_quantity: oldQty });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM parts WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
