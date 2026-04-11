import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBell, FiLogOut, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { alertsAPI } from '../../services/api';
import './Navbar.css';

const Navbar = ({ variant = 'admin' }) => {
  const { user, logout } = useAuth();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (variant !== 'admin' || !user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await alertsAPI.getAll(false);
        if (!cancelled) setUnreadAlerts((data || []).filter((a) => !a.read).length);
      } catch {
        if (!cancelled) setUnreadAlerts(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant, user]);

  return (
    <motion.nav
      className="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          <img src="/logo.svg" alt="JobScheduler" className="navbar-logo" />
          <span className="navbar-title">JobScheduler</span>
        </Link>
        <div className="navbar-actions">
          <div className="navbar-search">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search..." className="search-input" />
          </div>
          {variant === 'admin' ? (
            <Link to="/alerts" className="navbar-icon-btn" title="Alerts">
              <FiBell />
              {unreadAlerts > 0 ? <span className="badge badge-danger">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span> : null}
            </Link>
          ) : null}
          <span className="navbar-user-name">{user?.name}</span>
          <button type="button" className="btn btn-outline btn-sm navbar-logout" onClick={logout}>
            <FiLogOut /> Sign out
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;

