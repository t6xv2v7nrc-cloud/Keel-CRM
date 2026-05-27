import { useState } from 'react';
import { Icons } from '../components/icons';
import { StatusPill, SourceTag, Money } from '../components/ui';
import { useLead, useLeadActivity, useUpdateLead, useAddActivity } from '../hooks/useLeads';
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

export default function LeadDetail({ leadId, onBack }) {
  const { data: lead, isLoading } = useLead(leadId);
  const { data: activity = [] } = useLeadActivity(leadId);
  const updateLead = useUpdateLead();
  const addActivity = useAddActivity();

  const [tab, setTab] = useState('note');
  const [noteText, setNoteText] = useState('');
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) return <div className="loading-state">Loading…</div>;
  if (!lead) return <div className="loading-state">Lead not found</div>;

  const statusObj = STATUSES.find(s => s.id === lead.status) || STATUSES[0];
  const isDead = lead.status === 'dead';
  const currentIdx = isDead ? -1 : statusObj.idx;

  const operatorPct = lead.operator_split || 0.45;
  const partnerPct  = lead.partner_split  || 0.40;
  const councilPct  = lead.council_fee    || 0.15;
  const operatorCut = Math.round((lead.value || 0) * operatorPct);
  const partnerCut  = Math.round((lead.value || 0) * partnerPct);
  const councilCut  = (lead.value || 0) - operatorCut - partnerCut;

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
            <button className="btn" onClick={handleSave}><Icons.Phone size={11} />Log call</button>
            <button className="btn" onClick={() => { setTab('note'); }}><Icons.Note size={11} />Note</button>
            <button className="icon-btn"><Icons.Dots size={14} /></button>
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
          <div className="mod" style={{ marginBottom: 18 }}>
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

          <div className="mod">
            <div className="mod-head">
              <h3>Fee breakdown</h3>
              <span className="sub">council incentive</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="mono" style={{ fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                  £{(lead.value || 0).toLocaleString()}
                </span>
                <span className="lbl">total fee</span>
              </div>
              <div className="fee-bar">
                <div className="fee-seg" style={{ background: 'var(--ink)', color: 'var(--bg)', flex: operatorPct }}>
                  {Math.round(operatorPct * 100)}%
                </div>
                <div className="fee-seg" style={{ background: 'var(--ink-40)', color: 'var(--bg)', flex: partnerPct }}>
                  {Math.round(partnerPct * 100)}%
                </div>
                <div className="fee-seg" style={{ background: 'var(--bg-3)', color: 'var(--ink-60)', flex: councilPct }}>
                  {Math.round(councilPct * 100)}%
                </div>
              </div>
              <div className="fee-legend">
                <div className="fee-row">
                  <span className="swatch" style={{ background: 'var(--ink)' }}></span>
                  You (operator)
                  <span className="amt">£{operatorCut.toLocaleString()}</span>
                </div>
                <div className="fee-row">
                  <span className="swatch" style={{ background: 'var(--ink-40)' }}></span>
                  Partner {lead.officer_name ? `· ${lead.officer_name}` : '· Sourcing'}
                  <span className="amt">£{partnerCut.toLocaleString()}</span>
                </div>
                <div className="fee-row">
                  <span className="swatch" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}></span>
                  Council admin
                  <span className="amt">£{councilCut.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

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
