// Fictional seed data for the prototype. Every product, company, person and barcode is invented.
// Findings are not hand-written: they are produced by running the engine over the seed versions.
import { compare, suggest, reconcile } from './engine.mjs';

export const USERS = [
  { id: 'u-alex', name: 'Alex Rivera', title: 'Packaging QA lead', role: 'reviewer', initials: 'AR' },
  { id: 'u-sam', name: 'Sam Okafor', title: 'Quality reviewer', role: 'reviewer', initials: 'SO' },
  { id: 'u-jo', name: 'Jo Lindqvist', title: 'Artwork studio', role: 'studio', initials: 'JL' },
  { id: 'u-priya', name: 'Priya Nair', title: 'Workspace administrator', role: 'admin', initials: 'PN' },
];

export const DEFAULT_POLICY = {
  aiSuggestions: true,
  dailyAiCap: 25,
  twoPersonApproval: true,
  requireCriticalSignoff: true,
  retentionArtworkMonths: 24,
  retentionReportsMonths: 36,
  retentionAuditMonths: 60,
  retentionClosedDays: 180,
};

const f = (key, label, kind, value, extra = {}) => ({ key, label, kind, value, ...extra });

function build(base, runs) {
  const review = { ...base, findings: [], comparedVersion: null, decision: null };
  for (const [v, at] of runs) {
    const version = review.versions.find(x => x.v === v);
    review.findings = reconcile(review.findings, compare(review.spec, version), suggest(review.spec, version), v, at);
    review.comparedVersion = v;
  }
  return review;
}

export function seed() {
  const reviews = [
    build({
      id: 'PL-1001', product: 'Orchard Hand Wash', brand: 'Orchard', pack: 'Bottle label · front & back', market: 'UK', owner: 'u-alex', created: '2026-10-12T09:10:00Z',
      spec: {
        version: 2, confirmed: true, confirmedBy: 'u-alex',
        fields: [
          f('name', 'Product name', 'text', 'Orchard Hand Wash'),
          f('quantity', 'Net quantity', 'quantity', '450 ml', { critical: true }),
          f('code', 'Product code', 'code', 'OHW-450'),
          f('gtin', 'Barcode (GTIN-13)', 'gtin', '5012345000459'),
          f('storage', 'Storage', 'text', 'Store in a cool, dry place.'),
          f('warning', 'Warning', 'text', 'For external use only. Avoid contact with eyes.', { critical: true }),
        ],
        approvedClaims: ['Made with citrus & garden herbs', 'pH balanced'],
      },
      versions: [
        { v: 3, by: 'u-jo', at: '2026-10-14T15:30:00Z', note: 'Updated front label colours.',
          fields: { name: 'Orchard Hand Wash', quantity: '500 ml', code: 'OHW-500', gtin: '5012345000459', storage: '', warning: 'For external use only. Avoid contact with eyes.' },
          claims: ['Made with citrus & garden herbs', 'pH balanced', 'Dermatologically tested'] },
      ],
    }, [[3, '2026-10-14T15:42:00Z']]),
    build({
      id: 'PL-1002', product: 'Brightfield Oat & Honey Bar', brand: 'Brightfield', pack: 'Multipack carton', market: 'UK / IE', owner: 'u-sam', created: '2026-10-16T08:00:00Z',
      spec: {
        version: 4, confirmed: true, confirmedBy: 'u-sam',
        fields: [
          f('name', 'Product name', 'text', 'Brightfield Oat & Honey Bar'),
          f('quantity', 'Net quantity', 'quantity', '175 g', { critical: true }),
          f('gtin', 'Barcode (GTIN-13)', 'gtin', '5012345001128'),
          f('allergens', 'Allergens (emphasised)', 'list', ['Oats (gluten)', 'Milk', 'Almonds'], { critical: true }),
          f('bestbefore', 'Date wording', 'text', 'Best before: see side of pack.'),
          f('storage', 'Storage', 'text', 'Store in a cool, dry place.'),
        ],
        approvedClaims: ['High in fibre', 'Made with whole oats'],
      },
      versions: [
        { v: 1, by: 'u-jo', at: '2026-10-16T10:20:00Z', note: 'First artwork for the new multipack.',
          fields: { name: 'Brightfield Oat & Honey Bar', quantity: '175g', gtin: '5012345001125', allergens: ['Oats (gluten)', 'Milk'], bestbefore: 'Best before end: see side of pack.', storage: 'Store in a cool, dry place.' },
          claims: ['High in fibre', 'Made with wholegrain oats', 'No added sugar'] },
      ],
    }, [[1, '2026-10-16T10:31:00Z']]),
    build({
      id: 'PL-1003', product: 'Harbour Sea Salt Flakes', brand: 'Harbour', pack: 'Stand-up pouch', market: 'UK', owner: 'u-alex', created: '2026-10-20T11:00:00Z',
      spec: {
        version: 1, confirmed: false,
        fields: [
          f('name', 'Product name', 'text', 'Harbour Sea Salt Flakes'),
          f('quantity', 'Net quantity', 'quantity', '250 g', { critical: true }),
          f('code', 'Product code', 'code', 'HSS-250'),
          f('gtin', 'Barcode (GTIN-13)', 'gtin', '5012345002286'),
          f('storage', 'Storage', 'text', 'Reseal after opening. Store in a dry place.'),
        ],
        approvedClaims: ['Hand-harvested'],
      },
      versions: [
        { v: 1, by: 'u-jo', at: '2026-10-20T11:05:00Z', note: 'Supplier artwork received.',
          fields: { name: 'Harbour Sea Salt Flakes', quantity: '0.25 kg', code: 'HSS-250', gtin: '5012345002286', storage: 'Reseal after opening. Store in a dry place.' },
          claims: ['Hand-harvested'] },
      ],
    }, []),
    build({
      id: 'PL-0998', product: 'Meadow Glass Cleaner', brand: 'Meadow', pack: 'Trigger spray label', market: 'UK', owner: 'u-sam', created: '2026-10-02T09:00:00Z',
      spec: {
        version: 3, confirmed: true, confirmedBy: 'u-sam',
        fields: [
          f('name', 'Product name', 'text', 'Meadow Glass Cleaner'),
          f('quantity', 'Net quantity', 'quantity', '750 ml', { critical: true }),
          f('code', 'Product code', 'code', 'MGC-750'),
          f('gtin', 'Barcode (GTIN-13)', 'gtin', '5012345003351'),
          f('warning', 'Warning', 'text', 'Keep out of reach of children.', { critical: true }),
        ],
        approvedClaims: ['Streak-free shine'],
      },
      versions: [
        { v: 1, by: 'u-jo', at: '2026-10-03T10:00:00Z', note: 'Initial artwork.',
          fields: { name: 'Meadow Glass Cleaner', quantity: '750 ml', code: 'MGC-705', gtin: '5012345003351', warning: 'Keep out of reach of children.' },
          claims: ['Streak-free shine'] },
        { v: 2, by: 'u-jo', at: '2026-10-05T14:00:00Z', note: 'Code corrected after review.',
          fields: { name: 'Meadow Glass Cleaner', quantity: '750 ml', code: 'MGC-750', gtin: '5012345003351', warning: 'Keep out of reach of children.' },
          claims: ['Streak-free shine'] },
      ],
    }, [[1, '2026-10-03T10:05:00Z'], [2, '2026-10-05T14:04:00Z']]),
  ];
  const meadow = reviews.find(r => r.id === 'PL-0998');
  meadow.decision = { version: 2, by: 'u-sam', at: '2026-10-06T09:12:00Z', second: 'u-alex', secondAt: '2026-10-06T11:40:00Z', final: true };

  const audit = [
    ['2026-10-02T09:00:00Z', 'u-sam', 'Review created', 'PL-0998 · Meadow Glass Cleaner'],
    ['2026-10-03T10:05:00Z', 'system', 'Comparison run', 'PL-0998 · artwork v1 · 1 finding'],
    ['2026-10-05T14:04:00Z', 'system', 'Comparison run', 'PL-0998 · artwork v2 · finding verified fixed'],
    ['2026-10-06T09:12:00Z', 'u-sam', 'Print decision recorded (first approver)', 'PL-0998 · artwork v2'],
    ['2026-10-06T11:40:00Z', 'u-alex', 'Print decision confirmed (second approver)', 'PL-0998 · artwork v2'],
    ['2026-10-12T09:10:00Z', 'u-alex', 'Review created', 'PL-1001 · Orchard Hand Wash'],
    ['2026-10-14T15:42:00Z', 'system', 'Comparison run', 'PL-1001 · artwork v3 · 3 findings, 1 AI suggestion'],
    ['2026-10-16T08:00:00Z', 'u-sam', 'Review created', 'PL-1002 · Brightfield Oat & Honey Bar'],
    ['2026-10-16T10:31:00Z', 'system', 'Comparison run', 'PL-1002 · artwork v1'],
    ['2026-10-20T11:00:00Z', 'u-alex', 'Review created', 'PL-1003 · Harbour Sea Salt Flakes'],
    ['2026-10-21T08:30:00Z', 'u-priya', 'Policy changed', 'Two-person print approval enabled'],
  ].map(([at, user, action, detail], i) => ({ id: i + 1, at, user, action, detail }));

  return { version: 1, users: USERS.map(u => ({ ...u })), policy: { ...DEFAULT_POLICY }, reviews, audit, aiUsedToday: 4 };
}
