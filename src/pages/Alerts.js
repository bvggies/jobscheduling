import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { alertsAPI } from '../services/api';
import { format } from 'date-fns';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiCheck,
} from 'react-icons/fi';
import './Alerts.css';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  const loadAlerts = useCallback(async () => {
    try {
      const readParam = filter === 'unread' ? false : filter === 'read' ? true : null;
      const response = await alertsAPI.getAll(readParam);
      setAlerts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const handleMarkAsRead = async (id) => {
    try {
      await alertsAPI.markAsRead(id);
      loadAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertsAPI.markAllAsRead();
      loadAlerts();
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
  };

  const handleCheckAlerts = async () => {
    try {
      await alertsAPI.check();
      loadAlerts();
      alert('Alerts checked successfully!');
    } catch (error) {
      console.error('Error checking alerts:', error);
      alert('Failed to check alerts');
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <FiXCircle className="alert-icon error" />;
      case 'warning':
        return <FiAlertCircle className="alert-icon warning" />;
      default:
        return <FiInfo className="alert-icon info" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'var(--danger-color)';
      case 'warning':
        return 'var(--warning-color)';
      default:
        return 'var(--info-color)';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <motion.div 
      className="alerts-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="page-header">
        <div>
          <h1>Alerts & Notifications</h1>
          <p>Stay informed about important events</p>
        </div>
        <div className="alerts-actions">
          <button onClick={handleCheckAlerts} className="btn btn-outline">
            Check for Alerts
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="btn btn-primary">
              <FiCheck /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="alerts-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({alerts.length})
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({alerts.length - unreadCount})
          </button>
        </div>
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <FiCheckCircle className="empty-state-icon" />
              <p>No alerts</p>
            </div>
          </div>
        ) : (
          alerts.map((alert) => (
            <motion.div
              key={alert.id}
              className={`alert-item ${alert.read ? 'read' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="alert-indicator"
                style={{ backgroundColor: getSeverityColor(alert.severity) }}
              ></div>
              <div className="alert-content">
                <div className="alert-header">
                  <div className="alert-icon-wrapper">
                    {getSeverityIcon(alert.severity)}
                    <span className="alert-type">{alert.type.replace('_', ' ')}</span>
                  </div>
                  <span className="alert-time">
                    {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <p className="alert-message">{alert.message}</p>
                {alert.job_id && (
                  <Link
                    to={`/jobs/edit/${alert.job_id}`}
                    className="alert-link"
                  >
                    View Job →
                  </Link>
                )}
              </div>
              {!alert.read && (
                <button
                  onClick={() => handleMarkAsRead(alert.id)}
                  className="alert-mark-read"
                  title="Mark as read"
                >
                  <FiCheck />
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Alerts;

