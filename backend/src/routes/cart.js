const express = require('express');

module.exports = function createCartRouter(pool) {
  const router = express.Router();

  // In-memory cart for now (shared while developing)
  const cart = new Map();

  function buildPayload() {
    const items = Array.from(cart.values());
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return { items, subtotal };
  }

  router.post('/item', async (req, res) => {
    const { sku, qty = 1 } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'sku is required' });
    }

    const quantity = Number.parseInt(qty, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'qty must be a positive integer' });
    }

    try {
      const { rows } = await pool.query(
        `
          SELECT sku, title, price
          FROM products
          WHERE sku = $1
        `,
        [sku]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Unknown product' });
      }

      const product = rows[0];
      const price = Number(product.price);

      if (cart.has(product.sku)) {
        const existing = cart.get(product.sku);
        existing.qty += quantity;
      } else {
        cart.set(product.sku, {
          sku: product.sku,
          title: product.title,
          price,
          qty: quantity
        });
      }

      res.json(buildPayload());
    } catch (err) {
      console.error('Failed to add to cart', err);
      res.status(500).json({ error: 'Failed to add item' });
    }
  });

  router.patch('/item', (req, res) => {
    const { sku, qty } = req.body;
    const quantity = Number.parseInt(qty, 10);

    if (!sku || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'sku and integer qty are required' });
    }
    if (!cart.has(sku)) {
      return res.status(404).json({ error: 'Item not in cart' });
    }

    if (quantity <= 0) {
      cart.delete(sku);
    } else {
      cart.get(sku).qty = quantity;
    }

    res.json(buildPayload());
  });

  router.delete('/item/:sku', (req, res) => {
    const { sku } = req.params;
    if (!cart.has(sku)) {
      return res.status(404).json({ error: 'Item not in cart' });
    }

    cart.delete(sku);
    res.json(buildPayload());
  });

  return router;
};
