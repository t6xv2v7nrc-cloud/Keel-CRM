import { useState } from 'react';
import { Icons } from '../icons';
import { COUNCILS, HOUSEHOLD_TYPES } from '../../constants';

// CouncilSelect — dropdown of all London boroughs with optional "+ custom" entry.
// `value` is the council name string, `onChange(newValue)`.
export const CouncilSelect = ({ value, onChange, className = 'form-select' }) => {
  const [custom, setCustom] = useState(value && !COUNCILS.includes(value));
  const [customVal, setCustomVal] = useState(custom ? value : '');

  if (custom) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          value={customVal}
          onChange={e => { setCustomVal(e.target.value); onChange(e.target.value); }}
          placeholder="Enter council name"
          autoFocus
        />
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => { setCustom(false); setCustomVal(''); onChange(COUNCILS[0]); }}
        >
          ↩
        </button>
      </div>
    );
  }

  return (
    <select
      className={className}
      value={value || ''}
      onChange={e => {
        if (e.target.value === '__custom__') { setCustom(true); onChange(''); }
        else onChange(e.target.value);
      }}
    >
      {!value && <option value="">— Select —</option>}
      {COUNCILS.map(c => <option key={c} value={c}>{c}</option>)}
      <option value="__custom__">+ Add custom…</option>
    </select>
  );
};


export const StatusPill = ({ status }) => {
  const labels = {
    lead: 'Lead', qualified: 'Qualified', viewing: 'Viewing',
    application: 'Application', referencing: 'Referencing',
    signed: 'Signed', dead: 'Dead',
  };
  return <span className={`pill ${status}`}>{labels[status] || status}</span>;
};

export const SourceTag = ({ source }) => {
  const map = {
    website:  { cls: 'website',  label: 'Website' },
    whatsapp: { cls: 'whatsapp', label: 'WhatsApp' },
    officer:  { cls: 'officer',  label: 'Officer' },
    chatgpt:  { cls: 'chatgpt',  label: 'ChatGPT' },
    referral: { cls: 'referral', label: 'Referral' },
  };
  const s = map[source] || map.website;
  return (
    <span className={`src ${s.cls}`}>
      <span className="src-dot"></span>{s.label}
    </span>
  );
};

export const Money = ({ v, prefix = '£' }) => (
  <span className="mono">{prefix}{Number(v).toLocaleString('en-GB')}</span>
);

export const Sparkline = ({ data, color = '#F5F5F5', w = 76, h = 28 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const StatCard = ({ label, value, sub, delta, deltaDir, spark, sparkColor = '#F5F5F5' }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className={`stat-delta ${deltaDir || ''}`}>
      <span>{delta}</span>
      {sub && <><span style={{ color: 'var(--ink-15)' }}>·</span><span style={{ color: 'var(--ink-40)' }}>{sub}</span></>}
    </div>
    {spark && <div className="spark"><Sparkline data={spark} color={sparkColor} /></div>}
  </div>
);

export const Donut = ({ data, size = 140, thickness = 18 }) => {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = (d.pct / 100) * C;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
            strokeWidth={thickness} strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset} strokeLinecap="butt" />
        );
        offset += len + 1.5;
        return seg;
      })}
    </svg>
  );
};

// HouseholdBadge — shows Single / Couple / Family as a coloured tag
// Falls back to plain text for free-form values.
export const HouseholdBadge = ({ value }) => {
  if (!value) return null;
  const ht = HOUSEHOLD_TYPES.find(h => h.id === value);
  if (!ht) return <span style={{ fontFamily: 'var(--futura)', fontSize: 11, color: 'var(--ink-40)' }}>{value}</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', fontSize: 10, fontFamily: 'var(--futura)', letterSpacing: '0.08em',
      background: ht.bg, color: ht.color, fontWeight: 600,
    }}>
      {ht.id === 'Family' ? '👨‍👩‍👧' : ht.id === 'Couple' ? '👫' : '👤'} {ht.label.toUpperCase()}
    </span>
  );
};

// HouseholdSelect — dropdown for selecting household type
export const HouseholdSelect = ({ value, onChange, className = 'form-select', style }) => (
  <select className={className} style={style} value={value || ''} onChange={e => onChange(e.target.value)}>
    <option value="">— Select —</option>
    {HOUSEHOLD_TYPES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
  </select>
);

export const Chip = ({ active, onClick, children, count }) => (
  <button className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
    {children}
    {count != null && <span className="count">{count}</span>}
  </button>
);

export const NotificationsPanel = ({ items, onMarkAllRead }) => (
  <div className="notif-panel">
    <div className="notif-head">
      <span className="t">Notifications</span>
      <button className="clear" onClick={onMarkAllRead}>Mark all read</button>
    </div>
    {items.length === 0 && (
      <div style={{ padding: '24px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-25)', textAlign: 'center' }}>
        All clear
      </div>
    )}
    {items.map((n, i) => (
      <div className="notif-item" key={i}>
        <div className={`nicon ${n.tone}`}>
          {n.tone === 'r' && '!'}
          {n.tone === 'a' && '·'}
          {n.tone === 'g' && '✓'}
          {n.tone === 'b' && '+'}
        </div>
        <div>
          <div className="t">{n.title || n.t}</div>
          <div className="m">{n.message || n.m}</div>
        </div>
        <span className="ts">{n.ts || ''}</span>
      </div>
    ))}
  </div>
);
