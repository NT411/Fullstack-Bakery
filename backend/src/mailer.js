const crypto = require('crypto');
let nodemailer;
try {
  // Lazy require so the app still runs if the package hasn't been installed yet
  nodemailer = require('nodemailer');
} catch (err) {
  console.warn('\n[mailer] nodemailer package not found. Install it with "npm install nodemailer" to enable email features.\n');
}

function ensureTransporter() {
  if (!nodemailer) {
    throw new Error('Email transport unavailable: nodemailer is not installed.');
  }

  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 0);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('Email transport unavailable: MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS not fully configured.');
  }

  if (!ensureTransporter.cached) {
    ensureTransporter.cached = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass }
    });
  }

  return ensureTransporter.cached;
}

function buildHtmlTemplate({ title, intro, contentHtml, cta, footer }) {
  const safeTitle = title || 'TheSweetBaker Co.';
  const safeIntro = intro || '';
  const safeBody = contentHtml || '';
  const safeFooter = footer || 'Sweet regards,<br/>TheSweetBaker Co.';

  const actionBlock = cta
    ? `<div style="margin:24px 0;">
        <a href="${cta.href}"
           style="display:inline-block;padding:12px 20px;border:2px solid #b18597;border-radius:12px;
                  background:#fff0f0;color:#8d7b8d;font-weight:600;text-decoration:none;box-shadow:0 .4em 0 0 #ffe3e2;">
          ${cta.label}
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${safeTitle}</title>
    </head>
    <body style="margin:0;padding:24px;background:#fdf6f8;font-family:'Poppins',system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#8d7b8d;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#fff0f0;border:2px solid #b18597;border-radius:18px;box-shadow:0 12px 24px rgba(177,133,151,.18);">
        <tr>
          <td style="padding:32px;">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
              <div style="width:46px;height:46px;display:grid;place-items:center;background:#f9c4d2;border:2px solid #b18597;border-radius:14px;box-shadow:0 .5em 0 0 #ffe3e2;color:#a192a1;font-weight:700;">☼</div>
              <h1 style="margin:0;font-size:24px;color:#8d7b8d;">${safeTitle}</h1>
            </div>
            <p style="margin:0 0 18px;line-height:1.6;">${safeIntro}</p>
            <div style="line-height:1.7;font-size:16px;color:#9a879a;">${safeBody}</div>
            ${actionBlock}
            <p style="margin-top:24px;line-height:1.6;color:#9a879a;">${safeFooter}</p>
          </td>
        </tr>
      </table>
      <p style="margin:18px auto 0;text-align:center;font-size:13px;color:#b29ead;">© ${new Date().getFullYear()} TheSweetBaker Co.</p>
    </body>
  </html>`;
}

async function sendMail(options) {
  const transporter = ensureTransporter();
  const defaultFrom = process.env.MAIL_FROM || `TheSweetBaker Co. <${process.env.MAIL_USER}>`;
  const payload = {
    from: defaultFrom,
    ...options
  };
  return transporter.sendMail(payload);
}

function generateNumericCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(crypto.randomInt(min, max + 1));
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = {
  sendMail,
  buildHtmlTemplate,
  generateNumericCode,
  generateToken,
  hashValue
};
