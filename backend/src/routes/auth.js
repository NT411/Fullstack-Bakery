const express = require('express');
const crypto = require('crypto');
const {
  sendMail,
  buildHtmlTemplate,
  generateNumericCode,
  generateToken,
  hashValue
} = require('../mailer');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHex] = storedHash.split(':');
  const derivedHex = crypto.scryptSync(password, salt, 64).toString('hex');
  const original = Buffer.from(originalHex, 'hex');
  const derived = Buffer.from(derivedHex, 'hex');
  if (original.length !== derived.length) return false;
  return crypto.timingSafeEqual(original, derived);
}

function signToken(payload, secret, ttlSeconds = 60 * 60) {
  if (!secret) {
    throw new Error('JWT secret missing. Set AUTH_JWT_SECRET in your environment.');
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };

  const headerPart = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadPart = Buffer.from(JSON.stringify(body)).toString('base64url');
  const data = `${headerPart}.${payloadPart}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function generateAccountNumber() {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `BAK-${timestamp}-${random}`;
}

function createAuthRouter(pool) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const {
      email,
      password,
      fullName,
      accountNumber,
      verificationCode
    } = req.body || {};

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (fullName != null && typeof fullName !== 'string') {
      return res.status(400).json({ error: 'fullName must be a string' });
    }
    if (typeof verificationCode !== 'string' || !verificationCode.trim()) {
      return res.status(400).json({ error: 'verification code is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const nameValue = (fullName || '').trim() || null;
    const account = (accountNumber || '').trim() || generateAccountNumber();
    const passwordHash = hashPassword(password);
    const codeHash = hashValue(verificationCode.trim());

    try {
      const codeLookup = await pool.query(
        `
          SELECT code_hash, expires_at
          FROM registration_codes
          WHERE email = $1
        `,
        [normalizedEmail]
      );

      const entry = codeLookup.rows[0];
      if (!entry) {
        return res.status(400).json({ error: 'verification code not found or expired' });
      }
      if (entry.expires_at && entry.expires_at < new Date()) {
        await pool.query('DELETE FROM registration_codes WHERE email = $1', [normalizedEmail]);
        return res.status(400).json({ error: 'verification code expired' });
      }
      if (entry.code_hash !== codeHash) {
        return res.status(400).json({ error: 'invalid verification code' });
      }

      const query = `
        INSERT INTO users (email, password_hash, full_name, account_number)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, full_name, account_number, created_at;
      `;
      const { rows } = await pool.query(query, [
        normalizedEmail,
        passwordHash,
        nameValue,
        account
      ]);
      const user = rows[0];
      await pool.query('DELETE FROM registration_codes WHERE email = $1', [normalizedEmail]);

      // fire-and-forget welcome email
      if (user?.email) {
        sendMail({
          to: user.email,
          subject: 'Welcome to TheSweetBaker Co.',
          text: `Hi ${user.full_name || 'there'},\n\nYour account is ready. You can now place orders and manage your profile.\n\nSweet regards,\nTheSweetBaker Co.`,
          html: buildHtmlTemplate({
            title: 'Welcome aboard!',
            intro: `Hi ${user.full_name || 'there'},`,
            contentHtml: `<p>Your account is ready. You can now place orders, save your favourite treats, and keep your profile up to date.</p>`,
            footer: 'Sweet regards,<br/>TheSweetBaker Co.'
          })
        }).catch(err => {
          console.warn('[mailer] failed to send welcome email:', err.message);
        });
      }

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          accountNumber: user.account_number,
          createdAt: user.created_at
        }
      });
    } catch (err) {
      if (err.code === '23505') {
        if (err.constraint && err.constraint.includes('account_number')) {
          return res.status(409).json({ error: 'account number already in use' });
        }
        return res.status(409).json({ error: 'email already registered' });
      }
      console.error('Registration failed', err);
      res.status(500).json({ error: 'registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { rows } = await pool.query(
        `
          SELECT id, email, password_hash, full_name, account_number, created_at
          FROM users
          WHERE email = $1
        `,
        [normalizedEmail]
      );

      const user = rows[0];
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'invalid credentials' });
      }

      let token;
      try {
        token = signToken(
          { sub: user.id, email: user.email },
          process.env.AUTH_JWT_SECRET,
          60 * 60 * 4
        );
      } catch (err) {
        console.error('Token signing failed', err);
        return res.status(500).json({ error: 'token generation failed' });
      }

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          accountNumber: user.account_number,
          createdAt: user.created_at
        }
      });
    } catch (err) {
      console.error('Login failed', err);
      res.status(500).json({ error: 'login failed' });
    }
  });

  router.post('/send-code', async (req, res) => {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [normalizedEmail]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'email already registered' });
      }

      const code = generateNumericCode(6);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const codeHash = hashValue(code);

      await pool.query(
        `
          INSERT INTO registration_codes (email, code_hash, expires_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (email)
          DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, created_at = NOW()
        `,
        [normalizedEmail, codeHash, expiresAt]
      );

      await sendMail({
        to: normalizedEmail,
        subject: 'Your verification code',
        text: `Use this code to finish setting up your account: ${code}\n\nThe code expires in 15 minutes.`,
        html: buildHtmlTemplate({
          title: 'Confirm your email',
          intro: 'Let’s finish setting up your account.',
          contentHtml: `<p>Your verification code is:</p>
                        <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:12px 0;color:#8d7b8d;">${code}</p>
                        <p>This code expires in 15 minutes.</p>`
        })
      });

      res.json({ message: 'Verification code sent' });
    } catch (err) {
      console.error('Failed to send verification code', err);
      res.status(500).json({ error: 'could not send verification code' });
    }
  });

  router.post('/request-reset', async (req, res) => {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const userRes = await pool.query('SELECT id, email, full_name FROM users WHERE email = $1', [normalizedEmail]);
      const user = userRes.rows[0];

      if (user) {
        const token = generateToken();
        const tokenHash = hashValue(token);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
        await pool.query(
          `
            INSERT INTO password_resets (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
          `,
          [user.id, tokenHash, expiresAt]
        );

        const resetBase = process.env.RESET_URL_BASE || 'http://localhost:5500/frontend/html/index.html';
        const link = `${resetBase}?token=${token}`;

        await sendMail({
          to: user.email,
          subject: 'Reset your password',
          text: `Hi ${user.full_name || 'there'},\n\nUse the following link to reset your password (valid for 30 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`,
          html: buildHtmlTemplate({
            title: 'Reset your password',
            intro: `Hi ${user.full_name || 'there'},`,
            contentHtml: `<p>We received a request to reset your password. Use the button below to create a new one (the link stays active for 30 minutes).</p>`,
            cta: { href: link, label: 'Reset password' },
            footer: 'If you didn’t request this change, you can safely ignore this email.'
          })
        });
      }

      res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
      console.error('Failed to handle reset request', err);
      res.status(500).json({ error: 'could not start reset flow' });
    }
  });

  router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ error: 'token is required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const tokenHash = hashValue(token.trim());

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lookup = await client.query(
        `
          SELECT pr.user_id, pr.expires_at
          FROM password_resets pr
          WHERE pr.token_hash = $1
        `,
        [tokenHash]
      );

      const entry = lookup.rows[0];
      if (!entry) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid or expired token' });
      }
      if (entry.expires_at && entry.expires_at < new Date()) {
        await client.query('DELETE FROM password_resets WHERE token_hash = $1', [tokenHash]);
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'token expired' });
      }

      const newHash = hashPassword(password);
      await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, entry.user_id]);
      await client.query('DELETE FROM password_resets WHERE user_id = $1', [entry.user_id]);

      await client.query('COMMIT');
      res.json({ message: 'Password updated' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Failed to reset password', err);
      res.status(500).json({ error: 'could not reset password' });
    } finally {
      client.release();
    }
  });

  return router;
}

module.exports = createAuthRouter;
