const nodemailer = require('nodemailer');

const DEV = !process.env.EMAIL_HOST;
const APP_URL = (process.env.APP_URL || 'http://localhost').replace(/\/$/, '');

const transporter = DEV
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

async function sendLowStockAlert(alerts, recipients) {
  if (!alerts.length || !recipients.length) return;

  const rows = alerts.map((a) => `
    <tr>
      <td style="padding:6px 10px">${a.station}</td>
      <td style="padding:6px 10px">${a.part_name}</td>
      <td style="padding:6px 10px;font-family:monospace">${a.sku}</td>
      <td style="padding:6px 10px;text-align:center">${a.quantity}</td>
      <td style="padding:6px 10px;text-align:center">${a.min_threshold}</td>
      <td style="padding:6px 10px;text-align:center">
        <a href="${APP_URL}/order?part_id=${a.part_id}"
           style="background:#2563eb;color:#fff;padding:4px 12px;border-radius:4px;text-decoration:none;font-size:13px">
          Order
        </a>
      </td>
    </tr>`).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:700px">
      <h2 style="color:#1e293b">PartTrack — Low Stock Alert</h2>
      <p style="color:#64748b">${alerts.length} part(s) are below minimum threshold.</p>
      <table border="0" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;width:100%;border:1px solid #e2e8f0">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0">Station</th>
            <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0">Part</th>
            <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0">SKU</th>
            <th style="padding:8px 10px;text-align:center;border-bottom:1px solid #e2e8f0">Qty</th>
            <th style="padding:8px 10px;text-align:center;border-bottom:1px solid #e2e8f0">Min</th>
            <th style="padding:8px 10px;text-align:center;border-bottom:1px solid #e2e8f0"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@parttrack.dev',
    to: recipients.join(', '),
    subject: `[PartTrack] ${alerts.length} part(s) below threshold`,
    html,
  });

  if (DEV) {
    const msg = JSON.parse(info.message);
    console.log(`[mailer] Dev alert (not sent) → to: ${recipients.join(', ')}, subject: ${msg.subject}`);
  }
}

module.exports = { sendLowStockAlert };
