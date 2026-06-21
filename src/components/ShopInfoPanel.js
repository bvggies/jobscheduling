import React from 'react';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import { SHOP_CONTACT, DEPOSIT_PERCENT, formatBusinessHoursSummary } from '../utils/shopConfig';
import './ShopInfoPanel.css';

export default function ShopInfoPanel({ showPriceList = true, compact = false }) {
  const { priceList, hoursSummary, loading } = useServiceCatalog();
  const sections = priceList.length ? priceList : [];
  const hours = hoursSummary.length ? hoursSummary : formatBusinessHoursSummary();

  if (loading && !sections.length) {
    return <div className="shop-info-panel"><p>Loading shop info…</p></div>;
  }

  return (
    <div className={`shop-info-panel ${compact ? 'shop-info-panel--compact' : ''}`}>
      <section className="shop-info-section">
        <h2>How the system works</h2>
        <ol className="shop-info-steps">
          <li><strong>Pick a service & see price instantly</strong> — Unit price and total from size/quantity.</li>
          <li><strong>Pay deposit before booking</strong> — Pay at least {DEPOSIT_PERCENT * 100}% via MoMo, then book your slot.</li>
          <li><strong>Book available slots only</strong> — System-generated times; last slot by 5:00 PM.</li>
          <li><strong>Work starts after confirmation</strong> — The shop verifies your MoMo payment before production.</li>
        </ol>
      </section>

      {showPriceList ? (
        <section className="shop-info-section">
          <h2>Price list (GHS)</h2>
          <div className="shop-price-grid">
            {sections.map((section) => (
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
            {hours.map((line) => (
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
