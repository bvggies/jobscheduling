const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

async function createUserWithRole({ name, email, password, role }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();
  const taken = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (taken.rows.length > 0) {
    return { error: { status: 409, body: { error: 'An account with this email already exists' } } };
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, name, created_at`,
    [normalizedEmail, hash, role, trimmedName]
  );
  return { user: result.rows[0] };
}

router.post('/customers', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const out = await createUserWithRole({ name, email, password, role: 'customer' });
    if (out.error) return res.status(out.error.status).json(out.error.body);
    res.status(201).json(out.user);
  } catch (error) {
    console.error('Admin create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.post('/workers', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const out = await createUserWithRole({ name, email, password, role: 'worker' });
    if (out.error) return res.status(out.error.status).json(out.error.body);
    res.status(201).json(out.user);
  } catch (error) {
    console.error('Admin create worker error:', error);
    res.status(500).json({ error: 'Failed to create worker' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, created_at FROM users WHERE role = 'customer' ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

router.get('/workers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, created_at FROM users WHERE role = 'worker' ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List workers error:', error);
    res.status(500).json({ error: 'Failed to load workers' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Use profile settings to change your own account' });
    }
    const existing = await db.query(`SELECT id, role FROM users WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { name, email, password } = req.body;
    if (!name && !email && !password) {
      return res.status(400).json({ error: 'Provide name, email, and/or password to update' });
    }
    if (email) {
      const normalized = String(email).trim().toLowerCase();
      const clash = await db.query(`SELECT id FROM users WHERE email = $1 AND id <> $2`, [normalized, id]);
      if (clash.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }
    let q = `UPDATE users SET updated_at = CURRENT_TIMESTAMP`;
    const params = [];
    let n = 1;
    if (name) {
      q += `, name = $${n++}`;
      params.push(String(name).trim());
    }
    if (email) {
      q += `, email = $${n++}`;
      params.push(String(email).trim().toLowerCase());
    }
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      q += `, password_hash = $${n++}`;
      params.push(await bcrypt.hash(password, 10));
    }
    q += ` WHERE id = $${n}`;
    params.push(id);
    const result = await db.query(`${q} RETURNING id, email, role, name, created_at`, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const row = await db.query(`SELECT role FROM users WHERE id = $1`, [id]);
    if (row.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (row.rows[0].role === 'admin') {
      const admins = await db.query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`);
      if (admins.rows[0].n <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin account' });
      }
    }
    await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
