import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { COPY } from '../lib/copy';

function getSignupErrorMessage(err) {
  if (err?.code === 'auth/email-already-in-use') return COPY.errorEmailInUse;
  if (err?.code === 'auth/invalid-email') return COPY.errorInvalidEmail;
  if (err?.code === 'auth/weak-password') return COPY.errorWeakPassword;
  if (err?.code === 'auth/network-request-failed' || err?.message?.toLowerCase?.().includes('unavailable') || err?.message?.toLowerCase?.().includes('connection')) {
    return COPY.errorNetwork;
  }
  return COPY.errorSignupGeneric;
}

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError(COPY.errorPasswordsNoMatch);
      return;
    }

    try {
      setError('');
      setLoading(true);
      await signup(email.trim(), password, name.trim());
      navigate('/');
    } catch (err) {
      setError(getSignupErrorMessage(err));
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
          <h1 className="auth-title">{COPY.authCreateAccount}</h1>
          <p className="auth-subtitle">{COPY.authSignupSubtitle}</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" aria-label={COPY.authSignupFormLabel}>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">{COPY.authFullName}</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} aria-hidden="true" />
              <input
                id="signup-name"
                type="text"
                className="form-input"
                placeholder={COPY.authPlaceholderName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">{COPY.authEmailAddress}</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} aria-hidden="true" />
              <input
                id="signup-email"
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
            <label className="form-label" htmlFor="signup-password">{COPY.authPassword}</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} aria-hidden="true" />
              <input
                id="signup-password"
                type="password"
                className="form-input"
                placeholder={COPY.authPlaceholderPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirm-password">{COPY.authConfirmPassword}</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} aria-hidden="true" />
              <input
                id="signup-confirm-password"
                type="password"
                className="form-input"
                placeholder={COPY.authPlaceholderPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading} aria-busy={loading}>
            {loading ? COPY.authCreatingAccount : <><UserPlus size={18} /> {COPY.authSignUpButton}</>}
          </button>
        </form>

        <div className="auth-footer">
          {COPY.authHasAccount} <Link to="/login">{COPY.authLogInLink}</Link>
        </div>
      </div>
    </div>
  );
}
