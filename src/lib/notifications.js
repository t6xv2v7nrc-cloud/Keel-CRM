import { isStale } from './priorities';

export function generateNotifications(leads) {
  const notifs = [];

  const stale48 = leads.filter(
    l => !['signed', 'dead'].includes(l.status) && isStale(l, 48),
  );
  if (stale48.length > 0) {
    notifs.push({
      tone: 'r',
      title: `${stale48.length} lead${stale48.length > 1 ? 's' : ''} gone stale`,
      message: stale48.slice(0, 3).map(l => l.name).join(', ') + ' — no contact 48h+',
      lead_id: stale48[0]?.id,
    });
  }

  const highValueIdle = leads.filter(
    l => l.value >= 2000 && !['signed', 'dead'].includes(l.status) && isStale(l, 24),
  );
  highValueIdle.forEach(l => {
    if (!stale48.find(s => s.id === l.id)) {
      notifs.push({
        tone: 'a',
        title: `High-value lead idle`,
        message: `${l.name} · £${l.value.toLocaleString()} · ${l.council}`,
        lead_id: l.id,
      });
    }
  });

  const viewingNoFollowup = leads.filter(l => {
    if (l.status !== 'viewing') return false;
    return isStale(l, 24);
  });
  viewingNoFollowup.forEach(l => {
    notifs.push({
      tone: 'a',
      title: 'Viewing — no follow-up',
      message: `${l.name} · ${l.council} · chase outcome`,
      lead_id: l.id,
    });
  });

  return notifs;
}
