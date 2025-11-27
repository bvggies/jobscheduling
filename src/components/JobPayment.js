import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { jobsAPI } from '../services/api';
import { FiDollarSign, FiCheck, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import './JobPayment.css';

const JobPayment = ({ job, onUpdate }) => {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const balanceDue = (job.total_cost || 0) - (job.deposit_received || 0);

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
          <h4>Deposit</h4>
          <div className="payment-info">
            <div className="payment-row">
              <span>Required:</span>
              <strong>${(job.deposit_required || 0).toFixed(2)}</strong>
            </div>
            <div className="payment-row">
              <span>Received:</span>
              <strong>${(job.deposit_received || 0).toFixed(2)}</strong>
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
            {job.deposit_status !== 'Received' && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="btn btn-primary btn-sm mt-2"
              >
                Record Deposit
              </button>
            )}
          </div>
        </div>

        <div className="payment-section">
          <h4>Final Payment</h4>
          <div className="payment-info">
            <div className="payment-row">
              <span>Total Cost:</span>
              <strong>${(job.total_cost || 0).toFixed(2)}</strong>
            </div>
            <div className="payment-row">
              <span>Balance Due:</span>
              <strong className={balanceDue > 0 ? 'text-danger' : ''}>
                ${balanceDue.toFixed(2)}
              </strong>
            </div>
            <div className="payment-row">
              <span>Received:</span>
              <strong>${(job.final_payment_received || 0).toFixed(2)}</strong>
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
                <small className="form-help-text">Balance due: ${balanceDue.toFixed(2)}</small>
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

