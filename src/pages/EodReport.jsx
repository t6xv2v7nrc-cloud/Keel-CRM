import { StatusPill, Money } from '../components/ui';
import { useLeads } from '../hooks/useLeads';
import { generateEodReport } from '../lib/eod';

export default function EodReport() {
  const { data: leads = [], isLoading } = useLeads();
  const eod = generateEodReport(leads, []);

  if (isLoading) return <div className="loading-state">Loading…</div>;

  const netToday = eod.signed.reduce((s, x) => s + (x.value || 0), 0);

  return (
    <div className="page" data-screen-label="EOD Report">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">AUTO-GENERATED · 18:30 NIGHTLY</div>
          <h1 className="page-title">End of Day</h1>
          <div className="page-sub">Daily digest · printable</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost">Yesterday ▾</button>
          <button className="btn" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="report-paper">
        <div className="report-head">
          <div>
            <h2>End of Day</h2>
            <div className="report-date">{eod.date}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="report-tag">AUTO·v1.0</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-25)', marginTop: 8 }}>
              Generated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} GMT
            </div>
          </div>
        </div>

        <div className="report-section">
          <h3>Cash Position</h3>
          <div className="cash-grid">
            <div className="cash-cell confirmed">
              <div className="lbl">Confirmed MTD</div>
              <div className="v">£{eod.cash.confirmedThisMonth.toLocaleString()}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--green)', marginTop: 6 }}>banked</div>
            </div>
            <div className="cash-cell pending">
              <div className="lbl">Pending</div>
              <div className="v">£{eod.cash.pending.toLocaleString()}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-40)', marginTop: 6 }}>in flight</div>
            </div>
            <div className="cash-cell">
              <div className="lbl">Month-end forecast</div>
              <div className="v">£{eod.cash.forecasted.toLocaleString()}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-40)', marginTop: 6 }}>estimate</div>
            </div>
          </div>
        </div>

        {eod.signed.length > 0 && (
          <div className="report-section">
            <h3>Confirmed placements · {eod.signed.length}</h3>
            {eod.signed.map((s, i) => (
              <div key={i} className="row">
                <span className="a">
                  {s.name} <span className="mono" style={{ color: 'var(--ink-40)', fontSize: 11 }}>· {s.council}</span>
                </span>
                <span className="b" style={{ color: 'var(--green)' }}>+£{(s.value || 0).toLocaleString()}</span>
              </div>
            ))}
            <div className="row" style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 12 }}>
              <span className="lbl">Today's net</span>
              <span className="b" style={{ color: 'var(--green)', fontSize: 16 }}>
                +£{netToday.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {eod.newLeads.length > 0 && (
          <div className="report-section">
            <h3>New leads · {eod.newLeads.length}</h3>
            {eod.newLeads.map((l, i) => (
              <div key={i} className="row">
                <span className="a">{l.name}</span>
                <span className="b">
                  {l.source} <span style={{ color: 'var(--ink-25)', margin: '0 6px' }}>·</span> {l.council}
                </span>
              </div>
            ))}
          </div>
        )}

        {eod.statusChanges.length > 0 && (
          <div className="report-section">
            <h3>Status changes · {eod.statusChanges.length}</h3>
            {eod.statusChanges.map((c, i) => (
              <div key={i} className="row" style={{ alignItems: 'center' }}>
                <span className="a" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {c.name}
                  {c.meta && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <StatusPill status={c.meta.from} />
                      <span style={{ color: 'var(--ink-25)' }}>→</span>
                      <StatusPill status={c.meta.to} />
                    </span>
                  )}
                </span>
                <span className="b">
                  {c.meta?.reason
                    ? <span style={{ color: 'var(--red)' }}>✕ {c.meta.reason}</span>
                    : null
                  }
                </span>
              </div>
            ))}
          </div>
        )}

        {eod.tomorrow.length > 0 && (
          <div className="report-section">
            <h3>Tomorrow's top {eod.tomorrow.length}</h3>
            <div className="tomorrow-list">
              {eod.tomorrow.map((t, i) => (
                <div key={i} className="tomorrow-item">
                  <div className="num">{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1 }}>
                    <div className="t">{t.t}</div>
                    <div className="why">{t.why}</div>
                  </div>
                  <span style={{ color: 'var(--ink-25)' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {eod.newLeads.length === 0 && eod.signed.length === 0 && eod.statusChanges.length === 0 && (
          <div className="report-section">
            <div className="empty-state">No activity recorded today yet</div>
          </div>
        )}

        <div style={{
          marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'Cascadia Code, monospace',
          fontSize: 10, color: 'var(--ink-25)', letterSpacing: '0.04em'
        }}>
          <span>KEEL PIPELINE · DAILY REPORT</span>
          <span>sam@keelpipeline.uk</span>
        </div>
      </div>
    </div>
  );
}
