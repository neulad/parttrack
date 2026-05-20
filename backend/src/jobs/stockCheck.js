const cron = require('node-cron');
const pool = require('../db');
const { sendLowStockAlert } = require('../lib/mailer');

async function runStockCheck() {
  const { rows: lowParts } = await pool.query(`
    SELECT
      p.id AS part_id,
      p.name AS part_name,
      p.sku,
      p.min_threshold,
      s.name AS station,
      sl.quantity,
      ec.last_sent_at
    FROM parts p
    JOIN stock_levels sl ON sl.part_id = p.id
    JOIN stations s ON s.id = p.station_id
    LEFT JOIN email_cooldowns ec ON ec.part_id = p.id
    WHERE sl.quantity < p.min_threshold
  `);

  const now = new Date();
  const cooldownMs = 24 * 60 * 60 * 1000;

  const toAlert = lowParts.filter((r) => {
    if (!r.last_sent_at) return true;
    return now - new Date(r.last_sent_at) > cooldownMs;
  });

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

  // Update cooldowns
  for (const r of toAlert) {
    await pool.query(
      `INSERT INTO email_cooldowns(part_id, last_sent_at)
       VALUES($1, now())
       ON CONFLICT(part_id) DO UPDATE SET last_sent_at = now()`,
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

module.exports = { runStockCheck, startStockCheckJob };
