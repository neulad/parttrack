const nodemailer = require('nodemailer');

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.EMAIL_HOST) {
    // Dev: use Ethereal auto-account
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`[mailer] Ethereal account: ${testAccount.user}`);
  } else {
    _transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  return _transporter;
}

async function sendLowStockAlert(alerts) {
  if (!alerts.length) return;

  const transporter = await getTransporter();

  const rows = alerts
    .map(
      (a) =>
        `<tr><td>${a.station}</td><td>${a.part_name}</td><td>${a.sku}</td><td>${a.quantity}</td><td>${a.min_threshold}</td></tr>`
    )
    .join('');

  const html = `
    <h2>PartTrack — Low Stock Alert</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>Station</th><th>Part</th><th>SKU</th><th>Qty</th><th>Min</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@parttrack.dev',
    to: process.env.ALERT_TO || 'admin@parttrack.dev',
    subject: `[PartTrack] ${alerts.length} part(s) below threshold`,
    html,
  });

  if (!process.env.EMAIL_HOST) {
    console.log(`[mailer] Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}

module.exports = { sendLowStockAlert };
