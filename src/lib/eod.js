import { computePriorities } from './priorities';

export function generateEodReport(leads, todayActivities) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newLeads = leads.filter(l => {
    const created = new Date(l.created_at);
    created.setHours(0, 0, 0, 0);
    return created.getTime() === today.getTime();
  });

  const signed = leads.filter(l => {
    if (l.status !== 'signed') return false;
    const updated = new Date(l.updated_at);
    updated.setHours(0, 0, 0, 0);
    return updated.getTime() === today.getTime();
  });

  const statusChanges = (todayActivities || [])
    .filter(a => a.type === 'status' && a.meta?.from && a.meta?.to);

  const confirmedMTD = leads
    .filter(l => l.status === 'signed')
    .reduce((s, l) => s + (l.value || 0), 0);

  const pending = leads
    .filter(l => ['application', 'referencing'].includes(l.status))
    .reduce((s, l) => s + (l.value || 0), 0);

  const forecasted = leads
    .filter(l => !['dead', 'signed'].includes(l.status))
    .reduce((s, l) => s + (l.value || 0) * 0.15, 0) + pending;

  const priorities = computePriorities(leads);
  const tomorrow = priorities.slice(0, 3).map(p => ({
    t: p._title,
    why: p._meta.join(' · '),
  }));

  const dateStr = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return {
    date: dateStr,
    newLeads: newLeads.map(l => ({
      name: l.name,
      source: l.source,
      council: l.council,
    })),
    statusChanges,
    signed: signed.map(l => ({ name: l.name, council: l.council, value: l.value })),
    cash: {
      confirmedThisMonth: confirmedMTD,
      pending,
      forecasted: Math.round(forecasted),
    },
    tomorrow,
  };
}
