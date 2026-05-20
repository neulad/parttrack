const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
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
router.post(
  '/users',
  requireAdmin,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'delegate']).withMessage('role must be admin or delegate'),
  body('station_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password, role, station_id } = req.body;
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
  }
);

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

// Alert recipients
router.get('/alert-recipients', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM alert_recipients ORDER BY created_at');
  res.json(rows);
});

router.post(
  '/alert-recipients',
  requireAdmin,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { rows } = await pool.query(
        'INSERT INTO alert_recipients(email) VALUES($1) RETURNING *',
        [req.body.email]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already in list' });
      throw err;
    }
  }
);

router.put(
  '/alert-recipients/:id',
  requireAdmin,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { rows } = await pool.query(
        'UPDATE alert_recipients SET email = $1 WHERE id = $2 RETURNING *',
        [req.body.email, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already in list' });
      throw err;
    }
  }
);

router.delete('/alert-recipients/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM alert_recipients WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
