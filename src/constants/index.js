export const COUNCILS = [
  'RBKC', 'Harrow', 'Norwich', 'Islington', 'Camden',
  'Brent', 'Hounslow', 'Newham', 'Southwark', 'Lambeth',
];

export const STATUSES = [
  { id: 'lead',         label: 'Lead',        idx: 0 },
  { id: 'qualified',    label: 'Qualified',   idx: 1 },
  { id: 'viewing',      label: 'Viewing',     idx: 2 },
  { id: 'application',  label: 'Application', idx: 3 },
  { id: 'referencing',  label: 'Referencing', idx: 4 },
  { id: 'signed',       label: 'Signed',      idx: 5 },
  { id: 'dead',         label: 'Dead',        idx: -1 },
];

export const STATUS_FLOW = ['Lead', 'Qualified', 'Viewing', 'Application', 'Referencing', 'Signed'];

export const SOURCES = [
  { id: 'website',  label: 'Website',         cls: 'website' },
  { id: 'whatsapp', label: 'WhatsApp',        cls: 'whatsapp' },
  { id: 'officer',  label: 'Housing Officer', cls: 'officer' },
  { id: 'chatgpt',  label: 'ChatGPT',         cls: 'chatgpt' },
  { id: 'referral', label: 'Referral',        cls: 'referral' },
];

export const FAILURE_REASONS = [
  'Arrears', 'Ghosted', 'Wrong Area', 'Wrong Price',
  'Lost to Competitor', 'Personal Circumstances',
];

export const OFFICER_TEMPS = ['hot', 'warm', 'cool'];
