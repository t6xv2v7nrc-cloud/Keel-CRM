import { useState, useRef } from 'react';
import { Icons } from '../components/icons';
import { StatusPill, SourceTag, Money, Chip, CouncilSelect } from '../components/ui';
import { useLeads, useCreateLead, useBulkCreateLeads } from '../hooks/useLeads';
import { STATUSES, SOURCES, COUNCILS, FAILURE_REASONS } from '../constants';

// ─── CSV / JSON / Email parsing ────────────────────────────────────────────

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

// Parse a keellettings.com form-response email (or anything Key: Value formatted)
function parseEmailBody(text) {
  const get = (re) => {
    const m = text.match(re);
    return m ? m[1].trim() : '';
  };
  const firstName = get(/First Name:\s*(.+)/i);
  const lastName  = get(/Last Name:\s*(.+)/i);
  const email     = get(/Email:\s*(.+)/i);
  const phone     = get(/Phone:\s*(.+)/i);
  const enquiry   = get(/Enquiry Type:\s*(.+)/i);
  // Message can span multiple lines — grab everything after "Message:"
  const msgMatch  = text.match(/Message:\s*([\s\S]+?)(?:\n\s*\n\s*[A-Z][\w\s]+:|$)/i);
  const message   = msgMatch ? msgMatch[1].trim() : '';

  const name = `${firstName} ${lastName}`.trim();
  if (!name) return null;

  return {
    name,
    email: email || null,
    phone: phone || null,
    source: 'website',
    council: '',
    status: 'lead',
    notes: [enquiry && `Enquiry type: ${enquiry}`, message].filter(Boolean).join('\n\n'),
  };
}

const LEAD_ALIASES = {
  name:        ['name', 'full_name', 'fullname', 'contact_name', 'lead_name'],
  phone:       ['phone', 'telephone', 'mobile', 'tel', 'phone_number', 'contact_number'],
  email:       ['email', 'email_address', 'e_mail'],
  source:      ['source', 'channel', 'origin'],
  council:     ['council', 'local_authority', 'la', 'authority'],
  borough:     ['borough', 'area', 'district'],
  status:      ['status', 'stage', 'pipeline_stage'],
  value:       ['value', 'fee', 'total_fee', 'amount'],
  notes:       ['notes', 'note', 'comments', 'message', 'description'],
  next_action: ['next_action', 'next_step', 'todo', 'action'],
  composition: ['composition', 'household', 'family'],
  benefits:    ['benefits', 'income_source', 'income'],
};

const VALID_SOURCES  = SOURCES.map(s => s.id);
const VALID_STATUSES = STATUSES.map(s => s.id);

const norm = (k) => k.toLowerCase().replace(/[\s\-]/g, '_');

function mapLeadRow(raw) {
  const out = {};
  for (const [field, aliases] of Object.entries(LEAD_ALIASES)) {
    for (const key of Object.keys(raw)) {
      if (aliases.includes(norm(key))) { out[field] = raw[key]; break; }
    }
  }
  if (out.value)  out.value  = parseInt(String(out.value).replace(/[£,\s]/g, '')) || null;
  if (out.source) out.source = VALID_SOURCES.includes(String(out.source).toLowerCase())
                    ? String(out.source).toLowerCase() : 'website';
  else out.source = 'website';
  if (out.status) out.status = VALID_STATUSES.includes(String(out.status).toLowerCase())
                    ? String(out.status).toLowerCase() : 'lead';
  else out.status = 'lead';
  if (!out.council) out.council = 'RBKC';
  return out;
}

async function parseFile(file) {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : (parsed.leads ?? parsed.data ?? Object.values(parsed));
  }
  return parseCsvText(text);
}

// ─── Import Modal ──────────────────────────────────────────────────────────

function ImportLeadsModal({ onClose }) {
  const bulk = useBulkCreateLeads();
  const fileRef = useRef();
  const [mode, setMode]         = useState('file'); // file | email | json
  const [rows, setRows]         = useState([]);
  const [fileName, setFileName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [step, setStep]         = useState('input'); // input | preview | done
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    try {
      const raw = await parseFile(file);
      const mapped = raw.map(mapLeadRow).filter(r => r.name);
      if (!mapped.length) { setError('No rows with a "name" column found.'); return; }
      setFileName(file.name);
      setRows(mapped);
      setStep('preview');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleParsePaste = () => {
    setError('');
    if (!pasteText.trim()) { setError('Paste something first.'); return; }

    if (mode === 'email') {
      const parsed = parseEmailBody(pasteText);
      if (!parsed) { setError('Could not extract a name. Make sure the email has "First Name:" and "Last Name:" lines.'); return; }
      setRows([parsed]);
      setFileName('Pasted email');
      setStep('preview');
    } else if (mode === 'json') {
      try {
        const parsed = JSON.parse(pasteText);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const mapped = arr.map(mapLeadRow).filter(r => r.name);
        if (!mapped.length) { setError('No leads with a "name" field found in JSON.'); return; }
        setRows(mapped);
        setFileName(`Pasted JSON (${mapped.length})`);
        setStep('preview');
      } catch (e) {
        setError('Invalid JSON: ' + e.message);
      }
    }
  };

  const handleImport = async () => {
    try {
      await bulk.mutateAsync(rows.map(r => ({ ...r, last_contact_at: new Date().toISOString() })));
      setResult({ ok: rows.length, failed: 0 });
    } catch (e) {
      setResult({ ok: 0, failed: rows.length, msg: e.message });
    }
    setStep('done');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const updateRow = (idx, field, val) => {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 'min(760px, 96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Import leads</div>
        <div className="modal-sub">Upload a file, paste JSON, or paste a form-response email</div>

        {step === 'input' && (
          <>
            {/* Mode tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 16, gap: 0 }}>
              {[
                { id: 'file',  label: 'File (CSV/JSON)' },
                { id: 'email', label: 'Paste email' },
                { id: 'json',  label: 'Paste JSON' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`composer-tab ${mode === m.id ? 'active' : ''}`}
                  style={{ borderRight: '1px solid var(--line)' }}
                  onClick={() => { setMode(m.id); setError(''); }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'file' && (
              <>
                <div
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--ink)' : 'var(--line-2)'}`,
                    padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                    background: dragOver ? 'var(--bg-2)' : 'transparent',
                  }}
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
                <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-40)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Accepted columns</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['name *','email','phone','council','borough','source','status','value','notes','next_action'].map(f => (
                      <span key={f} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: f.includes('*') ? 'var(--ink)' : 'var(--ink-60)', background: 'var(--bg-3)', padding: '2px 8px' }}>{f}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === 'email' && (
              <>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-40)', marginBottom: 8 }}>
                  Paste the body of a form-response email (e.g. from keellettings.com)
                </div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={`First Name: Victoria\nLast Name: Carr\nEmail: victoria@example.com\nPhone: 07931...\nEnquiry Type: Tenant\nMessage: ...`}
                  style={{ width: '100%', minHeight: 200, padding: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }}
                />
                <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={handleParsePaste}>
                  Parse email
                </button>
              </>
            )}

            {mode === 'json' && (
              <>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-40)', marginBottom: 8 }}>
                  Paste a JSON object or array of leads
                </div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={`{\n  "name": "Victoria Carr",\n  "email": "victoria@example.com",\n  "phone": "07931...",\n  "council": "RBKC",\n  "notes": "2-bed needed"\n}`}
                  style={{ width: '100%', minHeight: 200, padding: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }}
                />
                <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={handleParsePaste}>
                  Parse JSON
                </button>
              </>
            )}

            {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}
          </>
        )}

        {step === 'preview' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>✓ {fileName}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-40)' }}>— {rows.length} lead{rows.length !== 1 ? 's' : ''} ready</span>
              <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => { setStep('input'); setRows([]); setPasteText(''); }}>
                Start over
              </button>
            </div>

            {/* If only one row, show an editable form so user can fill missing info */}
            {rows.length === 1 ? (
              <div style={{ border: '1px solid var(--line)', padding: 16, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-40)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>Review & edit before saving</div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Name *</label>
                    <input className="form-input" value={rows[0].name ?? ''} onChange={e => updateRow(0, 'name', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Phone</label>
                    <input className="form-input" value={rows[0].phone ?? ''} onChange={e => updateRow(0, 'phone', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Email</label>
                    <input className="form-input" value={rows[0].email ?? ''} onChange={e => updateRow(0, 'email', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Source</label>
                    <select className="form-select" value={rows[0].source ?? 'website'} onChange={e => updateRow(0, 'source', e.target.value)}>
                      {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Council</label>
                    <CouncilSelect value={rows[0].council ?? ''} onChange={v => updateRow(0, 'council', v)} />
                  </div>
                  <div className="form-field">
                    <label>Borough</label>
                    <input className="form-input" value={rows[0].borough ?? ''} onChange={e => updateRow(0, 'borough', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field full">
                    <label>Notes</label>
                    <textarea
                      className="form-input"
                      value={rows[0].notes ?? ''}
                      onChange={e => updateRow(0, 'notes', e.target.value)}
                      style={{ minHeight: 100, fontFamily: 'var(--futura)', fontSize: 12, resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--line)', marginBottom: 16, maxHeight: 320 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-2)' }}>
                    <tr>
                      {['name','email','phone','council','source','value'].map(c => (
                        <th key={c} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--futura)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-40)' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                        {['name','email','phone','council','source','value'].map(c => (
                          <td key={c} style={{ padding: '8px 12px', color: r[c] ? 'var(--ink)' : 'var(--ink-25)', fontFamily: ['email','phone'].includes(c) ? 'var(--mono)' : 'inherit' }}>
                            {r[c] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 8 && (
                  <div style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-40)', borderTop: '1px solid var(--line)' }}>
                    + {rows.length - 8} more rows
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {step === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            {result.ok > 0 ? (
              <>
                <div style={{ fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>{result.ok}</div>
                <div style={{ color: 'var(--ink-60)', fontSize: 13 }}>lead{result.ok !== 1 ? 's' : ''} imported</div>
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
            <button className="btn primary" onClick={handleImport} disabled={bulk.isPending || !rows[0]?.name?.trim()}>
              {bulk.isPending ? 'Saving…' : `Import ${rows.length} lead${rows.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddLeadModal({ onClose }) {
  const createLead = useCreateLead();
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    source: 'whatsapp', council: 'RBKC', borough: '',
    status: 'lead', value: '', next_action: '',
    operator_split: 0.45, partner_split: 0.40, council_fee: 0.15,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createLead.mutateAsync({
      ...form,
      value: form.value ? parseInt(form.value) : null,
      last_contact_at: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Add new lead</div>
        <div className="modal-sub">Fill in what you know — everything can be updated later</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label>Full name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 900000" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Value (£/month fee)</label>
              <input className="form-input" type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="1800" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Source</label>
              <select className="form-select" value={form.source} onChange={e => set('source', e.target.value)}>
                {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.filter(s => s.id !== 'dead').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Council</label>
              <CouncilSelect value={form.council} onChange={v => set('council', v)} />
            </div>
            <div className="form-field">
              <label>Borough</label>
              <input className="form-input" value={form.borough} onChange={e => set('borough', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field full">
              <label>Next action</label>
              <input className="form-input" value={form.next_action} onChange={e => set('next_action', e.target.value)} placeholder="e.g. Qualify income source" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={createLead.isPending}>
              {createLead.isPending ? 'Saving…' : 'Create lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatLastContact(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const h = diff / 3600000;
  if (h < 2) return 'Just now';
  if (h < 24) return 'Today';
  if (h < 48) return 'Yesterday';
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function isStaleContact(ts) {
  if (!ts) return true;
  return (Date.now() - new Date(ts).getTime()) > 72 * 3600000;
}

function exportCSV(leads) {
  const cols = ['name', 'email', 'phone', 'source', 'council', 'borough', 'status', 'value', 'last_contact_at', 'next_action', 'next_action_due', 'failure_reason', 'notes'];
  const header = cols.join(',');
  const rows = leads.map(l =>
    cols.map(k => {
      const v = l[k] ?? '';
      return typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `keel-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function Leads({ onOpenLead }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [councilFilter, setCouncilFilter] = useState('all');
  const [showDead, setShowDead] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: leads = [], isLoading } = useLeads();

  const filtered = leads.filter(l => {
    if (!showDead && l.status === 'dead') return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
    if (councilFilter !== 'all' && l.council !== councilFilter) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, l) => s + (l.status === 'dead' ? 0 : (l.value || 0)), 0);

  const councils = [...new Set(leads.map(l => l.council))].sort();

  if (isLoading) return <div className="loading-state">Loading leads…</div>;

  return (
    <div className="page" data-screen-label="Leads">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">PIPELINE · {filtered.length}/{leads.length} LEADS</div>
          <h1 className="page-title">Leads</h1>
          <div className="page-sub"><Money v={totalValue} /> in active pipeline</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => exportCSV(filtered)}>Export CSV</button>
          <button className="btn ghost" onClick={() => setShowImportModal(true)}>↑ Import</button>
          <button className="btn primary" onClick={() => setShowAddModal(true)}>+ New lead</button>
        </div>
      </div>

      <div className="chip-row">
        <span className="chip-group-label">Status</span>
        <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={leads.length}>All</Chip>
        {STATUSES.filter(s => s.id !== 'dead').map(s => (
          <Chip key={s.id} active={statusFilter === s.id} onClick={() => setStatusFilter(s.id)}
            count={leads.filter(l => l.status === s.id).length}>
            {s.label}
          </Chip>
        ))}
        <div className="chip-divider" />
        <span className="chip-group-label">Source</span>
        <Chip active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')}>All</Chip>
        {SOURCES.map(s => (
          <Chip key={s.id} active={sourceFilter === s.id} onClick={() => setSourceFilter(s.id)}>{s.label}</Chip>
        ))}
      </div>

      <div className="chip-row">
        <span className="chip-group-label">Council</span>
        <Chip active={councilFilter === 'all'} onClick={() => setCouncilFilter('all')}>All</Chip>
        {councils.map(c => (
          <Chip key={c} active={councilFilter === c} onClick={() => setCouncilFilter(c)}>{c}</Chip>
        ))}
        <div className="chip-divider" />
        <Chip active={showDead} onClick={() => setShowDead(!showDead)}>
          {showDead ? 'Hide dead' : 'Show dead'}
        </Chip>
      </div>

      <div className="table-wrap">
        <table className="leads">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Source</th>
              <th>Council</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Value</th>
              <th>Last Contact</th>
              <th>Next Action</th>
              <th style={{ width: 24 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const lastContact = formatLastContact(l.last_contact_at);
              const stale = isStaleContact(l.last_contact_at);
              return (
                <tr key={l.id} onClick={() => onOpenLead(l.id)}>
                  <td>
                    <div className="cell-name">{l.name}</div>
                    <div className="cell-sub">{l.id?.slice(0, 8)} · {l.borough || l.council}</div>
                  </td>
                  <td>
                    <SourceTag source={l.source} />
                    {l.officer_name && <div className="cell-sub" style={{ marginTop: 4 }}>{l.officer_name}</div>}
                  </td>
                  <td><span className="mono" style={{ color: 'var(--ink)', fontSize: 12 }}>{l.council}</span></td>
                  <td><StatusPill status={l.status} /></td>
                  <td className="cell-value" style={{ textAlign: 'right' }}>
                    {l.status === 'dead'
                      ? <span className="mono" style={{ color: 'var(--ink-25)', textDecoration: 'line-through' }}>£{(l.value || 0).toLocaleString()}</span>
                      : <Money v={l.value || 0} />
                    }
                  </td>
                  <td>
                    <span className={`mono ${stale && l.status !== 'dead' ? 'cell-stale' : ''}`}
                          style={{ fontSize: 11, color: stale && l.status !== 'dead' ? 'var(--red)' : 'var(--ink-60)' }}>
                      {lastContact}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: 'var(--ink-80)' }}>{l.next_action || '—'}</div>
                    {l.next_action_due && l.next_action_due !== '—' && (
                      <div className="mono" style={{ marginTop: 3, color: 'var(--ink-40)', fontSize: 10 }}>
                        {l.next_action_due}
                      </div>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" title="More"><Icons.Dots size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 50, color: 'var(--ink-40)' }}>
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="fab" onClick={() => setShowAddModal(true)}>+ Add Lead</button>
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
      {showImportModal && <ImportLeadsModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
