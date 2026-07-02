// Shown only on Sundays — a lightweight nudge to reflect before planning next week
import { useState } from 'react';

export default function SundayReview({ todayDate = null, weekId = null, writeback }) {
  // Use Worker date (UTC+7/UTC+10) so Sunday check matches the API's "today"
  const dayOfWeek = todayDate
    ? new Date(todayDate + 'T12:00:00Z').getUTCDay()
    : new Date().getDay();
  if (dayOfWeek !== 0) return null; // 0 = Sunday

  const [editing, setEditing] = useState(false);
  const [text, setText]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await writeback('set-weekly-priorities', weekId, text.trim());
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // leave editing open
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      background: 'var(--bg-2)',
      borderTop:    '0.5px solid var(--hair-strong)',
      borderRight:  '0.5px solid var(--hair-strong)',
      borderBottom: '0.5px solid var(--hair-strong)',
      borderLeft:   '3px solid var(--accent2)',
    }}>

      {/* eyebrow */}
      <div className="lp-mono" style={{
        fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--accent2)', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 12, lineHeight: 1 }}>◎</span>
        Sunday Review
      </div>

      {/* body */}
      <p style={{
        margin: 0,
        fontSize: 14, lineHeight: 1.55,
        color: 'var(--text)',
      }}>
        Week's done. Reflect on what got done, what didn't, and why — then set your sights on the next one.
      </p>

      {/* CTA */}
      <a
        href="https://www.notion.so/5e77a48652b247ca99a86710e12094bb"
        target="_blank"
        rel="noopener noreferrer"
        className="lp-tap"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 12, padding: '7px 14px', borderRadius: 8,
          textDecoration: 'none',
          background: 'color-mix(in oklch, var(--accent2) 10%, transparent)',
          border: '0.5px solid color-mix(in oklch, var(--accent2) 30%, transparent)',
        }}
      >
        <span className="lp-mono" style={{
          fontSize: 11, color: 'var(--accent2)', letterSpacing: '0.08em',
        }}>
          Open Weekly Tasks ↗
        </span>
      </a>

      {weekId && (
        <div style={{ marginTop: 10 }}>
          {saved && (
            <p className="lp-mono" style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 6 }}>✓ Saved</p>
          )}
          {!editing ? (
            <button className="lp-tap" onClick={() => setEditing(true)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <span className="lp-mono" style={{ fontSize: 11, color: 'var(--accent2)', letterSpacing: '0.08em' }}>
                ✎ Set priorities
              </span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={'1. First priority\n2. Second priority\n3. Third priority'}
                rows={3}
                style={{
                  width: '100%',
                  background: 'color-mix(in oklch, var(--accent2) 6%, transparent)',
                  border: '0.5px solid color-mix(in oklch, var(--accent2) 25%, transparent)',
                  borderRadius: 8,
                  padding: '8px 10px', color: 'var(--text)', fontSize: 13,
                  fontFamily: 'var(--font-body)', lineHeight: 1.5, resize: 'none', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="lp-tap" onClick={() => setEditing(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button className="lp-tap" onClick={handleSave} disabled={!text.trim() || saving}
                  style={{
                    padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                    background: 'color-mix(in oklch, var(--accent2) 18%, transparent)',
                    border: '0.5px solid color-mix(in oklch, var(--accent2) 35%, transparent)',
                    color: 'var(--accent2)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                  }}>
                  {saving ? '…' : 'SAVE'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
