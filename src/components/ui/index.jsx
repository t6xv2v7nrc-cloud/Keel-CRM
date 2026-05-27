import { Icons } from '../icons';

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
