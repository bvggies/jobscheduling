/** Shop contact, hours, and deposit rules (keep in sync with src/utils/shopConfig.js). */

const DEPOSIT_PERCENT = 0.8;

const SHOP_CONTACT = {
  phones: ['0542917636', '0207924080'],
  whatsapp: '0542917636',
  momo: { number: '05429176360', name: 'Tetteh Henry' },
};

const BUSINESS_HOURS = {
  monday: { open: '07:30', close: '18:00' },
  tuesday: { open: '07:30', close: '18:00' },
  wednesday: { open: '07:30', close: '18:00' },
  thursday: { open: '07:30', close: '18:00' },
  friday: { open: '07:30', close: '19:00' },
  saturday: { open: '10:00', close: '18:00' },
  sunday: null,
  break: { start: '12:30', end: '13:00' },
  sameDayCutoff: '17:00',
};

function formatBusinessHoursSummary() {
  return [
    'Monday–Thursday: 7:30 AM – 6:00 PM',
    'Friday: 7:30 AM – 7:00 PM',
    'Saturday: 10:00 AM – 6:00 PM',
    'Break: Daily 12:30 PM – 1:00 PM',
    'Same-day printing: send work by 5:00 PM latest',
  ];
}

function calcDepositRequired(totalCost) {
  const total = parseFloat(totalCost) || 0;
  if (total <= 0) return 0;
  return Math.round(total * DEPOSIT_PERCENT * 100) / 100;
}

module.exports = {
  DEPOSIT_PERCENT,
  SHOP_CONTACT,
  BUSINESS_HOURS,
  formatBusinessHoursSummary,
  calcDepositRequired,
};
