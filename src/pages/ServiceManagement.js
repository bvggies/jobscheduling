import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { servicesAPI, formatApiError } from '../services/api';
import './ServiceManagement.css';

const PRICING_TYPES = [
  { value: 'fixed-size', label: 'Fixed sizes (e.g. A4, 3ft×4ft)' },
  { value: 'per-unit', label: 'Per unit (e.g. sq ft)' },
  { value: 'tiered-yard', label: 'Tiered yards (cloth)' },
  { value: 'quote-required', label: 'Price on request' },
];

const EMPTY = {
  id: '',
  name: '',
  pricingType: 'fixed-size',
  unitLabel: 'sq ft',
  unitPrice: '',
  quoteNote: '',
  sizes: [{ id: 'size-1', label: '', unitPrice: '' }],
  tiers: [
    { min: 1, max: 49, unitPrice: 45 },
    { min: 50, max: 99, unitPrice: 43 },
    { min: 100, max: null, unitPrice: 40 },
  ],
  sortOrder: 0,
  active: true,
};

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await servicesAPI.listManage();
      setServices(data || []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (service) => {
    setEditingId(service.id);
    setForm({
      id: service.id,
      name: service.name,
      pricingType: service.pricingType,
      unitLabel: service.unitLabel || 'sq ft',
      unitPrice: service.unitPrice ?? '',
      quoteNote: service.quoteNote || '',
      sizes: (service.sizes || []).map((s, i) => ({ ...s, id: s.id || `size-${i}` })),
      tiers: service.tiers || EMPTY.tiers,
      sortOrder: service.sortOrder || 0,
      active: service.active !== false,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        id: form.id.trim(),
        name: form.name.trim(),
        pricingType: form.pricingType,
        quoteNote: form.quoteNote,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        active: form.active,
      };
      if (form.pricingType === 'fixed-size') {
        payload.sizes = form.sizes
          .filter((s) => s.label && s.unitPrice !== '')
          .map((s, i) => ({
            id: s.id || `size-${i}`,
            label: s.label,
            unitPrice: parseFloat(s.unitPrice),
          }));
      } else if (form.pricingType === 'per-unit') {
        payload.unitLabel = form.unitLabel;
        payload.unitPrice = parseFloat(form.unitPrice);
      } else if (form.pricingType === 'tiered-yard') {
        payload.unitLabel = form.unitLabel || 'yards';
        payload.tiers = form.tiers;
      }

      if (editingId) await servicesAPI.update(editingId, payload);
      else await servicesAPI.create(payload);

      resetForm();
      await load();
    } catch (err) {
      alert(formatApiError(err, 'Could not save service'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this service? It will no longer appear for customers.')) return;
    try {
      await servicesAPI.deactivate(id);
      await load();
    } catch (err) {
      alert(formatApiError(err, 'Could not deactivate service'));
    }
  };

  return (
    <motion.div className="service-mgmt-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1>Services & price list</h1>
          <p>Upload and manage services customers can order. Changes apply immediately.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={resetForm}>
          <FiPlus /> New service
        </button>
      </div>

      <div className="service-mgmt-grid">
        <section className="service-mgmt-list">
          <h2>Active catalog ({services.filter((s) => s.active).length})</h2>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <ul>
              {services.map((s) => (
                <li key={s.id} className={!s.active ? 'inactive' : ''}>
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.pricingType}</span>
                  </div>
                  <div className="service-mgmt-list-actions">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(s)}>Edit</button>
                    {s.active ? (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDeactivate(s.id)}>
                        <FiTrash2 />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="service-mgmt-form-panel">
          <h2>{editingId ? 'Edit service' : 'Add service'}</h2>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Service ID (slug) *</label>
              <input className="form-control" value={form.id} disabled={!!editingId} onChange={(e) => setForm({ ...form, id: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Pricing type *</label>
              <select className="form-control" value={form.pricingType} onChange={(e) => setForm({ ...form, pricingType: e.target.value })}>
                {PRICING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {form.pricingType === 'fixed-size' ? (
              <div className="form-group">
                <label className="form-label">Sizes & prices</label>
                {form.sizes.map((size, idx) => (
                  <div key={size.id} className="service-size-row">
                    <input placeholder="Label (A4)" value={size.label} onChange={(e) => {
                      const sizes = [...form.sizes];
                      sizes[idx] = { ...sizes[idx], label: e.target.value };
                      setForm({ ...form, sizes });
                    }} />
                    <input type="number" step="0.01" placeholder="Price" value={size.unitPrice} onChange={(e) => {
                      const sizes = [...form.sizes];
                      sizes[idx] = { ...sizes[idx], unitPrice: e.target.value };
                      setForm({ ...form, sizes });
                    }} />
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, sizes: [...form.sizes, { id: `size-${form.sizes.length}`, label: '', unitPrice: '' }] })}>
                  Add size
                </button>
              </div>
            ) : null}

            {form.pricingType === 'per-unit' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Unit label</label>
                  <input className="form-control" value={form.unitLabel} onChange={(e) => setForm({ ...form, unitLabel: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price per unit (GHS)</label>
                  <input type="number" step="0.01" className="form-control" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
                </div>
              </>
            ) : null}

            {form.pricingType === 'quote-required' ? (
              <div className="form-group">
                <label className="form-label">Quote note</label>
                <input className="form-control" value={form.quoteNote} onChange={(e) => setForm({ ...form, quoteNote: e.target.value })} />
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              <FiSave /> {saving ? 'Saving…' : editingId ? 'Update service' : 'Create service'}
            </button>
          </form>
        </section>
      </div>
    </motion.div>
  );
}
