const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  let query, params;
  if (req.user.role === 'admin') {
    query = 'SELECT * FROM stations ORDER BY name';
    params = [];
  } else {
    query = 'SELECT * FROM stations WHERE id = $1';
    params = [req.user.station_id];
  }
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { rows } = await pool.query(
    'INSERT INTO stations(name, location) VALUES($1,$2) RETURNING *',
    [name, location || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM stations WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
