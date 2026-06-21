const express = require('express');
const {
  SERVICES,
  buildPriceListSections,
  calculateOrderPrice,
  SHOP_CONTACT,
  BUSINESS_HOURS,
  DEPOSIT_PERCENT,
  formatBusinessHoursSummary,
} = require('../utils/serviceCatalog');

const router = express.Router();

router.get('/catalog', (req, res) => {
  res.json({
    services: SERVICES,
    priceList: buildPriceListSections(),
    depositPercent: DEPOSIT_PERCENT,
    contact: SHOP_CONTACT,
    businessHours: BUSINESS_HOURS,
    hoursSummary: formatBusinessHoursSummary(),
  });
});

router.post('/calculate', (req, res) => {
  const { service_id, service_variant, quantity } = req.body || {};
  const result = calculateOrderPrice(service_id, service_variant, quantity);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

module.exports = router;
