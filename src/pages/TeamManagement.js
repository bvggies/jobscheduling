import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiTool, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { format } from 'date-fns';
import { usersAPI } from '../services/api';

const emptyForm = { name: '', email: '', password: '' };

export default function TeamManagement() {
  const [tab, setTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [cRes, wRes] = await Promise.all([usersAPI.getCustomers(), usersAPI.getWorkers()]);
      setCustomers(cRes.data || []);
      setWorkers(wRes.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = tab === 'customers' ? customers : workers;

  const openCreate = () => {
    setCreateForm(emptyForm);
    setCreateOpen(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (tab === 'customers') {
        await usersAPI.createCustomer(createForm);
      } else {
        await usersAPI.createWorker(createForm);
      }
      setCreateOpen(false);
      setCreateForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create account');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name || '', email: u.email || '', password: '' });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    setError('');
    try {
      const payload = { name: editForm.name, email: editForm.email };
      if (editForm.password.trim()) payload.password = editForm.password;
      await usersAPI.updateUser(editUser.id, payload);
      setEditUser(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update user');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Remove ${u.name || u.email} from the system? This cannot be undone.`)) return;
    setError('');
    try {
      await usersAPI.deleteUser(u.id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete user');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p>Create and manage portal customers and shop floor workers</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Add {tab === 'customers' ? 'customer' : 'worker'}
        </button>
      </div>

      {error ? <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div> : null}

      <div className="card" style={{ marginBottom: '1rem', padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn ${tab === 'customers' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('customers')}
          >
            <FiUsers /> Customers
          </button>
          <button
            type="button"
            className={`btn ${tab === 'workers' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('workers')}
          >
            <FiTool /> Workers
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading" style={{ minHeight: 200 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      No {tab} yet. Use Add to create one.
                    </td>
                  </tr>
                ) : (
                  list.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Edit"
                          onClick={() => openEdit(u)}
                          aria-label="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-danger"
                          title="Delete"
                          onClick={() => removeUser(u)}
                          aria-label="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen ? (
        <div className="modal-overlay" onClick={() => !saving && setCreateOpen(false)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="modal-header">
              <h3>New {tab === 'customers' ? 'customer' : 'worker'}</h3>
              <button type="button" className="modal-close" onClick={() => !saving && setCreateOpen(false)} disabled={saving}>
                ×
              </button>
            </div>
            <form onSubmit={submitCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password (min 8 characters)</label>
                  <input
                    type="password"
                    className="form-control"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}

      {editUser ? (
        <div className="modal-overlay" onClick={() => !saving && setEditUser(null)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Edit {editUser.name}</h3>
              <button type="button" className="modal-close" onClick={() => !saving && setEditUser(null)} disabled={saving}>
                ×
              </button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New password (leave blank to keep)</label>
                  <input
                    type="password"
                    className="form-control"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    minLength={editForm.password ? 8 : 0}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditUser(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
}
