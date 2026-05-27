import { useState, useMemo } from 'react';
import { Icons } from '../components/icons';
import { useCalendarActivity } from '../hooks/useLeads';

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const TYPE_COLOR = {
  call:   'var(--green)',
  email:  'var(--violet)',
  note:   'var(--blue)',
  status: 'var(--amber)',
  lead:   'var(--ink-40)',
};
const TYPE_LABEL = { call: 'Call', email: 'Email', note: 'Note', status: 'Status change', lead: 'New lead' };

const TypeIcon = ({ type, size = 12 }) => {
  const Ic = type === 'call'   ? Icons.Phone
           : type === 'email'  ? Icons.Mail
           : type === 'status' ? Icons.Flag
           : type === 'lead'   ? Icons.Plus
           : Icons.Note;
  return <Ic size={size} />;
};

function toDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmt12(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function Calendar({ onOpenLead }) {
  const today = new Date();
  const [year,  setYear]    = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selKey, setSelKey] = useState(toDateKey(today));

  const { data, isLoading } = useCalendarActivity(year, month);

  // ── bucket events by date ────────────────────────────────────────────
  const byDay = useMemo(() => {
    const map = {};
    const add = (key, entry) => { (map[key] ??= []).push(entry); };
    (data?.activity ?? []).forEach(a =>
      add(toDateKey(a.created_at), { ...a, _kind: a.type })
    );
    (data?.newLeads ?? []).forEach(l =>
      add(toDateKey(l.created_at), { id: l.id, lead_id: l.id, type: 'lead', _kind: 'lead',
        text: `New lead: ${l.name}`, leads: { id: l.id, name: l.name, status: l.status },
        created_at: l.created_at })
    );
    return map;
  }, [data]);

  // ── calendar grid ────────────────────────────────────────────────────
  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    // Mon=0 … Sun=6
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth   = new Date(year, month + 1, 0).getDate();
    const daysInPrevMon = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < startDow; i++) {
      const d = daysInPrevMon - startDow + 1 + i;
      cells.push({ date: new Date(year, month - 1, d), current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), current: true });
    }
    const trailing = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      cells.push({ date: new Date(year, month + 1, d), current: false });
    }
    return cells;
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const todayKey = toDateKey(today);
  const selEvents = byDay[selKey] ?? [];
  const selDate   = selKey ? new Date(selKey + 'T00:00:00') : null;

  return (
    <div className="page" data-screen-label="Calendar">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">ACTIVITY CALENDAR</div>
          <h1 className="page-title">Calendar</h1>
          <div className="page-sub">Daily activity log — calls, emails, notes, status changes</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, alignItems: 'start' }}>

        {/* ── Calendar grid ── */}
        <div style={{ border: '1px solid var(--line)' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <button className="icon-btn" onClick={prevMonth} title="Previous month">
              <Icons.Chevron size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--futura)', fontSize: 13, fontWeight: 500, letterSpacing: '0.06em' }}>
              {MONTHS[month]} {year}
            </div>
            <button className="icon-btn" onClick={nextMonth} title="Next month">
              <Icons.Chevron size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--line)' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontFamily: 'var(--futura)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-40)', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {grid.map((cell, i) => {
              const key     = toDateKey(cell.date);
              const events  = byDay[key] ?? [];
              const isToday = key === todayKey;
              const isSel   = key === selKey;
              const dots    = [...new Set(events.map(e => e._kind))].slice(0, 4);
              const overflow = events.length > 4 ? events.length - 4 : 0;
              const colIdx  = i % 7;
              const isWeekend = colIdx >= 5;

              return (
                <div
                  key={key + i}
                  onClick={() => cell.current && setSelKey(key)}
                  style={{
                    minHeight: 72,
                    padding: '8px 10px',
                    borderRight: colIdx < 6 ? '1px solid var(--line)' : 'none',
                    borderBottom: i < grid.length - 7 ? '1px solid var(--line)' : 'none',
                    background: isSel ? 'var(--bg-3)' : isToday ? 'var(--bg-2)' : 'transparent',
                    cursor: cell.current ? 'pointer' : 'default',
                    opacity: cell.current ? 1 : 0.28,
                    position: 'relative',
                  }}
                >
                  {/* Today ring */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22,
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: isToday ? 600 : 400,
                    color: isToday ? 'var(--bg)' : isSel ? 'var(--ink)' : 'var(--ink-60)',
                    background: isToday ? 'var(--ink)' : 'transparent',
                    borderRadius: 0,
                    lineHeight: 1,
                  }}>{cell.date.getDate()}</div>

                  {/* Activity dots */}
                  {dots.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                      {dots.map((t, j) => (
                        <div key={j} style={{ width: 6, height: 6, background: TYPE_COLOR[t] ?? 'var(--ink-40)', flexShrink: 0 }} />
                      ))}
                      {overflow > 0 && (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-40)', lineHeight: '6px' }}>+{overflow}</span>
                      )}
                    </div>
                  )}

                  {/* Count badge */}
                  {events.length > 0 && (
                    <div style={{
                      position: 'absolute', top: 6, right: 8,
                      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-40)',
                    }}>{events.length}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '10px 18px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
            {Object.entries(TYPE_COLOR).map(([t, c]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--futura)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-40)' }}>
                <div style={{ width: 6, height: 6, background: c }} />
                {TYPE_LABEL[t]}
              </div>
            ))}
          </div>
        </div>

        {/* ── Day detail panel ── */}
        <div style={{ border: '1px solid var(--line)', position: 'sticky', top: 60 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--futura)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
              {selDate ? selDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Select a day'}
            </div>
            {selEvents.length > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-40)', marginTop: 3 }}>
                {selEvents.length} {selEvents.length === 1 ? 'event' : 'events'}
              </div>
            )}
          </div>

          {isLoading && (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-25)' }}>Loading…</div>
          )}

          {!isLoading && selEvents.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-25)' }}>
              No activity logged
            </div>
          )}

          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {selEvents.map((ev, i) => {
              const lead = ev.leads;
              return (
                <div
                  key={ev.id ?? i}
                  style={{
                    display: 'grid', gridTemplateColumns: '20px 1fr', gap: 10,
                    padding: '12px 16px',
                    borderBottom: i < selEvents.length - 1 ? '1px solid var(--line)' : 'none',
                    cursor: lead && ev._kind !== 'lead' ? 'pointer' : 'default',
                  }}
                  onClick={() => lead && onOpenLead && onOpenLead(lead.id)}
                >
                  {/* Icon */}
                  <div style={{ color: TYPE_COLOR[ev._kind] ?? 'var(--ink-40)', paddingTop: 1 }}>
                    <TypeIcon type={ev._kind} size={13} />
                  </div>

                  {/* Content */}
                  <div>
                    {lead && (
                      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500, marginBottom: 2, letterSpacing: '0.01em' }}>
                        {lead.name}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--ink-60)', lineHeight: 1.45, letterSpacing: '0.01em' }}>
                      {ev.text}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-25)', marginTop: 4 }}>
                      {TYPE_LABEL[ev._kind]} · {fmt12(ev.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: day detail below grid */}
      <style>{`
        @media (max-width: 880px) {
          .cal-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
