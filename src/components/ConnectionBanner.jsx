import { Skeleton } from './Primitives.jsx';
import { WORKER_URL } from '../hooks/useNotionData.js';

function relativeTime(ms) {
  if (!ms) return null;
  const diff = Date.now() - ms;
  if (diff < 45000) return 'just now';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ConnectionBanner({ status, onRefresh }) {
  const { loading, error, connected, email, updatedAt } = status;

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 12,
      background: 'var(--bg-2)', border: '0.5px solid var(--hair-strong)',
    }}>
      <Skeleton width={10} height={10} radius={99} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width={160} height={12} />
        <Skeleton width={110} height={10} />
      </div>
    </div>
  );

  if (!connected) return (
    <div style={{
      padding: '16px', borderRadius: 12,
      background: 'var(--bg-2)', border: '0.5px solid var(--hair-strong)',
    }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text)' }}>Google Calendar isn't connected yet.</p>
      <p className="lp-mono" style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--faint)' }}>
        Connect your account to see day/week/month events here.
      </p>
      {error && (
        <p className="lp-mono" style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--priority-high)' }}>
          {error}
        </p>
      )}
      <a
        href={`${WORKER_URL}/auth/google/start`}
        className="lp-tap"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginTop: 12, padding: '9px 16px', borderRadius: 8,
          background: 'var(--accent)', color: 'var(--bg)',
          fontSize: 13, fontWeight: 500, textDecoration: 'none',
        }}
      >
        Connect Google Calendar
      </a>
    </div>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 12,
      background: 'var(--bg-2)', border: '0.5px solid var(--hair-strong)',
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent2)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--text)' }}>Google Calendar · connected</div>
        <div className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
          {email}{updatedAt ? ` · updated ${relativeTime(updatedAt)}` : ''}
        </div>
      </div>
      <button
        onClick={onRefresh}
        className="lp-tap lp-mono"
        style={{
          flexShrink: 0, padding: '7px 12px', borderRadius: 8,
          background: 'transparent', border: '0.5px solid var(--hair-strong)',
          color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        ↻ Refresh
      </button>
    </div>
  );
}
