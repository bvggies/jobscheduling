import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSave, FiX, FiDollarSign, FiCalendar, FiInfo, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { jobsAPI, scheduleAPI, formatApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import { calculateOrderPriceForService } from '../utils/servicePricing';
import { DEPOSIT_PERCENT } from '../utils/shopConfig';
import ShopInfoPanel from './ShopInfoPanel';
import DepositPaymentForm, { isDepositPaymentComplete } from './DepositPaymentForm';
import '../pages/JobForm.css';
import './ServiceOrderForm.css';

const STEPS = ['Service', 'Deposit', 'Slot', 'Review'];

export default function ServiceOrderForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { services, loading: catalogLoading } = useServiceCatalog();

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [depositPayment, setDepositPayment] = useState(null);
  const [slotKey, setSlotKey] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const service = useMemo(() => services.find((s) => s.id === serviceId) || null, [services, serviceId]);

  const pricing = useMemo(() => {
    if (!service) return null;
    return calculateOrderPriceForService(service, variantId, quantity);
  }, [service, variantId, quantity]);

  const isQuote = pricing?.quoteRequired;

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const { data } = await scheduleAPI.getAvailableSlots({ days: 14 });
      setSlots(data || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2 || step === 3) loadSlots();
  }, [step, loadSlots]);

  useEffect(() => {
    setVariantId('');
    setQuantity('1');
    setDepositPayment(null);
  }, [serviceId]);

  const selectedSlot = useMemo(() => {
    if (!slotKey) return null;
    return slots.find((s) => `${s.date}|${s.time}` === slotKey) || null;
  }, [slotKey, slots]);

  const needsVariant = service?.pricingType === 'fixed-size';
  const visibleSteps = isQuote ? ['Service', 'Slot', 'Review'] : STEPS;

  const canProceedStep0 =
    serviceId &&
    (!needsVariant || variantId) &&
    pricing &&
    !pricing.error &&
    (isQuote || pricing.total > 0);

  const canProceedStep1 =
    isQuote || isDepositPaymentComplete(depositPayment, pricing?.depositRequired);

  const canProceedStep2 = !!selectedSlot;

  const handleNext = () => {
    if (step === 0 && !canProceedStep0) return;
    if (step === 1 && !isQuote && !canProceedStep1) {
      alert('Complete your MoMo deposit details before continuing.');
      return;
    }
    if (step === 2 && !canProceedStep2) return;
    if (isQuote && step === 0) setStep(2);
    else setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    if (isQuote && step === 2) setStep(0);
    else setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!canProceedStep0 || !canProceedStep2 || (!isQuote && !canProceedStep1) || !pricing) return;

    setSubmitting(true);
    try {
      await jobsAPI.create({
        service_id: serviceId,
        service_variant: variantId || null,
        quantity: parseInt(quantity, 10),
        due_date: selectedSlot.date,
        due_time: selectedSlot.time,
        total_cost: isQuote ? 0 : pricing.total,
        deposit_required: isQuote ? 0 : pricing.depositRequired,
        deposit_payment: isQuote ? undefined : depositPayment,
      });
      navigate('/portal/jobs');
    } catch (err) {
      alert(formatApiError(err, 'Could not submit your order'));
      await loadSlots();
    } finally {
      setSubmitting(false);
    }
  };

  const quantityLabel =
    service?.unitLabel ||
    (service?.pricingType === 'fixed-size' ? 'Quantity' : service?.pricingType === 'tiered-yard' ? 'Yards' : 'Quantity');

  if (catalogLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <motion.div className="job-form-page service-order-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1>Order a service</h1>
          <p>Select → see price → pay deposit → book slot → submit</p>
        </div>
        <div className="service-order-header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowInfo((v) => !v)}>
            <FiInfo /> {showInfo ? 'Hide' : 'Price list & info'}
          </button>
          <button type="button" onClick={() => navigate('/portal/jobs')} className="btn btn-outline">
            <FiX /> Cancel
          </button>
        </div>
      </div>

      <div className="service-order-steps">
        {visibleSteps.map((label, idx) => (
          <span key={label} className={`service-step-pill ${idx === (isQuote && step >= 2 ? step - 1 : step) ? 'active' : ''}`}>
            {idx + 1}. {label}
          </span>
        ))}
      </div>

      {showInfo ? (
        <div className="service-order-info-wrap">
          <ShopInfoPanel />
        </div>
      ) : null}

      <div className="job-form service-order-form">
        {step === 0 ? (
          <div className="form-section">
            <h2>1. Choose your service</h2>
            <div className="grid grid-2">
              <div className="form-group grid-span-2">
                <label className="form-label">Service *</label>
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="form-control" required>
                  <option value="">Select a service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {needsVariant ? (
                <div className="form-group grid-span-2">
                  <label className="form-label">Size / option *</label>
                  <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="form-control" required>
                    <option value="">Select size or option</option>
                    {service.sizes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — ₵{parseFloat(s.unitPrice).toFixed(2)} each
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {service && !isQuote ? (
                <div className="form-group">
                  <label className="form-label">{quantityLabel} *</label>
                  <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="form-control" required />
                </div>
              ) : null}
              <div className="form-group">
                <label className="form-label">Customer</label>
                <input type="text" value={user?.name || ''} className="form-control" disabled />
              </div>
            </div>
            {service && pricing ? (
              <div className="service-pricing-section" style={{ marginTop: '1rem' }}>
                {isQuote ? (
                  <div className="service-quote-notice">
                    <p>{service.quoteNote}</p>
                    <p className="form-hint">You will book a slot now. The shop will send a quote before you pay a deposit.</p>
                  </div>
                ) : pricing.error ? (
                  <p className="text-danger">{pricing.error}</p>
                ) : (
                  <div className="service-price-summary">
                    <div className="service-price-row"><span>Unit price</span><strong>₵{pricing.unitPrice.toFixed(2)}</strong></div>
                    <div className="service-price-row"><span>Total</span><strong className="service-price-total">₵{pricing.total.toFixed(2)}</strong></div>
                    <div className="service-price-row service-price-deposit">
                      <span>Deposit ({DEPOSIT_PERCENT * 100}%)</span><strong>₵{pricing.depositRequired.toFixed(2)}</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 && !isQuote ? (
          <div className="form-section">
            <h2><FiDollarSign /> 2. Pay your deposit (MoMo)</h2>
            <DepositPaymentForm
              depositRequired={pricing?.depositRequired}
              value={depositPayment}
              onChange={setDepositPayment}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-section">
            <h2><FiCalendar /> {isQuote ? '2' : '3'}. Book an appointment slot</h2>
            <p className="form-hint">Last slot ends by 5:00 PM. Manual date entry is not allowed.</p>
            {loadingSlots ? (
              <div className="loading-inline"><div className="spinner" /> Loading slots…</div>
            ) : slots.length === 0 ? (
              <p className="text-danger">No slots available. Contact the shop.</p>
            ) : (
              <div className="form-group">
                <label className="form-label">Available slot *</label>
                <select value={slotKey} onChange={(e) => setSlotKey(e.target.value)} className="form-control" required>
                  <option value="">Select date and time</option>
                  {slots.map((s) => (
                    <option key={`${s.date}|${s.time}`} value={`${s.date}|${s.time}`}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-section">
            <h2>{isQuote ? '3' : '4'}. Review & submit</h2>
            <ul className="service-review-list">
              <li><strong>Service:</strong> {service?.name}</li>
              {pricing?.variantLabel ? <li><strong>Option:</strong> {pricing.variantLabel}</li> : null}
              {!isQuote ? <li><strong>Total:</strong> ₵{pricing.total.toFixed(2)}</li> : null}
              {!isQuote ? <li><strong>Deposit submitted:</strong> ₵{depositPayment?.amount} (ref: {depositPayment?.momo_reference})</li> : null}
              <li><strong>Appointment:</strong> {selectedSlot?.label}</li>
            </ul>
          </div>
        ) : null}

        <div className="form-actions service-order-actions">
          {step > 0 ? (
            <button type="button" className="btn btn-outline" onClick={handleBack}>
              <FiArrowLeft /> Back
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={
                (step === 0 && !canProceedStep0) ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
            >
              Next <FiArrowRight />
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              <FiSave /> {submitting ? 'Submitting…' : 'Submit order'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
