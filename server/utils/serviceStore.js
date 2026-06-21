const { calcDepositRequired } = require('./shopConfig');
const { SERVICES: DEFAULT_SERVICES } = require('./catalogData');

function buildConfigFromService(service) {
  const config = {};
  if (service.sizes) config.sizes = service.sizes;
  if (service.tiers) config.tiers = service.tiers;
  if (service.unitLabel) config.unitLabel = service.unitLabel;
  if (service.unitPrice != null) config.unitPrice = service.unitPrice;
  return config;
}

function rowToService(row) {
  const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config || {};
  return {
    id: row.id,
    name: row.name,
    pricingType: row.pricing_type,
    quoteNote: row.quote_note,
    requiresAppointment: row.requires_appointment !== false,
    active: row.active !== false,
    sortOrder: row.sort_order || 0,
    unitLabel: config.unitLabel,
    unitPrice: config.unitPrice,
    sizes: config.sizes || [],
    tiers: config.tiers || [],
  };
}

function serviceToDbPayload(service) {
  const pricingType = service.pricingType || service.pricing_type;
  const config = {};
  if (pricingType === 'fixed-size') {
    config.sizes = (service.sizes || []).map((s, i) => ({
      id: s.id || `size-${i}`,
      label: s.label,
      unitPrice: parseFloat(s.unitPrice),
    }));
  } else if (pricingType === 'tiered-yard') {
    config.tiers = service.tiers || [];
    config.unitLabel = service.unitLabel || 'yards';
  } else if (pricingType === 'per-unit') {
    config.unitPrice = parseFloat(service.unitPrice);
    config.unitLabel = service.unitLabel || 'unit';
  }
  return {
    id: service.id,
    name: service.name,
    pricing_type: pricingType,
    config,
    quote_note: service.quoteNote || service.quote_note || null,
    requires_appointment: service.requiresAppointment !== false,
    active: service.active !== false,
    sort_order: parseInt(service.sortOrder ?? service.sort_order ?? 0, 10) || 0,
  };
}

async function ensureServicesSeeded(db) {
  const count = await db.query('SELECT COUNT(*)::int AS n FROM shop_services');
  if (count.rows[0].n > 0) return;

  for (let i = 0; i < DEFAULT_SERVICES.length; i += 1) {
    const s = DEFAULT_SERVICES[i];
    const payload = serviceToDbPayload({ ...s, sortOrder: i });
    await db.query(
      `INSERT INTO shop_services (id, name, pricing_type, config, quote_note, requires_appointment, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (id) DO NOTHING`,
      [
        payload.id,
        payload.name,
        payload.pricing_type,
        JSON.stringify(payload.config),
        payload.quote_note,
        payload.requires_appointment,
        payload.sort_order,
      ]
    );
  }
}

async function loadActiveServices(db) {
  await ensureServicesSeeded(db);
  const result = await db.query(
    `SELECT * FROM shop_services WHERE active = true ORDER BY sort_order ASC, name ASC`
  );
  return result.rows.map(rowToService);
}

async function loadAllServices(db) {
  await ensureServicesSeeded(db);
  const result = await db.query(`SELECT * FROM shop_services ORDER BY sort_order ASC, name ASC`);
  return result.rows.map(rowToService);
}

async function getServiceById(db, serviceId) {
  await ensureServicesSeeded(db);
  const result = await db.query(`SELECT * FROM shop_services WHERE id = $1`, [serviceId]);
  return result.rows[0] ? rowToService(result.rows[0]) : null;
}

function getServiceFromList(services, serviceId) {
  return services.find((s) => s.id === serviceId) || null;
}

function tierUnitPrice(service, quantity) {
  const qty = parseInt(quantity, 10) || 0;
  for (const tier of service.tiers || []) {
    const max = tier.max == null ? Infinity : tier.max;
    if (qty >= tier.min && qty <= max) return tier.unitPrice;
  }
  return null;
}

function calculateOrderPriceForService(service, variantId, quantity) {
  if (!service) {
    return { error: 'Unknown service', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
  }

  const qty = parseInt(quantity, 10);
  if (!Number.isFinite(qty) || qty < 1) {
    return { error: 'Quantity must be at least 1', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
  }

  if (service.pricingType === 'quote-required') {
    return {
      unitPrice: null,
      total: null,
      depositRequired: null,
      quoteRequired: true,
      variantLabel: service.quoteNote || 'Price on request',
    };
  }

  if (service.pricingType === 'fixed-size') {
    const size = (service.sizes || []).find((s) => s.id === variantId);
    if (!size) {
      return { error: 'Select a size', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
    }
    const total = Math.round(parseFloat(size.unitPrice) * qty * 100) / 100;
    return {
      unitPrice: parseFloat(size.unitPrice),
      total,
      depositRequired: calcDepositRequired(total),
      quoteRequired: false,
      variantLabel: size.label,
    };
  }

  if (service.pricingType === 'per-unit') {
    const total = Math.round(parseFloat(service.unitPrice) * qty * 100) / 100;
    return {
      unitPrice: parseFloat(service.unitPrice),
      total,
      depositRequired: calcDepositRequired(total),
      quoteRequired: false,
      variantLabel: service.unitLabel || 'unit',
    };
  }

  if (service.pricingType === 'tiered-yard') {
    const unitPrice = tierUnitPrice(service, qty);
    if (unitPrice == null) {
      return { error: 'Invalid quantity for pricing tier', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
    }
    const total = Math.round(unitPrice * qty * 100) / 100;
    return {
      unitPrice,
      total,
      depositRequired: calcDepositRequired(total),
      quoteRequired: false,
      variantLabel: `${qty} ${service.unitLabel || 'yards'}`,
    };
  }

  return { error: 'Unsupported pricing type', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
}

async function calculateOrderPrice(db, serviceId, variantId, quantity) {
  const services = await loadActiveServices(db);
  const service = getServiceFromList(services, serviceId);
  return calculateOrderPriceForService(service, variantId, quantity);
}

function buildPriceListSections(services) {
  return services.map((service) => {
    if (service.pricingType === 'fixed-size') {
      return {
        name: service.name,
        items: (service.sizes || []).map((s) => ({ label: s.label, price: `₵${parseFloat(s.unitPrice).toFixed(2)}` })),
      };
    }
    if (service.pricingType === 'per-unit') {
      return {
        name: service.name,
        items: [{ label: service.unitLabel, price: `₵${parseFloat(service.unitPrice).toFixed(2)}/${service.unitLabel}` }],
      };
    }
    if (service.pricingType === 'tiered-yard') {
      return {
        name: service.name,
        items: (service.tiers || []).map((t) => ({
          label: t.max ? `${t.min}–${t.max} ${service.unitLabel || 'yards'}` : `${t.min}+ ${service.unitLabel || 'yards'}`,
          price: `₵${t.unitPrice}/${service.unitLabel || 'yard'}`,
        })),
      };
    }
    return {
      name: service.name,
      items: [{ label: service.quoteNote || 'Price on request', price: '—' }],
    };
  });
}

async function validateCustomerOrder(db, payload) {
  const { service_id, service_variant, quantity, total_cost, deposit_required } = payload;
  const services = await loadActiveServices(db);
  const service = getServiceFromList(services, service_id);
  const pricing = calculateOrderPriceForService(service, service_variant, quantity);
  if (pricing.error) return { ok: false, error: pricing.error };

  if (pricing.quoteRequired) {
    if (parseFloat(total_cost) > 0 || parseFloat(deposit_required) > 0) {
      return { ok: false, error: 'Quote-required services cannot include a price until the shop confirms' };
    }
    return { ok: true, pricing, service };
  }

  const submittedTotal = Math.round((parseFloat(total_cost) || 0) * 100) / 100;
  const submittedDeposit = Math.round((parseFloat(deposit_required) || 0) * 100) / 100;

  if (Math.abs(submittedTotal - pricing.total) > 0.01) {
    return { ok: false, error: 'Total price does not match the current price list' };
  }
  if (Math.abs(submittedDeposit - pricing.depositRequired) > 0.01) {
    return { ok: false, error: `Deposit must be exactly ${calcDepositRequired(pricing.total)} (80% of total)` };
  }

  return { ok: true, pricing, service };
}

function validateDepositPayment(pricing, payment) {
  if (pricing.quoteRequired) return { ok: true };
  if (!payment) return { ok: false, error: 'Deposit payment details are required before submitting your order' };

  const { momo_phone, momo_reference, amount } = payment;
  if (!momo_phone || !String(momo_phone).trim()) {
    return { ok: false, error: 'Enter the mobile money number you paid from' };
  }
  if (!momo_reference || !String(momo_reference).trim()) {
    return { ok: false, error: 'Enter your MoMo transaction ID / reference' };
  }
  const paid = Math.round((parseFloat(amount) || 0) * 100) / 100;
  if (paid < pricing.depositRequired - 0.01) {
    return { ok: false, error: `Deposit payment must be at least ₵${pricing.depositRequired.toFixed(2)} (80% of total)` };
  }
  return { ok: true, amount: paid };
}

module.exports = {
  ensureServicesSeeded,
  loadActiveServices,
  loadAllServices,
  getServiceById,
  calculateOrderPrice,
  calculateOrderPriceForService,
  buildPriceListSections,
  validateCustomerOrder,
  validateDepositPayment,
  serviceToDbPayload,
  rowToService,
};
