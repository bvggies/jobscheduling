const shop = require('./shopConfig');
const store = require('./serviceStore');

async function validateCustomerOrder(db, payload) {
  return store.validateCustomerOrder(db, payload);
}

module.exports = {
  ...shop,
  validateCustomerOrder,
  validateDepositPayment: store.validateDepositPayment,
  loadActiveServices: (db) => store.loadActiveServices(db),
  calculateOrderPrice: (db, serviceId, variantId, quantity) =>
    store.calculateOrderPrice(db, serviceId, variantId, quantity),
  buildPriceListSections: store.buildPriceListSections,
};
