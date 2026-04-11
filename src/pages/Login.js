import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const { user, authReady, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authReady && user) {
    const home =
      user.role === 'admin' ? '/dashboard' : user.role === 'worker' ? '/worker' : '/portal';
    return <Navigate to={home} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      const home = u.role === 'admin' ? '/dashboard' : u.role === 'worker' ? '/worker' : '/portal';
      navigate(home, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Unable to sign in.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden />
      <div className="auth-page-scrim" aria-hidden />
      <div className="auth-page-vignette" aria-hidden />
      <motion.div className="auth-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        <div className="auth-logo">
          <img src="/logo.svg" alt="" />
          <span className="auth-brand-name">JobScheduler</span>
        </div>
        <h1>Sign in</h1>
        <p className="auth-sub">Sign in with your admin, customer, or worker account.</p>
        {error ? <div className="auth-error">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="auth-footer">
          New customer? <Link to="/register">Create an account</Link>
        </div>
      </motion.div>
    </div>
  );
}
