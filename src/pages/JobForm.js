import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsAPI, usersAPI } from '../services/api';
import JobActivityPanel from '../components/JobActivityPanel';
import { useAuth } from '../context/AuthContext';
import {
  PRIORITIES,
  PRODUCT_TYPES,
  SUBSTRATES,
  FINISHING_OPTIONS,
} from '../utils/constants';
import { FiSave, FiX, FiDollarSign, FiUserPlus } from 'react-icons/fi';
import JobPayment from '../components/JobPayment';
import { STATUSES } from '../utils/constants';
import './JobForm.css';

const JobForm = ({ portalMode = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { user, isAdmin } = useAuth();
  const jobsListPath = portalMode ? '/portal/jobs' : '/jobs';

  const [formData, setFormData] = useState({
    job_name: '',
    po_number: '',
    customer_name: '',
    product_type: '',
    quantity: '',
    substrate: '',
    finishing: [],
    due_date: '',
    due_time: '',
    priority: 'Medium',
    total_cost: '',
    deposit_required: '',
    status: 'Not Started',
    assigned_user_id: '',
  });

  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', password: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [createCustomerError, setCreateCustomerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);

  const loadJob = useCallback(async () => {
    try {
      setLoadingData(true);
      const response = await jobsAPI.getById(id);
      const job = response.data;
      setCurrentJob(job);
      setFormData({
        job_name: job.job_name || '',
        po_number: job.po_number || '',
        customer_name: job.customer_name || '',
        product_type: job.product_type || '',
        quantity: job.quantity || '',
        substrate: job.substrate || '',
        finishing: job.finishing || [],
        due_date: job.due_date ? job.due_date.split('T')[0] : '',
        due_time: job.due_time || '',
        priority: job.priority || 'Medium',
        total_cost: job.total_cost || '',
        deposit_required: job.deposit_required || '',
        status: job.status || 'Not Started',
        assigned_user_id: job.user_id != null ? String(job.user_id) : '',
      });
    } catch (error) {
      console.error('Error loading job:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load job';
      alert(`Failed to load job: ${errorMessage}`);
      navigate(jobsListPath);
    } finally {
      setLoadingData(false);
    }
  }, [id, navigate, jobsListPath]);

  useEffect(() => {
    if (isEdit) {
      loadJob();
    }
  }, [isEdit, loadJob]);

  useEffect(() => {
    if (!isEdit && portalMode && user?.name) {
      setFormData((prev) => ({ ...prev, customer_name: user.name }));
    }
  }, [isEdit, portalMode, user?.name]);

  useEffect(() => {
    if (portalMode || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await usersAPI.getCustomers();
        if (!cancelled) setCustomers(data || []);
      } catch {
        if (!cancelled) setCustomers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portalMode, isAdmin]);

  const refreshJob = useCallback(async () => {
    if (isEdit) {
      await loadJob();
    }
  }, [isEdit, loadJob]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (portalMode && name === 'customer_name') return;
    setFormData({ ...formData, [name]: value });
  };

  const handleNewCustomerField = (e) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCustomer = async () => {
    setCreateCustomerError('');
    setCreatingCustomer(true);
    try {
      const { data } = await usersAPI.createCustomer(newCustomer);
      setCustomers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((fd) => ({
        ...fd,
        assigned_user_id: String(data.id),
        customer_name: fd.customer_name?.trim() ? fd.customer_name : data.name,
      }));
      setNewCustomer({ name: '', email: '', password: '' });
    } catch (err) {
      setCreateCustomerError(err.response?.data?.error || 'Could not create customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleFinishingChange = (finish) => {
    const current = formData.finishing || [];
    if (current.includes(finish)) {
      setFormData({
        ...formData,
        finishing: current.filter((f) => f !== finish),
      });
    } else {
      setFormData({ ...formData, finishing: [...current, finish] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate: Cannot mark as Ready without deposit
    if (formData.status === 'Ready' && currentJob && currentJob.deposit_status !== 'Received') {
      alert('Cannot mark job as Ready. Deposit must be received first.');
      return;
    }

    setLoading(true);

    try {
      const { assigned_user_id, ...rest } = formData;
      const data = {
        ...rest,
        quantity: parseInt(formData.quantity, 10),
        total_cost: parseFloat(formData.total_cost) || 0,
        deposit_required: parseFloat(formData.deposit_required) || 0,
      };
      if (!portalMode && isAdmin) {
        data.user_id = assigned_user_id === '' ? null : parseInt(assigned_user_id, 10);
      }

      if (isEdit) {
        await jobsAPI.update(id, data);
      } else {
        await jobsAPI.create(data);
      }

      navigate(jobsListPath);
    } catch (error) {
      console.error('Error saving job:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save job';
      alert(`Failed to save job: ${errorMessage}`);
      setLoading(false);
    }
  };

  if (loadingData && isEdit) {
    return (
      <div className="job-form-page">
        <div className="page-header">
          <div>
            <h1>Edit Job</h1>
            <p>Loading job details...</p>
          </div>
        </div>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="job-form-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Job' : 'New Job'}</h1>
          <p>{isEdit ? 'Update job details' : 'Create a new print job'}</p>
        </div>
        <button onClick={() => navigate(jobsListPath)} className="btn btn-outline">
          <FiX /> Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="job-form">
        <div className="form-section">
          <h2>Job Information</h2>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Job Name *</label>
              <input
                type="text"
                name="job_name"
                value={formData.job_name}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">PO Number</label>
              <input
                type="text"
                name="po_number"
                value={formData.po_number}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                className="form-control"
                required
                disabled={portalMode}
                title={portalMode ? 'Uses your account name' : undefined}
              />
              {portalMode ? <small className="form-hint">Uses your account name</small> : null}
            </div>
            <div className="form-group">
              <label className="form-label">Product Type *</label>
              <select
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">Select Product Type</option>
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="form-control"
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Substrate *</label>
              <select
                name="substrate"
                value={formData.substrate}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">Select Substrate</option>
                {SUBSTRATES.map((substrate) => (
                  <option key={substrate} value={substrate}>
                    {substrate}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <div className="date-time-group">
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
                <input
                  type="time"
                  name="due_time"
                  value={formData.due_time}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Completion Time (Optional)"
                  title="Time the job must be completed"
                />
              </div>
              <small className="form-hint">Add a time to track completion deadlines more precisely</small>
            </div>
            <div className="form-group">
              <label className="form-label">Priority *</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="form-control"
                required
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            {!portalMode && isAdmin ? (
              <div className="form-group grid-span-2 portal-customer-section">
                <label className="form-label">Portal customer (optional)</label>
                <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                  Choose an existing portal account or create one so they can sign in, see this job, and receive
                  updates.
                </p>
                <select
                  name="assigned_user_id"
                  value={formData.assigned_user_id}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="">Not linked — customer portal only if linked below</option>
                  {customers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                <div className="create-customer-inline">
                  <h3 className="create-customer-title">
                    <FiUserPlus /> Or add a new portal customer
                  </h3>
                  {createCustomerError ? (
                    <div className="job-form-inline-error">{createCustomerError}</div>
                  ) : null}
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="nc-name">
                        Full name
                      </label>
                      <input
                        id="nc-name"
                        name="name"
                        className="form-control"
                        value={newCustomer.name}
                        onChange={handleNewCustomerField}
                        autoComplete="off"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="nc-email">
                        Email (login)
                      </label>
                      <input
                        id="nc-email"
                        name="email"
                        type="email"
                        className="form-control"
                        value={newCustomer.email}
                        onChange={handleNewCustomerField}
                        autoComplete="off"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="nc-password">
                        Password (min 8)
                      </label>
                      <input
                        id="nc-password"
                        name="password"
                        type="password"
                        className="form-control"
                        value={newCustomer.password}
                        onChange={handleNewCustomerField}
                        autoComplete="new-password"
                        minLength={8}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={
                      creatingCustomer ||
                      !newCustomer.name.trim() ||
                      !newCustomer.email.trim() ||
                      newCustomer.password.length < 8
                    }
                    onClick={handleCreateCustomer}
                  >
                    {creatingCustomer ? 'Creating…' : 'Create customer & link to this job'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="form-section">
          <h2>Finishing Options</h2>
          <div className="finishing-options">
            {FINISHING_OPTIONS.map((finish) => (
              <label key={finish} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.finishing?.includes(finish)}
                  onChange={() => handleFinishingChange(finish)}
                />
                <span>{finish}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h2>
            <FiDollarSign /> Payment Information
          </h2>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Total Cost</label>
              <input
                type="number"
                name="total_cost"
                value={formData.total_cost}
                onChange={handleChange}
                className="form-control"
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deposit Required</label>
              <input
                type="number"
                name="deposit_required"
                value={formData.deposit_required}
                onChange={handleChange}
                className="form-control"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {isEdit && (
          <>
            <div className="form-section">
              <h2>Status</h2>
              <div className="form-group">
                <label className="form-label">Job Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-control"
                  disabled={formData.status === 'Ready' && currentJob?.deposit_status !== 'Received'}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {formData.status === 'Ready' && currentJob?.deposit_status !== 'Received' && (
                  <small className="form-help-text text-danger">
                    Deposit must be received before marking job as Ready
                  </small>
                )}
              </div>
            </div>
            {currentJob && (
              <JobPayment job={currentJob} onUpdate={refreshJob} />
            )}
            {currentJob && !portalMode ? (
              <JobActivityPanel jobId={currentJob.id} canComment pollMs={0} />
            ) : null}
          </>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSave /> {loading ? 'Saving...' : isEdit ? 'Update Job' : 'Create Job'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default JobForm;

