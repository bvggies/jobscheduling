import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsAPI, machinesAPI } from '../services/api';
import { STATUSES, PRIORITY_COLORS, STATUS_COLORS } from '../utils/constants';
import { FiPlus, FiEdit, FiTrash2, FiCheckCircle, FiPlay, FiClock, FiCopy, FiDownload, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';
import './Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    customer: '',
    machine_id: '',
    start_date: '',
    end_date: '',
  });
  const [customers, setCustomers] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [paymentModal, setPaymentModal] = useState({ show: false, job: null, type: null });
  const [paymentData, setPaymentData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await jobsAPI.getAll(filters);
      setJobs(response.data);
      
      // Extract unique customers for autocomplete
      const uniqueCustomers = [...new Set(response.data.map(job => job.customer_name))].sort();
      setCustomers(uniqueCustomers);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadJobs();
    loadMachines();
  }, [loadJobs]);

  const loadMachines = async () => {
    try {
      const response = await machinesAPI.getAll();
      setMachines(response.data);
    } catch (error) {
      console.error('Error loading machines:', error);
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

  const handleStatusChange = async (jobId, newStatus, currentJob) => {
    // Validate: Cannot mark as Ready without deposit
    if (newStatus === 'Ready' && currentJob.deposit_status !== 'Received') {
      alert('Cannot mark job as Ready. Deposit must be received first.');
      return;
    }

    try {
      await jobsAPI.updateStatus(jobId, newStatus);
      loadJobs();
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update status';
      alert(`Failed to update status: ${errorMessage}`);
    }
  };

  const handleDuplicate = async (jobId) => {
    if (window.confirm('Duplicate this job? A new job will be created with the same details.')) {
      try {
        await jobsAPI.duplicate(jobId);
        loadJobs();
        alert('Job duplicated successfully!');
      } catch (error) {
        console.error('Error duplicating job:', error);
        alert('Failed to duplicate job');
      }
    }
  };

  const handleExport = () => {
    const headers = ['Job Name', 'PO Number', 'Customer', 'Product Type', 'Quantity', 'Substrate', 'Finishing', 'Due Date', 'Priority', 'Status', 'Total Cost', 'Payment Status', 'Machine'];
    const csvData = jobs.map(job => [
      job.job_name || '',
      job.po_number || '',
      job.customer_name || '',
      job.product_type || '',
      job.quantity || 0,
      job.substrate || '',
      (job.finishing || []).join(', '),
      format(new Date(job.due_date), 'yyyy-MM-dd'),
      job.priority || '',
      job.status || '',
      job.total_cost || 0,
      job.payment_status === 'Paid' ? 'Paid' : (job.deposit_status === 'Received' ? 'Deposit Received' : 'Pending'),
      job.machine_name || 'Not Assigned'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `jobs_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCustomerInputChange = (e) => {
    const value = e.target.value;
    setFilters({ ...filters, customer: value });
    
    if (value) {
      const filtered = customers.filter(c => 
        c.toLowerCase().includes(value.toLowerCase())
      );
      setCustomerSuggestions(filtered);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const selectCustomer = (customer) => {
    setFilters({ ...filters, customer });
    setCustomerSuggestions([]);
  };

  const handleMachineAssign = async (jobId, machineId, job) => {
    try {
      // If machineId is empty string, unassign the machine
      const machineIdValue = machineId === '' ? null : parseInt(machineId);
      
      // Check compatibility if machine is selected
      if (machineIdValue) {
        const selectedMachine = machines.find(m => m.id === machineIdValue);
        if (selectedMachine && selectedMachine.compatibility && selectedMachine.compatibility.length > 0) {
          const isCompatible = selectedMachine.compatibility.includes(job.substrate);
          if (!isCompatible) {
            const confirmAssign = window.confirm(
              `Warning: Machine "${selectedMachine.name}" may not be compatible with substrate "${job.substrate}".\n\nDo you want to assign it anyway?`
            );
            if (!confirmAssign) {
              return;
            }
          }
        }
      }

      await jobsAPI.update(jobId, { machine_id: machineIdValue });
      loadJobs();
    } catch (error) {
      console.error('Error assigning machine:', error);
      alert('Failed to assign machine');
    }
  };


  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'Not Started': ['Ready', 'In Progress'],
      'Ready': ['In Progress', 'Completed'],
      'In Progress': ['Completed'],
      'Completed': []
    };
    return statusFlow[currentStatus] || [];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ready':
        return <FiClock />;
      case 'In Progress':
        return <FiPlay />;
      case 'Completed':
        return <FiCheckCircle />;
      default:
        return null;
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

  const handlePaymentUpdate = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await jobsAPI.updatePayment(paymentModal.job.id, paymentModal.type, paymentData.amount, paymentData.date);
      setPaymentModal({ show: false, job: null, type: null });
      setPaymentData({ amount: '', date: new Date().toISOString().split('T')[0] });
      loadJobs();
      alert('Payment updated successfully!');
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment');
    }
  };

  const openPaymentModal = (job, type) => {
    setPaymentModal({ show: true, job, type });
    if (type === 'deposit') {
      setPaymentData({ 
        amount: (job.deposit_required || 0) - (job.deposit_received || 0),
        date: new Date().toISOString().split('T')[0]
      });
    } else {
      const balanceDue = (job.total_cost || 0) - (job.deposit_received || 0);
      setPaymentData({ 
        amount: balanceDue - (job.final_payment_received || 0),
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="jobs-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="page-header">
        <div>
          <h1>Jobs</h1>
          <p>Manage all your print jobs</p>
        </div>
        <div className="page-header-actions">
          <button onClick={handleExport} className="btn btn-outline" title="Export to CSV">
            <FiDownload /> Export
          </button>
          <Link to="/jobs/new" className="btn btn-primary">
            <FiPlus /> New Job
          </Link>
        </div>
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
          <div className="filter-group filter-group-autocomplete">
            <label>Customer</label>
            <div className="autocomplete-wrapper">
              <input
                type="text"
                placeholder="Search customer..."
                value={filters.customer}
                onChange={handleCustomerInputChange}
                onFocus={() => {
                  if (filters.customer) {
                    const filtered = customers.filter(c => 
                      c.toLowerCase().includes(filters.customer.toLowerCase())
                    );
                    setCustomerSuggestions(filtered);
                  }
                }}
                className="form-control"
              />
              {customerSuggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {customerSuggestions.map((customer, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onClick={() => selectCustomer(customer)}
                    >
                      {customer}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                <tr key={job.id}>
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
                    <div>
                      <span
                        className={
                          (() => {
                            if (job.status === 'Completed') return '';
                            const dueDate = new Date(job.due_date);
                            const now = new Date();
                            if (job.due_time) {
                              const [hours, minutes] = job.due_time.split(':');
                              dueDate.setHours(parseInt(hours), parseInt(minutes), 0);
                              return dueDate < now ? 'text-danger' : '';
                            }
                            return dueDate < now ? 'text-danger' : '';
                          })()
                        }
                      >
                        {format(new Date(job.due_date), 'MMM dd, yyyy')}
                      </span>
                      {job.due_time && (
                        <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          ⏰ {job.due_time}
                        </div>
                      )}
                    </div>
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
                    <div className="status-cell">
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${STATUS_COLORS[job.status]}20`,
                          color: STATUS_COLORS[job.status],
                        }}
                      >
                        {job.status}
                      </span>
                      <div className="status-actions">
                        {getNextStatus(job.status).map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => handleStatusChange(job.id, nextStatus, job)}
                            className="status-btn"
                            title={`Mark as ${nextStatus}`}
                            style={{
                              backgroundColor: `${STATUS_COLORS[nextStatus]}20`,
                              color: STATUS_COLORS[nextStatus],
                            }}
                          >
                            {getStatusIcon(nextStatus)}
                            <span>{nextStatus}</span>
                          </button>
                        ))}
                        {getNextStatus(job.status).length === 0 && job.status !== 'Completed' && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusChange(job.id, e.target.value, job);
                                e.target.value = '';
                              }
                            }}
                            className="status-select"
                            title="Change status"
                          >
                            <option value="">Change...</option>
                            {STATUSES.filter(s => s !== job.status).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="payment-status-cell">
                      <div className="payment-status">
                        <span className="payment-icon">{getPaymentIcon(job)}</span>
                        <span className="payment-text">{getPaymentStatus(job)}</span>
                      </div>
                      <div className="payment-actions">
                        {job.deposit_status !== 'Received' && job.deposit_required > 0 && (
                          <button
                            onClick={() => openPaymentModal(job, 'deposit')}
                            className="payment-action-btn"
                            title="Record Deposit"
                          >
                            <FiDollarSign /> Deposit
                          </button>
                        )}
                        {job.payment_status !== 'Paid' && job.deposit_status === 'Received' && (
                          <button
                            onClick={() => openPaymentModal(job, 'final')}
                            className="payment-action-btn"
                            title="Record Final Payment"
                          >
                            <FiDollarSign /> Final
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={job.machine_id || ''}
                      onChange={(e) => handleMachineAssign(job.id, e.target.value, job)}
                      className="machine-assign-select"
                      title="Assign machine"
                    >
                      <option value="">Not Assigned</option>
                      {machines.map((machine) => {
                        const isCompatible = !job.substrate || 
                          !machine.compatibility || 
                          machine.compatibility.length === 0 || 
                          machine.compatibility.includes(job.substrate);
                        
                        return (
                          <option 
                            key={machine.id} 
                            value={machine.id}
                            style={!isCompatible ? { color: '#ef4444' } : {}}
                          >
                            {machine.name} ({machine.type})
                            {!isCompatible ? ' ⚠️ Incompatible' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </td>
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
                        onClick={() => handleDuplicate(job.id)}
                        className="btn-icon"
                        title="Duplicate"
                        style={{ color: '#3b82f6' }}
                      >
                        <FiCopy />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="btn-icon btn-danger"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {paymentModal.show && paymentModal.job && (
        <div className="modal-overlay" onClick={() => setPaymentModal({ show: false, job: null, type: null })}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                Record {paymentModal.type === 'deposit' ? 'Deposit' : 'Final'} Payment
              </h3>
              <button 
                onClick={() => setPaymentModal({ show: false, job: null, type: null })} 
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Job: {paymentModal.job.job_name}</label>
              </div>
              {paymentModal.type === 'deposit' && (
                <div className="form-group">
                  <label>Deposit Required: ${(paymentModal.job.deposit_required || 0).toFixed(2)}</label>
                  <label>Already Received: ${(paymentModal.job.deposit_received || 0).toFixed(2)}</label>
                </div>
              )}
              {paymentModal.type === 'final' && (
                <div className="form-group">
                  <label>Total Cost: ${(paymentModal.job.total_cost || 0).toFixed(2)}</label>
                  <label>Balance Due: ${((paymentModal.job.total_cost || 0) - (paymentModal.job.deposit_received || 0) - (paymentModal.job.final_payment_received || 0)).toFixed(2)}</label>
                </div>
              )}
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="form-control"
                  placeholder="Enter amount"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Date *</label>
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
                onClick={() => setPaymentModal({ show: false, job: null, type: null })}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentUpdate}
                className="btn btn-primary"
              >
                <FiDollarSign /> Record Payment
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Jobs;

