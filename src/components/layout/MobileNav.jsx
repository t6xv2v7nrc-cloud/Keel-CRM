import { Icons } from '../icons';

const NAV = [
  { id: 'dashboard', label: 'Home',      icon: Icons.Home },
  { id: 'leads',     label: 'Leads',     icon: Icons.Users },
  { id: 'officers',  label: 'Officers',  icon: Icons.Building },
  { id: 'calendar',  label: 'Calendar',  icon: Icons.Calendar },
  { id: 'analytics', label: 'Insights',  icon: Icons.Chart },
  { id: 'report',    label: 'EOD',       icon: Icons.Report },
];

export default function MobileNav({ page, onNav }) {
  return (
    <nav className="mobile-tabs mobile-only">
      {NAV.map(n => {
        const Ic = n.icon;
        const active = page === n.id || (page === 'lead' && n.id === 'leads');
        return (
          <button key={n.id} className={`mtab ${active ? 'active' : ''}`} onClick={() => onNav(n.id)}>
            <Ic />
            {n.label}
          </button>
        );
      })}
    </nav>
  );
}
