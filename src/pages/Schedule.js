import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { scheduleAPI } from '../services/api';
import { format, parseISO } from 'date-fns';
import { FiRefreshCw, FiCalendar, FiClock } from 'react-icons/fi';
import './Schedule.css';

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoScheduling, setAutoScheduling] = useState(false);

  useEffect(() => {
    loadSchedule();
    const interval = setInterval(loadSchedule, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadSchedule = async () => {
    try {
      const response = await scheduleAPI.getAll();
      setSchedule(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setLoading(false);
    }
  };

  const handleAutoSchedule = async () => {
    setAutoScheduling(true);
    try {
      await scheduleAPI.autoSchedule();
      await loadSchedule();
      alert('Jobs have been automatically scheduled!');
    } catch (error) {
      console.error('Error auto-scheduling:', error);
      alert('Failed to auto-schedule jobs');
    } finally {
      setAutoScheduling(false);
    }
  };

  // Group schedule by machine
  const scheduleByMachine = schedule.reduce((acc, job) => {
    const machineName = job.machine_name || 'Unassigned';
    if (!acc[machineName]) {
      acc[machineName] = [];
    }
    acc[machineName].push(job);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="schedule-page" data-aos="fade-up">
      <div className="page-header">
        <div>
          <h1>Schedule</h1>
          <p>View and manage job schedules</p>
        </div>
        <button
          onClick={handleAutoSchedule}
          className="btn btn-primary"
          disabled={autoScheduling}
        >
          <FiRefreshCw /> {autoScheduling ? 'Scheduling...' : 'Auto-Schedule'}
        </button>
      </div>

      {Object.keys(scheduleByMachine).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FiCalendar className="empty-state-icon" />
            <p>No jobs scheduled</p>
            <button
              onClick={handleAutoSchedule}
              className="btn btn-primary btn-sm mt-2"
              disabled={autoScheduling}
            >
              Auto-Schedule Jobs
            </button>
          </div>
        </div>
      ) : (
        <div className="schedule-container">
          {Object.entries(scheduleByMachine).map(([machineName, jobs]) => (
            <motion.div
              key={machineName}
              className="machine-schedule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="machine-schedule-header">
                <h2>{machineName}</h2>
                <span className="job-count">{jobs.length} job(s)</span>
              </div>
              <div className="schedule-timeline">
                {jobs
                  .sort((a, b) => {
                    if (!a.scheduled_start || !b.scheduled_start) return 0;
                    return new Date(a.scheduled_start) - new Date(b.scheduled_start);
                  })
                  .map((job) => (
                    <div key={job.id} className="schedule-item">
                      <div className="schedule-item-header">
                        <h4>{job.job_name}</h4>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${
                              job.priority === 'Rush'
                                ? '#9C27B0'
                                : job.priority === 'High'
                                ? '#F44336'
                                : job.priority === 'Medium'
                                ? '#FF9800'
                                : '#4CAF50'
                            }20`,
                            color:
                              job.priority === 'Rush'
                                ? '#9C27B0'
                                : job.priority === 'High'
                                ? '#F44336'
                                : job.priority === 'Medium'
                                ? '#FF9800'
                                : '#4CAF50',
                          }}
                        >
                          {job.priority}
                        </span>
                      </div>
                      <div className="schedule-item-body">
                        <p>
                          <strong>Customer:</strong> {job.customer_name}
                        </p>
                        <p>
                          <strong>Product:</strong> {job.product_type} ({job.quantity} pcs)
                        </p>
                        <p>
                          <strong>Substrate:</strong> {job.substrate}
                        </p>
                      </div>
                      {job.scheduled_start && job.scheduled_end && (
                        <div className="schedule-item-time">
                          <FiClock />
                          <span>
                            {format(parseISO(job.scheduled_start), 'MMM dd, HH:mm')} -{' '}
                            {format(parseISO(job.scheduled_end), 'HH:mm')}
                          </span>
                        </div>
                      )}
                      <div className="schedule-item-footer">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${
                              job.status === 'Completed'
                                ? '#4CAF50'
                                : job.status === 'In Progress'
                                ? '#FF9800'
                                : job.status === 'Ready'
                                ? '#2196F3'
                                : '#9E9E9E'
                            }20`,
                            color:
                              job.status === 'Completed'
                                ? '#4CAF50'
                                : job.status === 'In Progress'
                                ? '#FF9800'
                                : job.status === 'Ready'
                                ? '#2196F3'
                                : '#9E9E9E',
                          }}
                        >
                          {job.status}
                        </span>
                        <span className="due-date">
                          Due: {format(new Date(job.due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Schedule;

