import React, { useState } from 'react';
import { jobsAPI, formatApiError } from '../services/api';
import { SHOP_CONTACT, DEPOSIT_PERCENT } from '../utils/shopConfig';
import DepositPaymentForm, { isDepositPaymentComplete } from './DepositPaymentForm';

export default function CustomerDepositInfo({ job, onUpdate }) {
  const total = parseFloat(job.total_cost) || 0;
  const depositRequired = parseFloat(job.deposit_required) || 0;
  const depositReceived = parseFloat(job.deposit_received) || 0;
  const isQuotePending = total <= 0 && depositRequired <= 0;
  const verification = job.deposit_verification_status || 'none';

  const [payment, setPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isQuotePending) {
    return (
      <div className="customer-deposit-panel customer-deposit-panel--quote">
        <h3>Price pending</h3>
        <p>The shop will confirm your quote. You will be able to pay your deposit here once pricing is set.</p>
      </div>
    );
  }

  const depositMet = job.deposit_status === 'Received' || depositReceived >= depositRequired;

  if (depositMet) {
    return (
      <div className="customer-deposit-panel customer-deposit-panel--paid">
        <h3>Deposit confirmed</h3>
        <p className="customer-deposit-confirmed">Your deposit of ₵{depositReceived.toFixed(2)} is confirmed. Work will start once the shop marks your job Ready.</p>
      </div>
    );
  }

  if (verification === 'pending') {
    return (
      <div className="customer-deposit-panel">
        <h3>Deposit pending verification</h3>
        <p>
          MoMo payment of <strong>₵{parseFloat(job.deposit_submitted_amount || 0).toFixed(2)}</strong> submitted
          (ref: {job.deposit_momo_reference}). The shop is confirming your payment.
        </p>
      </div>
    );
  }

  if (verification === 'rejected') {
    return (
      <div className="customer-deposit-panel customer-deposit-panel--quote">
        <h3>Deposit rejected</h3>
        <p>Your previous MoMo payment could not be verified. Please pay again below.</p>
        <DepositPaymentForm depositRequired={depositRequired} value={payment} onChange={setPayment} />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginTop: '0.75rem' }}
          disabled={submitting || !isDepositPaymentComplete(payment, depositRequired)}
          onClick={async () => {
            setSubmitting(true);
            try {
              await jobsAPI.submitDeposit(job.id, payment);
              onUpdate?.();
            } catch (e) {
              alert(formatApiError(e, 'Could not submit deposit'));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? 'Submitting…' : 'Resubmit deposit payment'}
        </button>
      </div>
    );
  }

  const handleSubmitDeposit = async () => {
    if (!isDepositPaymentComplete(payment, depositRequired)) return;
    setSubmitting(true);
    try {
      await jobsAPI.submitDeposit(job.id, payment);
      onUpdate?.();
    } catch (e) {
      alert(formatApiError(e, 'Could not submit deposit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="customer-deposit-panel">
      <h3>Pay your deposit ({DEPOSIT_PERCENT * 100}% = ₵{depositRequired.toFixed(2)})</h3>
      <div className="customer-deposit-grid">
        <div><span className="customer-deposit-label">Total</span><strong>₵{total.toFixed(2)}</strong></div>
        <div><span className="customer-deposit-label">PO number</span><strong>{job.po_number || '—'}</strong></div>
      </div>
      <DepositPaymentForm depositRequired={depositRequired} value={payment} onChange={setPayment} />
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: '0.75rem' }}
        disabled={submitting || !isDepositPaymentComplete(payment, depositRequired)}
        onClick={handleSubmitDeposit}
      >
        {submitting ? 'Submitting…' : 'Submit MoMo deposit'}
      </button>
      <p className="form-hint" style={{ marginTop: '0.5rem' }}>
        Pay to MoMo {SHOP_CONTACT.momo.number} ({SHOP_CONTACT.momo.name}) then submit your reference above.
      </p>
    </div>
  );
}
