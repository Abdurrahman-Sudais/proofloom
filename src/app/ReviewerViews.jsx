import React, { useState } from 'react';
import { ArrowRight, Download, Check, X, Send, Undo2, MessageSquare, Play, FileText } from 'lucide-react';
import { reviewStatus, decisionBlockers, compare, suggest, csv, AI_PENDING, UNRESOLVED } from './engine.mjs';
import {
  createReview, editSpecField, confirmSpec, runComparison, assignFinding, commentFinding, sendToStudio,
  acceptFinding, reopenFinding, decideSuggestion, recordDecision, reviewReport, findingRows, displayName,
} from './actions.mjs';
import { PageHead, AiBadge, Severity, Status, Kpi, Empty, StackBar, fmtDate, fmtDay, show, download, isUnresolved } from './ui.jsx';

const NEXT_STEP = {
  'Confirm specification': ['Check the extracted specification fields', 'spec'],
  'Comparison pending': ['Run the comparison on the latest artwork', 'compare'],
  'In review': ['Triage findings and AI suggestions', 'findings'],
  'With artwork studio': ['Waiting for corrected artwork', 'findings'],
  'Ready for decision': ['Record the print decision', 'decision'],
  'Awaiting second approval': ['A second reviewer confirms the decision', 'decision'],
  'Approved for print': ['Closed', 'decision'],
};

/* ---------------- Dashboard ---------------- */
export function ReviewerDashboard({ data, user }) {
  const open = data.reviews.filter(r => !r.decision?.final);
  const findings = open.flatMap(r => r.findings);
  const unresolved = findings.filter(f => UNRESOLVED.includes(f.status)).length;
  const ai = findings.filter(f => f.status === AI_PENDING).length;
  const ready = open.filter(r => ['Ready for decision', 'Awaiting second approval'].includes(reviewStatus(r))).length;
  const sev = s => findings.filter(f => isUnresolved(f) && f.severity === s).length;
  return (
    <>
      <PageHead title={`Good morning, ${user.name.split(' ')[0]}`} sub="What needs a second look across your packaging reviews." />
      <div className="pa-kpis">
        <Kpi value={open.length} label="active reviews" href="#/reviews" />
        <Kpi value={unresolved} label="unresolved findings" />
        <Kpi value={ai} label="AI suggestions awaiting a decision" />
        <Kpi value={ready} label="ready for a print decision" />
      </div>
      <div className="pa-grid2">
        <section className="pa-card" aria-labelledby="attn">
          <h2 id="attn">Needs attention</h2>
          {open.length ? (
            <ul className="pa-list">
              {open.map(r => {
                const status = reviewStatus(r);
                const [next, tab] = NEXT_STEP[status];
                return (
                  <li key={r.id}>
                    <a href={`#/reviews/${r.id}/${tab}`}><strong>{r.product}</strong><small>{r.id} · {r.pack}</small></a>
                    <Status value={status} />
                    <span className="pa-next">{next} <ArrowRight size={14} aria-hidden="true" /></span>
                  </li>
                );
              })}
            </ul>
          ) : <Empty>No active reviews.</Empty>}
        </section>
        <section className="pa-card" aria-labelledby="sev">
          <h2 id="sev">Unresolved by severity</h2>
          <StackBar parts={[{ label: 'Critical', value: sev('critical'), tone: 'bad' }, { label: 'Major', value: sev('major'), tone: 'warn' }, { label: 'Minor', value: sev('minor'), tone: 'info' }]} />
          <ul className="pa-legend"><li><i className="bad" />Critical {sev('critical')}</li><li><i className="warn" />Major {sev('major')}</li><li><i className="info" />Minor {sev('minor')}</li></ul>
          <p className="pa-hint">Critical: quantity, barcode, allergen and safety-warning fields marked critical in the specification. Severity is set by rules, not by the AI.</p>
          <h2>Recent activity</h2>
          <ol className="pa-feed">
            {data.audit.slice(-5).reverse().map(a => <li key={a.id}><span>{a.action}</span><small>{a.detail} · {fmtDate(a.at)}</small></li>)}
          </ol>
        </section>
      </div>
    </>
  );
}

/* ---------------- Review list ---------------- */
export function ReviewList({ data }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const rows = data.reviews.filter(r => `${r.id} ${r.product} ${r.brand} ${r.pack}`.toLowerCase().includes(q.toLowerCase()) && (status === 'All' || reviewStatus(r) === status));
  return (
    <>
      <PageHead title="Reviews" sub="Each review pairs one approved specification with a sequence of artwork versions.">
        <a className="button small" href="#/reviews/new">New review</a>
      </PageHead>
      <div className="pa-filters">
        <label><span className="sr-only">Search reviews</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search product, brand or ID…" /></label>
        <label><span className="sr-only">Filter by status</span>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {['All', ...Object.keys(NEXT_STEP)].map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="pa-card pa-tablewrap">
        <table className="pa-table">
          <thead><tr><th>Review</th><th>Pack</th><th>Artwork</th><th>Unresolved</th><th>Status</th><th>Owner</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><a href={`#/reviews/${r.id}`}><strong>{r.product}</strong></a><small>{r.id} · {r.market}</small></td>
                <td>{r.pack}</td>
                <td>v{r.versions.at(-1).v}</td>
                <td>{r.findings.filter(isUnresolved).length}</td>
                <td><Status value={reviewStatus(r)} /></td>
                <td>{displayName(data, r.owner)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No reviews match. Clear the search or choose another status.</Empty>}
      </div>
    </>
  );
}

/* ---------------- New review ---------------- */
const KINDS = [['text', 'Required wording'], ['quantity', 'Quantity'], ['code', 'Product code'], ['gtin', 'Barcode (GTIN)'], ['list', 'List (e.g. allergens)']];
const blankRow = () => ({ label: '', kind: 'text', value: '', artwork: '', critical: false });
const EXAMPLE = {
  product: 'Lumen Lip Balm', brand: 'Lumen', pack: 'Tube label', market: 'UK',
  rows: [
    { label: 'Product name', kind: 'text', value: 'Lumen Lip Balm', artwork: 'Lumen Lip Balm', critical: false },
    { label: 'Net quantity', kind: 'quantity', value: '4.8 g', artwork: '4,8 g', critical: true },
    { label: 'Product code', kind: 'code', value: 'LLB-048', artwork: 'LLB-048', critical: false },
    { label: 'Barcode (GTIN-13)', kind: 'gtin', value: '5012345004457', artwork: '5012345004457', critical: true },
    { label: 'Ingredients note', kind: 'text', value: 'Contains beeswax and shea butter.', artwork: 'Contains shea butter.', critical: false },
  ],
  approvedClaims: 'Long-lasting moisture',
  claims: 'Long lasting moisture\nVegan',
};

export function NewReview({ data, act, go, notify }) {
  const [form, setForm] = useState({ product: '', brand: '', pack: '', market: '', rows: [blankRow(), blankRow(), blankRow()], approvedClaims: '', claims: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setRow = (i, k, v) => setForm(f => ({ ...f, rows: f.rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)) }));
  const lines = s => s.split('\n').map(x => x.trim()).filter(Boolean);
  function submit(e) {
    e.preventDefault();
    const rows = form.rows.filter(r => r.label.trim() && r.value.trim());
    if (!form.product.trim()) return setError('Enter a product name.');
    if (!rows.length) return setError('Add at least one specification field with a label and approved value.');
    const keyed = rows.map((r, i) => ({ ...r, key: `f${i + 1}` }));
    const res = act(createReview, {
      product: form.product.trim(), brand: form.brand.trim(), pack: form.pack.trim(), market: form.market.trim(),
      fields: keyed.map(r => ({ key: r.key, label: r.label.trim(), kind: r.kind, value: r.kind === 'list' ? r.value.split(',').map(s => s.trim()).filter(Boolean) : r.value.trim(), critical: r.critical })),
      artwork: Object.fromEntries(keyed.map(r => [r.key, r.kind === 'list' ? r.artwork.split(',').map(s => s.trim()).filter(Boolean) : r.artwork.trim()])),
      approvedClaims: lines(form.approvedClaims), claims: lines(form.claims),
    });
    if (res.ok) { notify(`${res.result} created. Confirm the extracted specification next.`); go(`#/reviews/${res.result}/spec`); }
  }
  return (
    <>
      <PageHead title="New review" sub="In production you upload a specification and an artwork file and fields are extracted for you to confirm. Here you type the values the extraction would produce.">
        <button type="button" className="icon-button" onClick={() => { setForm(EXAMPLE); setError(''); }}><FileText size={16} aria-hidden="true" /> Fill with an example</button>
      </PageHead>
      <form className="pa-card pa-form" onSubmit={submit} noValidate>
        <div className="pa-form-grid">
          <label>Product name *<input value={form.product} onChange={e => set('product', e.target.value)} required /></label>
          <label>Brand<input value={form.brand} onChange={e => set('brand', e.target.value)} /></label>
          <label>Pack component<input value={form.pack} onChange={e => set('pack', e.target.value)} placeholder="Label, carton, pouch…" /></label>
          <label>Market<input value={form.market} onChange={e => set('market', e.target.value)} placeholder="UK, EU…" /></label>
        </div>
        <fieldset>
          <legend>Fields to check</legend>
          <p className="pa-hint">Lists are comma-separated. Mark a field critical if a mismatch must block print (quantities, barcodes, allergens, safety warnings).</p>
          <div className="pa-tablewrap">
            <table className="pa-table pa-edit">
              <thead><tr><th>Field</th><th>Check type</th><th>Approved value (specification)</th><th>Value on artwork</th><th>Critical</th></tr></thead>
              <tbody>
                {form.rows.map((r, i) => (
                  <tr key={i}>
                    <td><input aria-label={`Field ${i + 1} name`} value={r.label} onChange={e => setRow(i, 'label', e.target.value)} /></td>
                    <td><select aria-label={`Field ${i + 1} check type`} value={r.kind} onChange={e => setRow(i, 'kind', e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                    <td><input aria-label={`Field ${i + 1} approved value`} value={r.value} onChange={e => setRow(i, 'value', e.target.value)} /></td>
                    <td><input aria-label={`Field ${i + 1} artwork value`} value={r.artwork} onChange={e => setRow(i, 'artwork', e.target.value)} /></td>
                    <td><input type="checkbox" aria-label={`Field ${i + 1} critical`} checked={r.critical} onChange={e => setRow(i, 'critical', e.target.checked)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="icon-button" onClick={() => set('rows', [...form.rows, blankRow()])}>+ Add field</button>
        </fieldset>
        <div className="pa-form-grid">
          <label>Approved claims (one per line)<textarea value={form.approvedClaims} onChange={e => set('approvedClaims', e.target.value)} /></label>
          <label>Claims on the artwork (one per line)<textarea value={form.claims} onChange={e => set('claims', e.target.value)} /></label>
        </div>
        <p className="pa-error" role="alert">{error}</p>
        <button className="button small">Create review</button>
      </form>
    </>
  );
}

/* ---------------- Review detail ---------------- */
const TABS = [['spec', 'Specification'], ['compare', 'Compare'], ['findings', 'Findings'], ['versions', 'Versions'], ['decision', 'Print decision'], ['activity', 'Activity']];

export function ReviewDetail(props) {
  const { data, id, tab } = props;
  const review = data.reviews.find(r => r.id === id);
  if (!review) return <div className="pa-card pa-denied"><h1>Review not found</h1><a className="button small" href="#/reviews">All reviews</a></div>;
  const status = reviewStatus(review);
  const latest = review.versions.at(-1);
  const Tab = { spec: SpecTab, compare: CompareTab, findings: FindingsTab, versions: VersionsTab, decision: DecisionTab, activity: ActivityTab }[tab] || FindingsTab;
  return (
    <>
      <PageHead title={review.product} sub={`${review.id} · ${review.pack} · ${review.market} · specification v${review.spec.version} vs artwork v${latest.v}`}>
        <button type="button" className="icon-button" onClick={() => download(`${review.id}-report.txt`, reviewReport(data, review))}><Download size={16} aria-hidden="true" /> Report</button>
        <button type="button" className="icon-button" onClick={() => download(`${review.id}-findings.csv`, csv(findingRows(data, review)), 'text/csv')}><Download size={16} aria-hidden="true" /> Findings CSV</button>
      </PageHead>
      <div className="pa-review-status"><Status value={status} /><span>Next: {NEXT_STEP[status][0]}</span></div>
      <nav className="pa-tabs" aria-label="Review sections">
        {TABS.map(([k, label]) => {
          const n = k === 'findings' ? review.findings.filter(isUnresolved).length : 0;
          return <a key={k} href={`#/reviews/${review.id}/${k}`} aria-current={k === tab ? 'page' : undefined}>{label}{n ? <span className="pa-count">{n}</span> : null}</a>;
        })}
      </nav>
      <Tab {...props} review={review} />
    </>
  );
}

function SpecTab({ data, review, act, notify, go }) {
  const s = review.spec;
  return (
    <section className="pa-card">
      <div className="pa-row between">
        <h2>Specification v{s.version}</h2>
        {s.confirmed ? <span className="pa-status ok"><Check size={12} aria-hidden="true" /> Confirmed by {displayName(data, s.confirmedBy)}</span> : <span className="pa-status warn">Extracted · not yet confirmed</span>}
      </div>
      <p className="pa-hint">{s.confirmed ? 'Confirmed fields are the reference for every comparison. Changing them requires a new specification version.' : 'These values are what extraction read from the specification (simulated). Correct anything that is wrong, then confirm. Nothing is compared until a person confirms the reference.'}</p>
      <div className="pa-tablewrap">
        <table className="pa-table">
          <thead><tr><th>Field</th><th>Check</th><th>Approved value</th><th>Critical</th></tr></thead>
          <tbody>
            {s.fields.map(f => (
              <tr key={f.key}>
                <td>{f.label}</td>
                <td>{KINDS.find(k => k[0] === f.kind)?.[1]}</td>
                <td>{s.confirmed ? show(f.value) : (
                  <input aria-label={`${f.label} approved value`} defaultValue={show(f.value)} onBlur={e => { if (e.target.value !== show(f.value)) act(editSpecField, review.id, f.key, e.target.value); }} />
                )}</td>
                <td>{f.critical ? 'Yes' : ''}</td>
              </tr>
            ))}
            <tr><td>Approved claims</td><td>Claims list</td><td>{show(s.approvedClaims)}</td><td /></tr>
          </tbody>
        </table>
      </div>
      {!s.confirmed && (
        <button className="button small" onClick={() => { if (act(confirmSpec, review.id).ok) { notify('Specification confirmed. You can now run the comparison.'); go(`#/reviews/${review.id}/compare`); } }}>
          <Check size={16} aria-hidden="true" /> Confirm specification
        </button>
      )}
    </section>
  );
}

function CompareTab({ data, review, act, notify, go }) {
  const latest = review.versions.at(-1);
  const [v, setV] = useState(latest.v);
  const version = review.versions.find(x => x.v === v) || latest;
  const issues = compare(review.spec, version);
  const claims = suggest(review.spec, version);
  const stale = review.comparedVersion !== latest.v;
  function run() {
    if (act(runComparison, review.id).ok) { notify(`Comparison run on artwork v${latest.v}.`); go(`#/reviews/${review.id}/findings`); }
  }
  return (
    <section className="pa-card">
      <div className="pa-row between">
        <h2>Side by side</h2>
        <label className="pa-inline">Artwork version
          <select value={version.v} onChange={e => setV(Number(e.target.value))}>{review.versions.map(x => <option key={x.v} value={x.v}>v{x.v}{x.v === latest.v ? ' (latest)' : ''}</option>)}</select>
        </label>
      </div>
      {stale && (
        <div className="pa-callout">
          <p>{review.spec.confirmed ? `Artwork v${latest.v} has not been compared yet. The preview below is computed live; run the comparison to record findings.` : 'Confirm the specification before running a comparison.'}</p>
          <button className="button small" disabled={!review.spec.confirmed} onClick={run}><Play size={16} aria-hidden="true" /> Run comparison on v{latest.v}</button>
        </div>
      )}
      <div className="pa-tablewrap">
        <table className="pa-table pa-compare">
          <thead><tr><th>Field</th><th>Specification v{review.spec.version}</th><th>Artwork v{version.v}</th><th>Check</th></tr></thead>
          <tbody>
            {review.spec.fields.map(f => {
              const found = issues.filter(i => i.key === f.key);
              return (
                <tr key={f.key} className={found.length ? 'diff' : ''}>
                  <td>{f.label}{f.critical && <small>critical</small>}</td>
                  <td>{show(f.value)}</td>
                  <td>{show(version.fields[f.key])}</td>
                  <td>{found.length ? found.map((i, n) => <span key={n} className="pa-why"><Severity level={i.severity} /> {i.detail}</span>) : <span className="pa-status ok"><Check size={12} aria-hidden="true" /> Match</span>}</td>
                </tr>
              );
            })}
            <tr className={claims.length ? 'diff' : ''}>
              <td>Claims</td>
              <td>{show(review.spec.approvedClaims)}</td>
              <td>{show(version.claims)}</td>
              <td>{claims.length ? claims.map(c => <span key={c.key} className="pa-why"><AiBadge /> {c.detail}</span>) : <span className="pa-status ok"><Check size={12} aria-hidden="true" /> All approved</span>}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="pa-hint">Exact checks (quantities with unit conversion, codes, GS1 barcode check digits, required wording, list items) are deterministic rules. Claim review is an AI-assisted suggestion: a reviewer confirms or dismisses it. {data.policy.aiSuggestions ? '' : 'AI suggestions are currently switched off by your administrator.'}</p>
    </section>
  );
}

function FindingsTab({ data, review, act, notify, user }) {
  const [filter, setFilter] = useState('Needs action');
  const [selected, setSelected] = useState(review.findings.find(isUnresolved)?.id || review.findings[0]?.id);
  const shown = review.findings.filter(f => filter === 'All' || (filter === 'Needs action' ? isUnresolved(f) : filter === 'AI suggestions' ? f.source === 'ai' : !isUnresolved(f)));
  const f = review.findings.find(x => x.id === selected);
  const sendable = review.findings.filter(x => ['Open', 'Still present'].includes(x.status)).map(x => x.id);
  if (!review.comparedVersion) return <section className="pa-card"><Empty>No comparison has been run yet. {review.spec.confirmed ? <a href={`#/reviews/${review.id}/compare`}>Open Compare</a> : <a href={`#/reviews/${review.id}/spec`}>Confirm the specification first</a>}.</Empty></section>;
  return (
    <div className="pa-split">
      <section className="pa-card" aria-label="Findings list">
        <div className="pa-row between">
          <label className="pa-inline">Show
            <select value={filter} onChange={e => setFilter(e.target.value)}>{['Needs action', 'AI suggestions', 'Resolved', 'All'].map(x => <option key={x}>{x}</option>)}</select>
          </label>
          <button className="icon-button" disabled={!sendable.length || review.decision?.final} onClick={() => { if (act(sendToStudio, review.id, sendable, '').ok) notify(`${sendable.length} correction${sendable.length > 1 ? 's' : ''} sent to the artwork studio.`); }}>
            <Send size={16} aria-hidden="true" /> Send {sendable.length || ''} to studio
          </button>
        </div>
        <ul className="pa-findings">
          {shown.map(x => (
            <li key={x.id}>
              <button className={x.id === selected ? 'active' : ''} aria-pressed={x.id === selected} onClick={() => setSelected(x.id)}>
                <span className="pa-fid">{x.id}</span>
                <span><strong>{x.label}</strong><small>{x.source === 'ai' ? 'AI-suggested' : 'Automatic check'} · raised in v{x.raisedIn}</small></span>
                <Severity level={x.severity} />
                <Status value={x.status} />
              </button>
            </li>
          ))}
        </ul>
        {!shown.length && <Empty>{filter === 'Needs action' ? 'Nothing needs action. Check Print decision for what remains.' : 'No findings in this view.'}</Empty>}
      </section>
      {f ? <FindingPanel key={f.id} f={f} data={data} review={review} act={act} notify={notify} user={user} /> : <section className="pa-card"><Empty>Select a finding.</Empty></section>}
    </div>
  );
}

function FindingPanel({ f, data, review, act, notify }) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const closed = review.decision?.final;
  const reviewers = data.users.filter(u => u.role === 'reviewer' || u.role === 'studio');
  return (
    <section className="pa-card pa-finding" aria-labelledby="fd-title">
      <p className="eyebrow">{f.id} · {f.source === 'ai' ? <AiBadge /> : 'AUTOMATIC CHECK'}</p>
      <h2 id="fd-title">{f.label}</h2>
      <div className="pa-row"><Severity level={f.severity} /><Status value={f.status} />{f.verifiedIn && <small>verified in v{f.verifiedIn}</small>}</div>
      <div className="detail-values">
        <div><small>Specification v{review.spec.version}</small><strong>{show(f.expected)}</strong></div>
        <div><small>Artwork v{review.comparedVersion}</small><strong className="coral">{show(f.actual)}</strong></div>
      </div>
      <p>{f.detail}</p>
      {f.source === 'ai' && <p className="pa-hint">AI suggestions point to evidence for a person to judge. They never change a finding’s status on their own and never approve artwork.</p>}
      {f.reason && <p className="pa-callout"><strong>Reason recorded:</strong> {f.reason}</p>}

      {!closed && (
        <div className="pa-actions">
          {f.status === AI_PENDING && (
            <>
              <button className="button small" onClick={() => { if (act(decideSuggestion, review.id, f.id, true, '').ok) notify('Suggestion confirmed as a finding.'); }}><Check size={16} aria-hidden="true" /> Confirm as finding</button>
              <ReasonForm label="Dismiss with reason" reason={reason} setReason={setReason} onSubmit={() => act(decideSuggestion, review.id, f.id, false, reason).ok && notify('Suggestion dismissed. The reason is in the audit log.')} />
            </>
          )}
          {['Open', 'Still present'].includes(f.status) && (
            <>
              <button className="button small" onClick={() => { if (act(sendToStudio, review.id, [f.id], '').ok) notify('Correction sent to the artwork studio.'); }}><Send size={16} aria-hidden="true" /> Request correction</button>
              <ReasonForm label="Accept as-is with reason" reason={reason} setReason={setReason} warn={f.severity === 'critical' && data.policy.requireCriticalSignoff ? 'Policy: a critical finding accepted as-is will still block the print decision.' : ''} onSubmit={() => act(acceptFinding, review.id, f.id, reason).ok && notify('Finding accepted as-is. The reason is recorded.')} />
            </>
          )}
          {['Accepted with reason', 'Dismissed', 'Sent to studio'].includes(f.status) && (
            <button className="icon-button" onClick={() => { if (act(reopenFinding, review.id, f.id).ok) notify('Finding reopened.'); }}><Undo2 size={16} aria-hidden="true" /> Reopen</button>
          )}
          <label className="pa-inline">Assignee
            <select value={f.assignee} onChange={e => act(assignFinding, review.id, f.id, e.target.value)}>
              <option value="Unassigned">Unassigned</option>
              {reviewers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
        </div>
      )}

      <h3>Comments</h3>
      {f.comments.length ? <ul className="pa-comments">{f.comments.map((c, i) => <li key={i}><strong>{displayName(data, c.by)}</strong> · <small>{fmtDate(c.at)}</small><p>{c.text}</p></li>)}</ul> : <p className="pa-hint">No comments yet.</p>}
      <form className="pa-comment-form" onSubmit={e => { e.preventDefault(); if (comment.trim() && act(commentFinding, review.id, f.id, comment).ok) setComment(''); }}>
        <label><span className="sr-only">Add a comment</span><textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} placeholder="What needs to change?" /></label>
        <button className="icon-button" disabled={!comment.trim()}><MessageSquare size={16} aria-hidden="true" /> Add comment</button>
      </form>

      <h3>History</h3>
      <ol className="pa-feed">{[...f.history].reverse().map((h, i) => <li key={i}><span>{h.text}</span><small>{fmtDate(h.at)}</small></li>)}</ol>
    </section>
  );
}

function ReasonForm({ label, reason, setReason, onSubmit, warn }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="icon-button" onClick={() => setOpen(true)}><X size={16} aria-hidden="true" /> {label}</button>;
  return (
    <form className="pa-reason" onSubmit={e => { e.preventDefault(); if (onSubmit()) { setOpen(false); setReason(''); } }}>
      <label>{label}<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={10} maxLength={500} placeholder="Why is this acceptable? (at least 10 characters)" /></label>
      {warn && <p className="pa-hint">{warn}</p>}
      <div className="pa-row"><button className="button small">Save</button><button type="button" className="icon-button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}

function VersionsTab({ data, review }) {
  return (
    <section className="pa-card">
      <h2>Artwork versions</h2>
      <ol className="pa-versions">
        {[...review.versions].reverse().map((v, idx, arr) => {
          const prev = arr[idx + 1];
          const changes = prev ? Object.keys({ ...v.fields, ...prev.fields }).filter(k => show(v.fields[k]) !== show(prev.fields[k])) : [];
          const claimChange = prev && show(v.claims) !== show(prev.claims);
          return (
            <li key={v.v}>
              <div className="pa-row between"><strong>Artwork v{v.v}{v.v === review.comparedVersion ? ' · compared' : ''}</strong><small>{displayName(data, v.by)} · {fmtDate(v.at)}</small></div>
              <p>{v.note}</p>
              {prev && (changes.length || claimChange ? (
                <ul className="pa-diff">
                  {changes.map(k => {
                    const label = review.spec.fields.find(f => f.key === k)?.label || k;
                    return <li key={k}>{label}: <del>{show(prev.fields[k])}</del> → <ins>{show(v.fields[k])}</ins></li>;
                  })}
                  {claimChange && <li>Claims: <del>{show(prev.claims)}</del> → <ins>{show(v.claims)}</ins></li>}
                </ul>
              ) : <p className="pa-hint">No checked text changed from v{prev.v}.</p>)}
            </li>
          );
        })}
      </ol>
      <p className="pa-hint">Versions are never overwritten. In production each file is stored in versioned Amazon S3 with its extraction results.</p>
    </section>
  );
}

function DecisionTab({ data, review, act, notify, user }) {
  const [ack, setAck] = useState(false);
  const latest = review.versions.at(-1);
  const blockers = decisionBlockers(review, data.policy);
  const d = review.decision;
  if (d?.final) {
    return (
      <section className="pa-card">
        <h2>Approved for print</h2>
        <p>Artwork v{d.version} approved by {displayName(data, d.by)} on {fmtDay(d.at)}{d.second ? `, confirmed by ${displayName(data, d.second)} on ${fmtDay(d.secondAt)}` : ''}.</p>
        <p className="pa-hint">The decision is tied to this exact artwork version. Any later artwork change needs a new review.</p>
      </section>
    );
  }
  const pendingSecond = d && !d.final;
  const sameUser = pendingSecond && d.by === user.id;
  return (
    <section className="pa-card">
      <h2>Print decision</h2>
      <p>A person records the print decision for one exact artwork version. Proofloom checks that nothing is outstanding; it never approves artwork by itself and does not certify regulatory compliance.</p>
      <ul className="pa-checklist">
        {[
          ['Specification confirmed', review.spec.confirmed],
          [`Latest artwork (v${latest.v}) compared`, review.comparedVersion === latest.v],
          ['No unresolved findings', !review.findings.some(f => UNRESOLVED.includes(f.status))],
          ['Every AI suggestion decided by a reviewer', !review.findings.some(f => f.status === AI_PENDING)],
          ...(data.policy.requireCriticalSignoff ? [['No critical finding accepted without correction (policy)', !review.findings.some(f => f.status === 'Accepted with reason' && f.severity === 'critical')]] : []),
        ].map(([label, ok]) => <li key={label} className={ok ? 'ok' : 'bad'}>{ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />} {label}</li>)}
      </ul>
      {pendingSecond && <p className="pa-callout">First approval recorded by {displayName(data, d.by)} on {fmtDate(d.at)}. Your workspace requires a second reviewer to confirm.</p>}
      {!blockers.length && !sameUser && (
        <>
          <label className="check-label"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /> I have reviewed artwork v{latest.v} against specification v{review.spec.version} and the recorded findings. This decision applies to this version only.</label>
          <button className="button small" disabled={!ack} onClick={() => { if (act(recordDecision, review.id).ok) { setAck(false); notify(pendingSecond ? 'Second approval recorded. Artwork approved for print.' : data.policy.twoPersonApproval ? 'First approval recorded. A second reviewer must confirm.' : 'Print decision recorded.'); } }}>
            {pendingSecond ? 'Confirm as second approver' : 'Record print decision'}
          </button>
        </>
      )}
      {sameUser && <p className="pa-hint">Switch “Demo as” to another reviewer to confirm. The same person cannot give both approvals.</p>}
      {blockers.length > 0 && <p className="pa-hint">Resolve the items marked ✕ to enable the decision.</p>}
    </section>
  );
}

function ActivityTab({ data, review }) {
  const rows = data.audit.filter(a => a.detail.startsWith(review.id)).reverse();
  return (
    <section className="pa-card">
      <h2>Activity</h2>
      <ol className="pa-feed">{rows.map(a => <li key={a.id}><span>{a.action} · {displayName(data, a.user)}</span><small>{a.detail} · {fmtDate(a.at)}</small></li>)}</ol>
    </section>
  );
}
