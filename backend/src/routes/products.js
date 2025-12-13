const express = require('express');

module.exports = function createProductsRouter(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { category } = req.query;
    const params = [];
    let sql = `
      SELECT
        sku,
        title,
        description,
        category,
        level,
        format,
        duration,
        price
      FROM products
    `;

    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }

    sql += ' ORDER BY title ASC';

    try {
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error('Failed to fetch products', err);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  return router;
};
