import { useState, useRef } from 'react';
import { Icons } from '../components/icons';
import { useOfficers, useCreateOfficer, useOfficerStreak, useBulkCreateOfficers } from '../hooks/useOfficers';
import { COUNCILS } from '../constants';

// ─── CSV / JSON parsing ────────────────────────────────────────────────────

function parseCsvText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseRow = (line) => {
    const fields = [];
    let i = 0;
    while (i <= line.length) {
      if (line[i] === '"') {
        let val = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else val += line[i++];
        }
        if (line[i] === ',') i++;
        fields.push(val);
      } else {
        const j = line.indexOf(',', i);
        const end = j === -1 ? line.length : j;
        fields.push(line.slice(i, end).trim());
        if (j === -1) break;
        i = end + 1;
      }
    }
    return fields;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseRow(l);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

async function parseFile(file) {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : (parsed.officers ?? parsed.data ?? Object.values(parsed));
  }
  return parseCsvText(text);
}

// ─── Field mapping ─────────────────────────────────────────────────────────

const FIELD_ALIASES = {
  name:         ['name', 'full_name', 'fullname', 'officer', 'officer_name', 'contact', 'contact_name'],
  title:        ['title', 'job_title', 'jobtitle', 'position', 'role', 'job'],
  council:      ['council', 'local_authority', 'la', 'authority', 'council_name'],
  borough:      ['borough', 'area', 'district', 'ward'],
  email:        ['email', 'email_address', 'e_mail', 'mail'],
  phone:        ['phone', 'telephone', 'mobile', 'tel', 'phone_number', 'contact_number'],
  temp:         ['temp', 'temperature', 'warmth', 'status', 'relationship_status'],
  score:        ['score', 'relationship_score', 'rel_score', 'rating'],
  notes:        ['notes', 'note', 'comments', 'comment', 'description'],
  response_hrs: ['response_hrs', 'response_time', 'avg_response', 'response_hours'],
  prefers_sms:  ['prefers_sms', 'sms', 'contact_preference', 'preferred_contact'],
};

function norm(k) { return k.toLowerCase().replace(/[\s\-]/g, '_'); }

function mapRow(raw) {
  const out = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const key of Object.keys(raw)) {
      if (aliases.includes(norm(key))) { out[field] = raw[key]; break; }
    }
  }
  if (out.score !== undefined)        out.score        = parseInt(out.score) || 50;
  if (out.response_hrs !== undefined) out.response_hrs = parseInt(out.response_hrs) || 24;
  if (out.prefers_sms !== undefined)  out.prefers_sms  = ['true','1','yes','sms'].includes(String(out.prefers_sms).toLowerCase());
  if (out.temp) out.temp = ['hot','warm','cool'].includes(out.temp.toLowerCase()) ? out.temp.toLowerCase() : 'warm';
  else out.temp = 'warm';
  if (!out.score) out.score = 50;
  return out;
}

// ─── Import modal ──────────────────────────────────────────────────────────

function ImportOfficersModal({ onClose }) {
  const bulk = useBulkCreateOfficers();
  const fileRef = useRef();
  const [step, setStep]     = useState('upload'); // upload | preview | done
  const [rows, setRows]     = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const PREVIEW_COLS = ['name','title','council','borough','email','phone'];

  const handleFile = async (file) => {
    if (!file) return;
    setParseError('');
    try {
      const raw = await parseFile(file);
      const mapped = raw.map(mapRow).filter(r => r.name);
      if (!mapped.length) { setParseError('No rows with a "name" column found.'); return; }
      setFileName(file.name);
      setRows(mapped);
      setStep('preview');
    } catch (e) {
      setParseError(e.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    try {
      await bulk.mutateAsync(rows);
      setResult({ ok: rows.length, failed: 0 });
    } catch (e) {
      setResult({ ok: 0, failed: rows.length, msg: e.message });
    }
    setStep('done');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 'min(720px, 96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Import officers</div>
        <div className="modal-sub">CSV or JSON — accepts name, title, council, borough, email, phone, temp, score, notes</div>

        {step === 'upload' && (
          <>
            <div
              style={{
                border: `2px dashed ${dragOver ? 'var(--ink)' : 'var(--line-2)'}`,
                padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--bg-2)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                Drop a file here or click to browse
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', fontFamily: 'var(--mono)' }}>
                .csv · .json
              </div>
              <input
                ref={fileRef} type="file" accept=".csv,.json"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
            {parseError && <div className="login-error" style={{ marginTop: 12 }}>{parseError}</div>}
            <div style={{ marginTop: 18, padding: '14px 16px', background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 10, color: 'var(--ink-40)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Expected columns</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['name *','title','council','borough','email','phone','temp','score','notes','response_hrs','prefers_sms'].map(f => (
                  <span key={f} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: f.includes('*') ? 'var(--ink)' : 'var(--ink-60)', background: 'var(--bg-3)', padding: '2px 8px' }}>{f}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>✓ {fileName}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-40)' }}>— {rows.length} officers ready</span>
              <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => { setStep('upload'); setRows([]); }}>
                Change file
              </button>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--line)', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {PREVIEW_COLS.map(c => (
                      <th key={c} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--futura)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-40)', background: 'var(--bg-2)', whiteSpace: 'nowrap' }}>{c}</th>
                    ))}
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--futura)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-40)', background: 'var(--bg-2)' }}>temp</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                      {PREVIEW_COLS.map(c => (
                        <td key={c} style={{ padding: '8px 12px', color: r[c] ? 'var(--ink)' : 'var(--ink-25)', fontFamily: c === 'email' || c === 'phone' ? 'var(--mono)' : 'inherit', fontSize: 12 }}>
                          {r[c] || '—'}
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: r.temp === 'hot' ? 'var(--red)' : r.temp === 'warm' ? 'var(--amber)' : 'var(--ink-40)' }}>
                          {r.temp}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <div style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-40)', borderTop: '1px solid var(--line)' }}>
                  + {rows.length - 5} more rows
                </div>
              )}
            </div>
            {rows.some(r => !r.council) && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', marginBottom: 12 }}>
                ⚠ Some rows have no council — they will import without one
              </div>
            )}
          </>
        )}

        {step === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            {result.ok > 0 ? (
              <>
                <div style={{ fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>{result.ok}</div>
                <div style={{ color: 'var(--ink-60)', fontSize: 13 }}>officers imported successfully</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 8 }}>Import failed</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-40)' }}>{result.msg}</div>
              </>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          {step === 'preview' && (
            <button className="btn primary" onClick={handleImport} disabled={bulk.isPending}>
              {bulk.isPending ? 'Importing…' : `Import ${rows.length} officers`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const h = diff / 3600000;
  if (h < 24) return 'Today';
  if (h < 48) return 'Yesterday';
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

const Streak = ({ data }) => (
  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 24 }}>
    {(data || []).map((v, i) => (
      <div key={i} style={{
        flex: 1, background: v ? 'var(--ink)' : 'var(--bg-3)',
        height: v ? '100%' : '30%',
        opacity: v ? (0.4 + 0.6 * ((i + 1) / data.length)) : 1,
        minWidth: 3,
      }} />
    ))}
  </div>
);

function AddOfficerModal({ onClose }) {
  const createOfficer = useCreateOfficer();
  const [form, setForm] = useState({
    name: '', title: '', council: 'RBKC', borough: '',
    email: '', phone: '', temp: 'warm', score: 50,
    response_hrs: 24, prefers_sms: false, notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createOfficer.mutateAsync(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Add housing officer</div>
        <div className="modal-sub">Supply-side relationship</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label>Full name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-field">
              <label>Job title</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Housing Officer" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Council</label>
              <select className="form-select" value={form.council} onChange={e => set('council', e.target.value)}>
                {COUNCILS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Borough</label>
              <input className="form-input" value={form.borough} onChange={e => set('borough', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Temperature</label>
              <select className="form-select" value={form.temp} onChange={e => set('temp', e.target.value)}>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
              </select>
            </div>
            <div className="form-field">
              <label>Rel. score (0–100)</label>
              <input className="form-input" type="number" min="0" max="100" value={form.score} onChange={e => set('score', parseInt(e.target.value))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field full">
              <label>Notes</label>
              <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Working style, preferences, cadence…" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={createOfficer.isPending}>
              {createOfficer.isPending ? 'Saving…' : 'Add officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const OfficerCard = ({ o }) => {
  const { data: liveStreak } = useOfficerStreak(o.id);
  const streakData = liveStreak || o.streak || [];
  return (
  <div className={`officer-card ${o.temp}`}>
    <div className="officer-head">
      <div className="officer-init">{(o.name || '').split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 className="officer-name">{o.name}</h3>
        <div className="officer-sub">{o.title} · {o.council}{o.borough ? ` / ${o.borough}` : ''}</div>
      </div>
      <div className={`officer-temp ${o.temp}`}>{o.temp}</div>
    </div>

    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="lbl" style={{ letterSpacing: '0.18em' }}>Relationship</div>
      <div style={{ flex: 1 }}>
        <div className="relationship-bar">
          <div className="fill" style={{ width: (o.score || 0) + '%' }}></div>
          <div className="marker" style={{ left: (o.score || 0) + '%' }}></div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{o.score}</div>
    </div>

    <div className="officer-stats">
      <div className="officer-stat">
        <div className="lbl">Referrals 30d</div>
        <div className="v">{o.referrals_30d || 0}</div>
      </div>
      <div className="officer-stat">
        <div className="lbl">Signed 30d</div>
        <div className={`v ${(o.signed_30d || 0) > 0 ? 'green' : ''}`}>{o.signed_30d || 0}</div>
      </div>
      <div className="officer-stat">
        <div className="lbl">Fees 30d</div>
        <div className="v">£{((o.fees_generated || 0) / 1000).toFixed(1)}k</div>
      </div>
      <div className="officer-stat">
        <div className="lbl">Active</div>
        <div className="v">{o.active_leads || 0}</div>
      </div>
    </div>

    {streakData.length > 0 && (
      <div style={{ marginTop: 16 }}>
        <div className="lbl" style={{ marginBottom: 6 }}>30-day referral activity</div>
        <Streak data={streakData} />
      </div>
    )}

    <div className="officer-sub-row">
      <span>Last contact <b>{timeAgo(o.last_contact_at)}</b></span>
      <span style={{ color: 'var(--ink-15)' }}>·</span>
      <span>Replies in <b>{o.response_hrs || '?'}h</b> avg</span>
      {o.conversion_pct != null && (
        <>
          <span style={{ color: 'var(--ink-15)' }}>·</span>
          <span>Conv <b>{o.conversion_pct}%</b></span>
        </>
      )}
      <span style={{ color: 'var(--ink-15)' }}>·</span>
      <span>Prefers <b>{o.prefers_sms ? 'SMS' : 'Email'}</b></span>
    </div>

    {o.notes && (
      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)',
        fontSize: 12, color: 'var(--ink-80)', letterSpacing: '0.01em',
        lineHeight: 1.5, fontStyle: 'italic',
      }}>
        "{o.notes}"
      </div>
    )}

    <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
      <button className="btn"><Icons.Phone size={11} />Call</button>
      <button className="btn"><Icons.Mail size={11} />{o.prefers_sms ? 'SMS' : 'Email'}</button>
      <button className="btn ghost sm">Log touchpoint</button>
      <button className="btn ghost sm" style={{ marginLeft: 'auto' }}>View leads →</button>
    </div>
  </div>
  );
};

export default function Officers() {
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { data: officers = [], isLoading } = useOfficers();

  const filtered = officers.filter(o => filter === 'all' || o.temp === filter);

  const hot = officers.filter(o => o.temp === 'hot').length;
  const warm = officers.filter(o => o.temp === 'warm').length;
  const totalReferrals = officers.reduce((s, o) => s + (o.referrals_30d || 0), 0);
  const totalFees = officers.reduce((s, o) => s + (o.fees_generated || 0), 0);

  if (isLoading) return <div className="loading-state">Loading officers…</div>;

  return (
    <div className="page" data-screen-label="Housing Officers">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">SUPPLY-SIDE RELATIONSHIPS · {officers.length} OFFICERS</div>
          <h1 className="page-title">Housing Officers</h1>
          <div className="page-sub">Your most leveraged channel — track relationship temperature & yield</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost">Export</button>
          <button className="btn ghost" onClick={() => setShowImportModal(true)}>↑ Import</button>
          <button className="btn primary" onClick={() => setShowAddModal(true)}>+ Add officer</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">Hot officers</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{hot}</div>
          <div className="stat-delta"><span style={{ color: 'var(--ink-40)' }}>of {officers.length}</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">Referrals 30d</div>
          <div className="stat-value">{totalReferrals}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Officer-sourced fees</div>
          <div className="stat-value">£{(totalFees / 1000).toFixed(1)}k</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg response</div>
          <div className="stat-value">
            {officers.length > 0
              ? Math.round(officers.reduce((s, o) => s + (o.response_hrs || 24), 0) / officers.length)
              : '—'}
            <span style={{ fontSize: 14, color: 'var(--ink-40)', marginLeft: 6 }}>hrs</span>
          </div>
        </div>
      </div>

      <div className="chip-row">
        <span className="chip-group-label">Temperature</span>
        {['all', 'hot', 'warm', 'cool'].map(f => (
          <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span className="count">{officers.filter(o => o.temp === f).length}</span>}
            {f === 'all' && <span className="count">{officers.length}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">No officers {filter !== 'all' ? `with "${filter}" temperature` : 'yet'}</div>
      )}

      <div className="officer-grid">
        {filtered.map(o => <OfficerCard key={o.id} o={o} />)}
      </div>

      {showAddModal && <AddOfficerModal onClose={() => setShowAddModal(false)} />}
      {showImportModal && <ImportOfficersModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
