import React from 'react';
import {
  SHOP_CONTACT,
  DEPOSIT_PERCENT,
  formatBusinessHoursSummary,
} from '../utils/shopConfig';
import { buildPriceListSections } from '../utils/serviceCatalog';
import './ShopInfoPanel.css';

export default function ShopInfoPanel({ showPriceList = true, compact = false }) {
  const priceSections = buildPriceListSections();

  return (
    <div className={`shop-info-panel ${compact ? 'shop-info-panel--compact' : ''}`}>
      <section className="shop-info-section">
        <h2>How the system works</h2>
        <ol className="shop-info-steps">
          <li>
            <strong>Pick a service & see price instantly</strong> — Select any service from our price list. The
            system shows the unit price and calculates your total from size and quantity.
          </li>
          <li>
            <strong>Pay deposit before work starts</strong> — After your total is shown, pay a deposit of at least{' '}
            {DEPOSIT_PERCENT * 100}%. Work begins only after the shop confirms your deposit.
          </li>
          <li>
            <strong>Book available time slots only</strong> — Choose from system-generated appointment dates and
            times. Manual date entry is not allowed.
          </li>
          <li>
            <strong>Same flow for every service</strong> — Select → unit price → total → pay deposit → book your
            slot.
          </li>
        </ol>
      </section>

      {showPriceList ? (
        <section className="shop-info-section">
          <h2>Price list (GHS)</h2>
          <div className="shop-price-grid">
            {priceSections.map((section) => (
              <div key={section.name} className="shop-price-card">
                <h3>{section.name}</h3>
                <ul>
                  {section.items.map((item) => (
                    <li key={`${section.name}-${item.label}`}>
                      <span>{item.label}</span>
                      <strong>{item.price}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shop-info-section shop-info-hours-contact">
        <div>
          <h2>Working days & hours</h2>
          <ul className="shop-info-list">
            {formatBusinessHoursSummary().map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul className="shop-info-list shop-info-contact">
            <li>
              Call:{' '}
              {SHOP_CONTACT.phones.map((p, i) => (
                <span key={p}>
                  {i > 0 ? ' / ' : ''}
                  <a href={`tel:${p}`}>{p}</a>
                </span>
              ))}
            </li>
            <li>
              WhatsApp: <a href={`https://wa.me/233${SHOP_CONTACT.whatsapp.replace(/^0/, '')}`}>{SHOP_CONTACT.whatsapp}</a>
            </li>
            <li>
              MoMo: {SHOP_CONTACT.momo.number} — {SHOP_CONTACT.momo.name}
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
