import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsAPI, machinesAPI } from '../services/api';
import {
  PRIORITIES,
  PRODUCT_TYPES,
  SUBSTRATES,
  FINISHING_OPTIONS,
} from '../utils/constants';
import { FiSave, FiX, FiDollarSign } from 'react-icons/fi';
import JobPayment from '../components/JobPayment';
import { STATUSES } from '../utils/constants';
import './JobForm.css';

const JobForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    job_name: '',
    po_number: '',
    customer_name: '',
    product_type: '',
    quantity: '',
    substrate: '',
    finishing: [],
    due_date: '',
    priority: 'Medium',
    total_cost: '',
    deposit_required: '',
    status: 'Not Started',
  });

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [currentJob, setCurrentJob] = useState(null);

  useEffect(() => {
    loadMachines();
    if (isEdit) {
      loadJob();
    }
  }, [id]);

  const loadMachines = async () => {
    try {
      const response = await machinesAPI.getAll();
      setMachines(response.data);
      setLoadingMachines(false);
    } catch (error) {
      console.error('Error loading machines:', error);
      setLoadingMachines(false);
    }
  };

  const loadJob = async () => {
    try {
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
        priority: job.priority || 'Medium',
        total_cost: job.total_cost || '',
        deposit_required: job.deposit_required || '',
        status: job.status || 'Not Started',
      });
    } catch (error) {
      console.error('Error loading job:', error);
      alert('Failed to load job');
      navigate('/jobs');
    }
  };

  const refreshJob = async () => {
    if (isEdit) {
      await loadJob();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
      const data = {
        ...formData,
        quantity: parseInt(formData.quantity),
        total_cost: parseFloat(formData.total_cost) || 0,
        deposit_required: parseFloat(formData.deposit_required) || 0,
      };

      if (isEdit) {
        await jobsAPI.update(id, data);
      } else {
        await jobsAPI.create(data);
      }

      navigate('/jobs');
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Failed to save job');
      setLoading(false);
    }
  };

  return (
    <div className="job-form-page" data-aos="fade-up">
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Job' : 'New Job'}</h1>
          <p>{isEdit ? 'Update job details' : 'Create a new print job'}</p>
        </div>
        <button onClick={() => navigate('/jobs')} className="btn btn-outline">
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
              />
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
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="form-control"
                required
              />
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
          </>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSave /> {loading ? 'Saving...' : isEdit ? 'Update Job' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobForm;

