const catalog = require('./catalogData');
const shop = require('./shopConfig');

function validateCustomerOrder({ service_id, service_variant, quantity, total_cost, deposit_required }) {
  const pricing = catalog.calculateOrderPrice(service_id, service_variant, quantity);
  if (pricing.error) return { ok: false, error: pricing.error };

  if (pricing.quoteRequired) {
    if (parseFloat(total_cost) > 0 || parseFloat(deposit_required) > 0) {
      return { ok: false, error: 'Quote-required services cannot include a price until the shop confirms' };
    }
    return { ok: true, pricing, service: catalog.getServiceById(service_id) };
  }

  const expectedTotal = pricing.total;
  const expectedDeposit = pricing.depositRequired;
  const submittedTotal = Math.round((parseFloat(total_cost) || 0) * 100) / 100;
  const submittedDeposit = Math.round((parseFloat(deposit_required) || 0) * 100) / 100;

  if (Math.abs(submittedTotal - expectedTotal) > 0.01) {
    return { ok: false, error: 'Total price does not match the current price list' };
  }
  if (Math.abs(submittedDeposit - expectedDeposit) > 0.01) {
    return {
      ok: false,
      error: `Deposit must be at least ${shop.DEPOSIT_PERCENT * 100}% of the total (₵${expectedDeposit})`,
    };
  }

  return { ok: true, pricing, service: catalog.getServiceById(service_id) };
}

module.exports = {
  ...catalog,
  ...shop,
  validateCustomerOrder,
};
