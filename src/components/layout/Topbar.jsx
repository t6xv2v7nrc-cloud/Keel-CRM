import { useState } from 'react';
import { Icons } from '../icons';
import { NotificationsPanel } from '../ui';
import { useLeads } from '../../hooks/useLeads';
import { generateNotifications } from '../../lib/notifications';

export default function Topbar({ page, leadId, onNav, onOpenPalette }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: leads = [] } = useLeads();

  const notifications = generateNotifications(leads);

  const crumb = () => {
    const map = {
      dashboard: 'Dashboard',
      leads: 'Leads',
      officers: 'Housing Officers',
      analytics: 'Insights',
      report: 'EOD Report',
    };
    if (page === 'lead') {
      return (
        <>
          <button className="btn ghost sm" onClick={() => onNav('leads')} style={{ padding: '2px 6px' }}>
            Leads
          </button>
          <span className="slash">/</span>
          <b>{leadId}</b>
        </>
      );
    }
    return <b>{map[page] || page}</b>;
  };

  return (
    <header className="topbar" style={{ position: 'sticky' }}>
      <div className="crumb">{crumb()}</div>

      <div className="right">
        <div className="search" onClick={onOpenPalette} style={{ cursor: 'pointer' }}>
          <Icons.Search size={13} />
          <input placeholder="Search leads, officers, councils…" readOnly style={{ cursor: 'pointer' }} />
          <span className="kbd">⌘K</span>
        </div>
        <button className="icon-btn" title="Notifications" onClick={() => setNotifOpen(v => !v)}>
          <Icons.Bell size={15} />
          {notifications.length > 0 && (
            <span className="bell-count">{notifications.length}</span>
          )}
        </button>
      </div>

      {notifOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 45 }}
            onClick={() => setNotifOpen(false)}
          />
          <NotificationsPanel
            items={notifications}
            onMarkAllRead={() => setNotifOpen(false)}
          />
        </>
      )}
    </header>
  );
}
