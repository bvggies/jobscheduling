import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiLayout,
  FiBriefcase,
  FiSettings,
  FiCalendar,
  FiBarChart2,
  FiAlertCircle,
  FiPlus,
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: FiLayout, label: 'Dashboard' },
    { path: '/jobs', icon: FiBriefcase, label: 'Jobs' },
    { path: '/machines', icon: FiSettings, label: 'Machines' },
    { path: '/schedule', icon: FiCalendar, label: 'Schedule' },
    { path: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { path: '/alerts', icon: FiAlertCircle, label: 'Alerts' },
  ];

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="sidebar-nav">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="sidebar-icon" />
                <span className="sidebar-label">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
      <div className="sidebar-actions">
        <Link to="/jobs/new" className="btn btn-primary btn-sm">
          <FiPlus />
          New Job
        </Link>
      </div>
    </motion.aside>
  );
};

export default Sidebar;

