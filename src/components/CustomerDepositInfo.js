import React from 'react';
import { SHOP_CONTACT, DEPOSIT_PERCENT } from '../../utils/shopConfig';

export default function CustomerDepositInfo({ job }) {
  const total = parseFloat(job.total_cost) || 0;
  const depositRequired = parseFloat(job.deposit_required) || 0;
  const depositReceived = parseFloat(job.deposit_received) || 0;
  const isQuotePending = total <= 0 && depositRequired <= 0;

  if (isQuotePending) {
    return (
      <div className="customer-deposit-panel customer-deposit-panel--quote">
        <h3>Price pending</h3>
        <p>The shop will confirm your quote. You will be notified when it is time to pay your deposit.</p>
      </div>
    );
  }

  const depositMet = job.deposit_status === 'Received' || depositReceived >= depositRequired;

  return (
    <div className={`customer-deposit-panel ${depositMet ? 'customer-deposit-panel--paid' : ''}`}>
      <h3>Payment & deposit</h3>
      <div className="customer-deposit-grid">
        <div>
          <span className="customer-deposit-label">Total</span>
          <strong>₵{total.toFixed(2)}</strong>
        </div>
        <div>
          <span className="customer-deposit-label">Deposit ({DEPOSIT_PERCENT * 100}% min.)</span>
          <strong>₵{depositRequired.toFixed(2)}</strong>
        </div>
        <div>
          <span className="customer-deposit-label">Deposit status</span>
          <strong>{job.deposit_status || 'Pending'}</strong>
        </div>
      </div>
      {!depositMet ? (
        <div className="customer-deposit-instructions">
          <p>
            Pay at least <strong>₵{depositRequired.toFixed(2)}</strong> before work can start:
          </p>
          <ul>
            <li>
              MoMo: <strong>{SHOP_CONTACT.momo.number}</strong> — {SHOP_CONTACT.momo.name}
            </li>
            <li>
              WhatsApp: <strong>{SHOP_CONTACT.whatsapp}</strong>
            </li>
            <li>
              Call: {SHOP_CONTACT.phones.join(' / ')}
            </li>
          </ul>
          <p className="form-hint">Reference your PO number when paying. The shop confirms deposits in the system.</p>
        </div>
      ) : (
        <p className="customer-deposit-confirmed">Deposit confirmed — your job is queued for production.</p>
      )}
    </div>
  );
}
