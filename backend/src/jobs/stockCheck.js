const cron = require('node-cron');
const pool = require('../db');
const { sendLowStockAlert } = require('../lib/mailer');

function shouldAlert(r, now) {
  const inTransit = parseInt(r.in_transit);
  if (r.quantity + inTransit >= r.min_threshold) return false;
  if (!r.last_sent_at) return true;

  const hoursSinceLast = (now - new Date(r.last_sent_at)) / (1000 * 60 * 60);
  const count = parseInt(r.alert_count);

  if (count < 3) return hoursSinceLast >= 24;

  const isMonday8am = now.getDay() === 1 && now.getHours() === 8;
  return isMonday8am && hoursSinceLast >= 144;
}

async function runStockCheck() {
  // Reset cooldowns for parts covered by stock + in-transit
  await pool.query(`
    DELETE FROM email_cooldowns ec
    USING parts p, stock_levels sl
    WHERE ec.part_id = p.id AND sl.part_id = p.id
      AND sl.quantity + COALESCE((
        SELECT SUM(sh.quantity) FROM shipments sh
        WHERE sh.part_id = p.id AND sh.status = 'pending'
      ), 0) >= p.min_threshold
  `);

  const { rows: candidates } = await pool.query(`
    SELECT
      p.id AS part_id,
      p.name AS part_name,
      p.sku,
      p.min_threshold,
      s.name AS station,
      sl.quantity,
      COALESCE((
        SELECT SUM(sh.quantity) FROM shipments sh
        WHERE sh.part_id = p.id AND sh.status = 'pending'
      ), 0) AS in_transit,
      ec.last_sent_at,
      COALESCE(ec.alert_count, 0) AS alert_count
    FROM parts p
    JOIN stock_levels sl ON sl.part_id = p.id
    JOIN stations s ON s.id = p.station_id
    LEFT JOIN email_cooldowns ec ON ec.part_id = p.id
    WHERE sl.quantity < p.min_threshold
  `);

  const now = new Date();
  const toAlert = candidates.filter((r) => shouldAlert(r, now));

  if (!toAlert.length) {
    console.log('[stock-check] No alerts to send.');
    return;
  }

  const { rows: recipients } = await pool.query(
    'SELECT email FROM alert_recipients ORDER BY created_at'
  );

  if (!recipients.length) {
    console.log('[stock-check] No alert recipients configured, skipping email.');
    return;
  }

  await sendLowStockAlert(toAlert, recipients.map((r) => r.email));

  for (const r of toAlert) {
    await pool.query(
      `INSERT INTO email_cooldowns(part_id, last_sent_at, alert_count)
       VALUES($1, now(), 1)
       ON CONFLICT(part_id) DO UPDATE SET last_sent_at = now(), alert_count = email_cooldowns.alert_count + 1`,
      [r.part_id]
    );
  }

  console.log(`[stock-check] Sent alert for ${toAlert.length} part(s).`);
}

function startStockCheckJob() {
  cron.schedule('0 * * * *', () => {
    runStockCheck().catch((err) => console.error('[stock-check] Error:', err));
  });
  console.log('[stock-check] Cron started (hourly).');
}

module.exports = { runStockCheck, startStockCheckJob, shouldAlert };
