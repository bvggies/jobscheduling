const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all machines
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM machines ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// Get single machine
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM machines WHERE id = $1', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching machine:', error);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
});

// Create new machine
router.post('/', async (req, res) => {
  try {
    const { name, type, compatibility } = req.body;
    const result = await db.query(
      'INSERT INTO machines (name, type, compatibility) VALUES ($1, $2, $3) RETURNING *',
      [name, type, compatibility || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating machine:', error);
    res.status(500).json({ error: 'Failed to create machine' });
  }
});

// Update machine
router.put('/:id', async (req, res) => {
  try {
    const { name, type, compatibility } = req.body;
    const result = await db.query(
      'UPDATE machines SET name = $1, type = $2, compatibility = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, type, compatibility || [], req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating machine:', error);
    res.status(500).json({ error: 'Failed to update machine' });
  }
});

// Delete machine
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM machines WHERE id = $1 RETURNING *', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    console.error('Error deleting machine:', error);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
});

module.exports = router;

