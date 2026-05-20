const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('station_id').optional().isInt({ min: 1 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const page = req.query.page || 1;
    const limit = req.query.limit || 50;
    const offset = (page - 1) * limit;

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

    const countParams = [...params];
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM parts p ${where}`,
      countParams
    );

    const dataParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const { rows } = await pool.query(
      `SELECT p.*, sl.quantity, sl.updated_at AS stock_updated_at,
              s.name AS station_name, s.location AS station_location,
              COALESCE((
                SELECT SUM(sh.quantity) FROM shipments sh
                WHERE sh.part_id = p.id AND sh.status = 'pending'
              ), 0) AS in_transit
       FROM parts p
       JOIN stock_levels sl ON sl.part_id = p.id
       JOIN stations s ON s.id = p.station_id
       ${where}
       ORDER BY s.name, p.name
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataParams
    );

    res.json({ rows, total: parseInt(count), page, limit });
  }
);

router.get('/:id', requireAuth, async (req, res) => {
  const { rows: [part] } = await pool.query(
    `SELECT p.*, sl.quantity, s.name AS station_name, s.location AS station_location,
            COALESCE((
              SELECT SUM(sh.quantity) FROM shipments sh
              WHERE sh.part_id = p.id AND sh.status = 'pending'
            ), 0) AS in_transit
     FROM parts p
     JOIN stock_levels sl ON sl.part_id = p.id
     JOIN stations s ON s.id = p.station_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!part) return res.status(404).json({ error: 'Part not found' });

  if (req.user.role !== 'admin' && part.station_id !== req.user.station_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(part);
});

router.post(
  '/',
  requireAdmin,
  body('station_id').isInt({ min: 1 }).withMessage('station_id required'),
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 300 }),
  body('sku').trim().notEmpty().withMessage('sku is required').isLength({ max: 100 }),
  body('supplier').optional({ nullable: true }).trim().isLength({ max: 300 }),
  body('min_threshold').optional().isInt({ min: 0 }).toInt(),
  body('tracking_link').optional({ nullable: true }).trim().isURL().withMessage('tracking_link must be a valid URL'),
  body('ordered_quantity').optional().isInt({ min: 1 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { station_id, name, sku, supplier, min_threshold, tracking_link, ordered_quantity } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [part] } = await client.query(
        `INSERT INTO parts(station_id, name, sku, supplier, min_threshold)
         VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [station_id, name, sku, supplier || null, min_threshold || 0]
      );
      await client.query('INSERT INTO stock_levels(part_id, quantity) VALUES($1, 0)', [part.id]);

      if (tracking_link && ordered_quantity > 0) {
        await client.query(
          `INSERT INTO shipments(part_id, quantity, tracking_link, created_by)
           VALUES($1,$2,$3,$4)`,
          [part.id, ordered_quantity, tracking_link, req.user.id]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ ...part, quantity: 0, in_transit: (tracking_link && ordered_quantity > 0) ? ordered_quantity : 0 });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists for this station' });
      throw err;
    } finally {
      client.release();
    }
  }
);

router.patch(
  '/:id/quantity',
  requireAuth,
  body('quantity').isInt({ min: 0 }).withMessage('quantity must be a non-negative integer').toInt(),
  body('note').optional({ nullable: true }).trim().isLength({ max: 500 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const partId = parseInt(req.params.id);
    const { quantity: newQty, note } = req.body;

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
  }
);

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM parts WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

/* ── Shipments ── */

router.get('/:id/shipments', requireAuth, async (req, res) => {
  const partId = parseInt(req.params.id);
  const { rows: [part] } = await pool.query('SELECT station_id FROM parts WHERE id = $1', [partId]);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  if (req.user.role !== 'admin' && part.station_id !== req.user.station_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { rows } = await pool.query(
    `SELECT sh.*, u.email AS created_by_email
     FROM shipments sh
     LEFT JOIN users u ON u.id = sh.created_by
     WHERE sh.part_id = $1
     ORDER BY sh.created_at DESC`,
    [partId]
  );
  res.json(rows);
});

router.post(
  '/:id/shipments',
  requireAuth,
  body('quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1').toInt(),
  body('tracking_link').optional({ nullable: true }).trim().isURL().withMessage('tracking_link must be a valid URL'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const partId = parseInt(req.params.id);
    const { quantity, tracking_link } = req.body;

    const { rows: [part] } = await pool.query('SELECT station_id FROM parts WHERE id = $1', [partId]);
    if (!part) return res.status(404).json({ error: 'Part not found' });
    if (req.user.role !== 'admin' && part.station_id !== req.user.station_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: [shipment] } = await pool.query(
      `INSERT INTO shipments(part_id, quantity, tracking_link, created_by)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [partId, quantity, tracking_link || null, req.user.id]
    );
    res.status(201).json(shipment);
  }
);

/* ── Deliver a shipment ── */

router.patch('/:partId/shipments/:shipmentId/deliver', requireAuth, async (req, res) => {
  const partId = parseInt(req.params.partId);
  const shipmentId = parseInt(req.params.shipmentId);

  const { rows: [part] } = await pool.query('SELECT station_id FROM parts WHERE id = $1', [partId]);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  if (req.user.role !== 'admin' && part.station_id !== req.user.station_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { rows: [shipment] } = await pool.query(
    'SELECT * FROM shipments WHERE id = $1 AND part_id = $2',
    [shipmentId, partId]
  );
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  if (shipment.status === 'delivered') return res.status(409).json({ error: 'Already delivered' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "UPDATE shipments SET status = 'delivered', delivered_at = now() WHERE id = $1",
      [shipmentId]
    );
    const { rows: [sl] } = await client.query(
      'SELECT quantity FROM stock_levels WHERE part_id = $1 FOR UPDATE',
      [partId]
    );
    const oldQty = sl ? sl.quantity : 0;
    const newQty = oldQty + shipment.quantity;
    await client.query(
      'UPDATE stock_levels SET quantity = $1, updated_at = now() WHERE part_id = $2',
      [newQty, partId]
    );
    await client.query(
      `INSERT INTO audit_log(user_id, part_id, old_quantity, new_quantity, delta, note)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [req.user.id, partId, oldQty, newQty, shipment.quantity, `Shipment #${shipmentId} delivered`]
    );
    await client.query('COMMIT');
    res.json({ ok: true, new_quantity: newQty });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/* ── Part history (quantity changes + shipments) ── */

router.get('/:id/history', requireAuth, async (req, res) => {
  const partId = parseInt(req.params.id);
  const { rows: [part] } = await pool.query('SELECT station_id FROM parts WHERE id = $1', [partId]);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  if (req.user.role !== 'admin' && part.station_id !== req.user.station_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { rows: changes } = await pool.query(
    `SELECT 'quantity_change' AS type, al.created_at AS at,
            u.email AS user_email, al.old_quantity, al.new_quantity, al.delta, al.note
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.part_id = $1
       AND (al.note IS NULL OR al.note NOT LIKE 'Shipment #%')`,
    [partId]
  );

  const { rows: shipments } = await pool.query(
    `SELECT 'shipment' AS type, sh.created_at AS at,
            u.email AS created_by_email, sh.id AS shipment_id,
            sh.quantity, sh.tracking_link, sh.status, sh.delivered_at
     FROM shipments sh
     LEFT JOIN users u ON u.id = sh.created_by
     WHERE sh.part_id = $1`,
    [partId]
  );

  const timeline = [...changes, ...shipments].sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json(timeline);
});

module.exports = router;
