import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { COPY } from '../lib/copy';

const LOGIN_TIMEOUT_MS = 10000;

function getLoginErrorMessage(err) {
  if (err?.message === 'LOGIN_TIMEOUT') return COPY.errorLoginTimeout;
  if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
    return COPY.errorIncorrectCredentials;
  }
  if (err?.code === 'auth/too-many-requests') return COPY.errorTooManyAttempts;
  return COPY.errorLoginGeneric;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const loginPromise = login(email.trim(), password);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), LOGIN_TIMEOUT_MS);
      });

      await Promise.race([loginPromise, timeoutPromise]);
      trackEvent('login', { method: 'email' });
      navigate('/');
    } catch (err) {
      setError(getLoginErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">Z</div>
          <h1 className="auth-title">{COPY.authWelcomeBack}</h1>
          <p className="auth-subtitle">{COPY.authLoginSubtitle}</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" aria-label={COPY.authLoginFormLabel}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">{COPY.authEmailAddress}</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder={COPY.authPlaceholderEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">{COPY.authPassword}</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder={COPY.authPlaceholderPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading} aria-busy={loading}>
            {loading ? COPY.authLoggingIn : <><LogIn size={18} /> {COPY.authLogIn}</>}
          </button>
        </form>

        <div className="auth-footer">
          {COPY.authNoAccount} <Link to="/signup">{COPY.authSignUp}</Link>
        </div>
      </div>
    </div>
  );
}
