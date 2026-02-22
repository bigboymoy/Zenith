import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SPORTS } from '../lib/constants';
import { firestoreUser } from '../lib/firestore';
import { COPY } from '../lib/copy';
import { trackEvent } from '../lib/analytics';

const ONBOARDING_STORAGE_KEY = 'zenith_onboarding_done';

export function getOnboardingDone() {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch (e) {
    console.warn('Could not persist onboarding completion', e);
  }
}

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: COPY.onboardingLoseWeight },
  { value: 'build_muscle', label: COPY.onboardingBuildMuscle },
  { value: 'stay_active', label: COPY.onboardingStayActive },
];

export default function Onboarding({ user, onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [primarySport, setPrimarySport] = useState(user?.primarySport || 'run');
  const [goal, setGoal] = useState(user?.goal || 'stay_active');
  const overlayRef = useRef(null);

  useEffect(() => {
    trackEvent('onboarding_started');
  }, []);

  // Move focus into the step content when step changes
  useEffect(() => {
    const focusable = overlayRef.current?.querySelectorAll(
      'button, [href], input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    if (first) first.focus();
  }, [step]);

  const handleGetStarted = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else {
      trackEvent('onboarding_completed', { step_reached: 3 });
      setOnboardingDone();
      onComplete?.();
      // Navigate to Dashboard and ask it to open Add Activity (via location state)
      navigate('/', { state: { openAddActivity: true }, replace: true });
    }
  };

  const handleSkipProfile = () => {
    trackEvent('onboarding_skipped', { step: 2 });
    setStep(3);
  };

  const handleSaveProfileAndContinue = async () => {
    if (user?.uid) {
      try {
        await firestoreUser.update(user.uid, { primarySport, goal });
      } catch (e) {
        console.warn('Could not save onboarding profile', e);
      }
    }
    setStep(3);
  };

  return (
    <div
      ref={overlayRef}
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="onboarding-card">
        {step === 1 && (
          <>
            <h1 id="onboarding-title" className="onboarding-headline">{COPY.onboardingStep1Title}</h1>
            <p className="onboarding-body">
              {COPY.onboardingStep1Body}
            </p>
            <button type="button" className="btn btn-primary btn-lg onboarding-cta" onClick={handleGetStarted}>
              {COPY.onboardingGetStarted}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 id="onboarding-title" className="onboarding-headline">{COPY.onboardingStep2Title}</h1>
            <div className="form-group">
              <label className="form-label">{COPY.onboardingMainFocus}</label>
              <div className="onboarding-options">
                {Object.entries(SPORTS).map(([key, s]) => (
                  <button
                    key={key}
                    type="button"
                    className={`onboarding-option ${primarySport === key ? 'active' : ''}`}
                    onClick={() => setPrimarySport(key)}
                    aria-pressed={primarySport === key}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{COPY.onboardingMainGoal}</label>
              <div className="onboarding-options">
                {GOAL_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`onboarding-option ${goal === o.value ? 'active' : ''}`}
                    onClick={() => setGoal(o.value)}
                    aria-pressed={goal === o.value}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="onboarding-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={handleSaveProfileAndContinue}>
                {COPY.onboardingContinue}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleSkipProfile}>
                {COPY.onboardingSkipForNow}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 id="onboarding-title" className="onboarding-headline">{COPY.onboardingStep3Title}</h1>
            <p className="onboarding-body">
              {COPY.onboardingStep3Body}
            </p>
            <button type="button" className="btn btn-primary btn-lg onboarding-cta" onClick={handleGetStarted}>
              {COPY.onboardingLogFirstWorkout}
            </button>
          </>
        )}

        <div className="onboarding-dots" aria-hidden="true">
          {[1, 2, 3].map((s) => (
            <span key={s} className={s === step ? 'active' : ''} />
          ))}
        </div>
      </div>
    </div>
  );
}
