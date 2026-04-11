import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PrivateRoute({ allowedRoles }) {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Loading session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'admin' ? '/dashboard' : '/portal';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
