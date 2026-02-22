import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import { useApp } from '../App';
import { useAuth } from '../context/AuthContext';
import { firestoreNutrition } from '../lib/firestore';
import { COPY } from '../lib/copy';
import { format } from 'date-fns';

const DATE_FMT = 'yyyy-MM-dd';

function todayKey() {
  return format(new Date(), DATE_FMT);
}

function sumEntries(entries, key) {
  if (!Array.isArray(entries)) return 0;
  return entries.reduce((s, e) => s + (Number(e[key]) || 0), 0);
}

export default function Nutrition() {
  const { toast } = useApp();
  const { currentUser } = useAuth();
  const [dateKey, setDateKey] = useState(todayKey);
  const [dayData, setDayData] = useState(null);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ protein: '', carbs: '', fat: '', calories: '' });

  const entries = dayData?.entries ?? [];
  const totals = {
    protein: sumEntries(entries, 'protein'),
    carbs: sumEntries(entries, 'carbs'),
    fat: sumEntries(entries, 'fat'),
    calories: sumEntries(entries, 'calories'),
  };

  const loadDay = useCallback(async (uid, date) => {
    const [data, goalData] = await Promise.all([
      firestoreNutrition.get(uid, date),
      firestoreNutrition.getGoal(uid),
    ]);
    setDayData(data || { entries: [] });
    setGoal(goalData || null);
    setGoalForm({
      protein: goalData?.protein ?? '',
      carbs: goalData?.carbs ?? '',
      fat: goalData?.fat ?? '',
      calories: goalData?.calories ?? '',
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    loadDay(currentUser.uid, dateKey).finally(() => setLoading(false));
  }, [currentUser, dateKey, loadDay]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    const form = e.target;
    const mealName = (form.mealName?.value || '').trim();
    const protein = Math.max(0, parseInt(form.protein?.value, 10) || 0);
    const carbs = Math.max(0, parseInt(form.carbs?.value, 10) || 0);
    const fat = Math.max(0, parseInt(form.fat?.value, 10) || 0);
    const calories = Math.max(0, parseInt(form.calories?.value, 10) || 0);
    if (protein === 0 && carbs === 0 && fat === 0) {
      toast(COPY.nutritionEnterAtLeastOne, 'info');
      return;
    }
    const uid = currentUser?.uid;
    if (!uid) return;
    const id = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newEntry = { id, mealName: mealName || undefined, protein, carbs, fat, calories: calories || undefined };
    const nextEntries = [...entries, newEntry];
    setSaving(true);
    try {
      await firestoreNutrition.set(uid, dateKey, { entries: nextEntries });
      setDayData((prev) => ({ ...prev, entries: nextEntries }));
      form.reset();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    const uid = currentUser?.uid;
    if (!uid) return;
    const nextEntries = entries.filter((e) => e.id !== entryId);
    setSaving(true);
    try {
      await firestoreNutrition.set(uid, dateKey, { entries: nextEntries });
      setDayData((prev) => ({ ...prev, entries: nextEntries }));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    const form = e.target;
    const protein = Math.max(0, parseInt(form.goalProtein?.value, 10) || 0);
    const carbs = Math.max(0, parseInt(form.goalCarbs?.value, 10) || 0);
    const fat = Math.max(0, parseInt(form.goalFat?.value, 10) || 0);
    const calories = Math.max(0, parseInt(form.goalCalories?.value, 10) || 0);
    const uid = currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      await firestoreNutrition.setGoal(uid, { protein, carbs, fat, calories });
      setGoal({ protein, carbs, fat, calories });
      setShowGoalForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="page nutrition-page">
      <div className="page-header">
        <h1 className="page-title">{COPY.nutritionTitle}</h1>
        <p className="page-subtitle">{COPY.nutritionSubtitle}</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <label className="label" htmlFor="nutrition-date">
          {COPY.nutritionDate}
        </label>
        <input
          id="nutrition-date"
          type="date"
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          className="input"
          style={{ maxWidth: 200 }}
          aria-label={COPY.nutritionDate}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)' }}>{COPY.loading}</p>
      ) : (
        <>
          {/* Daily goal (optional) */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 className="section-title" style={{ margin: 0 }}>{COPY.nutritionDailyGoal}</h2>
              {!showGoalForm && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowGoalForm(true)}
                  aria-label={COPY.nutritionSetGoal}
                >
                  <Target size={14} /> {COPY.nutritionSetGoal}
                </button>
              )}
            </div>
            {showGoalForm ? (
              <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                <div>
                  <label className="label" style={{ fontSize: '0.75rem' }}>{COPY.nutritionGoalProtein}</label>
                  <input type="number" name="goalProtein" min={0} className="input" defaultValue={goalForm.protein} placeholder="0" style={{ width: 80 }} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '0.75rem' }}>{COPY.nutritionGoalCarbs}</label>
                  <input type="number" name="goalCarbs" min={0} className="input" defaultValue={goalForm.carbs} placeholder="0" style={{ width: 80 }} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '0.75rem' }}>{COPY.nutritionGoalFat}</label>
                  <input type="number" name="goalFat" min={0} className="input" defaultValue={goalForm.fat} placeholder="0" style={{ width: 80 }} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '0.75rem' }}>{COPY.nutritionGoalCalories}</label>
                  <input type="number" name="goalCalories" min={0} className="input" defaultValue={goalForm.calories} placeholder="0" style={{ width: 90 }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{COPY.nutritionSaveGoal}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowGoalForm(false)}>{COPY.cancel}</button>
              </form>
            ) : goal && (goal.protein > 0 || goal.carbs > 0 || goal.fat > 0 || goal.calories > 0) ? (
              <div className="nutrition-goal-bars">
                {[
                  { key: 'protein', label: COPY.nutritionProteinShort, target: goal.protein, value: totals.protein },
                  { key: 'carbs', label: COPY.nutritionCarbsShort, target: goal.carbs, value: totals.carbs },
                  { key: 'fat', label: COPY.nutritionFatShort, target: goal.fat, value: totals.fat },
                  { key: 'calories', label: COPY.nutritionCalShort, target: goal.calories, value: totals.calories },
                ].filter(({ target }) => target > 0).map(({ key, label, target, value }) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                      <span>{label}</span>
                      <span>{value} / {target}g</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--surface-3)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (value / target) * 100)}%`,
                          background: 'var(--accent)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Add entry form */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>{COPY.nutritionLogEntry}</h2>
            <form onSubmit={handleAddEntry} className="nutrition-form">
              <input
                type="text"
                name="mealName"
                className="input"
                placeholder={COPY.nutritionMealNamePlaceholder}
                aria-label={COPY.nutritionMealName}
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8, marginBottom: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: '0.7rem' }}>{COPY.nutritionProteinShort}</label>
                  <input type="number" name="protein" min={0} className="input" placeholder="0" aria-label={COPY.nutritionProtein} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '0.7rem' }}>{COPY.nutritionCarbsShort}</label>
                  <input type="number" name="carbs" min={0} className="input" placeholder="0" aria-label={COPY.nutritionCarbs} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '0.7rem' }}>{COPY.nutritionFatShort}</label>
                  <input type="number" name="fat" min={0} className="input" placeholder="0" aria-label={COPY.nutritionFat} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '0.7rem' }}>{COPY.nutritionCalShort}</label>
                  <input type="number" name="calories" min={0} className="input" placeholder="0" aria-label={COPY.nutritionCalories} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Plus size={14} /> {COPY.nutritionAddEntry}
              </button>
            </form>
          </div>

          {/* Daily totals */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>{COPY.nutritionDailyTotals}</h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span><strong>{COPY.nutritionProteinShort}</strong> {totals.protein}g</span>
              <span><strong>{COPY.nutritionCarbsShort}</strong> {totals.carbs}g</span>
              <span><strong>{COPY.nutritionFatShort}</strong> {totals.fat}g</span>
              {totals.calories > 0 && <span><strong>{COPY.nutritionCalShort}</strong> {totals.calories}</span>}
            </div>
          </div>

          {/* Entries list */}
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: 12 }}>{COPY.nutritionLogEntry}</h2>
            {entries.length === 0 ? (
              <p className="empty-state-desc" style={{ color: 'var(--text-2)' }}>{COPY.nutritionNoEntriesDesc}</p>
            ) : (
              <ul className="nutrition-entries-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                      gap: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{entry.mealName || COPY.nutritionLogEntry}</span>
                      <span style={{ marginLeft: 8, fontSize: '0.875rem', color: 'var(--text-2)' }}>
                        P {entry.protein || 0} · C {entry.carbs || 0} · F {entry.fat || 0}
                        {entry.calories ? ` · ${entry.calories} cal` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleDeleteEntry(entry.id)}
                      aria-label={COPY.activitiesDelete}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
