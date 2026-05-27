import { Icons } from '../icons';
import { useAuth, signOut } from '../../hooks/useAuth';
import { usePinnedLeads } from '../../hooks/useLeads';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.Home },
  { id: 'leads',     label: 'Leads',     icon: Icons.Users },
  { id: 'officers',  label: 'Officers',  icon: Icons.Building },
  { id: 'calendar',  label: 'Calendar',  icon: Icons.Calendar },
  { id: 'analytics', label: 'Insights',  icon: Icons.Chart },
  { id: 'report',    label: 'EOD',       icon: Icons.Report },
];

export default function Sidebar({ page, onNav, onOpenLead }) {
  const { data: pinned = [] } = usePinnedLeads();
  const { session } = useAuth();
  const userEmail = session?.user?.email ?? '';
  const userName = session?.user?.user_metadata?.full_name
    ?? userEmail.split('@')[0]
    ?? 'You';
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"></div>
        <div>
          <div className="brand-name">Keel</div>
        </div>
      </div>

      <div className="nav-section-label">Workspace</div>
      {NAV.map(n => {
        const Ic = n.icon;
        const active = page === n.id || (page === 'lead' && n.id === 'leads');
        return (
          <button
            key={n.id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => onNav(n.id)}
          >
            <Ic className="nav-icon" />
            {n.label}
          </button>
        );
      })}

      {pinned.length > 0 && (
        <>
          <div className="nav-section-label">Pinned</div>
          {pinned.map(r => (
            <button
              key={r.id}
              className="nav-item"
              onClick={() => onOpenLead(r.id)}
              style={{ fontSize: 11.5 }}
            >
              <span style={{
                width: 14, height: 14,
                border: '1px solid var(--line-2)',
                fontSize: 8, color: 'var(--ink-60)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
                letterSpacing: 0
              }}>
                {r.name.split(' ').map(p => p[0]).join('')}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
            </button>
          ))}
        </>
      )}

      <div className="sidebar-footer">
        <div className="avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{userName}</div>
          <div className="user-role">OPERATOR · SOLE</div>
        </div>
        <button className="icon-btn" onClick={signOut} title="Sign out">
          <Icons.X size={14} />
        </button>
      </div>
    </aside>
  );
}
