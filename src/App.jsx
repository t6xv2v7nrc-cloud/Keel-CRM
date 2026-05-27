import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import MobileNav from './components/layout/MobileNav';
import SearchPalette from './components/SearchPalette';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Officers from './pages/Officers';
import Insights from './pages/Insights';
import EodReport from './pages/EodReport';
import Calendar from './pages/Calendar';

export default function App() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [leadId, setLeadId] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openLead = (id) => { setLeadId(id); setPage('lead'); };
  const goto = (p) => { setLeadId(null); setPage(p); };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
        return;
      }
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (page === 'lead') goto('leads');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, paletteOpen]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#000', color: 'rgba(245,245,245,0.25)', fontFamily: 'Cascadia Code, monospace', fontSize: 11, letterSpacing: '0.08em' }}>
        KEEL PIPELINE
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div className="app">
      <Sidebar page={page} onNav={goto} onOpenLead={openLead} />

      <div className="main">
        <Topbar page={page} leadId={leadId} onNav={goto} onOpenPalette={() => setPaletteOpen(true)} />

        {page === 'dashboard' && <Dashboard onOpenLead={openLead} onGotoReport={() => goto('report')} />}
        {page === 'leads'     && <Leads onOpenLead={openLead} />}
        {page === 'lead'      && <LeadDetail leadId={leadId} onBack={() => goto('leads')} />}
        {page === 'officers'  && <Officers />}
        {page === 'analytics' && <Insights />}
        {page === 'report'    && <EodReport />}
        {page === 'calendar'  && <Calendar onOpenLead={openLead} />}

        <MobileNav page={page} onNav={goto} />
      </div>

      {paletteOpen && (
        <SearchPalette
          onClose={() => setPaletteOpen(false)}
          onOpenLead={(id) => { openLead(id); setPaletteOpen(false); }}
          onNav={(p) => { goto(p); setPaletteOpen(false); }}
        />
      )}
    </div>
  );
}
