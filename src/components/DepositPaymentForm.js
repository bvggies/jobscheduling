import React, { useEffect, useState } from 'react';
import { FiDollarSign } from 'react-icons/fi';
import { SHOP_CONTACT, DEPOSIT_PERCENT } from '../utils/shopConfig';
import './DepositPaymentForm.css';

const EMPTY = { momo_phone: '', momo_reference: '', amount: '' };

export default function DepositPaymentForm({
  depositRequired,
  value,
  onChange,
  disabled = false,
  showInstructions = true,
}) {
  const [form, setForm] = useState(value || EMPTY);

  useEffect(() => {
    if (value) setForm(value);
  }, [value]);

  useEffect(() => {
    if (depositRequired > 0 && !form.amount) {
      const next = { ...form, amount: depositRequired.toFixed(2) };
      setForm(next);
      onChange?.(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositRequired]);

  const update = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    onChange?.(next);
  };

  const contact = SHOP_CONTACT;

  return (
    <div className="deposit-payment-form">
      {showInstructions ? (
        <div className="deposit-payment-instructions">
          <p>
            Send at least <strong>₵{parseFloat(depositRequired || 0).toFixed(2)}</strong> ({DEPOSIT_PERCENT * 100}% of
            total) to:
          </p>
          <ul>
            <li>
              MoMo: <strong>{contact.momo.number}</strong> — {contact.momo.name}
            </li>
            <li>WhatsApp: {contact.whatsapp}</li>
          </ul>
          <p className="form-hint">Then enter your payment details below. Your order is not complete until deposit is submitted.</p>
        </div>
      ) : null}

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Amount paid (GHS) *</label>
          <input
            type="number"
            step="0.01"
            min={depositRequired || 0}
            className="form-control"
            value={form.amount}
            disabled={disabled}
            onChange={(e) => update({ amount: e.target.value })}
            required
          />
          <small className="form-hint">Minimum ₵{parseFloat(depositRequired || 0).toFixed(2)}</small>
        </div>
        <div className="form-group">
          <label className="form-label">Your MoMo number *</label>
          <input
            type="tel"
            className="form-control"
            placeholder="e.g. 0542917636"
            value={form.momo_phone}
            disabled={disabled}
            onChange={(e) => update({ momo_phone: e.target.value })}
            required
          />
        </div>
        <div className="form-group grid-span-2">
          <label className="form-label">
            <FiDollarSign style={{ verticalAlign: 'middle' }} /> Transaction ID / reference *
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="MoMo transaction reference"
            value={form.momo_reference}
            disabled={disabled}
            onChange={(e) => update({ momo_reference: e.target.value })}
            required
          />
        </div>
      </div>
    </div>
  );
}

export function isDepositPaymentComplete(payment, depositRequired) {
  if (!payment) return false;
  const amount = parseFloat(payment.amount);
  const required = parseFloat(depositRequired);
  return (
    payment.momo_phone?.trim() &&
    payment.momo_reference?.trim() &&
    Number.isFinite(amount) &&
    amount >= required - 0.01
  );
}
