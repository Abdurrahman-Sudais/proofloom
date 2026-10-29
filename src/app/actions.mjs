// State transitions for the prototype. Each action mutates a draft copy of the workspace data,
// checks the acting user's permission first, and writes an audit entry. The UI calls these through
// a wrapper that clones, applies and persists, so they can be unit-tested without a DOM.
import { compare, suggest, reconcile, decisionBlockers, UNRESOLVED, AI_PENDING } from './engine.mjs';

export const PERMISSIONS = [
  ['View reviews and findings', { reviewer: true, studio: 'Assigned corrections only', admin: 'Aggregates only' }],
  ['Create reviews, confirm specifications', { reviewer: true, studio: false, admin: false }],
  ['Run comparison', { reviewer: true, studio: false, admin: false }],
  ['Triage findings and AI suggestions', { reviewer: true, studio: false, admin: false }],
  ['Upload corrected artwork', { reviewer: false, studio: true, admin: false }],
  ['Record print decision', { reviewer: true, studio: false, admin: false }],
  ['Change roles and policy', { reviewer: false, studio: false, admin: true }],
  ['View audit log', { reviewer: false, studio: false, admin: true }],
];

const ALLOWED = {
  createReview: ['reviewer'], editSpec: ['reviewer'], confirmSpec: ['reviewer'], runComparison: ['reviewer'],
  triage: ['reviewer'], uploadVersion: ['studio'], decide: ['reviewer'], admin: ['admin'],
};

export class PermissionError extends Error {}

export const userById = (data, id) => data.users.find(u => u.id === id);
export const reviewById = (data, id) => data.reviews.find(r => r.id === id);
const nameOf = (data, id) => (id === 'system' ? 'Automatic check' : userById(data, id)?.name || id);

function guard(data, userId, action) {
  const user = userById(data, userId);
  if (!user || !ALLOWED[action].includes(user.role)) throw new PermissionError(`${user ? user.name : 'This user'} cannot ${action.replace(/[A-Z]/g, c => ' ' + c.toLowerCase())}.`);
  return user;
}

export function audit(data, userId, action, detail, now) {
  data.audit.push({ id: (data.audit.at(-1)?.id || 0) + 1, at: now, user: userId, action, detail });
}

function revokeDecision(data, review, userId, now, why) {
  if (review.decision && !review.decision.final) {
    review.decision = null;
    audit(data, userId, 'Pending print decision revoked', `${review.id} · ${why}`, now);
  }
}

function findingOf(review, id) {
  const f = review.findings.find(x => x.id === id);
  if (!f) throw new Error('Finding not found');
  return f;
}

export function createReview(data, userId, input, now) {
  guard(data, userId, 'createReview');
  const id = `PL-${Math.max(...data.reviews.map(r => Number(r.id.slice(3)))) + 1}`;
  const fields = input.fields.filter(f => String(f.value).trim()).map(f => ({ ...f, key: f.key || f.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
  data.reviews.unshift({
    id, product: input.product, brand: input.brand || input.product.split(' ')[0], pack: input.pack || 'Label', market: input.market || '—',
    owner: userId, created: now, comparedVersion: null, decision: null, findings: [],
    spec: { version: 1, confirmed: false, fields, approvedClaims: input.approvedClaims || [] },
    versions: [{ v: 1, by: userId, at: now, note: 'Artwork supplied with the review request.', fields: input.artwork, claims: input.claims || [] }],
  });
  audit(data, userId, 'Review created', `${id} · ${input.product}`, now);
  return id;
}

export function editSpecField(data, userId, reviewId, key, value, now) {
  guard(data, userId, 'editSpec');
  const r = reviewById(data, reviewId);
  if (r.spec.confirmed) throw new Error('The specification is confirmed. Create a new specification version to change it.');
  const field = r.spec.fields.find(f => f.key === key);
  const old = field.value;
  field.value = field.kind === 'list' ? String(value).split(',').map(s => s.trim()).filter(Boolean) : value;
  audit(data, userId, 'Extracted field corrected', `${reviewId} · ${field.label}: “${old}” → “${field.value}”`, now);
}

export function confirmSpec(data, userId, reviewId, now) {
  guard(data, userId, 'confirmSpec');
  const r = reviewById(data, reviewId);
  r.spec.confirmed = true;
  r.spec.confirmedBy = userId;
  audit(data, userId, 'Specification confirmed', `${reviewId} · specification v${r.spec.version}`, now);
}

/** Run deterministic checks (+ AI suggestions when the policy and daily cap allow) on the latest version. */
export function runComparison(data, userId, reviewId, now) {
  if (userId !== 'system') guard(data, userId, 'runComparison');
  const r = reviewById(data, reviewId);
  if (!r.spec.confirmed) throw new Error('Confirm the specification before comparing.');
  const latest = r.versions.at(-1);
  let suggestions = [];
  let aiNote = 'AI suggestions off';
  if (data.policy.aiSuggestions) {
    if (data.aiUsedToday < data.policy.dailyAiCap) {
      suggestions = suggest(r.spec, latest);
      data.aiUsedToday++;
      aiNote = `${suggestions.length} AI suggestion${suggestions.length === 1 ? '' : 's'}`;
    } else aiNote = 'daily AI cap reached; deterministic checks only';
  } else {
    // Without fresh suggestions, keep earlier AI findings as they are rather than marking them fixed.
    suggestions = r.findings.filter(f => f.source === 'ai' && f.status !== 'Verified fixed')
      .map(({ key, label, kind, type, severity, expected, actual, detail }) => ({ key, label, kind, type, severity, expected, actual, detail }));
  }
  const issues = compare(r.spec, latest);
  r.findings = reconcile(r.findings, issues, suggestions, latest.v, now);
  r.comparedVersion = latest.v;
  revokeDecision(data, r, userId, now, 'comparison re-run');
  audit(data, userId, 'Comparison run', `${reviewId} · artwork v${latest.v} · ${issues.length} check issue${issues.length === 1 ? '' : 's'}, ${aiNote}`, now);
}

export function assignFinding(data, userId, reviewId, findingId, assignee, now) {
  guard(data, userId, 'triage');
  const f = findingOf(reviewById(data, reviewId), findingId);
  f.assignee = assignee;
  f.history.push({ at: now, text: `Assigned to ${nameOf(data, assignee)} by ${nameOf(data, userId)}.` });
  audit(data, userId, 'Finding assigned', `${reviewId} · ${findingId} → ${nameOf(data, assignee)}`, now);
}

export function commentFinding(data, userId, reviewId, findingId, text, now) {
  const user = userById(data, userId);
  if (!['reviewer', 'studio'].includes(user.role)) throw new PermissionError(`${user.name} cannot comment on findings.`);
  const f = findingOf(reviewById(data, reviewId), findingId);
  f.comments.push({ at: now, by: userId, text: text.trim() });
  audit(data, userId, 'Comment added', `${reviewId} · ${findingId}`, now);
}

export function sendToStudio(data, userId, reviewId, findingIds, note, now) {
  guard(data, userId, 'triage');
  const r = reviewById(data, reviewId);
  findingIds.forEach(id => {
    const f = findingOf(r, id);
    if (!UNRESOLVED.includes(f.status)) return;
    f.status = 'Sent to studio';
    f.history.push({ at: now, text: `Correction requested from the artwork studio${note ? `: “${note}”` : ''}.` });
  });
  revokeDecision(data, r, userId, now, 'corrections requested');
  audit(data, userId, 'Correction requested', `${reviewId} · ${findingIds.join(', ')}`, now);
}

export function acceptFinding(data, userId, reviewId, findingId, reason, now) {
  guard(data, userId, 'triage');
  if (!reason || reason.trim().length < 10) throw new Error('Give a reason of at least 10 characters for accepting artwork that differs from the specification.');
  const r = reviewById(data, reviewId);
  const f = findingOf(r, findingId);
  f.status = 'Accepted with reason';
  f.reason = reason.trim();
  f.history.push({ at: now, text: `Accepted as-is by ${nameOf(data, userId)}: “${f.reason}”.` });
  audit(data, userId, 'Finding accepted as-is', `${reviewId} · ${findingId} · ${f.severity}`, now);
}

export function reopenFinding(data, userId, reviewId, findingId, now) {
  guard(data, userId, 'triage');
  const r = reviewById(data, reviewId);
  const f = findingOf(r, findingId);
  f.status = f.source === 'ai' && !f.confirmed ? AI_PENDING : 'Open';
  f.reason = undefined;
  f.history.push({ at: now, text: `Reopened by ${nameOf(data, userId)}.` });
  revokeDecision(data, r, userId, now, 'finding reopened');
  audit(data, userId, 'Finding reopened', `${reviewId} · ${findingId}`, now);
}

/** Reviewer decision on an AI suggestion: confirm it as a finding, or dismiss it with a reason. */
export function decideSuggestion(data, userId, reviewId, findingId, confirm, reason, now) {
  guard(data, userId, 'triage');
  const r = reviewById(data, reviewId);
  const f = findingOf(r, findingId);
  if (f.source !== 'ai') throw new Error('Only AI suggestions need this decision.');
  if (confirm) {
    f.status = 'Open';
    f.confirmed = true;
    f.history.push({ at: now, text: `AI suggestion confirmed as a finding by ${nameOf(data, userId)}.` });
    audit(data, userId, 'AI suggestion confirmed', `${reviewId} · ${findingId}`, now);
  } else {
    if (!reason || reason.trim().length < 10) throw new Error('Give a reason of at least 10 characters for dismissing a suggestion.');
    f.status = 'Dismissed';
    f.reason = reason.trim();
    f.history.push({ at: now, text: `AI suggestion dismissed by ${nameOf(data, userId)}: “${f.reason}”.` });
    audit(data, userId, 'AI suggestion dismissed', `${reviewId} · ${findingId}`, now);
  }
}

/** Studio uploads a corrected artwork version; the system re-runs the comparison automatically. */
export function uploadVersion(data, userId, reviewId, fields, claims, note, now) {
  guard(data, userId, 'uploadVersion');
  const r = reviewById(data, reviewId);
  if (r.decision?.final) throw new Error('This review is closed. Start a new review for further artwork changes.');
  const v = r.versions.at(-1).v + 1;
  r.versions.push({ v, by: userId, at: now, note: note || 'Corrected artwork.', fields: { ...fields }, claims: [...claims] });
  revokeDecision(data, r, userId, now, `artwork v${v} uploaded`);
  audit(data, userId, 'Artwork version uploaded', `${reviewId} · v${v}`, now);
  if (r.spec.confirmed) runComparison(data, 'system', reviewId, now);
  return v;
}

export function recordDecision(data, userId, reviewId, now) {
  guard(data, userId, 'decide');
  const r = reviewById(data, reviewId);
  const blockers = decisionBlockers(r, data.policy);
  if (blockers.length) throw new Error(blockers.join(' '));
  const latest = r.versions.at(-1).v;
  if (r.decision && !r.decision.final) {
    if (r.decision.by === userId) throw new Error('Two-person approval: a different reviewer must confirm.');
    r.decision = { ...r.decision, second: userId, secondAt: now, final: true };
    audit(data, userId, 'Print decision confirmed (second approver)', `${reviewId} · artwork v${latest}`, now);
    return;
  }
  r.decision = { version: latest, by: userId, at: now, final: !data.policy.twoPersonApproval };
  audit(data, userId, data.policy.twoPersonApproval ? 'Print decision recorded (first approver)' : 'Print decision recorded', `${reviewId} · artwork v${latest}`, now);
}

export function setRole(data, userId, targetId, role, now) {
  guard(data, userId, 'admin');
  const target = userById(data, targetId);
  if (targetId === userId && role !== 'admin') throw new Error('You cannot remove your own administrator role.');
  const old = target.role;
  target.role = role;
  audit(data, userId, 'Role changed', `${target.name}: ${old} → ${role}`, now);
}

const POLICY_LABELS = {
  aiSuggestions: 'AI suggestions', dailyAiCap: 'Daily AI comparison cap', twoPersonApproval: 'Two-person print approval',
  requireCriticalSignoff: 'Critical findings must be fixed', retentionArtworkMonths: 'Artwork retention (months)',
  retentionReportsMonths: 'Report retention (months)', retentionAuditMonths: 'Audit log retention (months)', retentionClosedDays: 'Closed review retention (days)',
};
const BOUNDS = { dailyAiCap: [0, 500], retentionArtworkMonths: [6, 120], retentionReportsMonths: [12, 120], retentionAuditMonths: [24, 120], retentionClosedDays: [30, 730] };

export function setPolicy(data, userId, key, value, now) {
  guard(data, userId, 'admin');
  if (BOUNDS[key]) {
    const [lo, hi] = BOUNDS[key];
    value = Number(value);
    if (!Number.isFinite(value) || value < lo || value > hi) throw new Error(`${POLICY_LABELS[key]} must be between ${lo} and ${hi}.`);
  }
  const old = data.policy[key];
  data.policy[key] = value;
  const show = v => (typeof v === 'boolean' ? (v ? 'on' : 'off') : v);
  audit(data, userId, 'Policy changed', `${POLICY_LABELS[key]}: ${show(old)} → ${show(value)}`, now);
}

/** What a retention run would remove on `today`, given the policy. Preview only: nothing is deleted. */
export function retentionPreview(data, today) {
  const days = (a, b) => (new Date(b) - new Date(a)) / 86400000;
  const p = data.policy;
  const closed = data.reviews.filter(r => r.decision?.final && days(r.decision.secondAt || r.decision.at, today) > p.retentionClosedDays);
  const versions = data.reviews.flatMap(r => r.versions.map(v => ({ r, v }))).filter(({ v }) => days(v.at, today) > p.retentionArtworkMonths * 30.44);
  const auditOld = data.audit.filter(a => days(a.at, today) > p.retentionAuditMonths * 30.44);
  return { closed: closed.map(r => r.id), versions: versions.map(({ r, v }) => `${r.id} v${v.v}`), audit: auditOld.length };
}

/** Plain-text review report for export. */
export function reviewReport(data, r) {
  const latest = r.versions.at(-1);
  const d = r.decision;
  const decision = !d ? 'No print decision recorded.'
    : d.final ? `Approved for print: artwork v${d.version} by ${nameOf(data, d.by)} (${d.at})${d.second ? `, confirmed by ${nameOf(data, d.second)} (${d.secondAt})` : ''}.`
      : `First approval by ${nameOf(data, d.by)} (${d.at}); awaiting a second reviewer.`;
  return [
    'PROOFLOOM PROTOTYPE — REVIEW REPORT',
    'Fictional sample data. Simulated extraction and AI suggestions; no real documents were processed.',
    '',
    `Review: ${r.id} · ${r.product} · ${r.pack} · market ${r.market}`,
    `Specification v${r.spec.version} (${r.spec.confirmed ? `confirmed by ${nameOf(data, r.spec.confirmedBy)}` : 'not confirmed'})`,
    `Latest artwork: v${latest.v} · compared: ${r.comparedVersion ? `v${r.comparedVersion}` : 'not yet'}`,
    `Decision: ${decision}`,
    '',
    'FINDINGS',
    ...r.findings.flatMap(f => [
      `${f.id} [${f.severity}] ${f.label} — ${f.status}${f.source === 'ai' ? ' (AI-suggested)' : ' (automatic check)'}`,
      `  Specification: ${Array.isArray(f.expected) ? f.expected.join(', ') : f.expected}`,
      `  Artwork: ${Array.isArray(f.actual) ? f.actual.join(', ') : f.actual}`,
      `  ${f.detail}`,
      ...(f.reason ? [`  Reason: ${f.reason}`] : []),
      ...f.comments.map(c => `  Comment (${nameOf(data, c.by)}): ${c.text}`),
    ]),
    '',
    'ACTIVITY',
    ...data.audit.filter(a => a.detail.startsWith(r.id)).map(a => `${a.at} · ${nameOf(data, a.user)} · ${a.action} · ${a.detail}`),
  ].join('\n');
}

export const findingRows = (data, r) => [
  ['review', 'finding', 'field', 'severity', 'source', 'status', 'specification', 'artwork', 'raised_in', 'assignee', 'reason'],
  ...r.findings.map(f => [r.id, f.id, f.label, f.severity, f.source, f.status, f.expected, f.actual, `v${f.raisedIn}`, nameOf(data, f.assignee), f.reason || '']),
];

export const displayName = nameOf;
