import React from 'react';
import { COPY } from '../lib/copy';

/**
 * Catches render errors in the tree, shows a minimal fallback UI, and logs to console (no PII).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught an error:', error?.message ?? String(error), errorInfo?.componentStack ?? '');
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="error-boundary-fallback"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'var(--bg, #0a0e27)',
            color: 'var(--text, #e8e9f3)',
            fontFamily: 'var(--font)',
            textAlign: 'center',
          }}
        >
          <p style={{ marginBottom: 16, fontSize: '1rem' }}>{COPY.errorBoundaryMessage}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.handleRetry}
          >
            {COPY.retry}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
