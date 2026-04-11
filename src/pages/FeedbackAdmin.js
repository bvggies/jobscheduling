import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { feedbackAPI } from '../services/api';
import { FiSend, FiCheckCircle } from 'react-icons/fi';
import './customer/CustomerPages.css';

export default function FeedbackAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [busyId, setBusyId] = useState(null);

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

  const sendReply = async (id) => {
    const text = (replyText[id] || '').trim();
    if (!text) return;
    setBusyId(id);
    try {
      await feedbackAPI.reply(id, text);
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to send reply');
    } finally {
      setBusyId(null);
    }
  };

  const closeThread = async (id) => {
    setBusyId(id);
    try {
      await feedbackAPI.setStatus(id, 'closed');
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="feedback-admin-page">
      <div className="page-header">
        <div>
          <h1>Customer feedback</h1>
          <p>Read messages from customers and post replies. They see replies in their portal.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="customer-info-panel">
          <p>No feedback submissions yet.</p>
        </div>
      ) : (
        <div className="customer-feedback-list">
          {items.map((f) => (
            <article key={f.id} className="customer-feedback-card">
              <h3>{f.subject}</h3>
              <div className="customer-feedback-meta">
                {f.user_name} ({f.user_email}) · {format(new Date(f.created_at), 'MMM d, yyyy h:mm a')} · {f.status}
              </div>
              <div className="customer-feedback-body">{f.message}</div>
              {f.admin_reply ? (
                <div className="customer-reply">
                  <strong>Your reply</strong>
                  {f.admin_reply}
                </div>
              ) : null}
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Reply to customer</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={replyText[f.id] ?? ''}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  placeholder="Type a reply…"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busyId === f.id}
                  onClick={() => sendReply(f.id)}
                >
                  <FiSend /> {busyId === f.id ? 'Saving…' : 'Send reply'}
                </button>
                {f.status !== 'closed' ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={busyId === f.id}
                    onClick={() => closeThread(f.id)}
                  >
                    <FiCheckCircle /> Mark closed
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </motion.div>
  );
}
