import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../App';
import { firestoreClubs } from '../lib/firestore';
import { COPY } from '../lib/copy';

function CreateClubModal({ onClose, onCreated, toast }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { currentUser } = useAuth();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast(COPY.clubsNameRequired, 'error', '❌');
      return;
    }
    if (!currentUser?.uid) return;
    setSaving(true);
    try {
      const club = await firestoreClubs.create(currentUser.uid, {
        name: name.trim(),
        description: description.trim(),
      });
      toast(COPY.clubsCreated, 'success', '✅');
      onCreated(club);
      onClose();
    } catch (err) {
      console.error('Create club failed:', err);
      toast(COPY.clubsCreateFailed, 'error', '❌');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="create-club-title">
        <div className="modal-header">
          <h2 id="create-club-title" className="modal-title">{COPY.clubsCreateClubTitle}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.profileCloseModal}>×</button>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="form-group">
            <label className="form-label">{COPY.clubsName}</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={COPY.clubsNamePlaceholder}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{COPY.clubsDescription}</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={COPY.clubsDescriptionPlaceholder}
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={onClose}>{COPY.cancel}</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? COPY.loading : COPY.clubsCreate}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Clubs() {
  const { currentUser } = useAuth();
  const { toast } = useApp();
  const uid = currentUser?.uid;
  const [tab, setTab] = useState('mine');
  const [myClubs, setMyClubs] = useState([]);
  const [discoverClubs, setDiscoverClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [mine, discover] = await Promise.all([
          uid ? firestoreClubs.getByMember(uid) : [],
          firestoreClubs.getDiscover(50),
        ]);
        if (!cancelled) {
          setMyClubs(Array.isArray(mine) ? mine : []);
          setDiscoverClubs(Array.isArray(discover) ? discover : []);
        }
      } catch (err) {
        console.error('Load clubs failed:', err);
        if (!cancelled) {
          setMyClubs([]);
          setDiscoverClubs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [uid]);

  const list = tab === 'mine' ? myClubs : discoverClubs;
  const emptyCopy = tab === 'mine' ? COPY.clubsEmptyMyDesc : COPY.clubsEmptyDiscoverDesc;

  const handleClubCreated = (club) => {
    setMyClubs((prev) => (prev.some((c) => c.id === club.id) ? prev : [club, ...prev]));
  };

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{COPY.clubsTitle}</h1>
          <p className="page-subtitle">{COPY.clubsSubtitle}</p>
        </div>
        {uid && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            aria-label={COPY.clubsCreateClub}
          >
            <Plus size={18} aria-hidden="true" /> {COPY.clubsCreateClub}
          </button>
        )}
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`filter-chip ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => setTab('mine')}
          aria-pressed={tab === 'mine'}
        >
          {COPY.clubsMyClubs}
        </button>
        <button
          type="button"
          className={`filter-chip ${tab === 'discover' ? 'active' : ''}`}
          onClick={() => setTab('discover')}
          aria-pressed={tab === 'discover'}
        >
          {COPY.clubsDiscover}
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: 24 }}>{COPY.loading}</p>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">👥</span>
          <h3 className="empty-title">{COPY.clubsEmptyTitle}</h3>
          <p className="empty-desc">{emptyCopy}</p>
          {uid && tab === 'mine' && (
            <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
              {COPY.clubsCreateClub}
            </button>
          )}
        </div>
      ) : (
        <div className="activity-list">
          {list.map((club) => {
            const count = (club.memberIds || []).length;
            const isMember = uid && (club.memberIds || []).includes(uid);
            return (
              <Link
                key={club.id}
                to={`/clubs/${club.id}`}
                className="activity-card"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className="activity-sport-icon" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                  <UsersRound size={20} aria-hidden="true" />
                </div>
                <div className="activity-info" style={{ flex: 1 }}>
                  <div className="activity-title">{club.name}</div>
                  {club.description ? (
                    <div className="activity-meta" style={{ marginTop: 4 }}>
                      {club.description.slice(0, 80)}{club.description.length > 80 ? '…' : ''}
                    </div>
                  ) : null}
                  <div className="activity-meta" style={{ marginTop: 6 }}>
                    <span className="activity-stat">
                      <UsersRound size={12} /> {count} {count === 1 ? COPY.clubsMemberCount : COPY.clubsMemberCountPlural}
                    </span>
                    {isMember && (
                      <span className="badge" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                        Member
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateClubModal
          onClose={() => setShowCreate(false)}
          onCreated={handleClubCreated}
          toast={toast}
        />
      )}
    </div>
  );
}

// useApp is used in CreateClubModal