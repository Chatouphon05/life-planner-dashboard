import { useState, useCallback } from 'react';
import { SectionHeader, Skeleton } from './Primitives.jsx';

const MOODS    = ['🚀 Amazing', '😊 Good', '😐 Okay', '😔 Low', '😴 Tired'];
const ENERGIES = ['⚡ High', '🔋 Medium', '🪫 Low'];

function Chip({ label, selected, onSelect, disabled }) {
  return (
    <div
      className={disabled ? '' : 'lp-tap'}
      onClick={disabled ? undefined : onSelect}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '5px 10px', borderRadius: 99,
        border: selected
          ? '0.5px solid var(--accent)'
          : '0.5px solid var(--hair-strong)',
        background: selected
          ? 'color-mix(in oklch, var(--accent) 18%, var(--bg-2))'
          : 'var(--bg-2)',
        color: selected ? 'var(--accent)' : 'var(--muted)',
        fontSize: 12,
        transition: 'background .15s, border .15s, color .15s',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </div>
  );
}

export default function MoodPicker({ today, writeback, loading }) {
  if (loading) return (
    <div>
      <SectionHeader label="Mood" />
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <Skeleton width={32} height={9} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[80, 70, 65, 60, 70].map((w, i) => <Skeleton key={i} width={w} height={30} radius={99} />)}
          </div>
        </div>
        <div>
          <Skeleton width={40} height={9} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[60, 80, 55].map((w, i) => <Skeleton key={i} width={w} height={30} radius={99} />)}
          </div>
        </div>
      </div>
    </div>
  );
  const { mood: initMood, energy: initEnergy, dailyId } = today || {};

  const [mood,      setMood]      = useState(initMood   || null);
  const [energy,    setEnergy]    = useState(initEnergy || null);
  const [moodErr,   setMoodErr]   = useState(false);
  const [energyErr, setEnergyErr] = useState(false);

  // Sync from prop when today changes (after refetch)
  // We only update if the user hasn't set a local override yet
  // (simplest: just re-init from prop on mount; after refetch parent re-mounts this component)

  const pick = useCallback(async (type, value, current, set, setErr) => {
    if (!dailyId) return;
    set(value);
    setErr(false);
    try {
      await writeback(type, dailyId, value === current ? null : value);
    } catch {
      set(current);
      setErr(true);
      setTimeout(() => setErr(false), 2500);
    }
  }, [dailyId, writeback]);

  const pickMood   = (v) => pick('mood',   v, mood,   setMood,   setMoodErr);
  const pickEnergy = (v) => pick('energy', v, energy, setEnergy, setEnergyErr);

  const disabled = !dailyId;

  return (
    <div>
      <SectionHeader label="Mood" />

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Mood row */}
        <div>
          <div className="lp-mono" style={{
            fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: moodErr ? 'var(--faint)' : 'var(--muted)', marginBottom: 6,
          }}>
            {moodErr ? 'sync failed · pull to retry' : 'Mood'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <Chip
                key={m}
                label={m}
                selected={mood === m}
                onSelect={() => pickMood(m)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        {/* Energy row */}
        <div>
          <div className="lp-mono" style={{
            fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: energyErr ? 'var(--faint)' : 'var(--muted)', marginBottom: 6,
          }}>
            {energyErr ? 'sync failed · pull to retry' : 'Energy'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ENERGIES.map(e => (
              <Chip
                key={e}
                label={e}
                selected={energy === e}
                onSelect={() => pickEnergy(e)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        {disabled && (
          <p className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', margin: 0 }}>
            No daily entry found — create today's page in Notion first.
          </p>
        )}
      </div>
    </div>
  );
}
