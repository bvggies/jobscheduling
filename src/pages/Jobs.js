import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsAPI } from '../services/api';
import { STATUSES, PRIORITY_COLORS, STATUS_COLORS } from '../utils/constants';
import { FiPlus, FiEdit, FiTrash2, FiFilter, FiSearch, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';
import './Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    customer: '',
    machine_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadJobs();
  }, [filters]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await jobsAPI.getAll(filters);
      setJobs(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobsAPI.delete(id);
        loadJobs();
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job');
      }
    }
  };

  const getPaymentIcon = (job) => {
    if (job.payment_status === 'Paid') return '🟢';
    if (job.deposit_status === 'Received') return '✅';
    return '💰';
  };

  const getPaymentStatus = (job) => {
    if (job.payment_status === 'Paid') return 'Fully Paid';
    if (job.deposit_status === 'Received') return 'Deposit Received';
    return 'Deposit Pending';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="jobs-page" data-aos="fade-up">
      <div className="page-header">
        <div>
          <h1>Jobs</h1>
          <p>Manage all your print jobs</p>
        </div>
        <Link to="/jobs/new" className="btn btn-primary">
          <FiPlus /> New Job
        </Link>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="form-control"
            >
              <option value="">All</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Customer</label>
            <input
              type="text"
              placeholder="Search customer..."
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="form-control"
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Machine</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center">
                  <div className="empty-state">
                    <p>No jobs found</p>
                    <Link to="/jobs/new" className="btn btn-primary btn-sm mt-2">
                      Create First Job
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <td>
                    <strong>{job.job_name}</strong>
                    {job.po_number && (
                      <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                        PO: {job.po_number}
                      </div>
                    )}
                  </td>
                  <td>{job.customer_name}</td>
                  <td>{job.product_type}</td>
                  <td>{job.quantity.toLocaleString()}</td>
                  <td>
                    <span
                      className={
                        new Date(job.due_date) < new Date() && job.status !== 'Completed'
                          ? 'text-danger'
                          : ''
                      }
                    >
                      {format(new Date(job.due_date), 'MMM dd, yyyy')}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${PRIORITY_COLORS[job.priority]}20`,
                        color: PRIORITY_COLORS[job.priority],
                      }}
                    >
                      {job.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${STATUS_COLORS[job.status]}20`,
                        color: STATUS_COLORS[job.status],
                      }}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td>
                    <div className="payment-status">
                      <span className="payment-icon">{getPaymentIcon(job)}</span>
                      <span className="payment-text">{getPaymentStatus(job)}</span>
                    </div>
                  </td>
                  <td>{job.machine_name || 'Not Assigned'}</td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        to={`/jobs/edit/${job.id}`}
                        className="btn-icon"
                        title="Edit"
                      >
                        <FiEdit />
                      </Link>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="btn-icon btn-danger"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Jobs;

