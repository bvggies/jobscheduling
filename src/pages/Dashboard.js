import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { jobsAPI, analyticsAPI } from '../services/api';
import {
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiTrendingUp,
  FiCalendar,
  FiDollarSign,
  FiUsers,
  FiPackage,
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    inProgress: 0,
    completed: 0,
    late: 0,
  });
  const [analytics, setAnalytics] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [jobsRes, analyticsRes] = await Promise.all([
        jobsAPI.getAll(),
        analyticsAPI.get(),
      ]);

      const jobs = jobsRes.data;
      setRecentJobs(jobs.slice(0, 5));

      setStats({
        totalJobs: jobs.length,
        inProgress: jobs.filter((j) => j.status === 'In Progress').length,
        completed: jobs.filter((j) => j.status === 'Completed').length,
        late: analyticsRes.data.lateJobs?.length || 0,
      });

      setAnalytics(analyticsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Jobs',
      value: stats.totalJobs,
      icon: FiBriefcase,
      color: '#3b82f6',
      link: '/jobs',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: FiClock,
      color: '#f59e0b',
      link: '/jobs?status=In Progress',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: FiCheckCircle,
      color: '#10b981',
      link: '/jobs?status=Completed',
    },
    {
      title: 'Late Jobs',
      value: stats.late,
      icon: FiAlertTriangle,
      color: '#ef4444',
      link: '/alerts',
    },
  ];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your job scheduling dashboard</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Link to={stat.link} className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                  <Icon />
                </div>
                <div className="stat-content">
                  <h3>{stat.value}</h3>
                  <p>{stat.title}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {analytics && analytics.revenue && (
        <div className="revenue-cards-grid">
          <motion.div
            className="card revenue-card-dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="revenue-card-header">
              <FiDollarSign className="revenue-icon" />
              <div>
                <h3>Total Revenue</h3>
                <p className="revenue-amount">
                  ₵{parseFloat(analytics.revenue.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="revenue-card-details">
              <div className="revenue-detail-item">
                <span>Collected</span>
                <strong style={{ color: '#10b981' }}>
                  ₵{parseFloat(analytics.revenue.collected_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="revenue-detail-item">
                <span>Pending</span>
                <strong style={{ color: '#f59e0b' }}>
                  ₵{parseFloat(analytics.revenue.pending_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="card revenue-card-small"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="revenue-card-small-content">
              <FiUsers className="revenue-icon-small" style={{ color: '#3b82f6' }} />
              <div>
                <h4>Top Customers</h4>
                <p className="revenue-value">
                  {analytics.revenueByCustomer?.length || 0}
                </p>
                <p className="revenue-label">Active</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="card revenue-card-small"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="revenue-card-small-content">
              <FiPackage className="revenue-icon-small" style={{ color: '#8b5cf6' }} />
              <div>
                <h4>Avg Job Value</h4>
                <p className="revenue-value">
                  ₵{parseFloat(analytics.revenue.avg_job_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="revenue-label">Per Job</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="dashboard-grid">
        <motion.div
          className="card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="card-header">
            <h2 className="card-title">Recent Jobs</h2>
            <Link to="/jobs" className="btn btn-outline btn-sm">
              View All
            </Link>
          </div>
          <div className="recent-jobs">
            {recentJobs.length === 0 ? (
              <div className="empty-state">
                <p>No jobs yet</p>
                <Link to="/jobs/new" className="btn btn-primary btn-sm mt-2">
                  Create First Job
                </Link>
              </div>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/edit/${job.id}`}
                  className="recent-job-item"
                >
                  <div className="job-info">
                    <h4>{job.job_name}</h4>
                    <p>{job.customer_name}</p>
                  </div>
                  <div className="job-meta">
                    <span className={`badge badge-${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="job-date">
                      <FiCalendar /> {new Date(job.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {analytics && (
          <motion.div
            className="card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="card-header">
              <h2 className="card-title">Performance</h2>
            </div>
            <div className="performance-metrics">
              <div className="metric">
                <div className="metric-label">On-Time Rate</div>
                <div className="metric-value">
                  {analytics.completionRate?.total > 0
                    ? Math.round(
                        (analytics.completionRate.on_time /
                          analytics.completionRate.total) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{
                      width: `${
                        analytics.completionRate?.total > 0
                          ? (analytics.completionRate.on_time /
                              analytics.completionRate.total) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="metric">
                <div className="metric-label">Machine Utilization</div>
                <div className="metric-value">
                  <FiTrendingUp /> Active
                </div>
                <p className="metric-desc">
                  {analytics.utilization?.filter((m) => m.job_count > 0).length || 0} machines
                  in use
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    'Not Started': 'secondary',
    Ready: 'info',
    'In Progress': 'warning',
    Completed: 'success',
  };
  return colors[status] || 'secondary';
};

export default Dashboard;

