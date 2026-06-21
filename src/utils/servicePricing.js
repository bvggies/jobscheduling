import { calcDepositRequired } from './shopConfig';

export function tierUnitPrice(service, quantity) {
  const qty = parseInt(quantity, 10) || 0;
  for (const tier of service.tiers || []) {
    const max = tier.max == null ? Infinity : tier.max;
    if (qty >= tier.min && qty <= max) return tier.unitPrice;
  }
  return null;
}

export function calculateOrderPriceForService(service, variantId, quantity) {
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

export function buildPriceListSectionsFromServices(services) {
  return (services || []).map((service) => {
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
