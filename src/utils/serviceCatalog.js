import { calcDepositRequired } from './shopConfig';

/**
 * Service catalog and pricing rules.
 * Keep in sync with server/utils/catalogData.js
 */
export const SERVICES = [
  {
    id: 'dtf-printing',
    name: 'DTF Printing',
    pricingType: 'fixed-size',
    requiresAppointment: true,
    sizes: [
      { id: 'a4', label: 'A4', unitPrice: 5.0 },
      { id: 'a3', label: 'A3', unitPrice: 10 },
      { id: 'a2', label: 'A2', unitPrice: 20 },
    ],
  },
  {
    id: 'banner-printing',
    name: 'Banner Printing',
    pricingType: 'fixed-size',
    requiresAppointment: true,
    sizes: [
      { id: '3x4', label: '3ft x 4ft', unitPrice: 180 },
      { id: '4x4', label: '4ft x 4ft', unitPrice: 200 },
      { id: '5x4', label: '5ft x 4ft', unitPrice: 230 },
      { id: '6x4', label: '6ft x 4ft', unitPrice: 250 },
      { id: '8x4', label: '8ft x 4ft', unitPrice: 300 },
      { id: '8x8', label: '8ft x 8ft', unitPrice: 350 },
    ],
  },
  {
    id: 'sticker-printing',
    name: 'Sticker Printing',
    pricingType: 'fixed-size',
    requiresAppointment: true,
    sizes: [
      { id: 'a4', label: 'A4', unitPrice: 5 },
      { id: 'a3', label: 'A3', unitPrice: 10 },
      { id: 'a2', label: 'A2', unitPrice: 15 },
      { id: '4out', label: '4out', unitPrice: 20 },
    ],
  },
  {
    id: 'sqft-sticker',
    name: 'Square Foot — Sticker',
    pricingType: 'per-unit',
    unitLabel: 'sq ft',
    unitPrice: 3.0,
    requiresAppointment: true,
  },
  {
    id: 'sqft-banner',
    name: 'Square Foot — Banner',
    pricingType: 'per-unit',
    unitLabel: 'sq ft',
    unitPrice: 3.5,
    requiresAppointment: true,
  },
  {
    id: 'sqft-one-way-vision',
    name: 'Square Foot — One-way Vision',
    pricingType: 'per-unit',
    unitLabel: 'sq ft',
    unitPrice: 6.0,
    requiresAppointment: true,
  },
  {
    id: 'sqft-reflective-sticker',
    name: 'Square Foot — Reflective Sticker',
    pricingType: 'per-unit',
    unitLabel: 'sq ft',
    unitPrice: 8.0,
    requiresAppointment: true,
  },
  {
    id: 'cloth-printing',
    name: 'Material — Cloth Printing',
    pricingType: 'tiered-yard',
    unitLabel: 'yards',
    requiresAppointment: true,
    tiers: [
      { min: 1, max: 49, unitPrice: 45 },
      { min: 50, max: 99, unitPrice: 43 },
      { min: 100, max: null, unitPrice: 40 },
    ],
  },
  {
    id: 'digital-flag',
    name: 'Digital Flag Printing',
    pricingType: 'quote-required',
    quoteNote: 'Available now. Price on request.',
    requiresAppointment: true,
  },
  {
    id: 'wooden-frame',
    name: 'Wooden Frame — Complete',
    pricingType: 'fixed-size',
    requiresAppointment: true,
    sizes: [
      { id: '15x19', label: '15" x 19"', unitPrice: 200 },
      { id: '12x16', label: '12" x 16"', unitPrice: 160 },
      { id: '19x23', label: '19" x 23"', unitPrice: 300 },
      { id: '20x30', label: '20" x 30"', unitPrice: 450 },
      { id: '24x36', label: '24" x 36"', unitPrice: 600 },
    ],
  },
  {
    id: 'signage-3d',
    name: 'Signage / 3D Signboard',
    pricingType: 'quote-required',
    quoteNote: 'Price depends on size and letters. Contact us for a quote.',
    requiresAppointment: true,
  },
  {
    id: 'tshirt-printing',
    name: 'T-Shirt Printing',
    pricingType: 'fixed-size',
    requiresAppointment: true,
    sizes: [
      { id: 'lacoste', label: 'Lacoste', unitPrice: 70 },
      { id: 'cotton', label: 'Cotton round neck', unitPrice: 60 },
      { id: 'silk', label: 'Silk round neck', unitPrice: 55 },
      { id: 'jersey', label: 'Jersey round neck', unitPrice: 50 },
    ],
  },
];

export const SERVICE_NAMES = SERVICES.map((s) => s.name);

export function getServiceById(serviceId) {
  return SERVICES.find((s) => s.id === serviceId) || null;
}

export function getServiceByName(name) {
  return SERVICES.find((s) => s.name === name) || null;
}

function tierUnitPrice(service, quantity) {
  const qty = parseInt(quantity, 10) || 0;
  for (const tier of service.tiers) {
    const max = tier.max == null ? Infinity : tier.max;
    if (qty >= tier.min && qty <= max) return tier.unitPrice;
  }
  return null;
}

/**
 * @returns {{ unitPrice: number|null, total: number|null, depositRequired: number|null, quoteRequired: boolean, variantLabel: string|null, error?: string }}
 */
export function calculateOrderPrice(serviceId, variantId, quantity) {
  const service = getServiceById(serviceId);
  if (!service) return { error: 'Unknown service', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };

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
    const size = service.sizes?.find((s) => s.id === variantId);
    if (!size) return { error: 'Select a size', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
    const total = Math.round(size.unitPrice * qty * 100) / 100;
    return {
      unitPrice: size.unitPrice,
      total,
      depositRequired: calcDepositRequired(total),
      quoteRequired: false,
      variantLabel: size.label,
    };
  }

  if (service.pricingType === 'per-unit') {
    const total = Math.round(service.unitPrice * qty * 100) / 100;
    return {
      unitPrice: service.unitPrice,
      total,
      depositRequired: calcDepositRequired(total),
      quoteRequired: false,
      variantLabel: service.unitLabel || 'unit',
    };
  }

  if (service.pricingType === 'tiered-yard') {
    const unitPrice = tierUnitPrice(service, qty);
    if (unitPrice == null) return { error: 'Invalid quantity for pricing tier', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
    const total = Math.round(unitPrice * qty * 100) / 100;
    return {
      unitPrice,
      total,
      depositRequired: calcDepositRequired(total),
      quoteRequired: false,
      variantLabel: `${qty} ${service.unitLabel}`,
    };
  }

  return { error: 'Unsupported pricing type', unitPrice: null, total: null, depositRequired: null, quoteRequired: false, variantLabel: null };
}

export function buildPriceListSections() {
  return SERVICES.map((service) => {
    if (service.pricingType === 'fixed-size') {
      return {
        name: service.name,
        items: service.sizes.map((s) => ({ label: s.label, price: `₵${s.unitPrice.toFixed(2)}` })),
      };
    }
    if (service.pricingType === 'per-unit') {
      return {
        name: service.name,
        items: [{ label: service.unitLabel, price: `₵${service.unitPrice.toFixed(2)}/${service.unitLabel}` }],
      };
    }
    if (service.pricingType === 'tiered-yard') {
      return {
        name: service.name,
        items: [
          { label: '1–49 yards', price: '₵45/yard' },
          { label: '50–100 yards', price: '₵43/yard' },
          { label: '100+ yards', price: '₵40/yard' },
        ],
      };
    }
    return {
      name: service.name,
      items: [{ label: service.quoteNote || 'Price on request', price: '—' }],
    };
  });
}
