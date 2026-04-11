import React from 'react';
import authHeroUrl from '../assets/auth-hero.svg';

/**
 * Wraps login/register so the hero image URL is resolved by webpack (works with any PUBLIC_URL / homepage).
 */
export default function AuthPageChrome({ children }) {
  return (
    <div className="auth-page">
      <div
        className="auth-page-bg"
        style={{ backgroundImage: `url(${authHeroUrl})` }}
        aria-hidden
      />
      <div className="auth-page-scrim" aria-hidden />
      <div className="auth-page-vignette" aria-hidden />
      {children}
    </div>
  );
}
