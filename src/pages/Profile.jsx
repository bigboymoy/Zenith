import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Edit2, MapPin, Clock, Zap, Flame, Calendar, Settings, Plus, Trash2, X, FileStack, UserPlus, UserMinus, Link2, Apple } from 'lucide-react';
import { useApp } from '../App';
import { useAuth } from '../context/AuthContext';
import { firestoreUser, firestoreWorkoutTemplates, firestoreFollows } from '../lib/firestore';
import { settingsStorage } from '../lib/storage';
import { calculateStreak, formatDuration, getLevelInfo } from '../lib/gamification';
import { SPORTS } from '../lib/constants';
import { format } from 'date-fns';
import AddActivityModal from '../components/AddActivityModal';
import { COPY } from '../lib/copy';
import { AUDIO_CUES_INTERVAL_OPTIONS } from '../lib/audioCues';
import {
  getStravaAuthUrl,
  exchangeStravaCode,
  saveStravaTokens,
  getStravaIntegration,
  disconnectStrava,
  importStravaActivities,
} from '../lib/strava';
import {
  isHealthImportAvailable,
  getHealthLastImport,
  importHealthWorkouts,
} from '../lib/health';

function EditProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [primarySport, setPrimarySport] = useState(user?.primarySport || 'run');
  const { toast } = useApp();

  const handleSave = async () => {
    if (!name.trim()) { toast(COPY.profileNameRequired, 'error', '❌'); return; }
    try {
      await firestoreUser.update(user.uid, { 
        name: name.trim(), 
        username: username.trim(), 
        primarySport 
      });
      toast(COPY.profileUpdated, 'success', '✅');
      onSave(); // Refresh via context listener
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast(COPY.profileUpdateFailed, 'error', '❌');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <div className="modal-header">
          <h2 id="edit-profile-title" className="modal-title">{COPY.profileEditProfileTitle}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.profileCloseModal}><Edit2 size={18} aria-hidden="true" /></button>
        </div>
        <div className="form-group">
          <label className="form-label">{COPY.profileDisplayName}</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{COPY.profileUsername}</label>
          <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder={COPY.profilePlaceholderUsername} />
        </div>
        <div className="form-group">
          <label className="form-label">{COPY.profilePrimarySport}</label>
          <select className="form-select" value={primarySport} onChange={e => setPrimarySport(e.target.value)}>
            {Object.entries(SPORTS).map(([k, s]) => (
              <option key={k} value={k}>{s.icon} {s.label}</option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>{COPY.cancel}</button>
          <button className="btn btn-primary" onClick={handleSave}>{COPY.profileSaveChanges}</button>
        </div>
      </div>
    </div>
  );
}

// ── Followers / Following list modal ───────────────────────────────────────
function FollowListModal({ listType, userId, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const load = listType === 'followers'
      ? () => firestoreFollows.getFollowersWithProfiles(userId)
      : () => firestoreFollows.getFollowingWithProfiles(userId);
    load().then(setList).finally(() => setLoading(false));
  }, [userId, listType]);

  const title = listType === 'followers' ? COPY.socialFollowersListTitle : COPY.socialFollowingListTitle;
  const emptyMsg = listType === 'followers' ? COPY.socialNoFollowers : COPY.socialNoFollowing;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="follow-list-title">
        <div className="modal-header">
          <h2 id="follow-list-title" className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.profileCloseModal}><X size={18} aria-hidden="true" /></button>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ color: 'var(--text-2)', padding: 16 }}>{COPY.loading}</p>
          ) : list.length === 0 ? (
            <p style={{ color: 'var(--text-2)', padding: 16 }}>{emptyMsg}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {list.map(p => {
                const initials = p.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
                return (
                  <li key={p.uid} style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                    <Link
                      to={`/profile/${p.uid}`}
                      onClick={onClose}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="avatar sm" style={{ flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name || COPY.profileAthlete}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{'@'}{p.username || (p.uid && p.uid.slice(0, 8)) || '—'}</div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{COPY.socialViewProfile}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Template create/edit modal ─────────────────────────────────────────────
function TemplateModal({ template, currentUserId, onClose, onSave }) {
  const isEdit = Boolean(template?.id);
  const [name, setName] = useState(template?.name || '');
  const [exercises, setExercises] = useState(
    template?.exercises?.length
      ? template.exercises.map(e => ({ name: e.name, setsCount: String(e.setsCount || 1) }))
      : [{ name: '', setsCount: '3' }]
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useApp();

  const addExercise = () => setExercises(prev => [...prev, { name: '', setsCount: '3' }]);
  const removeExercise = i => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const updateExercise = (i, field, value) =>
    setExercises(prev => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));

  const handleSave = async () => {
    if (!name.trim()) { toast(COPY.templatesNameRequired, 'error', '❌'); return; }
    const cleaned = exercises
      .map(e => ({ name: (e.name || '').trim(), setsCount: Math.max(1, parseInt(e.setsCount, 10) || 1) }))
      .filter(e => e.name);
    if (!cleaned.length) { toast(COPY.templatesOneExerciseRequired, 'error', '❌'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await firestoreWorkoutTemplates.update(template.id, { name: name.trim(), exercises: cleaned });
        toast(COPY.templatesUpdated, 'success', '✅');
      } else {
        if (!currentUserId) { toast(COPY.addActivityMustBeLoggedIn, 'error', '❌'); setSaving(false); return; }
        await firestoreWorkoutTemplates.create(currentUserId, { name: name.trim(), sport: 'lift', exercises: cleaned });
        toast(COPY.templatesCreated, 'success', '✅');
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Template save failed:', err);
      toast(COPY.templatesCreateFailed, 'error', '❌');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="template-modal-title">
        <div className="modal-header">
          <h2 id="template-modal-title" className="modal-title">
            {isEdit ? COPY.templatesEditTemplate : COPY.templatesNewTemplate}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.addActivityCloseModal}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">{COPY.templatesTemplateName}</label>
          <input
            className="form-input"
            placeholder={COPY.templatesPlaceholderName}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{COPY.templatesExercises}</label>
          {exercises.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                className="form-input"
                placeholder={COPY.addActivityPlaceholderExercise}
                value={ex.name}
                onChange={e => updateExercise(i, 'name', e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                className="form-input"
                placeholder={COPY.templatesSetsCount}
                min={1}
                value={ex.setsCount}
                onChange={e => updateExercise(i, 'setsCount', e.target.value)}
                style={{ width: 70 }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{COPY.templatesSetsCount}</span>
              {exercises.length > 1 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeExercise(i)} aria-label="Remove exercise">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addExercise}>
            <Plus size={14} /> {COPY.templatesAddExercise}
          </button>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{COPY.cancel}</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? COPY.addActivitySaving : (isEdit ? COPY.profileSaveChanges : COPY.done)}
          </button>
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_VISIBILITY_OPTIONS = [
  { value: 'public', label: COPY.privacyVisibilityPublic },
  { value: 'followers', label: COPY.privacyVisibilityFollowers },
  { value: 'private', label: COPY.privacyVisibilityPrivate },
];

function SettingsPanel({ settings, onUpdate, user, onActivityPrivacyUpdate }) {
  const defaultVisibility = user?.defaultActivityVisibility ?? 'public';
  const defaultHideMap = Boolean(user?.defaultHideMap);
  const defaultHideStartTime = Boolean(user?.defaultHideStartTime);
  const [privacySaving, setPrivacySaving] = useState(false);

  const handleActivityPrivacyChange = async (patch) => {
    if (!user?.uid || !onActivityPrivacyUpdate) return;
    setPrivacySaving(true);
    try {
      await onActivityPrivacyUpdate(patch);
    } finally {
      setPrivacySaving(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">{COPY.profileSettingsTitle}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              label: COPY.profileUnits, key: 'units',
              options: [{ value: 'imperial', label: COPY.profileImperial }, { value: 'metric', label: COPY.profileMetric }]
            },
            {
              label: COPY.profilePrivacy, key: 'privacy',
              options: [{ value: 'public', label: COPY.profilePublic }, { value: 'friends', label: COPY.profileFriendsOnly }, { value: 'private', label: COPY.profilePrivate }]
            },
          ].map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>{s.label}</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={settings[s.key] || s.options[0].value}
                onChange={e => onUpdate({ [s.key]: e.target.value })}
              >
                {s.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>{COPY.profileNotifications}</span>
            <button
              onClick={() => onUpdate({ notifications: !settings.notifications })}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: settings.notifications ? 'var(--text)' : 'var(--surface-3)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: settings.notifications ? 23 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>{COPY.audioCuesTitle}</span>
              <button
                onClick={() => onUpdate({ audioCuesEnabled: !settings.audioCuesEnabled })}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: settings.audioCuesEnabled ? 'var(--text)' : 'var(--surface-3)',
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3,
                  left: settings.audioCuesEnabled ? 23 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {settings.audioCuesEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{COPY.audioCuesInterval}</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', padding: '6px 12px' }}
                  value={settings.audioCuesInterval || '1_mi'}
                  onChange={e => onUpdate({ audioCuesInterval: e.target.value })}
                >
                  {AUDIO_CUES_INTERVAL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{COPY[o.labelKey]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity privacy defaults (Strava-style) */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">{COPY.activityDetailPrivacy}</span>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--text-2)' }}>
          Defaults for new activities. You can change these per activity when logging.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>{COPY.privacyActivityVisibility}</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={defaultVisibility}
              onChange={e => handleActivityPrivacyChange({ defaultActivityVisibility: e.target.value })}
              disabled={privacySaving}
            >
              {ACTIVITY_VISIBILITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>{COPY.privacyHideMapByDefault}</span>
            <button
              type="button"
              onClick={() => handleActivityPrivacyChange({ defaultHideMap: !defaultHideMap })}
              disabled={privacySaving}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: defaultHideMap ? 'var(--text)' : 'var(--surface-3)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s',
              }}
              aria-pressed={defaultHideMap}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: defaultHideMap ? 23 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>{COPY.privacyHideStartTimeByDefault}</span>
            <button
              type="button"
              onClick={() => handleActivityPrivacyChange({ defaultHideStartTime: !defaultHideStartTime })}
              disabled={privacySaving}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: defaultHideStartTime ? 'var(--text)' : 'var(--surface-3)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s',
              }}
              aria-pressed={defaultHideStartTime}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: defaultHideStartTime ? 23 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Profile() {
  const { userId: routeUserId } = useParams();
  const { logout, currentUser } = useAuth();
  const { user, activities, achievements, settings, refreshUser, toast, onActivityAdded } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [tab, setTab] = useState('stats');
  const [templates, setTemplates] = useState([]);
  const [templateModal, setTemplateModal] = useState(null); // null | { template: null } for create | { template } for edit
  const [deleteConfirm, setDeleteConfirm] = useState(null);  // { id, name }

  const isViewingOther = Boolean(routeUserId && routeUserId !== currentUser?.uid);
  const targetUid = routeUserId || currentUser?.uid;

  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listModal, setListModal] = useState(null); // null | { type: 'followers'|'following', userId }
  const [stravaIntegration, setStravaIntegration] = useState(null);
  const [healthLastImport, setHealthLastImport] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectProgress, setConnectProgress] = useState('');
  const [connectError, setConnectError] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) {
      setTemplates([]);
      return;
    }
    const unsub = firestoreWorkoutTemplates.subscribe(currentUser.uid, setTemplates);
    return unsub;
  }, [currentUser?.uid]);

  // Load other user profile and follow state when viewing someone else
  useEffect(() => {
    if (!isViewingOther || !routeUserId || !currentUser?.uid) {
      if (!isViewingOther) setProfileUser(null);
      return;
    }
    setProfileLoading(true);
    Promise.all([
      firestoreUser.get(routeUserId),
      firestoreFollows.isFollowing(currentUser.uid, routeUserId),
      firestoreFollows.getFollowers(routeUserId),
      firestoreFollows.getFollowing(routeUserId),
    ]).then(([userData, following, followers, followingList]) => {
      setProfileUser(userData ? { uid: routeUserId, ...userData } : null);
      setIsFollowing(!!following);
      setFollowersCount(followers?.length ?? 0);
      setFollowingCount(followingList?.length ?? 0);
    }).catch(err => console.error('Profile load error:', err)).finally(() => setProfileLoading(false));
  }, [isViewingOther, routeUserId, currentUser?.uid]);

  // Load followers/following counts for own profile
  useEffect(() => {
    if (!currentUser?.uid || isViewingOther) return;
    Promise.all([
      firestoreFollows.getFollowers(currentUser.uid),
      firestoreFollows.getFollowing(currentUser.uid),
    ]).then(([followers, followingList]) => {
      setFollowersCount(followers?.length ?? 0);
      setFollowingCount(followingList?.length ?? 0);
    }).catch(err => console.error('Follow counts error:', err));
  }, [currentUser?.uid, isViewingOther]);

  // Handle Strava OAuth return: URL has ?code= (or #/profile?code= with HashRouter)
  useEffect(() => {
    if (!currentUser?.uid || isViewingOther) return;
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
    const code = params.get('code');
    if (!code) return;
    setTab('connect');
    setConnectLoading(true);
    setConnectError('');
    exchangeStravaCode(code)
      .then(async (tokens) => {
        if (tokens) {
          await saveStravaTokens(currentUser.uid, tokens);
          setStravaIntegration(await getStravaIntegration(currentUser.uid));
          toast('Strava connected', 'success', '✅');
        }
        window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
      })
      .catch((err) => {
        setConnectError(err?.message || 'Could not connect Strava');
        toast(COPY.connectImportFailed, 'error', '❌');
      })
      .finally(() => setConnectLoading(false));
  }, [currentUser?.uid, isViewingOther, toast]);

  // Load Connect tab data (Strava + Health status)
  useEffect(() => {
    if (!currentUser?.uid || isViewingOther) return;
    if (tab !== 'connect') return;
    getStravaIntegration(currentUser.uid).then(setStravaIntegration);
    getHealthLastImport(currentUser.uid).then(setHealthLastImport);
  }, [currentUser?.uid, isViewingOther, tab]);

  const displayUser = isViewingOther ? profileUser : user;
  const handleFollow = async () => {
    if (!currentUser?.uid || !routeUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await firestoreFollows.unfollow(currentUser.uid, routeUserId);
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
        toast(COPY.profileUnfollow + ' ✓', 'info', '👤');
      } else {
        await firestoreFollows.follow(currentUser.uid, routeUserId);
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
        toast(COPY.profileFollow + ' ✓', 'success', '✨');
      }
    } catch (err) {
      console.error('Follow/unfollow error:', err);
      toast(COPY.profileUpdateFailed, 'error', '❌');
    } finally {
      setFollowLoading(false);
    }
  };
  const openListModal = (type, uid) => setListModal({ type, userId: uid || targetUid });
  const closeListModal = () => setListModal(null);

  const stats = useMemo(() => {
    const streak = calculateStreak(activities);
    const totalDist = activities.filter(a => a.distance).reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = activities.reduce((s, a) => s + (a.duration || 0), 0);
    const totalVol = activities.filter(a => a.volume).reduce((s, a) => s + (a.volume || 0), 0);
    const totalXP = user?.xp || 0;
    return { streak, totalDist, totalTime, totalVol, totalXP, totalWorkouts: activities.length };
  }, [activities, user]);

  const earnedBadges = achievements.filter(a => a.earned);

  const handleSettingsUpdate = (patch) => {
    const updated = settingsStorage.update(patch);
    setLocalSettings(updated);
  };

  if (isViewingOther && profileLoading) {
    return (
      <div className="page-header">
        <h1 className="page-title">{COPY.profileTitle}</h1>
        <p style={{ color: 'var(--text-2)' }}>{COPY.loading}</p>
      </div>
    );
  }
  if (isViewingOther && !profileUser) {
    return (
      <div>
        <div className="page-header">
          <Link to="/profile" className="btn btn-secondary">← {COPY.profileTitle}</Link>
        </div>
        <div className="empty-state">
          <p className="empty-desc">User not found.</p>
          <Link to="/profile" className="btn btn-primary">{COPY.profileTitle}</Link>
        </div>
      </div>
    );
  }

  const displayLevelInfo = getLevelInfo(displayUser?.xp || 0);
  const displaySport = SPORTS[displayUser?.primarySport || 'run'];
  const displayInitials = displayUser?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isViewingOther ? (displayUser?.name || COPY.profileAthlete) : COPY.profileTitle}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          {isViewingOther ? (
            <Link to="/profile" className="btn btn-secondary">← {COPY.profileTitle}</Link>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
                <Edit2 size={16} /> {COPY.profileEditProfile}
              </button>
              <button className="btn btn-danger" onClick={logout}>
                {COPY.profileLogOut}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div className="avatar xl">{displayInitials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
              {displayUser?.name || COPY.profileAthlete}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 6 }}>
              @{displayUser?.username || '—'} · {displaySport?.icon} {displaySport?.label}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-level">Level {displayLevelInfo.level} · {displayLevelInfo.title}</span>
              {!isViewingOther && (
                <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                  🔥 {stats.streak}d streak
                </span>
              )}
              {!isViewingOther && displayUser?.joinedAt && (
                <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                  <Calendar size={10} /> {COPY.profileJoined} {format(new Date(displayUser.joinedAt), 'MMM yyyy')}
                </span>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => openListModal('followers', targetUid)}
              >
                <strong>{followersCount}</strong> {COPY.profileFollowers}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => openListModal('following', targetUid)}
              >
                <strong>{followingCount}</strong> {COPY.profileFollowing}
              </button>
              {isViewingOther && currentUser?.uid && (
                <button
                  type="button"
                  className={isFollowing ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                  onClick={handleFollow}
                  disabled={followLoading}
                  style={{ marginLeft: 8 }}
                >
                  {followLoading ? COPY.loading : isFollowing ? <><UserMinus size={14} /> {COPY.profileUnfollow}</> : <><UserPlus size={14} /> {COPY.profileFollow}</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="xp-bar-container">
          <div className="xp-bar-labels">
            <span style={{ color: 'var(--text-2)', fontWeight: 600, fontSize: '0.8rem' }}>
              {(displayUser?.xp || 0).toLocaleString()} XP
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              {displayLevelInfo.progress}% to Level {displayLevelInfo.level + 1}
            </span>
          </div>
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${displayLevelInfo.progress}%` }} />
          </div>
        </div>
      </div>

      {listModal && (
        <FollowListModal
          listType={listModal.type}
          userId={listModal.userId}
          onClose={closeListModal}
        />
      )}

      {isViewingOther && (
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 24 }}>
          Their activities may appear in your feed when they’re shared.
        </p>
      )}

      {/* Tabs and content (own profile only) */}
      {!isViewingOther && (
      <>
      <div className="tabs">
        <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>{COPY.profileStats}</button>
        <button className={`tab-btn ${tab === 'badges' ? 'active' : ''}`} onClick={() => setTab('badges')}>
          {COPY.profileBadges} ({earnedBadges.length})
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>{COPY.profileHistory}</button>
        <button className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
          <FileStack size={14} /> {COPY.templatesTitle}
        </button>
        <button className={`tab-btn ${tab === 'connect' ? 'active' : ''}`} onClick={() => setTab('connect')}>
          <Link2 size={14} /> {COPY.connectTitle}
        </button>
        <button className={`tab-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          <Settings size={14} /> {COPY.profileSettings}
        </button>
      </div>

      {/* Stats tab */}
      {tab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: '🏋️', label: COPY.profileTotalWorkouts, value: stats.totalWorkouts },
            { icon: '📍', label: COPY.profileTotalDistance, value: `${stats.totalDist.toFixed(1)} mi` },
            { icon: '⏱️', label: COPY.profileTotalTime, value: formatDuration(stats.totalTime) },
            { icon: '⚡', label: COPY.profileTotalXp, value: stats.totalXP.toLocaleString() },
            { icon: '🔥', label: COPY.profileCurrentStreak, value: `${stats.streak}d` },
            { icon: '💪', label: COPY.profileVolumeLifted, value: stats.totalVol > 0 ? `${(stats.totalVol / 1000).toFixed(1)}k lbs` : '—' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badges tab */}
      {tab === 'badges' && (
        earnedBadges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">🏅</span>
            <h3 className="empty-title">{COPY.profileNoBadgesTitle}</h3>
            <p className="empty-desc">{COPY.profileNoBadgesDesc}</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>{COPY.dashboardLogWorkout}</button>
          </div>
        ) : (
          <div className="badges-grid">
            {earnedBadges.map(a => (
              <div key={a.id} className="badge-card earned">
                <span className="badge-icon">{a.icon}</span>
                <div className="badge-name">{a.name}</div>
                <div className="badge-desc">{a.description}</div>
                {a.earnedDate && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 4 }}>
                    {format(new Date(a.earnedDate), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* History tab */}
      {tab === 'history' && (
        activities.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">📋</span>
            <h3 className="empty-title">{COPY.profileNoHistoryTitle}</h3>
            <p className="empty-desc">{COPY.profileNoHistoryDesc}</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>{COPY.dashboardLogWorkout}</button>
          </div>
        ) : (
          <div className="activity-list">
            {activities.slice(0, 20).map(a => {
              const s = SPORTS[a.sport];
              const colors = {
                run: { bg: 'rgba(34,197,94,0.12)', color: 'var(--run)' },
                cycle: { bg: 'rgba(59,130,246,0.12)', color: 'var(--cycle)' },
                swim: { bg: 'rgba(6,182,212,0.12)', color: 'var(--swim)' },
                lift: { bg: 'rgba(245,158,11,0.12)', color: 'var(--lift)' },
              }[a.sport] || {};
              return (
                <div key={a.id} className="activity-card" style={{ cursor: 'default' }}>
                  <div className="activity-sport-icon" style={{ background: colors.bg, color: colors.color }}>
                    {s?.icon}
                  </div>
                  <div className="activity-info">
                    <div className="activity-title">{a.title}</div>
                    <div className="activity-meta">
                      {a.distance && <span className="activity-stat"><MapPin size={12} /> {a.distance.toFixed(1)} {s?.unit}</span>}
                      {a.volume && <span className="activity-stat"><Zap size={12} /> {a.volume.toLocaleString()} lbs</span>}
                      <span className="activity-stat"><Clock size={12} /> {formatDuration(a.duration)}</span>
                    </div>
                  </div>
                  <div className="activity-right">
                    <span className="badge badge-xp">+{a.xpEarned} XP</span>
                    <span className="activity-date">
                      {a.hideStartTime
                        ? COPY.privacyDateHidden
                        : new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span className="card-title">{COPY.templatesTitle}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setTemplateModal({ template: null })}>
              <Plus size={14} /> {COPY.templatesNewTemplate}
            </button>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--text-2)' }}>{COPY.templatesSubtitle}</p>
          {templates.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <span className="empty-icon" aria-hidden="true">📋</span>
              <h3 className="empty-title">{COPY.templatesEmptyTitle}</h3>
              <p className="empty-desc">{COPY.templatesEmptyDesc}</p>
              <button type="button" className="btn btn-primary" onClick={() => setTemplateModal({ template: null })}>
                <Plus size={14} /> {COPY.templatesNewTemplate}
              </button>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {templates.map(t => (
                <li
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                      {t.exercises?.length || 0} {COPY.templatesExercises.toLowerCase()}
                      {t.exercises?.length ? ` · ${t.exercises.map(e => e.name).filter(Boolean).join(', ')}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTemplateModal({ template: t })} aria-label={COPY.templatesEditTemplate}>
                      <Edit2 size={14} />
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm({ id: t.id, name: t.name })} aria-label={COPY.templatesDeleteTemplate}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Connect tab */}
      {tab === 'connect' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{COPY.connectTitle}</span>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--text-2)' }}>{COPY.connectSubtitle}</p>
          {connectError && (
            <p style={{ margin: '0 0 16px', padding: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: 'var(--danger)', fontSize: '0.875rem' }}>
              {connectError}
            </p>
          )}
          {connectProgress && (
            <p style={{ margin: '0 0 16px', color: 'var(--text-2)', fontSize: '0.875rem' }}>{connectProgress}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Strava */}
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: '1.25rem' }}>🟠</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{COPY.connectStrava}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{COPY.connectStravaDesc}</div>
                </div>
              </div>
              {stravaIntegration?.accessToken ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--run)' }}>{COPY.connectStravaConnected}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                    {COPY.connectStravaLastImport} {stravaIntegration.lastImportAt
                      ? format(new Date(stravaIntegration.lastImportAt), 'MMM d, yyyy')
                      : COPY.connectStravaNever}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={connectLoading}
                    onClick={async () => {
                      setConnectLoading(true); setConnectError(''); setConnectProgress(COPY.connectImporting);
                      try {
                        const { imported } = await importStravaActivities(
                          currentUser.uid,
                          (msg) => setConnectProgress(msg),
                          onActivityAdded
                        );
                        setConnectProgress('');
                        if (imported > 0) {
                          setStravaIntegration(await getStravaIntegration(currentUser.uid));
                          toast(COPY.connectImportResult.replace('{count}', String(imported)), 'success', '✅');
                        } else {
                          toast(COPY.connectImportResultNone, 'info', 'ℹ️');
                        }
                      } catch (err) {
                        setConnectError(err?.message || COPY.connectImportFailed);
                        toast(COPY.connectImportFailed, 'error', '❌');
                      } finally {
                        setConnectLoading(false);
                      }
                    }}
                  >
                    {COPY.connectStravaImport}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={connectLoading}
                    onClick={async () => {
                      if (!window.confirm('Disconnect Strava? Your imported activities will stay in Zenith.')) return;
                      await disconnectStrava(currentUser.uid);
                      setStravaIntegration(null);
                      toast('Strava disconnected', 'info', '👋');
                    }}
                  >
                    {COPY.connectStravaDisconnect}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={connectLoading}
                  onClick={() => {
                    try {
                      const redirectUri = `${window.location.origin}${window.location.pathname || '/'}`;
                      window.location.href = getStravaAuthUrl(redirectUri);
                    } catch (err) {
                      setConnectError(err?.message || COPY.connectStravaNotConfigured);
                      toast(COPY.connectStravaNotConfigured, 'error', '❌');
                    }
                  }}
                >
                  {COPY.connectStravaConnect}
                </button>
              )}
            </div>
            {/* Apple Health */}
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Apple size={20} style={{ color: 'var(--text-2)' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{COPY.connectAppleHealth}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{COPY.connectAppleHealthDesc}</div>
                </div>
              </div>
              {isHealthImportAvailable() ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {healthLastImport != null && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                      {COPY.connectStravaLastImport} {format(new Date(healthLastImport), 'MMM d, yyyy')}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={connectLoading}
                    onClick={async () => {
                      setConnectLoading(true); setConnectError(''); setConnectProgress(COPY.connectImporting);
                      try {
                        const result = await importHealthWorkouts(
                          currentUser.uid,
                          {},
                          (msg) => setConnectProgress(msg),
                          onActivityAdded
                        );
                        setConnectProgress('');
                        setHealthLastImport(result.error ? null : Date.now());
                        if (result.error) {
                          setConnectError(result.error);
                          toast(COPY.connectImportFailed, 'error', '❌');
                        } else if (result.imported > 0) {
                          toast(COPY.connectImportResult.replace('{count}', String(result.imported)), 'success', '✅');
                        } else {
                          toast(COPY.connectImportResultNone, 'info', 'ℹ️');
                        }
                      } catch (err) {
                        setConnectError(err?.message || COPY.connectImportFailed);
                        toast(COPY.connectImportFailed, 'error', '❌');
                      } finally {
                        setConnectLoading(false);
                      }
                    }}
                  >
                    {COPY.connectAppleHealthImport}
                  </button>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                  {COPY.connectAppleHealthComingSoonDesc}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <SettingsPanel
          settings={localSettings}
          onUpdate={handleSettingsUpdate}
          user={user}
          onActivityPrivacyUpdate={async (patch) => {
            if (!currentUser?.uid) return;
            await firestoreUser.update(currentUser.uid, patch);
            refreshUser();
          }}
        />
      )}
      </>
      )}

      {templateModal !== null && (
        <TemplateModal
          template={templateModal.template}
          currentUserId={currentUser?.uid}
          onClose={() => setTemplateModal(null)}
          onSave={() => {}}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">{COPY.templatesDeleteConfirmTitle}</h2>
              <button type="button" className="modal-close" onClick={() => setDeleteConfirm(null)} aria-label={COPY.addActivityCloseModal}><X size={18} /></button>
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--text-2)' }}>{COPY.templatesDeleteConfirmDesc}</p>
            <p style={{ margin: '0 0 16px', fontWeight: 600 }}>“{deleteConfirm.name}”</p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>{COPY.cancel}</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  try {
                    await firestoreWorkoutTemplates.delete(deleteConfirm.id);
                    toast(COPY.templatesDeleted, 'success', '✅');
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error('Delete template failed:', err);
                    toast(COPY.templatesCreateFailed, 'error', '❌');
                  }
                }}
              >
                {COPY.templatesDeleteTemplate}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSave={refreshUser}
        />
      )}
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
