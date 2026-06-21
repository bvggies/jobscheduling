const express = require('express');
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const shop = require('../utils/shopConfig');
const store = require('../utils/serviceStore');

const router = express.Router();

router.get('/catalog', async (req, res) => {
  try {
    const services = await store.loadActiveServices(db);
    res.json({
      services,
      priceList: store.buildPriceListSections(services),
      depositPercent: shop.DEPOSIT_PERCENT,
      contact: shop.SHOP_CONTACT,
      businessHours: shop.BUSINESS_HOURS,
      hoursSummary: shop.formatBusinessHoursSummary(),
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({ error: 'Failed to load service catalog' });
  }
});

router.post('/calculate', async (req, res) => {
  try {
    const { service_id, service_variant, quantity } = req.body || {};
    const result = await store.calculateOrderPrice(db, service_id, service_variant, quantity);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});

router.get('/manage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const services = await store.loadAllServices(db);
    res.json(services);
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

router.post('/manage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const payload = store.serviceToDbPayload(req.body);
    if (!payload.id || !payload.name || !payload.pricing_type) {
      return res.status(400).json({ error: 'Service id, name, and pricing type are required' });
    }
    const result = await db.query(
      `INSERT INTO shop_services (id, name, pricing_type, config, quote_note, requires_appointment, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        payload.id,
        payload.name,
        payload.pricing_type,
        JSON.stringify(payload.config),
        payload.quote_note,
        payload.requires_appointment,
        payload.sort_order,
        payload.active,
      ]
    );
    res.status(201).json(store.rowToService(result.rows[0]));
  } catch (error) {
    if (String(error.message).includes('duplicate key')) {
      return res.status(409).json({ error: 'A service with this id already exists' });
    }
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

router.put('/manage/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = await db.query(`SELECT id FROM shop_services WHERE id = $1`, [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Service not found' });

    const payload = store.serviceToDbPayload({ ...req.body, id: req.params.id });
    const result = await db.query(
      `UPDATE shop_services SET
        name = $2,
        pricing_type = $3,
        config = $4,
        quote_note = $5,
        requires_appointment = $6,
        sort_order = $7,
        active = $8,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        payload.name,
        payload.pricing_type,
        JSON.stringify(payload.config),
        payload.quote_note,
        payload.requires_appointment,
        payload.sort_order,
        payload.active,
      ]
    );
    res.json(store.rowToService(result.rows[0]));
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.delete('/manage/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE shop_services SET active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service deactivated' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to deactivate service' });
  }
});

module.exports = router;
