import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBell, FiSearch } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
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
          <Link to="/alerts" className="navbar-icon-btn">
            <FiBell />
            <span className="badge badge-danger">3</span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;

