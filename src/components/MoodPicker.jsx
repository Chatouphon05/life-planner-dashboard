import { useState, useCallback } from 'react';
import { Eyebrow, Skeleton } from './Primitives.jsx';

const FIELDS = [
  { key: 'energy', type: 'energy-score', label: 'Energy' },
  { key: 'focus',  type: 'focus-score',  label: 'Focus'  },
  { key: 'mood',   type: 'mood-score',   label: 'Mood'   },
];

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function segmentColor(n) {
  return n >= 8 ? 'var(--accent)' : n >= 5 ? 'var(--accent2)' : 'var(--muted)';
}

function ScoreRow({ label, value, error, disabled, onPick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: disabled ? 0.5 : 1 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', width: 56, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, flex: 1 }}>
        {SCALE.map(n => {
          const active = value != null && n <= value;
          return (
            <span
              key={n}
              className={disabled ? '' : 'lp-tap'}
              onClick={disabled ? undefined : () => onPick(n === value ? null : n)}
              style={{
                flex: 1, height: 14, borderRadius: 1,
                background: active ? segmentColor(value) : 'var(--hair-strong)',
                transition: 'background .15s',
              }}
            />
          );
        })}
      </div>
      <span className="lp-mono" style={{
        fontSize: 11, width: 20, textAlign: 'right', flexShrink: 0,
        color: error ? 'var(--priority-high)' : 'var(--text)',
      }}>
        {error ? '!' : value ?? '–'}
      </span>
    </div>
  );
}

export default function MoodPicker({ today, writeback, loading, dayLabel }) {
  const { energyScore: initEnergy, focusScore: initFocus, moodScore: initMood, dailyId } = today || {};

  const [values, setValues] = useState({ energy: initEnergy, focus: initFocus, mood: initMood });
  const [errors, setErrors] = useState({});

  const pick = useCallback(async (field, type, next) => {
    if (!dailyId) return;
    const current = values[field];
    setValues(v => ({ ...v, [field]: next }));
    setErrors(e => ({ ...e, [field]: false }));
    try {
      await writeback(type, dailyId, next);
    } catch {
      setValues(v => ({ ...v, [field]: current }));
      setErrors(e => ({ ...e, [field]: true }));
      setTimeout(() => setErrors(e => ({ ...e, [field]: false })), 2500);
    }
  }, [dailyId, values, writeback]);

  if (loading) return (
    <div>
      <Eyebrow>How are you</Eyebrow>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width={56} height={11} />
            <Skeleton height={14} style={{ flex: 1 }} radius={1} />
            <Skeleton width={20} height={11} />
          </div>
        ))}
      </div>
    </div>
  );

  const disabled = !dailyId;

  return (
    <div>
      <Eyebrow>How are you{dayLabel ? ` · ${dayLabel.slice(0, 3)} morning` : ''}</Eyebrow>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FIELDS.map(f => (
          <ScoreRow
            key={f.key}
            label={f.label}
            value={values[f.key]}
            error={errors[f.key]}
            disabled={disabled}
            onPick={(n) => pick(f.key, f.type, n)}
          />
        ))}
      </div>
      {disabled && (
        <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 10 }}>
          No daily entry found — create today's page in Notion first.
        </p>
      )}
    </div>
  );
}
