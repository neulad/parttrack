const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { runStockCheck } = require('../jobs/stockCheck');

const router = express.Router();

// Audit log
router.get('/audit-log', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  const { rows } = await pool.query(
    `SELECT al.*, u.email AS user_email, p.name AS part_name, p.sku, s.name AS station_name
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     LEFT JOIN parts p ON p.id = al.part_id
     LEFT JOIN stations s ON s.id = p.station_id
     ORDER BY al.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json(rows);
});

// Users list
router.get('/users', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, u.station_id, u.created_at, s.name AS station_name
     FROM users u
     LEFT JOIN stations s ON s.id = u.station_id
     ORDER BY u.created_at`
  );
  res.json(rows);
});

// Create user
router.post('/users', requireAdmin, async (req, res) => {
  const { email, password, role, station_id } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'email, password, role required' });
  }
  if (!['admin', 'delegate'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or delegate' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users(email, password_hash, role, station_id)
       VALUES($1,$2,$3,$4) RETURNING id, email, role, station_id, created_at`,
      [email, hash, role, station_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    throw err;
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

// Manual stock check trigger
router.post('/check-stock', requireAdmin, async (req, res) => {
  await runStockCheck();
  res.json({ ok: true, message: 'Stock check complete' });
});

module.exports = router;
