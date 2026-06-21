import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiBriefcase, FiMessageSquare, FiLogOut, FiPlus, FiMessageCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './CustomerLayout.css';

export default function CustomerLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="App customer-app">
      <motion.header className="customer-topbar" initial={{ y: -12 }} animate={{ y: 0 }}>
        <Link to="/portal" className="customer-brand">
          <img src="/logo.svg" alt="" className="customer-brand-logo" />
          <span className="customer-brand-text">JobScheduler</span>
        </Link>
        <nav className="customer-nav">
          <NavLink to="/portal" end className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            <FiHome /> Home
          </NavLink>
          <NavLink
            to="/portal/jobs"
            end
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiBriefcase /> My jobs
          </NavLink>
          <NavLink
            to="/portal/jobs/new"
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiPlus /> Order service
          </NavLink>
          <NavLink
            to="/portal/chat"
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiMessageCircle /> Live chat
          </NavLink>
          <NavLink
            to="/portal/feedback"
            className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
          >
            <FiMessageSquare /> Feedback
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
