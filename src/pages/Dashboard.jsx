import { StatCard, Money } from '../components/ui';
import { Icons } from '../components/icons';
import { useLeads } from '../hooks/useLeads';
import { useOfficers } from '../hooks/useOfficers';
import { useAuth } from '../hooks/useAuth';
import { computePriorities } from '../lib/priorities';
import { generateEodReport } from '../lib/eod';

export default function Dashboard({ onOpenLead, onGotoReport }) {
  const { data: leads = [], isLoading } = useLeads();
  const { data: officers = [] } = useOfficers();

  const active = leads.filter(l => !['signed', 'dead'].includes(l.status));
  const signed = leads.filter(l => l.status === 'signed');
  const priorities = computePriorities(leads);
  const eod = generateEodReport(leads, []);

  const confirmedMTD = signed.reduce((s, l) => s + (l.value || 0), 0);
  const pipeline = active.reduce((s, l) => s + (l.value || 0), 0);
  const convRate = leads.length > 0 ? ((signed.length / leads.length) * 100).toFixed(1) : '0.0';

  const { session } = useAuth();
  const userName = session?.user?.user_metadata?.full_name
    ?? session?.user?.email?.split('@')[0]
    ?? 'there';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();

  if (isLoading) {
    return <div className="loading-state">Loading…</div>;
  }

  const hotOfficers = officers
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 4);

  return (
    <div className="page" data-screen-label="Dashboard">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{dateStr} · {timeStr}</div>
          <h1 className="page-title">{greeting}, {userName}</h1>
          <div className="page-sub">
            {priorities.length} leads need attention · <Money v={priorities.reduce((s, p) => s + (p.value || 0), 0)} /> at stake
          </div>
        </div>
        <div className="page-actions">
          <button className="btn ghost">This week</button>
          <button className="btn">Quick log</button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Confirmed MTD"
          value={<Money v={confirmedMTD} />}
          delta={`${signed.length} banked`}
          deltaDir={signed.length > 0 ? 'up' : ''}
          sub="signed"
          spark={[2, 3, 3, 5, 4, 6, signed.length]}
        />
        <StatCard
          label="Pending Pipeline"
          value={<Money v={pipeline} />}
          delta={`${active.length} placements`}
          sub={`${new Set(active.map(l => l.council)).size} boroughs`}
          spark={[8, 9, 10, 12, 11, 13, active.length]}
        />
        <StatCard
          label="Active Leads"
          value={String(active.length)}
          delta={`+${active.filter(l => {
            const d = new Date(l.created_at);
            const week = Date.now() - 7 * 86400000;
            return d.getTime() > week;
          }).length}`}
          deltaDir="up"
          sub="this week"
          spark={[35, 38, 40, 42, 44, 46, active.length]}
        />
        <StatCard
          label="Lead → Sign"
          value={`${convRate}%`}
          delta="conversion rate"
          sub="all time"
          spark={[18, 16, 17, 15, 16, 14, parseFloat(convRate)]}
        />
      </div>

      <div className="dash-cols">
        <div className="mod">
          <div className="mod-head">
            <h3>Today's priorities</h3>
            <span className="sub">ranked by £ at risk × recency</span>
            <div className="right">
              <button className="btn ghost sm">Re-rank</button>
            </div>
          </div>
          {priorities.length === 0 && (
            <div className="empty-state">All caught up — no urgent leads</div>
          )}
          {priorities.map((p, i) => (
            <div
              key={p.id}
              className={`priority ${p._urgency}`}
              onClick={() => onOpenLead(p.id)}
            >
              <div className="pri-rank">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div className="pri-title">{p._title}</div>
                <div className="pri-meta">
                  {p._meta.map((m, j) => (
                    <span key={j}>
                      {j > 0 && <span className="sep">/</span>}
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pri-action" onClick={e => e.stopPropagation()}>
                <button className="btn ghost sm" title="Log contact"><Icons.Phone size={12} /></button>
                <button className="btn sm" onClick={() => onOpenLead(p.id)}>Open</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="mod">
            <div className="mod-head">
              <h3>Yesterday's EOD</h3>
              <div className="right">
                <button className="btn ghost sm" onClick={onGotoReport}>Full →</button>
              </div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-40)', letterSpacing: '0.04em' }}>
                {eod.date.toUpperCase()}
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {eod.newLeads.length > 0 && (
                  <div>
                    <div className="lbl" style={{ marginBottom: 8 }}>New leads · {eod.newLeads.length}</div>
                    {eod.newLeads.map((l, i) => (
                      <div key={i} style={{ fontSize: 12, padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--ink)' }}>{l.name}</span>
                        <span className="mono" style={{ color: 'var(--ink-40)', fontSize: 11 }}>{l.council}</span>
                      </div>
                    ))}
                  </div>
                )}
                {eod.signed.length > 0 && (
                  <div>
                    <div className="lbl" style={{ marginBottom: 8 }}>Signed · {eod.signed.length}</div>
                    {eod.signed.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                        <span style={{ color: 'var(--ink)' }}>{s.name}</span>
                        <span className="mono" style={{ color: 'var(--green)' }}>+<Money v={s.value} /></span>
                      </div>
                    ))}
                  </div>
                )}
                {eod.newLeads.length === 0 && eod.signed.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-25)', fontFamily: 'var(--mono)' }}>No activity yet today</div>
                )}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <div style={{ borderRight: '1px solid var(--line)', paddingRight: 12 }}>
                    <div className="lbl">Signed today</div>
                    <div className="mono" style={{ fontSize: 22, color: 'var(--green)', letterSpacing: '-0.03em', marginTop: 6 }}>
                      +<Money v={eod.signed.reduce((s, x) => s + (x.value || 0), 0)} />
                    </div>
                  </div>
                  <div style={{ paddingLeft: 12 }}>
                    <div className="lbl">New leads</div>
                    <div className="mono" style={{ fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.03em', marginTop: 6 }}>
                      {eod.newLeads.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mod">
            <div className="mod-head">
              <h3>Officer pulse</h3>
              <span className="sub">supply side</span>
            </div>
            <div style={{ padding: '4px 0 8px' }}>
              {hotOfficers.length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>No officers yet</div>
              )}
              {hotOfficers.map((o, i) => (
                <div key={o.id} style={{
                  padding: '10px 18px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: i < hotOfficers.length - 1 ? '1px solid var(--line)' : 'none'
                }}>
                  <div style={{
                    width: 26, height: 26, border: '1px solid var(--line-2)',
                    display: 'grid', placeItems: 'center', fontSize: 10,
                    color: 'var(--ink)', letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    {(o.name || '').split(' ').map(p => p[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', letterSpacing: '0.01em' }}>{o.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-40)' }}>
                      {o.council} · {o.referrals_30d || 0} referrals · {o.signed_30d || 0} signed
                    </div>
                  </div>
                  <span className={`officer-temp ${o.temp || 'warm'}`}>{o.temp || 'warm'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
