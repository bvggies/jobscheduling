import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { feedbackAPI } from '../../services/api';
import { FiSend } from 'react-icons/fi';
import './CustomerPages.css';

export default function CustomerFeedback() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await feedbackAPI.getAll();
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await feedbackAPI.create({ subject, message });
      setSubject('');
      setMessage('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="customer-page-header">
        <h1>Feedback</h1>
        <p>Send a message to the shop. You will see replies here when staff respond.</p>
      </div>

      <form className="customer-form-panel" onSubmit={handleSubmit}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>New message</h2>
        {error ? <div className="auth-error">{error}</div> : null}
        <div className="form-group">
          <label className="form-label" htmlFor="fb-subject">
            Subject
          </label>
          <input
            id="fb-subject"
            className="form-control"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="fb-message">
            Message
          </label>
          <textarea
            id="fb-message"
            className="form-control"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          <FiSend /> {submitting ? 'Sending…' : 'Send'}
        </button>
      </form>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Your threads</h2>
      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No messages yet.</p>
      ) : (
        <div className="customer-feedback-list">
          {items.map((f) => (
            <article key={f.id} className="customer-feedback-card">
              <h3>{f.subject}</h3>
              <div className="customer-feedback-meta">
                {format(new Date(f.created_at), 'MMM d, yyyy h:mm a')} · {f.status}
              </div>
              <div className="customer-feedback-body">{f.message}</div>
              {f.admin_reply ? (
                <div className="customer-reply">
                  <strong>Reply from the shop</strong>
                  {f.admin_reply}
                </div>
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Awaiting reply…</p>
              )}
            </article>
          ))}
        </div>
      )}
    </motion.div>
  );
}
