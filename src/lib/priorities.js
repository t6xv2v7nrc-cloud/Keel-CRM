const STATUS_WEIGHTS = {
  lead: 1,
  qualified: 2,
  viewing: 3.5,
  application: 4,
  referencing: 4.5,
};

const STALE_THRESHOLDS = {
  urgent: 3,
  warm: 1,
};

export function computePriorities(leads) {
  const now = Date.now();

  return leads
    .filter(l => !['signed', 'dead'].includes(l.status))
    .map(l => {
      const lastContact = l.last_contact_at ? new Date(l.last_contact_at) : new Date(0);
      const daysSince = (now - lastContact.getTime()) / (1000 * 60 * 60 * 24);
      const statusWeight = STATUS_WEIGHTS[l.status] || 1;
      const stalenessFactor = Math.min(daysSince / 1.5, 12);
      const score = (l.value || 0) * stalenessFactor * statusWeight;

      let urgency = 'normal';
      if (daysSince >= STALE_THRESHOLDS.urgent && (l.value || 0) >= 1400) urgency = 'urgent';
      else if (daysSince >= STALE_THRESHOLDS.warm || (l.value || 0) >= 2000) urgency = 'warm';

      const titleParts = [];
      if (daysSince >= 3) titleParts.push(`${Math.floor(daysSince)}d no contact`);
      if (l.next_action && l.next_action !== '—') titleParts.push(l.next_action);

      return {
        ...l,
        _score: score,
        _urgency: urgency,
        _daysSince: daysSince,
        _title: titleParts.length
          ? `${l.name} — ${titleParts[0]}`
          : `${l.name} — follow up`,
        _meta: [
          l.value ? `£${l.value.toLocaleString()} at stake` : null,
          [l.council, l.officer].filter(Boolean).join(' · '),
          l.status.charAt(0).toUpperCase() + l.status.slice(1),
        ].filter(Boolean),
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);
}

export function isStale(lead, hoursThreshold = 48) {
  if (!lead.last_contact_at) return true;
  const diff = Date.now() - new Date(lead.last_contact_at).getTime();
  return diff > hoursThreshold * 60 * 60 * 1000;
}
