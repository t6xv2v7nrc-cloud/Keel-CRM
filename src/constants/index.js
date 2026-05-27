// All 32 London boroughs + City of London, plus a few neighbouring authorities
// already in your data (Norwich kept for legacy).
export const COUNCILS = [
  'Barking & Dagenham',
  'Barnet',
  'Bexley',
  'Brent',
  'Bromley',
  'Camden',
  'City of London',
  'Croydon',
  'Ealing',
  'Enfield',
  'Greenwich',
  'Hackney',
  'Hammersmith & Fulham',
  'Haringey',
  'Harrow',
  'Havering',
  'Hillingdon',
  'Hounslow',
  'Islington',
  'RBKC',                  // Kensington & Chelsea
  'Kingston upon Thames',
  'Lambeth',
  'Lewisham',
  'Merton',
  'Newham',
  'Redbridge',
  'Richmond upon Thames',
  'Southwark',
  'Sutton',
  'Tower Hamlets',
  'Waltham Forest',
  'Wandsworth',
  'Westminster',
  // Out-of-London (kept from legacy data)
  'Norwich',
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
