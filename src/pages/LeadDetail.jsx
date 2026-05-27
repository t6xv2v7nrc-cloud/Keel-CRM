import { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/icons';
import { StatusPill, SourceTag, Money } from '../components/ui';
import { useLead, useLeadActivity, useUpdateLead, useAddActivity, useCreateLead } from '../hooks/useLeads';
import { supabase } from '../lib/supabase';
import { STATUSES, STATUS_FLOW, FAILURE_REASONS } from '../constants';

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const h = diff / 3600000;
  if (h < 1) return 'Just now';
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

// ─── Editable fee breakdown ───────────────────────────────────────────────

function FeeBreakdown({ lead, updateLead }) {
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState(lead.value || 0);
  const [opPct,   setOpPct]     = useState(Math.round((lead.operator_split || 0.45) * 100));
  const [paPct,   setPaPct]     = useState(Math.round((lead.partner_split  || 0.40) * 100));
  // Council is computed = 100 - op - pa (must always sum to 100)
  const coPct = Math.max(0, 100 - opPct - paPct);
  const total = parseInt(value) || 0;
  const opCut = Math.round(total * opPct / 100);
  const paCut = Math.round(total * paPct / 100);
  const coCut = total - opCut - paCut;

  const save = async () => {
    await updateLead.mutateAsync({
      id: lead.id,
      value: total,
      operator_split: opPct / 100,
      partner_split:  paPct / 100,
      council_fee:    coPct / 100,
    });
    setEditing(false);
  };

  const cancel = () => {
    setValue(lead.value || 0);
    setOpPct(Math.round((lead.operator_split || 0.45) * 100));
    setPaPct(Math.round((lead.partner_split  || 0.40) * 100));
    setEditing(false);
  };

  return (
    <div className="mod">
      <div className="mod-head">
        <h3>Fee breakdown</h3>
        <span className="sub">{editing ? 'editing' : 'council incentive'}</span>
        <div className="right">
          {!editing ? (
            <button className="btn ghost sm" onClick={() => setEditing(true)}>Edit splits</button>
          ) : (
            <>
              <button className="btn ghost sm" onClick={cancel}>Cancel</button>
              <button className="btn sm" onClick={save} disabled={updateLead.isPending}>
                {updateLead.isPending ? '…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {editing ? (
            <>
              <span className="mono" style={{ fontSize: 22, color: 'var(--ink-40)' }}>£</span>
              <input
                type="number" min="0" step="100"
                value={value}
                onChange={e => setValue(e.target.value)}
                style={{
                  fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em',
                  background: 'var(--bg-2)', border: '1px solid var(--line-2)',
                  color: 'var(--ink)', padding: '4px 10px', width: 160, outline: 'none',
                }}
              />
            </>
          ) : (
            <span className="mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              £{total.toLocaleString()}
            </span>
          )}
          <span className="lbl">total fee</span>
        </div>

        <div className="fee-bar">
          <div className="fee-seg" style={{ background: 'var(--ink)',   color: 'var(--bg)',     flex: opPct || 0.01 }}>{opPct}%</div>
          <div className="fee-seg" style={{ background: 'var(--ink-40)', color: 'var(--bg)',     flex: paPct || 0.01 }}>{paPct}%</div>
          <div className="fee-seg" style={{ background: 'var(--bg-3)',  color: 'var(--ink-60)', flex: coPct || 0.01 }}>{coPct}%</div>
        </div>

        <div className="fee-legend">
          <div className="fee-row">
            <span className="swatch" style={{ background: 'var(--ink)' }}></span>
            You (operator)
            {editing && (
              <input
                type="number" min="0" max="100"
                value={opPct}
                onChange={e => {
                  const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  setOpPct(v);
                  if (v + paPct > 100) setPaPct(100 - v);
                }}
                style={{ width: 50, fontFamily: 'var(--mono)', fontSize: 12, padding: '2px 6px', background: 'var(--bg-2)', border: '1px solid var(--line-2)', color: 'var(--ink)', marginLeft: 8, outline: 'none' }}
              />
            )}
            <span className="amt">£{opCut.toLocaleString()}</span>
          </div>
          <div className="fee-row">
            <span className="swatch" style={{ background: 'var(--ink-40)' }}></span>
            Partner {lead.officer_name ? `· ${lead.officer_name}` : '· Sourcing'}
            {editing && (
              <input
                type="number" min="0" max="100"
                value={paPct}
                onChange={e => {
                  const v = Math.max(0, Math.min(100 - opPct, parseInt(e.target.value) || 0));
                  setPaPct(v);
                }}
                style={{ width: 50, fontFamily: 'var(--mono)', fontSize: 12, padding: '2px 6px', background: 'var(--bg-2)', border: '1px solid var(--line-2)', color: 'var(--ink)', marginLeft: 8, outline: 'none' }}
              />
            )}
            <span className="amt">£{paCut.toLocaleString()}</span>
          </div>
          <div className="fee-row">
            <span className="swatch" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}></span>
            Council admin <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-25)', marginLeft: 4 }}>(auto)</span>
            <span className="amt">£{coCut.toLocaleString()}</span>
          </div>
        </div>

        {editing && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-40)', marginTop: 12, padding: '8px 10px', background: 'var(--bg-2)', borderLeft: '2px solid var(--ink)' }}>
            Council % auto-balances so the total stays at 100%.
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadDetail({ leadId, onBack }) {
  const { data: lead, isLoading } = useLead(leadId);
  const { data: activity = [] } = useLeadActivity(leadId);
  const updateLead = useUpdateLead();
  const addActivity = useAddActivity();
  const createLead = useCreateLead();

  const [tab, setTab] = useState('note');
  const [noteText, setNoteText] = useState('');
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const composerRef = useRef(null);
  const textareaRef = useRef(null);

  // Close overflow menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = () => setMenuOpen(false);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [menuOpen]);

  const focusComposer = (whichTab) => {
    setTab(whichTab);
    setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      textareaRef.current?.focus();
    }, 50);
  };

  const handleShareEmail = () => {
    if (!lead) return;
    const subject = `Lead — ${lead.name}`;
    const body = [
      `Name: ${lead.name}`,
      lead.phone   && `Phone: ${lead.phone}`,
      lead.email   && `Email: ${lead.email}`,
      lead.council && `Council: ${lead.council}${lead.borough ? ` / ${lead.borough}` : ''}`,
      lead.status  && `Status: ${lead.status}`,
      lead.value   && `Value: £${lead.value.toLocaleString()}`,
      lead.notes   && `\nNotes:\n${lead.notes}`,
    ].filter(Boolean).join('\n');
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDuplicate = async () => {
    if (!lead) return;
    setMenuOpen(false);
    const { id, created_at, updated_at, ...rest } = lead;
    await createLead.mutateAsync({
      ...rest,
      name: `${rest.name} (copy)`,
      status: 'lead',
      last_contact_at: null,
    });
  };

  const handleDelete = async () => {
    if (!lead) return;
    setMenuOpen(false);
    if (!window.confirm(`Delete "${lead.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);
    if (!error) onBack();
    else alert('Delete failed: ' + error.message);
  };

  if (isLoading) return <div className="loading-state">Loading…</div>;
  if (!lead) return <div className="loading-state">Lead not found</div>;

  const statusObj = STATUSES.find(s => s.id === lead.status) || STATUSES[0];
  const isDead = lead.status === 'dead';
  const currentIdx = isDead ? -1 : statusObj.idx;

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'dead') {
      setShowFailureModal(true);
    } else {
      updateLead.mutate({
        id: lead.id,
        status: newStatus,
        last_contact_at: new Date().toISOString(),
      });
      addActivity.mutate({
        lead_id: lead.id,
        type: 'status',
        actor: 'You',
        text: `moved to ${newStatus}`,
        meta: { from: lead.status, to: newStatus },
      });
    }
  };

  const handleMarkDead = () => {
    if (!selectedFailure) return;
    updateLead.mutate({ id: lead.id, status: 'dead', failure_reason: selectedFailure });
    addActivity.mutate({
      lead_id: lead.id,
      type: 'status',
      actor: 'You',
      text: `marked as dead · ${selectedFailure}`,
      meta: { from: lead.status, to: 'dead', reason: selectedFailure },
    });
    setShowFailureModal(false);
  };

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await addActivity.mutateAsync({
      lead_id: lead.id,
      type: tab,
      actor: 'You',
      text: tab === 'note' ? 'left a note' : tab === 'call' ? 'logged a call' : 'sent email',
      body: noteText,
    });
    await updateLead.mutateAsync({
      id: lead.id,
      last_contact_at: new Date().toISOString(),
    });
    setNoteText('');
    setSaving(false);
  };

  const initials = lead.name ? lead.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : '??';

  return (
    <div className="page" data-screen-label="Lead Detail">
      <div style={{ marginBottom: 18 }} className="crumb">
        <button className="btn ghost sm" onClick={onBack}>← Leads</button>
        <span className="slash">/</span>
        <span className="mono">{lead.id?.slice(0, 8)}</span>
      </div>

      <div className="lead-hero">
        <div className="lead-hero-top">
          <div className="lead-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="lead-name">{lead.name}</h2>
            <div className="lead-contact">
              {lead.phone && <span><Icons.Phone size={11} />{lead.phone}</span>}
              {lead.email && <span><Icons.Mail size={11} />{lead.email}</span>}
              {(lead.borough || lead.council) && (
                <span><Icons.Pin size={11} />{[lead.borough, lead.council].filter(Boolean).join(', ')}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusPill status={lead.status} />
            <button
              className={`pin-btn ${lead.pinned ? 'pinned' : ''}`}
              onClick={() => updateLead.mutate({ id: lead.id, pinned: !lead.pinned })}
              title={lead.pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
            >
              {lead.pinned ? '⊙ Pinned' : '○ Pin'}
            </button>
            <button className="btn" onClick={() => focusComposer('call')}><Icons.Phone size={11} />Log call</button>
            <button className="btn" onClick={() => focusComposer('note')}><Icons.Note size={11} />Note</button>
            <button className="btn" onClick={handleShareEmail} title="Share lead via email">
              <Icons.Mail size={11} />Share
            </button>
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
                title="More actions"
              >
                <Icons.Dots size={14} />
              </button>
              {menuOpen && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 36, right: 0, minWidth: 180,
                    background: 'var(--bg)', border: '1px solid var(--line-2)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 50,
                  }}
                >
                  <button
                    onClick={handleDuplicate}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: 'transparent', border: 'none',
                      color: 'var(--ink)', fontFamily: 'var(--futura)', fontSize: 12,
                      cursor: 'pointer', borderBottom: '1px solid var(--line)',
                    }}
                  >
                    Duplicate lead
                  </button>
                  <button
                    onClick={handleShareEmail}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: 'transparent', border: 'none',
                      color: 'var(--ink)', fontFamily: 'var(--futura)', fontSize: 12,
                      cursor: 'pointer', borderBottom: '1px solid var(--line)',
                    }}
                  >
                    Share via email
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: 'transparent', border: 'none',
                      color: 'var(--red)', fontFamily: 'var(--futura)', fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Delete lead
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lead-hero-meta">
          <div className="meta-cell">
            <div className="meta-label">Total Value</div>
            <div className="meta-value"><Money v={lead.value || 0} /></div>
          </div>
          <div className="meta-cell">
            <div className="meta-label">Source</div>
            <div className="meta-value" style={{ fontSize: 13, fontFamily: 'var(--futura)' }}>
              <SourceTag source={lead.source} />
            </div>
            {lead.officer_name && (
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-40)', marginTop: 4 }}>{lead.officer_name}</div>
            )}
          </div>
          <div className="meta-cell">
            <div className="meta-label">Last Contact</div>
            <div className="meta-value" style={{ color: !lead.last_contact_at ? 'var(--red)' : 'var(--ink)' }}>
              {timeAgo(lead.last_contact_at)}
            </div>
          </div>
          <div className="meta-cell">
            <div className="meta-label">Next Action</div>
            <div className="meta-value" style={{ fontSize: 13, fontFamily: 'var(--futura)' }}>
              {lead.next_action || '—'}
            </div>
            {lead.next_action_due && (
              <div className="mono" style={{ fontSize: 10, color: 'var(--amber)', marginTop: 4 }}>
                Due {lead.next_action_due}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flow">
        {STATUS_FLOW.map((step, i) => {
          let cls = '';
          if (isDead) cls = i <= 1 ? 'done' : '';
          else if (i < currentIdx) cls = 'done';
          else if (i === currentIdx) cls = 'current';
          return <div key={step} className={`flow-step ${cls}`}>{step}</div>;
        })}
        {isDead && (
          <div className="flow-step" style={{ background: 'var(--red-w)', color: 'var(--red)', flex: '0 0 auto', padding: '12px 16px' }}>
            ✕ {lead.failure_reason}
          </div>
        )}
      </div>

      <div className="lead-grid">
        <div>
          <div ref={composerRef} className="mod" style={{ marginBottom: 18 }}>
            <div className="mod-head">
              <h3>Update lead</h3>
              <span className="sub">log activity + change status</span>
            </div>
            <div style={{ padding: 14 }}>
              <div className="composer">
                <div className="composer-tabs">
                  {['note', 'call', 'email'].map(t => (
                    <button key={t} className={`composer-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder={
                    tab === 'note' ? "What happened? What's next?" :
                    tab === 'call' ? 'Call summary — duration auto-logged' :
                    'Email subject and key points'
                  }
                />
                <div className="composer-footer">
                  <span className="lbl">Status:</span>
                  <select
                    className="status-select"
                    value={lead.status}
                    onChange={e => handleStatusChange(e.target.value)}
                  >
                    {STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={handleSave} disabled={saving || !noteText.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mod">
            <div className="mod-head">
              <h3>Activity</h3>
              <span className="sub">{activity.length} events</span>
            </div>
            <div className="timeline">
              {activity.length === 0 && (
                <div className="empty-state" style={{ padding: 32 }}>No activity yet</div>
              )}
              {activity.map((item, i) => (
                <div key={item.id || i} className="tl-item">
                  <div className={`tl-dot ${item.type}`}>
                    {item.type === 'note' && <Icons.Note size={11} />}
                    {item.type === 'call' && <Icons.Phone size={11} />}
                    {item.type === 'status' && <Icons.Flag size={11} />}
                    {item.type === 'email' && <Icons.Mail size={11} />}
                  </div>
                  <div>
                    <div className="tl-head">
                      <span className="tl-actor">{item.actor}</span>
                      <span className="tl-action">{item.text}</span>
                      <span className="tl-time">{timeAgo(item.created_at)}</span>
                    </div>
                    {item.body && <div className="tl-body note-body">{item.body}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {lead.property_address && (
            <div className="mod">
              <div className="mod-head"><h3>Property</h3></div>
              <div className="property-card">
                <div className="property-thumb">[ photo ]</div>
                <div className="property-info">
                  <div className="addr">{lead.property_address}</div>
                  <div className="det">
                    {lead.property_beds && <span>{lead.property_beds} bed</span>}
                    {lead.property_ppm && <span>£{lead.property_ppm.toLocaleString()} pcm</span>}
                    {lead.property_available && <span>{lead.property_available}</span>}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                    <button className="btn ghost sm">View listing</button>
                    <button className="btn ghost sm">Change</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <FeeBreakdown lead={lead} updateLead={updateLead} />

          {isDead && (
            <div className="mod" style={{ borderColor: 'rgba(226,92,92,0.30)' }}>
              <div className="mod-head" style={{ borderBottomColor: 'rgba(226,92,92,0.30)' }}>
                <h3 style={{ color: 'var(--red)' }}>Failure logged</h3>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <div className="lbl">Reason</div>
                <div className="mono" style={{ fontSize: 15, color: 'var(--ink)', marginTop: 6 }}>{lead.failure_reason}</div>
                <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setShowFailureModal(true)}>
                  Edit reason
                </button>
              </div>
            </div>
          )}

          <div className="mod">
            <div className="mod-head"><h3>Tenant profile</h3></div>
            <div style={{ padding: '4px 0' }}>
              {[
                ['Household', lead.composition || '—'],
                ['Benefits', lead.benefits || '—'],
                ['Notes', lead.notes || '—'],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 20px', fontSize: 12,
                  borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                  gap: 12,
                }}>
                  <span className="lbl" style={{ letterSpacing: '0.10em', flexShrink: 0 }}>{k}</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--futura)', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showFailureModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'grid', placeItems: 'center', zIndex: 100 }}
          onClick={() => setShowFailureModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', padding: 28, width: 'min(440px, 92vw)' }}
          >
            <div style={{ fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--futura)', marginBottom: 6 }}>
              Mark lead as dead
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-40)', marginBottom: 18 }}>
              Select failure reason — feeds analytics donut
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FAILURE_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedFailure(r)}
                  style={{
                    textAlign: 'left', padding: '11px 14px',
                    background: selectedFailure === r ? 'var(--red-w)' : 'var(--bg-2)',
                    border: `1px solid ${selectedFailure === r ? 'rgba(226,92,92,0.40)' : 'var(--line)'}`,
                    color: selectedFailure === r ? 'var(--red)' : 'var(--ink-80)',
                    fontFamily: 'var(--futura)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setShowFailureModal(false)}>Cancel</button>
              <button className="btn danger" disabled={!selectedFailure} onClick={handleMarkDead}>
                Mark dead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
