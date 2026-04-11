import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBell, FiLogOut, FiSearch, FiMoon, FiSun } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { alertsAPI } from '../../services/api';
import './Navbar.css';

const Navbar = ({ variant = 'admin' }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

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

  const submitSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      navigate('/jobs');
      return;
    }
    navigate(`/jobs?q=${encodeURIComponent(q)}`);
  };

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
          {variant === 'admin' ? (
            <form className="navbar-search-form" onSubmit={submitSearch}>
              <div className="navbar-search">
                <FiSearch className="search-icon" />
                <input
                  type="search"
                  placeholder="Search jobs, customers, PO…"
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search jobs"
                />
              </div>
            </form>
          ) : null}
          <button
            type="button"
            className="navbar-icon-btn navbar-theme-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
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
