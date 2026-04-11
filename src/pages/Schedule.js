import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { scheduleAPI, machinesAPI } from '../services/api';
import { format, parseISO } from 'date-fns';
import { FiRefreshCw, FiCalendar, FiClock, FiCpu } from 'react-icons/fi';
import './Schedule.css';

const Schedule = ({ workerView = false }) => {
  const [schedule, setSchedule] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [assignMachineByJob, setAssignMachineByJob] = useState({});

  const loadSchedule = useCallback(async () => {
    try {
      const response = await scheduleAPI.getAll();
      setSchedule(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setLoading(false);
    }
  }, []);

  const loadMachines = useCallback(async () => {
    if (workerView) return;
    try {
      const { data } = await machinesAPI.getAll();
      setMachines(data || []);
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  }, [workerView]);

  useEffect(() => {
    loadSchedule();
    loadMachines();
    const interval = setInterval(loadSchedule, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [loadSchedule, loadMachines]);

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

  const handleAssignMachine = async (jobId) => {
    const raw = assignMachineByJob[jobId];
    const machineId = raw != null && raw !== '' ? parseInt(raw, 10) : NaN;
    if (Number.isNaN(machineId)) {
      alert('Choose a machine first.');
      return;
    }
    setAssigningId(jobId);
    try {
      await scheduleAPI.update(jobId, { machine_id: machineId });
      setAssignMachineByJob((prev) => ({ ...prev, [jobId]: '' }));
      await loadSchedule();
    } catch (error) {
      console.error('Error assigning job:', error);
      const msg = error.response?.data?.error || error.message || 'Failed to assign job';
      alert(msg);
    } finally {
      setAssigningId(null);
    }
  };

  // Group schedule by machine (Unassigned first)
  const scheduleByMachine = schedule.reduce((acc, job) => {
    const machineName = job.machine_name || 'Unassigned';
    if (!acc[machineName]) {
      acc[machineName] = [];
    }
    acc[machineName].push(job);
    return acc;
  }, {});

  const machineGroups = Object.entries(scheduleByMachine).sort(([a], [b]) => {
    if (a === 'Unassigned') return -1;
    if (b === 'Unassigned') return 1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="schedule-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="page-header">
        <div>
          <h1>Schedule</h1>
          <p>View schedules; assign unqueued jobs to a press without running auto-schedule.</p>
        </div>
        {!workerView ? (
          <button
            onClick={handleAutoSchedule}
            className="btn btn-primary"
            disabled={autoScheduling}
          >
            <FiRefreshCw /> {autoScheduling ? 'Scheduling...' : 'Auto-Schedule'}
          </button>
        ) : null}
      </div>

      {machineGroups.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FiCalendar className="empty-state-icon" />
            <p>No jobs scheduled</p>
            {!workerView ? (
              <button
                onClick={handleAutoSchedule}
                className="btn btn-primary btn-sm mt-2"
                disabled={autoScheduling}
              >
                Auto-Schedule Jobs
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="schedule-container">
          {machineGroups.map(([machineName, jobs]) => (
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
                    const ta = a.scheduled_start ? new Date(a.scheduled_start).getTime() : null;
                    const tb = b.scheduled_start ? new Date(b.scheduled_start).getTime() : null;
                    if (ta != null && tb != null && ta !== tb) return ta - tb;
                    if (ta != null && tb == null) return -1;
                    if (ta == null && tb != null) return 1;
                    return new Date(a.due_date) - new Date(b.due_date);
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
                      {!workerView && job.machine_id == null ? (
                        <div className="schedule-assign-row">
                          <FiCpu className="schedule-assign-icon" aria-hidden />
                          <select
                            className="form-control schedule-assign-select"
                            aria-label={`Assign machine for ${job.job_name}`}
                            value={assignMachineByJob[job.id] ?? ''}
                            onChange={(e) =>
                              setAssignMachineByJob((prev) => ({ ...prev, [job.id]: e.target.value }))
                            }
                          >
                            <option value="">Select machine…</option>
                            {machines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.type})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={!assignMachineByJob[job.id] || assigningId === job.id}
                            onClick={() => handleAssignMachine(job.id)}
                          >
                            {assigningId === job.id ? 'Assigning…' : 'Assign'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Schedule;

