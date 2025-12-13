const createProductsRouter = require('./routes/products');
const createCartRouter = require('./routes/cart');
const createAuthRouter = require('./routes/auth');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool();
app.use('/api/products', createProductsRouter(pool));
app.use('/api/cart', createCartRouter(pool));
app.use('/api/auth', createAuthRouter(pool));

app.get('/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, now: rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`API on http://localhost:${process.env.PORT}`)
);
