import { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from './icons';
import { StatusPill } from './ui';
import { useLeads } from '../hooks/useLeads';
import { useOfficers } from '../hooks/useOfficers';

function score(str, q) {
  if (!str) return 0;
  const s = str.toLowerCase();
  const t = q.toLowerCase();
  if (s.startsWith(t)) return 3;
  if (s.includes(t)) return 2;
  return 0;
}

function matchLead(l, q) {
  return Math.max(
    score(l.name, q),
    score(l.council, q),
    score(l.borough, q),
    score(l.status, q),
    score(l.email, q),
    score(l.phone, q),
  );
}

function matchOfficer(o, q) {
  return Math.max(
    score(o.name, q),
    score(o.council, q),
    score(o.borough, q),
  );
}

export default function SearchPalette({ onClose, onOpenLead, onNav }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const { data: leads = [] } = useLeads();
  const { data: officers = [] } = useOfficers();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const matchedLeads = leads
      .map(l => ({ type: 'lead', item: l, s: matchLead(l, q) }))
      .filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6);

    const matchedOfficers = officers
      .map(o => ({ type: 'officer', item: o, s: matchOfficer(o, q) }))
      .filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);

    return [...matchedLeads, ...matchedOfficers];
  }, [query, leads, officers]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && results[cursor]) {
      select(results[cursor]);
    }
  };

  const select = ({ type, item }) => {
    if (type === 'lead') onOpenLead(item.id);
    else if (type === 'officer') onNav('officers');
    onClose();
  };

  const quickLinks = [
    { label: 'Dashboard', icon: Icons.Home, action: () => { onNav('dashboard'); onClose(); } },
    { label: 'All Leads', icon: Icons.Users, action: () => { onNav('leads'); onClose(); } },
    { label: 'Officers', icon: Icons.Building, action: () => { onNav('officers'); onClose(); } },
    { label: 'EOD Report', icon: Icons.Report, action: () => { onNav('report'); onClose(); } },
  ];

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input-row">
          <Icons.Search size={15} style={{ color: 'var(--ink-40)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search leads, officers, councils…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <span className="kbd" onClick={onClose}>esc</span>
        </div>

        <div className="palette-body" ref={listRef}>
          {!query && (
            <>
              <div className="palette-group-label">Quick navigate</div>
              {quickLinks.map((l, i) => {
                const Ic = l.icon;
                return (
                  <button key={i} className="palette-row" onClick={l.action}>
                    <Ic size={13} style={{ color: 'var(--ink-40)', flexShrink: 0 }} />
                    <span className="palette-title">{l.label}</span>
                    <span className="palette-hint">↵</span>
                  </button>
                );
              })}
            </>
          )}

          {query && results.length === 0 && (
            <div className="palette-empty">No results for "{query}"</div>
          )}

          {query && results.length > 0 && (() => {
            const leadResults = results.filter(r => r.type === 'lead');
            const officerResults = results.filter(r => r.type === 'officer');
            let idx = 0;

            return (
              <>
                {leadResults.length > 0 && (
                  <>
                    <div className="palette-group-label">Leads</div>
                    {leadResults.map(({ item: l }) => {
                      const i = idx++;
                      return (
                        <button
                          key={l.id}
                          className={`palette-row ${cursor === i ? 'active' : ''}`}
                          onClick={() => select({ type: 'lead', item: l })}
                          onMouseEnter={() => setCursor(i)}
                        >
                          <div className="palette-avatar">{(l.name || '').split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="palette-title">{l.name}</div>
                            <div className="palette-sub">{l.council}{l.borough ? ` · ${l.borough}` : ''}</div>
                          </div>
                          <StatusPill status={l.status} />
                          {l.value && (
                            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-40)' }}>
                              £{l.value.toLocaleString()}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}

                {officerResults.length > 0 && (
                  <>
                    <div className="palette-group-label">Officers</div>
                    {officerResults.map(({ item: o }) => {
                      const i = idx++;
                      return (
                        <button
                          key={o.id}
                          className={`palette-row ${cursor === i ? 'active' : ''}`}
                          onClick={() => select({ type: 'officer', item: o })}
                          onMouseEnter={() => setCursor(i)}
                        >
                          <div className="palette-avatar">{(o.name || '').split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="palette-title">{o.name}</div>
                            <div className="palette-sub">{o.council}{o.borough ? ` / ${o.borough}` : ''}</div>
                          </div>
                          <span className={`officer-temp ${o.temp}`}>{o.temp}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </>
            );
          })()}
        </div>

        <div className="palette-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
