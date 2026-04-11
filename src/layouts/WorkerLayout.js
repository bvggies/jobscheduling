import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiBriefcase, FiCalendar, FiActivity, FiLogOut, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { alertsAPI } from '../services/api';
import './CustomerLayout.css';

export default function WorkerLayout() {
  const { user, logout } = useAuth();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await alertsAPI.getAll(false);
        if (!cancelled) setUnreadAlerts((data || []).filter((a) => !a.read).length);
      } catch {
        if (!cancelled) setUnreadAlerts(0);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="App customer-app">
      <motion.header className="customer-topbar" initial={{ y: -12 }} animate={{ y: 0 }}>
        <Link to="/worker" className="customer-brand">
          <img src="/logo.svg" alt="" className="customer-brand-logo" />
          <span className="customer-brand-text">JobScheduler</span>
        </Link>
        <nav className="customer-nav">
          <NavLink to="/worker" end className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            <FiHome /> Floor
          </NavLink>
          <NavLink
            to="/worker/jobs"
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiBriefcase /> Jobs
          </NavLink>
          <NavLink
            to="/worker/schedule"
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiCalendar /> Schedule
          </NavLink>
          <NavLink
            to="/worker/activity"
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiActivity /> Activity
          </NavLink>
          <NavLink
            to="/worker/alerts"
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiBell /> Messages
            {unreadAlerts > 0 ? (
              <span
                className="badge"
                style={{
                  marginLeft: 6,
                  fontSize: '0.65rem',
                  verticalAlign: 'middle',
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#fff',
                }}
              >
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            ) : null}
          </NavLink>
        </nav>
        <div className="customer-user">
          <span className="customer-user-name">{user?.name}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
            <FiLogOut /> Sign out
          </button>
        </div>
      </motion.header>
      <main className="customer-main">
        <Outlet />
      </main>
    </div>
  );
}
