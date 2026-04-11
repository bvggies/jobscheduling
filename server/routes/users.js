const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.post('/customers', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();
    const taken = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, 'customer', $3)
       RETURNING id, email, role, name`,
      [normalizedEmail, hash, trimmedName]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Admin create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email FROM users WHERE role = 'customer' ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

module.exports = router;
