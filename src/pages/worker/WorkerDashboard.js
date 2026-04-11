import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isToday, parseISO } from 'date-fns';
import { FiBriefcase, FiClock, FiCalendar, FiActivity } from 'react-icons/fi';
import { jobsAPI } from '../../services/api';
import '../Dashboard.css';

export default function WorkerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await jobsAPI.getAll();
        if (!cancelled) setJobs(data || []);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  const active = jobs.filter((j) => j.status !== 'Completed').length;
  const inProgress = jobs.filter((j) => j.status === 'In Progress').length;
  const dueToday = jobs.filter((j) => {
    if (!j.due_date || j.status === 'Completed') return false;
    try {
      return isToday(parseISO(j.due_date));
    } catch {
      return false;
    }
  }).length;

  const statCards = [
    {
      title: 'Active jobs',
      value: active,
      color: '#3b82f6',
      link: '/worker/jobs',
      icon: FiBriefcase,
    },
    {
      title: 'In progress',
      value: inProgress,
      color: '#f59e0b',
      link: '/worker/jobs?status=In%20Progress',
      icon: FiClock,
    },
    {
      title: 'Due today',
      value: dueToday,
      color: '#ef4444',
      link: '/worker/jobs',
      icon: FiCalendar,
    },
  ];

  return (
    <motion.div
      className="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="dashboard-header">
        <h1>Shop floor</h1>
        <p>Overview of work in progress and what is due today</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
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

      <motion.div
        className="card"
        style={{ padding: '1.25rem' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
          <FiActivity /> Quick links
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link to="/worker/jobs" className="btn btn-primary">
            All jobs
          </Link>
          <Link to="/worker/schedule" className="btn btn-outline">
            Schedule
          </Link>
          <Link to="/worker/activity" className="btn btn-outline">
            Work activity
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
