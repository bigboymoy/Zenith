/**
 * Analytics for Zenith. Tracks events via Firebase Analytics when available;
 * otherwise logs to console in development and no-ops in production until FA is available.
 * Never send PII in event properties (e.g. use sport type, not user name).
 */
import app from './firebase';

let analyticsInstance = null;
const isDev = import.meta.env.DEV;

function getAnalyticsInstance() {
  if (analyticsInstance !== null && analyticsInstance !== undefined) {
    return Promise.resolve(analyticsInstance);
  }
  return import('firebase/analytics')
    .then(({ getAnalytics }) => {
      if (app?.options?.measurementId) {
        analyticsInstance = getAnalytics(app);
        return analyticsInstance;
      }
      return null;
    })
    .catch(() => null);
}

/**
 * Track an analytics event. Properties must not contain PII.
 * @param {string} name - Event name (e.g. 'login', 'activity_added')
 * @param {Record<string, string | number | boolean>} [props] - Optional event properties (no PII)
 */
export function trackEvent(name, props = {}) {
  const safeProps = props && typeof props === 'object' ? { ...props } : {};
  if (isDev) {
    console.log('[Analytics]', name, safeProps);
  }
  getAnalyticsInstance()
    .then((fa) => {
      if (fa) {
        return import('firebase/analytics').then(({ logEvent }) => {
          logEvent(fa, name, safeProps);
        });
      }
    })
    .catch((err) => {
      if (isDev) console.warn('[Analytics] logEvent failed:', err);
    });
}
