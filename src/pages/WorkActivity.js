import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { activityAPI } from '../services/api';
import './WorkActivity.css';

export default function WorkActivity() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await activityAPI.getRecent({ limit: 80 });
      setRows(data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1>Work activity</h1>
          <p>Latest progress across all jobs. Customer posts and automated scheduling appear here.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No activity yet.</p>
      ) : (
        <div className="work-activity-table-wrap">
          <table className="work-activity-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Job</th>
                <th>Type</th>
                <th>Summary</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{format(new Date(r.created_at), 'MMM d, h:mm a')}</td>
                  <td>
                    <Link to={`/jobs/edit/${r.job_id}`}>{r.job_name}</Link>
                    {r.assigned_customer_id ? (
                      <span className="work-activity-badge">Linked customer</span>
                    ) : null}
                  </td>
                  <td>{r.kind}</td>
                  <td>
                    <div>{r.summary}</div>
                    {r.body ? <div className="work-activity-note">{r.body}</div> : null}
                  </td>
                  <td>{r.actor_name || r.actor_role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
