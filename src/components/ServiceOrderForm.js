import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSave, FiX, FiDollarSign, FiCalendar, FiInfo } from 'react-icons/fi';
import { jobsAPI, scheduleAPI, formatApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SERVICES, calculateOrderPrice } from '../utils/serviceCatalog';
import { DEPOSIT_PERCENT, SHOP_CONTACT } from '../utils/shopConfig';
import ShopInfoPanel from './ShopInfoPanel';
import '../pages/JobForm.css';
import './ServiceOrderForm.css';

export default function ServiceOrderForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [serviceId, setServiceId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [slotKey, setSlotKey] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const service = useMemo(() => SERVICES.find((s) => s.id === serviceId) || null, [serviceId]);

  const pricing = useMemo(() => {
    if (!serviceId) return null;
    return calculateOrderPrice(serviceId, variantId, quantity);
  }, [serviceId, variantId, quantity]);

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
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    setVariantId('');
    setQuantity('1');
  }, [serviceId]);

  const selectedSlot = useMemo(() => {
    if (!slotKey) return null;
    return slots.find((s) => `${s.date}|${s.time}` === slotKey) || null;
  }, [slotKey, slots]);

  const needsVariant = service?.pricingType === 'fixed-size';
  const variantMissing = needsVariant && !variantId;
  const canSubmit =
    serviceId &&
    !variantMissing &&
    pricing &&
    !pricing.error &&
    selectedSlot &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !pricing) return;

    setSubmitting(true);
    try {
      await jobsAPI.create({
        service_id: serviceId,
        service_variant: variantId || null,
        quantity: parseInt(quantity, 10),
        due_date: selectedSlot.date,
        due_time: selectedSlot.time,
        total_cost: pricing.quoteRequired ? 0 : pricing.total,
        deposit_required: pricing.quoteRequired ? 0 : pricing.depositRequired,
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

  return (
    <motion.div
      className="job-form-page service-order-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="page-header">
        <div>
          <h1>Order a service</h1>
          <p>Select a service, see your price, pay deposit, and book an appointment slot.</p>
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

      {showInfo ? (
        <div className="service-order-info-wrap">
          <ShopInfoPanel />
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="job-form service-order-form">
        <div className="form-section">
          <h2>1. Choose your service</h2>
          <div className="grid grid-2">
            <div className="form-group grid-span-2">
              <label className="form-label">Service *</label>
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setSlotKey('');
                }}
                className="form-control"
                required
              >
                <option value="">Select a service</option>
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {needsVariant ? (
              <div className="form-group grid-span-2">
                <label className="form-label">Size / option *</label>
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">Select size or option</option>
                  {service.sizes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — ₵{s.unitPrice.toFixed(2)} each
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {service && service.pricingType !== 'quote-required' ? (
              <div className="form-group">
                <label className="form-label">{quantityLabel} *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="form-control"
                  required
                />
                {service.pricingType === 'tiered-yard' ? (
                  <small className="form-hint">1–49 yards @ ₵45, 50–100 @ ₵43, 100+ @ ₵40 per yard</small>
                ) : null}
                {service.pricingType === 'per-unit' ? (
                  <small className="form-hint">Enter total {service.unitLabel}</small>
                ) : null}
              </div>
            ) : null}

            <div className="form-group">
              <label className="form-label">Customer</label>
              <input type="text" value={user?.name || ''} className="form-control" disabled />
            </div>
          </div>
        </div>

        {service ? (
          <div className="form-section service-pricing-section">
            <h2>
              <FiDollarSign /> 2. Your price
            </h2>
            {pricing?.quoteRequired ? (
              <div className="service-quote-notice">
                <p>{service.quoteNote || 'Price on request.'}</p>
                <p className="form-hint">
                  Submit your request and appointment slot. The shop will confirm pricing before you pay a deposit.
                </p>
              </div>
            ) : pricing?.error ? (
              <p className="text-danger">{pricing.error}</p>
            ) : (
              <div className="service-price-summary">
                <div className="service-price-row">
                  <span>Unit price</span>
                  <strong>₵{pricing.unitPrice.toFixed(2)}</strong>
                </div>
                <div className="service-price-row">
                  <span>Total</span>
                  <strong className="service-price-total">₵{pricing.total.toFixed(2)}</strong>
                </div>
                <div className="service-price-row service-price-deposit">
                  <span>Deposit required ({DEPOSIT_PERCENT * 100}% minimum)</span>
                  <strong>₵{pricing.depositRequired.toFixed(2)}</strong>
                </div>
                <p className="form-hint service-deposit-note">
                  Pay at least ₵{pricing.depositRequired.toFixed(2)} via MoMo ({SHOP_CONTACT.momo.number} —{' '}
                  {SHOP_CONTACT.momo.name}) or WhatsApp {SHOP_CONTACT.whatsapp}. Work starts only after the shop
                  confirms your deposit.
                </p>
              </div>
            )}
          </div>
        ) : null}

        <div className="form-section">
          <h2>
            <FiCalendar /> 3. Book an appointment slot
          </h2>
          <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
            Choose from available times only — manual date entry is not allowed.
          </p>
          {loadingSlots ? (
            <div className="loading-inline">
              <div className="spinner" /> Loading available slots…
            </div>
          ) : slots.length === 0 ? (
            <p className="text-danger">No appointment slots available in the next two weeks. Please contact the shop.</p>
          ) : (
            <div className="form-group">
              <label className="form-label">Available slot *</label>
              <select
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
                className="form-control"
                required
              >
                <option value="">Select date and time</option>
                {slots.map((s) => (
                  <option key={`${s.date}|${s.time}`} value={`${s.date}|${s.time}`}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            <FiSave /> {submitting ? 'Submitting…' : 'Submit order'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
