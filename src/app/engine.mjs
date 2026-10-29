// Comparison engine for the Proofloom prototype. Pure functions, no DOM: the same rules are
// implemented in backend/lambdas/compare_fields/handler.py and both are tested against
// backend/tests/fixtures/cases.json so the prototype and the proposed Lambda stay in step.

const UNITS = {
  ml: ['volume', 1], cl: ['volume', 10], l: ['volume', 1000],
  g: ['mass', 1], kg: ['mass', 1000],
};

/** Parse "450 ml", "0,45 L", "175g" into {value, dimension} in base units (ml or g). */
export function parseQuantity(text) {
  const m = String(text || '').toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|kg|g|l)\b/);
  if (!m) return null;
  const [dimension, factor] = UNITS[m[2]];
  return { value: Math.round(Number(m[1].replace(',', '.')) * factor * 1000) / 1000, dimension };
}

/** GTIN-8/12/13/14 check digit validation (GS1 mod-10). */
export function validGtin(code) {
  const digits = String(code || '').replace(/\s/g, '');
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return false;
  const body = digits.slice(0, -1).split('').map(Number);
  let sum = 0;
  for (let i = body.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += body[i] * w;
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

export const normalise = text => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
const words = text => normalise(text).split(' ').filter(Boolean);

/** Dice similarity on word sets: 1 = same words, 0 = nothing shared. */
export function similarity(a, b) {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size && !B.size) return 1;
  let shared = 0;
  A.forEach(w => { if (B.has(w)) shared++; });
  return (2 * shared) / (A.size + B.size);
}

/** Words in the approved text that the artwork lacks, and words the artwork adds. */
export function wordDiff(expected, actual) {
  const E = words(expected), A = words(actual);
  return { missing: E.filter(w => !A.includes(w)), added: A.filter(w => !E.includes(w)) };
}

const listOf = value => (Array.isArray(value) ? value : String(value || '').split(/[,;\n]/)).map(s => s.trim()).filter(Boolean);

const issue = (field, type, severity, expected, actual, detail) => ({
  key: field.key, label: field.label, kind: field.kind, type, severity, expected, actual, detail,
});

/**
 * Deterministic check of one specification field against the artwork value.
 * Returns an array of issues (empty when the artwork matches).
 */
export function checkField(field, actualValue) {
  const expected = field.value;
  const actual = actualValue ?? '';
  const blank = !String(Array.isArray(actual) ? actual.join('') : actual).trim();
  if (field.kind === 'list') {
    const want = listOf(expected), have = listOf(actual);
    const haveN = have.map(normalise), wantN = want.map(normalise);
    const out = [];
    want.filter(x => !haveN.includes(normalise(x))).forEach(x =>
      out.push(issue(field, 'missing-item', field.critical ? 'critical' : 'major', x, 'Not present', `“${x}” is in the approved ${field.label.toLowerCase()} but not on the artwork.`)));
    have.filter(x => !wantN.includes(normalise(x))).forEach(x =>
      out.push(issue(field, 'extra-item', 'major', 'Not in specification', x, `“${x}” appears on the artwork but not in the approved ${field.label.toLowerCase()}.`)));
    return out;
  }
  if (blank) return [issue(field, 'missing', field.critical ? 'critical' : 'major', expected, 'Not present', `${field.label} is required by the specification and was not found on the artwork.`)];
  if (field.kind === 'quantity') {
    const e = parseQuantity(expected), a = parseQuantity(actual);
    if (!a) return [issue(field, 'unreadable', 'major', expected, actual, `Could not read a quantity and unit from “${actual}”.`)];
    if (e.dimension !== a.dimension) return [issue(field, 'mismatch', 'critical', expected, actual, `Unit type differs: specification is ${e.dimension}, artwork is ${a.dimension}.`)];
    if (e.value !== a.value) return [issue(field, 'mismatch', 'critical', expected, actual, `Quantity differs: ${expected} in the specification, ${actual} on the artwork.`)];
    return [];
  }
  if (field.kind === 'gtin') {
    const out = [];
    if (!validGtin(actual)) out.push(issue(field, 'invalid-gtin', 'critical', expected, actual, 'The artwork barcode number fails the GS1 check-digit test.'));
    if (actual.replace(/\s/g, '') !== String(expected).replace(/\s/g, '')) out.push(issue(field, 'mismatch', 'critical', expected, actual, 'The artwork barcode number differs from the specification.'));
    return out;
  }
  if (field.kind === 'code') {
    const n = s => String(s).toUpperCase().replace(/\s/g, '');
    return n(expected) === n(actual) ? [] : [issue(field, 'mismatch', 'major', expected, actual, `Code differs: ${expected} expected, ${actual} found.`)];
  }
  // kind === 'text': approved wording must appear; punctuation and case are ignored.
  if (normalise(expected) === normalise(actual)) return [];
  const d = wordDiff(expected, actual);
  const parts = [d.missing.length && `missing “${d.missing.join(' ')}”`, d.added.length && `adds “${d.added.join(' ')}”`].filter(Boolean).join('; ');
  return [issue(field, 'wording', field.critical ? 'major' : 'minor', expected, actual, `Wording differs from the approved text (${parts}).`)];
}

/** Run every deterministic check for a specification against one artwork version. */
export function compare(spec, version) {
  return spec.fields.flatMap(f => checkField(f, version.fields[f.key]));
}

/**
 * Simulated AI suggestions. In production these come from Amazon Bedrock with source evidence;
 * here a deterministic rule produces the same shape so the review workflow can be exercised.
 * Rule: a claim on the artwork that is not in the approved claims list is suggested for review,
 * with the nearest approved claim (if any) offered as evidence.
 */
export function suggest(spec, version) {
  const approved = listOf(spec.approvedClaims);
  return listOf(version.claims).filter(c => !approved.some(a => normalise(a) === normalise(c))).map(claim => {
    const nearest = approved.map(a => [a, similarity(a, claim)]).sort((x, y) => y[1] - x[1])[0];
    const close = nearest && nearest[1] >= 0.5;
    return {
      key: `claim:${normalise(claim)}`, label: 'Marketing claim', kind: 'claim', type: 'unapproved-claim', severity: 'major',
      expected: close ? nearest[0] : 'No matching approved claim', actual: claim,
      detail: close
        ? `“${claim}” resembles the approved claim “${nearest[0]}” but the wording differs. A reviewer should decide whether it is equivalent.`
        : `“${claim}” does not appear in the approved claims list. A reviewer should confirm whether it is supported.`,
    };
  });
}

const issueId = i => `${i.key}|${i.type}|${normalise(i.type === 'missing-item' ? i.expected : i.type === 'extra-item' || i.kind === 'claim' ? i.actual : '')}`;

export const UNRESOLVED = ['Open', 'Sent to studio', 'Still present'];
export const AI_PENDING = 'Suggested · needs decision';

/**
 * Reconcile existing findings with a fresh comparison of `version`.
 * - an unresolved finding whose issue is gone becomes "Verified fixed" (by the deterministic re-check)
 * - an unresolved finding still present becomes "Still present"
 * - new issues become new findings; AI suggestions start as "Suggested · needs decision"
 * Accepted/dismissed decisions are kept unless the underlying value changes.
 */
export function reconcile(findings, issues, suggestions, versionNumber, now) {
  const fresh = [...issues.map(i => ({ ...i, source: 'check' })), ...suggestions.map(i => ({ ...i, source: 'ai' }))];
  const byId = new Map(fresh.map(i => [issueId(i), i]));
  const out = findings.map(f => {
    const match = byId.get(f.issueId);
    if (match) byId.delete(f.issueId);
    if (!match) {
      if (UNRESOLVED.includes(f.status) || f.status === AI_PENDING) {
        return { ...f, status: 'Verified fixed', verifiedIn: versionNumber, history: [...f.history, { at: now, text: `Not detected in artwork v${versionNumber}: verified by automatic re-check.` }] };
      }
      return f;
    }
    if (f.status === 'Verified fixed' || (f.status === 'Accepted with reason' && match.actual !== f.actual) || (f.status === 'Dismissed' && match.actual !== f.actual)) {
      return { ...f, ...match, status: f.source === 'ai' ? AI_PENDING : 'Open', history: [...f.history, { at: now, text: `Detected again in artwork v${versionNumber}; reopened.` }] };
    }
    if (UNRESOLVED.includes(f.status)) {
      return { ...f, ...match, status: 'Still present', history: [...f.history, { at: now, text: `Still present in artwork v${versionNumber}.` }] };
    }
    return { ...f, ...match };
  });
  let n = findings.length;
  byId.forEach((i, id) => {
    n++;
    out.push({
      ...i, id: `F${String(n).padStart(2, '0')}`, issueId: id, raisedIn: versionNumber,
      status: i.source === 'ai' ? AI_PENDING : 'Open', assignee: 'Unassigned', comments: [],
      history: [{ at: now, text: i.source === 'ai' ? `AI suggestion raised on artwork v${versionNumber}.` : `Raised by automatic check on artwork v${versionNumber}.` }],
    });
  });
  return out;
}

/** Why a print decision is (not) allowed yet. Returns a list of blocking reasons; empty = allowed. */
export function decisionBlockers(review, policy) {
  const reasons = [];
  const latest = review.versions.at(-1);
  if (!review.spec.confirmed) reasons.push('Confirm the extracted specification fields.');
  if (review.comparedVersion !== latest.v) reasons.push(`Run the comparison on the latest artwork (v${latest.v}).`);
  const open = review.findings.filter(f => UNRESOLVED.includes(f.status)).length;
  if (open) reasons.push(`${open} finding${open > 1 ? 's are' : ' is'} unresolved.`);
  const ai = review.findings.filter(f => f.status === AI_PENDING).length;
  if (ai) reasons.push(`${ai} AI suggestion${ai > 1 ? 's need' : ' needs'} a reviewer decision.`);
  if (policy && policy.requireCriticalSignoff) {
    const waivedCritical = review.findings.filter(f => f.status === 'Accepted with reason' && f.severity === 'critical').length;
    if (waivedCritical) reasons.push(`${waivedCritical} critical finding${waivedCritical > 1 ? 's were' : ' was'} accepted without correction; policy requires critical findings to be fixed.`);
  }
  return reasons;
}

/** Review-level status label derived from its state. */
export function reviewStatus(review) {
  if (review.decision?.final) return 'Approved for print';
  if (review.decision && !review.decision.final) return 'Awaiting second approval';
  if (!review.spec.confirmed) return 'Confirm specification';
  if (review.comparedVersion !== review.versions.at(-1).v) return 'Comparison pending';
  if (review.findings.some(f => f.status === 'Sent to studio')) return 'With artwork studio';
  if (review.findings.some(f => UNRESOLVED.includes(f.status) || f.status === AI_PENDING)) return 'In review';
  return 'Ready for decision';
}

export function csv(rows) {
  return rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}
