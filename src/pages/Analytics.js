import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../services/api';
import { format } from 'date-fns';
import { FiTrendingUp, FiAlertTriangle, FiBarChart2, FiDollarSign, FiUsers, FiPackage } from 'react-icons/fi';
import './Analytics.css';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: '',
  });

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.get(dateRange);
      setAnalytics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <motion.div 
        className="analytics-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="page-header">
          <h1>Analytics & Reports</h1>
          <p>Performance metrics and insights</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <FiBarChart2 className="empty-state-icon" />
            <p>No analytics data available</p>
            <p className="text-secondary">Create some jobs to see analytics</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const onTimeRate =
    analytics.completionRate?.total > 0
      ? Math.round(
          (analytics.completionRate.on_time / analytics.completionRate.total) * 100
        )
      : 0;

  return (
    <motion.div 
      className="analytics-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="page-header">
        <div>
          <h1>Analytics & Reports</h1>
          <p>Performance metrics and insights</p>
        </div>
        <div className="date-filters">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) =>
              setDateRange({ ...dateRange, start_date: e.target.value })
            }
            className="form-control"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) =>
              setDateRange({ ...dateRange, end_date: e.target.value })
            }
            className="form-control"
            placeholder="End Date"
          />
        </div>
      </div>

      <div className="analytics-grid">
        <motion.div
          className="card analytics-card revenue-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="analytics-card-header">
            <FiDollarSign className="analytics-icon" style={{ color: '#10b981' }} />
            <h2>Revenue Overview</h2>
          </div>
          <div className="analytics-card-body">
            <div className="metric-large" style={{ color: '#10b981' }}>
              ${parseFloat(analytics.revenue?.collected_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="metric-details">
              <div className="metric-detail">
                <span className="metric-label">Total Revenue</span>
                <span className="metric-value">
                  ${parseFloat(analytics.revenue?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="metric-detail">
                <span className="metric-label">Paid</span>
                <span className="metric-value" style={{ color: '#10b981' }}>
                  ${parseFloat(analytics.revenue?.paid_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="metric-detail">
                <span className="metric-label">Pending</span>
                <span className="metric-value text-warning">
                  ${parseFloat(analytics.revenue?.pending_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="revenue-breakdown">
              <div className="revenue-item">
                <span>Deposits Collected:</span>
                <strong>${parseFloat(analytics.revenue?.deposit_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="revenue-item">
                <span>Average Job Value:</span>
                <strong>${parseFloat(analytics.revenue?.avg_job_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card analytics-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="analytics-card-header">
            <FiTrendingUp className="analytics-icon" />
            <h2>On-Time Completion Rate</h2>
          </div>
          <div className="analytics-card-body">
            <div className="metric-large">{onTimeRate}%</div>
            <div className="metric-details">
              <div className="metric-detail">
                <span className="metric-label">On Time:</span>
                <span className="metric-value">
                  {analytics.completionRate?.on_time || 0}
                </span>
              </div>
              <div className="metric-detail">
                <span className="metric-label">Late:</span>
                <span className="metric-value text-danger">
                  {analytics.completionRate?.late || 0}
                </span>
              </div>
              <div className="metric-detail">
                <span className="metric-label">Total:</span>
                <span className="metric-value">
                  {analytics.completionRate?.total || 0}
                </span>
              </div>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${onTimeRate}%` }}
              ></div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card analytics-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="analytics-card-header">
            <FiBarChart2 className="analytics-icon" />
            <h2>Status Breakdown</h2>
          </div>
          <div className="analytics-card-body">
            <div className="status-breakdown">
              {analytics.statusBreakdown && analytics.statusBreakdown.length > 0 ? (
                analytics.statusBreakdown.map((status) => (
                  <div key={status.status} className="status-item">
                    <div className="status-info">
                      <span className="status-name">{status.status}</span>
                      <span className="status-count">{status.count}</span>
                    </div>
                    <div className="status-bar">
                      <div
                        className="status-bar-fill"
                        style={{
                          width: `${
                            analytics.completionRate?.total > 0
                              ? (status.count / analytics.completionRate.total) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-secondary">No status data available</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="analytics-grid">
        {analytics.revenueByCustomer && analytics.revenueByCustomer.length > 0 && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="card-header">
              <h2 className="card-title">
                <FiUsers className="analytics-icon" /> Top Customers by Revenue
              </h2>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Jobs</th>
                    <th>Total Revenue</th>
                    <th>Paid</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.revenueByCustomer.map((customer, index) => (
                    <tr key={index}>
                      <td><strong>{customer.customer_name}</strong></td>
                      <td>{customer.job_count}</td>
                      <td>${parseFloat(customer.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ color: '#10b981' }}>${parseFloat(customer.paid_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="text-warning">${parseFloat((customer.total_revenue || 0) - (customer.paid_revenue || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {analytics.revenueByProduct && analytics.revenueByProduct.length > 0 && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="card-header">
              <h2 className="card-title">
                <FiPackage className="analytics-icon" /> Revenue by Product Type
              </h2>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product Type</th>
                    <th>Jobs</th>
                    <th>Total Revenue</th>
                    <th>Avg per Job</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.revenueByProduct.map((product, index) => (
                    <tr key={index}>
                      <td><strong>{product.product_type}</strong></td>
                      <td>{product.job_count}</td>
                      <td>${parseFloat(product.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>${parseFloat(product.avg_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {analytics.revenueByMonth && analytics.revenueByMonth.length > 0 && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h2 className="card-title">
              <FiBarChart2 className="analytics-icon" /> Revenue Trend (Last 6 Months)
            </h2>
          </div>
          <div className="revenue-trend">
            {analytics.revenueByMonth.reverse().map((month, index) => {
              const maxRevenue = Math.max(...analytics.revenueByMonth.map(m => parseFloat(m.total_revenue || 0)));
              const percentage = maxRevenue > 0 ? (parseFloat(month.total_revenue || 0) / maxRevenue) * 100 : 0;
              return (
                <div key={index} className="trend-item">
                  <div className="trend-header">
                    <span className="trend-month">{new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    <span className="trend-value">${parseFloat(month.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="trend-bar-container">
                    <div 
                      className="trend-bar" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="trend-details">
                    <span>{month.job_count} jobs</span>
                    <span style={{ color: '#10b981' }}>${parseFloat(month.paid_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="card-header">
          <h2 className="card-title">Machine Utilization</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Type</th>
                <th>Active Jobs</th>
                <th>Total Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!analytics.utilization || analytics.utilization.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">
                    No machine data available
                  </td>
                </tr>
              ) : (
                analytics.utilization.map((machine) => (
                  <tr key={machine.id}>
                    <td>
                      <strong>{machine.name}</strong>
                    </td>
                    <td>{machine.type}</td>
                    <td>{machine.job_count || 0}</td>
                    <td>{parseFloat(machine.total_hours || 0).toFixed(2)} hrs</td>
                    <td>
                      <span
                        className={`badge ${
                          machine.job_count > 0 ? 'badge-success' : 'badge-secondary'
                        }`}
                      >
                        {machine.job_count > 0 ? 'Active' : 'Idle'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {analytics.lateJobs && analytics.lateJobs.length > 0 && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h2 className="card-title">
              <FiAlertTriangle className="text-danger" /> Late Jobs
            </h2>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Job Name</th>
                  <th>Customer</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Machine</th>
                </tr>
              </thead>
              <tbody>
                {analytics.lateJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.job_name}</strong>
                    </td>
                    <td>{job.customer_name}</td>
                    <td className="text-danger">
                      {format(new Date(job.due_date), 'MMM dd, yyyy')}
                    </td>
                    <td>
                      <span className="badge badge-warning">{job.status}</span>
                    </td>
                    <td>{job.machine_name || 'Not Assigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Analytics;

