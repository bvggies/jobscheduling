import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { jobsAPI } from '../services/api';
import { FiDollarSign, FiCheck, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import { DEPOSIT_PERCENT } from '../utils/shopConfig';
import './JobPayment.css';

const JobPayment = ({ job, onUpdate }) => {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [quoteTotal, setQuoteTotal] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const balanceDue = (job.total_cost || 0) - (job.deposit_received || 0);
  const momoPending = job.deposit_verification_status === 'pending';
  const needsQuote = parseFloat(job.total_cost || 0) <= 0 && job.service_id;

  const handleVerifyDeposit = async (action) => {
    setVerifyLoading(true);
    try {
      await jobsAPI.verifyDeposit(job.id, action);
      if (onUpdate) await onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to verify deposit');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSetQuote = async () => {
    const total = parseFloat(quoteTotal);
    if (!Number.isFinite(total) || total <= 0) {
      alert('Enter a valid quote total');
      return;
    }
    setLoading(true);
    try {
      await jobsAPI.setQuote(job.id, { total_cost: total });
      if (onUpdate) await onUpdate();
      setQuoteTotal('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to set quote');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (type) => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await jobsAPI.updatePayment(job.id, type, paymentData.amount, paymentData.date);
      if (onUpdate) {
        await onUpdate();
      }
      setShowDepositModal(false);
      setShowFinalModal(false);
      setPaymentData({ amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = () => {
    if (job.payment_status === 'Paid') return { icon: '🟢', text: 'Fully Paid', color: 'success' };
    if (job.deposit_status === 'Received') return { icon: '✅', text: 'Deposit Received', color: 'info' };
    return { icon: '💰', text: 'Deposit Pending', color: 'warning' };
  };

  const status = getPaymentStatus();

  return (
    <div className="job-payment">
      <div className="payment-header">
        <h3>
          <FiDollarSign /> Payment Status
        </h3>
        <span className={`payment-badge badge-${status.color}`}>
          {status.icon} {status.text}
        </span>
      </div>

      <div className="payment-details">
        <div className="payment-section">
          <h4>Deposit ({DEPOSIT_PERCENT * 100}% minimum before work starts)</h4>
          <div className="payment-info">
            <div className="payment-row">
              <span>Required:</span>
              <strong>₵{parseFloat(job.deposit_required || 0).toFixed(2)}</strong>
            </div>
            <div className="payment-row">
              <span>Received:</span>
              <strong>₵{parseFloat(job.deposit_received || 0).toFixed(2)}</strong>
            </div>
            {job.deposit_date && (
              <div className="payment-row">
                <span>Date:</span>
                <span>{format(new Date(job.deposit_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
            <div className="payment-row">
              <span>Status:</span>
              <span className={`badge badge-${job.deposit_status === 'Received' ? 'success' : 'warning'}`}>
                {job.deposit_status || 'Pending'}
              </span>
            </div>
            {momoPending ? (
              <div className="momo-verification-box">
                <p><strong>MoMo deposit awaiting verification</strong></p>
                <div className="payment-row"><span>Submitted:</span><strong>₵{parseFloat(job.deposit_submitted_amount || 0).toFixed(2)}</strong></div>
                <div className="payment-row"><span>From:</span><span>{job.deposit_momo_phone}</span></div>
                <div className="payment-row"><span>Reference:</span><span>{job.deposit_momo_reference}</span></div>
                <div className="momo-verification-actions">
                  <button type="button" className="btn btn-primary btn-sm" disabled={verifyLoading} onClick={() => handleVerifyDeposit('confirm')}>
                    Confirm MoMo deposit
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={verifyLoading} onClick={() => handleVerifyDeposit('reject')}>
                    Reject
                  </button>
                </div>
              </div>
            ) : null}
            {job.deposit_status !== 'Received' && !momoPending && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="btn btn-primary btn-sm mt-2"
              >
                Record Deposit
              </button>
            )}
          </div>
        </div>

        {needsQuote ? (
          <div className="payment-section">
            <h4>Set quote pricing</h4>
            <p className="form-hint">Customer submitted a price-on-request service. Set total (80% deposit auto-calculated).</p>
            <div className="form-group">
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Total cost (GHS)"
                value={quoteTotal}
                onChange={(e) => setQuoteTotal(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={loading} onClick={handleSetQuote}>
              Save quote & notify customer
            </button>
          </div>
        ) : null}

        <div className="payment-section">
          <h4>Final Payment</h4>
          <div className="payment-info">
            <div className="payment-row">
              <span>Total Cost:</span>
              <strong>₵{parseFloat(job.total_cost || 0).toFixed(2)}</strong>
            </div>
            <div className="payment-row">
              <span>Balance Due:</span>
              <strong className={balanceDue > 0 ? 'text-danger' : ''}>
                ₵{balanceDue.toFixed(2)}
              </strong>
            </div>
            <div className="payment-row">
              <span>Received:</span>
              <strong>₵{parseFloat(job.final_payment_received || 0).toFixed(2)}</strong>
            </div>
            {job.final_payment_date && (
              <div className="payment-row">
                <span>Date:</span>
                <span>{format(new Date(job.final_payment_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
            <div className="payment-row">
              <span>Status:</span>
              <span className={`badge badge-${job.payment_status === 'Paid' ? 'success' : 'warning'}`}>
                {job.payment_status || 'Pending'}
              </span>
            </div>
            {job.payment_status !== 'Paid' && balanceDue > 0 && (
              <button
                onClick={() => setShowFinalModal(true)}
                className="btn btn-primary btn-sm mt-2"
              >
                Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Record Deposit Payment</h3>
              <button onClick={() => setShowDepositModal(false)} className="modal-close">
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={job.deposit_required || 0}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="form-control"
                  placeholder="Enter amount"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDepositModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayment('deposit')}
                className="btn btn-primary"
                disabled={loading}
              >
                <FiCheck /> {loading ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Final Payment Modal */}
      {showFinalModal && (
        <div className="modal-overlay" onClick={() => setShowFinalModal(false)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Record Final Payment</h3>
              <button onClick={() => setShowFinalModal(false)} className="modal-close">
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={balanceDue}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="form-control"
                  placeholder="Enter amount"
                />
                <small className="form-help-text">Balance due: ₵{balanceDue.toFixed(2)}</small>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowFinalModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayment('final')}
                className="btn btn-primary"
                disabled={loading}
              >
                <FiCheck /> {loading ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default JobPayment;

