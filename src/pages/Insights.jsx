import { Donut } from '../components/ui';
import { useLeads } from '../hooks/useLeads';
import { STATUSES, FAILURE_REASONS } from '../constants';

const COUNCIL_COLORS = {
  RBKC: '#6FA8DC', Newham: '#5FB37A', Islington: '#B19CD9',
  Harrow: '#E0A24C', Camden: '#A8C8E0', Brent: '#E25C5C',
  Southwark: '#8FA8C4', Norwich: '#C8946F', Hounslow: '#D4A0B0', Lambeth: '#9FC89F',
};

const FAILURE_COLORS = {
  Arrears: '#E25C5C', Ghosted: '#E0A24C', 'Wrong Area': '#B19CD9',
  'Wrong Price': '#A8C8E0', 'Lost to Competitor': '#6FA8DC', 'Personal Circumstances': '#5FB37A',
};

const TrendChart = ({ weeks = 6 }) => {
  const w = 640, h = 200;
  const padL = 40, padR = 16, padT = 18, padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const labels = Array.from({ length: weeks }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });
  const newLeads = [12, 15, 11, 18, 22, 19].slice(-weeks);
  const signed   = [2,  3,  4,  3,  5,  4].slice(-weeks);

  const maxV = Math.max(...newLeads) + 4;
  const stepX = innerW / (labels.length - 1);

  const pts = (arr) => arr.map((v, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - (v / maxV) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const gridYs = [0, Math.round(maxV / 2), maxV];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg className="trend-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {gridYs.map((v, i) => {
          const y = padT + innerH - (v / maxV) * innerH;
          return <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '2 3'} />;
        })}
        <polyline points={pts(newLeads)} fill="none" stroke="#F5F5F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts(signed)} fill="none" stroke="#5FB37A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {newLeads.map((v, i) => {
          const cx = padL + i * stepX;
          const cy = padT + innerH - (v / maxV) * innerH;
          return <circle key={`l${i}`} cx={cx} cy={cy} r="3" fill="#F5F5F5" />;
        })}
        {signed.map((v, i) => {
          const cx = padL + i * stepX;
          const cy = padT + innerH - (v / maxV) * innerH;
          return <circle key={`s${i}`} cx={cx} cy={cy} r="3" fill="#5FB37A" />;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {gridYs.map((v, i) => {
          const y = padT + innerH - (v / maxV) * innerH;
          return (
            <span key={i} style={{
              position: 'absolute',
              top: ((y / h) * 100) + '%',
              left: 0,
              width: ((padL - 8) / w * 100) + '%',
              textAlign: 'right',
              transform: 'translateY(-50%)',
              fontFamily: 'Cascadia Code, monospace',
              fontSize: 10,
              color: 'rgba(245,245,245,0.40)',
            }}>{v}</span>
          );
        })}
        {labels.map((l, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: (((padL + i * stepX) / w) * 100) + '%',
            bottom: 4,
            transform: 'translateX(-50%)',
            fontFamily: 'Cascadia Code, monospace',
            fontSize: 10,
            color: 'rgba(245,245,245,0.40)',
            letterSpacing: '0.04em',
          }}>{l}</span>
        ))}
      </div>
    </div>
  );
};

export default function Insights() {
  const { data: leads = [], isLoading } = useLeads();

  if (isLoading) return <div className="loading-state">Loading…</div>;

  const dead = leads.filter(l => l.status === 'dead');
  const signed = leads.filter(l => l.status === 'signed');

  const funnelData = STATUSES.filter(s => s.id !== 'dead').map(s => ({
    name: s.label,
    count: leads.filter(l => l.status === s.id).length,
  }));
  const maxFunnel = funnelData[0]?.count || 1;

  const councilData = Object.entries(
    leads.filter(l => l.status === 'signed').reduce((acc, l) => {
      acc[l.council] = (acc[l.council] || 0) + (l.value || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value, color: COUNCIL_COLORS[name] || '#888' }));

  const failureData = FAILURE_REASONS.map(r => ({
    name: r,
    count: dead.filter(l => l.failure_reason === r).length,
    color: FAILURE_COLORS[r] || '#888',
  })).filter(f => f.count > 0);

  const totalDead = failureData.reduce((s, f) => s + f.count, 0);
  const failureDonut = failureData.map(f => ({
    ...f,
    pct: totalDead > 0 ? Math.round((f.count / totalDead) * 100) : 0,
  }));

  const maxBar = Math.max(...councilData.map(c => c.value), 1);

  const avgFee = signed.length > 0
    ? Math.round(signed.reduce((s, l) => s + (l.value || 0), 0) / signed.length)
    : 0;

  const convRate = leads.length > 0 ? ((signed.length / leads.length) * 100).toFixed(1) : '0.0';
  const failRate = leads.length > 0 ? ((dead.length / leads.length) * 100).toFixed(0) : '0';

  return (
    <div className="page" data-screen-label="Analytics">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">ALL TIME · ALL COUNCILS</div>
          <h1 className="page-title">Insights</h1>
          <div className="page-sub">Conversion, failure modes, council yield</div>
        </div>
        <div className="page-actions">
          <button className="btn">Filter</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">Lead → Sign</div>
          <div className="stat-value">{convRate}%</div>
          <div className="stat-delta">{signed.length} signed / {leads.length} total</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg fee · signed</div>
          <div className="stat-value">£{avgFee.toLocaleString()}</div>
          <div className="stat-delta">per placement</div>
        </div>
        <div className="stat">
          <div className="stat-label">Failure rate</div>
          <div className="stat-value">{failRate}%</div>
          <div className="stat-delta">{dead.length}/{leads.length} leads</div>
        </div>
        <div className="stat">
          <div className="stat-label">Active pipeline</div>
          <div className="stat-value">{leads.filter(l => !['signed', 'dead'].includes(l.status)).length}</div>
          <div className="stat-delta">in flight</div>
        </div>
      </div>

      <div className="an-grid" style={{ marginBottom: 20 }}>
        <div className="mod">
          <div className="mod-head">
            <h3>Conversion funnel</h3>
            <span className="sub">{leads.length} total leads</span>
          </div>
          <div className="funnel">
            {funnelData.map((s, i) => {
              const conv = i === 0 ? null : funnelData[i - 1].count > 0
                ? Math.round((s.count / funnelData[i - 1].count) * 100)
                : 0;
              return (
                <div key={s.name} className="funnel-row">
                  <div className="stage-name">{s.name}</div>
                  <div className="funnel-bar">
                    <div className="funnel-fill" style={{ width: maxFunnel > 0 ? (s.count / maxFunnel * 100) + '%' : '0%' }}>
                      {s.count > 0 && s.count}
                    </div>
                  </div>
                  <div className="funnel-count">{s.count}</div>
                  <div className="funnel-pct">{conv != null ? `${conv}%` : '—'}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mod">
          <div className="mod-head">
            <h3>Failure reasons</h3>
            <span className="sub">{dead.length} dead</span>
          </div>
          {dead.length === 0 ? (
            <div className="empty-state">No dead leads yet</div>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <Donut data={failureDonut} />
                <div className="center">
                  <div>
                    <div className="big">{dead.length}</div>
                    <div className="lbl">deaths</div>
                  </div>
                </div>
              </div>
              <div className="donut-legend">
                {failureDonut.map((f, i) => (
                  <div key={i} className="row">
                    <span className="sw" style={{ background: f.color }}></span>
                    <span style={{ color: 'var(--ink-80)' }}>{f.name}</span>
                    <span className="amt">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="an-grid">
        <div className="mod">
          <div className="mod-head">
            <h3>Council yield</h3>
            <span className="sub">fees generated · signed only</span>
          </div>
          {councilData.length === 0 ? (
            <div className="empty-state">No signed leads yet</div>
          ) : (
            <div className="bars">
              {councilData.map(c => (
                <div key={c.name} className="bar-row">
                  <div className="bar-name">{c.name}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: (c.value / maxBar) * 100 + '%', background: c.color }}></div>
                  </div>
                  <div className="bar-val">£{c.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mod">
          <div className="mod-head">
            <h3>Weekly trend</h3>
            <span className="sub">last 6 weeks</span>
          </div>
          <div className="trend-legend">
            <span><span className="sw" style={{ background: '#F5F5F5' }}></span>New leads</span>
            <span><span className="sw" style={{ background: '#5FB37A' }}></span>Signed</span>
          </div>
          <TrendChart />
          <div style={{ padding: '0 22px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid var(--line)', marginTop: 4 }}>
            <div style={{ padding: '14px 14px 14px 0', borderRight: '1px solid var(--line)' }}>
              <div className="lbl">Avg new/wk</div>
              <div className="mono" style={{ fontSize: 20, color: 'var(--ink)', marginTop: 4, letterSpacing: '-0.03em' }}>16.2</div>
            </div>
            <div style={{ padding: '14px 0 14px 14px' }}>
              <div className="lbl">Avg signed/wk</div>
              <div className="mono" style={{ fontSize: 20, color: 'var(--green)', marginTop: 4, letterSpacing: '-0.03em' }}>3.5</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
