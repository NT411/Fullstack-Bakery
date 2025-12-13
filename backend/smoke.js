// backend/scripts/smoke.js
// Runs basic backend checks: health, products, register/login/reset.
require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const crypto = require('crypto');

// Node 18+ has global fetch
const base = process.env.BASE_URL || 'http://localhost:4000';
const pool = new Pool(); // uses PG* env vars

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function request(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    data = text;
  }
  return { res, data, text };
}

async function expectStatus(label, res, expected = 200) {
  if (res.status !== expected) {
    throw new Error(`${label} expected ${expected}, got ${res.status} (${await res.text()})`);
  }
  console.log(`✅ ${label} (${res.status})`);
}

async function run() {
  const email = `smoke+${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const newPassword = 'NewPass123!';
  const code = String(100000 + Math.floor(Math.random() * 900000));
  const resetToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  // Health
  {
    const { res, data } = await request('/health');
    await expectStatus('health', res, 200);
    if (!data?.ok) throw new Error('health ok flag missing');
  }

  // Products (all + categories)
  {
    const { res, data } = await request('/api/products');
    await expectStatus('products', res, 200);
    if (!Array.isArray(data) || data.length === 0) throw new Error('products empty');

    for (const category of ['Order', 'Book', 'Course']) {
      const { res: r2, data: d2 } = await request(`/api/products?category=${encodeURIComponent(category)}`);
      await expectStatus(`products ${category}`, r2, 200);
      if (!Array.isArray(d2) || d2.length === 0) {
        throw new Error(`products ${category} empty`);
      }
    }
  }

  // Seed verification code directly
  {
    const expiresAt = new Date(now + 15 * 60 * 1000);
    const codeHash = hashValue(code);
    await pool.query(
      `INSERT INTO registration_codes (email, code_hash, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [email, codeHash, expiresAt]
    );
  }

  // Register
  {
    const payload = {
      email,
      password,
      fullName: 'Smoke Test',
      verificationCode: code
      // accountNumber omitted to let backend auto-generate
    };
    const { res, data } = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    await expectStatus('register', res, 201);
    if (!data?.user?.id) throw new Error('register missing user');
  }

  // Login
  let token;
  {
    const { res, data } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    await expectStatus('login', res, 200);
    token = data?.token;
    if (!token) throw new Error('login missing token');
  }

  // Seed reset token directly
  {
    const expiresAt = new Date(now + 30 * 60 * 1000);
    const tokenHash = hashValue(resetToken);
    // lookup user id
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const userId = rows[0]?.id;
    if (!userId) throw new Error('user not found for reset');
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
  }

  // Reset password
  {
    const { res } = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, password: newPassword })
    });
    await expectStatus('reset-password', res, 200);
  }

  // Login with new password
  {
    const { res } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: newPassword })
    });
    await expectStatus('login after reset', res, 200);
  }

  console.log('🎉 Smoke tests passed');
} // end run

run()
  .catch(err => {
    console.error('❌ Smoke test failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
