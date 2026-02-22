import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createSegmentFromTrack } from '../lib/segments';
import { firestoreSegments } from '../lib/firestore';
import { SPORTS } from '../lib/constants';
import { COPY } from '../lib/copy';

const MI_TO_KM = 1.60934;

export default function CreateSegmentModal({ activity, onClose, onCreated }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const track = activity?.track;
  const sport = activity?.sport || 'run';

  const [name, setName] = useState('');
  const [startMi, setStartMi] = useState('0');
  const [endMi, setEndMi] = useState(activity?.distance ? String(Number(activity.distance).toFixed(2)) : '1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!track?.length || !uid) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const n = name.trim();
    if (!n) {
      setError(COPY.segmentsNameRequired);
      return;
    }
    const start = parseFloat(startMi);
    const end = parseFloat(endMi);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      setError(COPY.segmentsInvalidRange);
      return;
    }
    setSaving(true);
    try {
      const startKm = start * MI_TO_KM;
      const endKm = end * MI_TO_KM;
      const segment = createSegmentFromTrack({
        track,
        sport,
        name: n,
        startKm,
        endKm,
        createdBy: uid,
      });
      if (!segment) {
        setError(COPY.segmentsCreateFailed);
        setSaving(false);
        return;
      }
      await firestoreSegments.add(segment);
      onCreated?.(segment);
      onClose();
    } catch (err) {
      console.error('Create segment failed:', err);
      setError(COPY.segmentsCreateFailed);
    } finally {
      setSaving(false);
    }
  };

  const sportLabel = SPORTS[sport]?.label ?? sport;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-segment-title"
      >
        <div className="modal-header">
          <h2 id="create-segment-title" className="modal-title">{COPY.segmentsCreateSegment}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.dismissNotification}>×</button>
        </div>
        <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>
          From: {activity?.title} ({sportLabel})
        </p>
        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="segment-name">{COPY.segmentsSegmentName}</label>
          <input
            id="segment-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Park Loop Hill"
            autoFocus
          />
          <label className="form-label" htmlFor="segment-start">{COPY.segmentsStartDistance}</label>
          <input
            id="segment-start"
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            value={startMi}
            onChange={(e) => setStartMi(e.target.value)}
          />
          <label className="form-label" htmlFor="segment-end">{COPY.segmentsEndDistance}</label>
          <input
            id="segment-end"
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            value={endMi}
            onChange={(e) => setEndMi(e.target.value)}
          />
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 8 }} role="alert">{error}</p>
          )}
          <div className="form-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{COPY.cancel}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? COPY.loading : COPY.segmentsCreate}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
