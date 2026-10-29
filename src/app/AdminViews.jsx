import React, { useState } from 'react';
import { Download, Check, X } from 'lucide-react';
import { reviewStatus, csv, AI_PENDING, UNRESOLVED } from './engine.mjs';
import { setRole, setPolicy, retentionPreview, PERMISSIONS, displayName } from './actions.mjs';
import { PageHead, Kpi, StackBar, Empty, fmtDate, download } from './ui.jsx';

const ROLES = [['reviewer', 'Reviewer'], ['studio', 'Artwork studio'], ['admin', 'Administrator']];

export function AdminOverview({ data }) {
  const all = data.reviews.flatMap(r => r.findings);
  const ai = all.filter(f => f.source === 'ai');
  const confirmed = ai.filter(f => f.confirmed).length;
  const dismissed = ai.filter(f => f.status === 'Dismissed').length;
  const approved = data.reviews.filter(r => r.decision?.final);
  const byStatus = data.reviews.reduce((m, r) => { const s = reviewStatus(r); m[s] = (m[s] || 0) + 1; return m; }, {});
  const type = t => all.filter(f => f.type === t).length;
  return (
    <>
      <PageHead title="Workspace overview" sub="Administrators see aggregate counts. Review contents and artwork stay with reviewers." />
      <div className="pa-kpis">
        <Kpi value={data.reviews.length} label="reviews" />
        <Kpi value={all.filter(f => UNRESOLVED.includes(f.status) || f.status === AI_PENDING).length} label="unresolved findings" />
        <Kpi value={approved.length ? (approved.reduce((s, r) => s + r.decision.version, 0) / approved.length).toFixed(1) : '—'} label="avg. artwork versions to approval" />
        <Kpi value={`${data.aiUsedToday} / ${data.policy.dailyAiCap}`} label="AI comparisons used today" href="#/admin/policy" />
      </div>
      <div className="pa-grid2">
        <section className="pa-card"><h2>Reviews by status</h2>
          <table className="pa-table"><tbody>{Object.entries(byStatus).map(([s, n]) => <tr key={s}><td>{s}</td><td className="num">{n}</td></tr>)}</tbody></table>
        </section>
        <section className="pa-card"><h2>Findings by type</h2>
          <table className="pa-table"><tbody>
            {[['Value mismatch', type('mismatch')], ['Missing field', type('missing')], ['Missing list item (e.g. allergen)', type('missing-item')], ['Extra list item', type('extra-item')], ['Wording difference', type('wording')], ['Invalid barcode check digit', type('invalid-gtin')], ['Claim suggestions (AI)', type('unapproved-claim')]].map(([l, n]) => <tr key={l}><td>{l}</td><td className="num">{n}</td></tr>)}
          </tbody></table>
          <h2>AI suggestion outcomes</h2>
          <StackBar parts={[{ label: 'Confirmed by reviewer', value: confirmed, tone: 'ok' }, { label: 'Dismissed', value: dismissed, tone: 'muted' }, { label: 'Awaiting decision', value: ai.filter(f => f.status === AI_PENDING).length, tone: 'ai' }]} />
          <p className="pa-hint">{confirmed + dismissed ? `${Math.round((confirmed / (confirmed + dismissed)) * 100)}% of decided suggestions were confirmed.` : 'No suggestions decided yet.'} A falling rate is a quality signal for the prompt and model.</p>
        </section>
      </div>
    </>
  );
}

export function AdminUsers({ data, user, act, notify }) {
  return (
    <>
      <PageHead title="Users & roles" sub="Least privilege: studios see only correction requests; administrators do not open review contents." />
      <div className="pa-card pa-tablewrap">
        <table className="pa-table">
          <thead><tr><th>Name</th><th>Title</th><th>Role</th></tr></thead>
          <tbody>
            {data.users.map(u => (
              <tr key={u.id}>
                <td><span className="avatar">{u.initials}</span> {u.name}{u.id === user.id && ' (you)'}</td>
                <td>{u.title}</td>
                <td><select aria-label={`Role for ${u.name}`} value={u.role} onChange={e => { if (act(setRole, u.id, e.target.value).ok) notify(`${u.name} is now ${ROLES.find(r => r[0] === e.target.value)[1]}.`); }}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pa-hint">In production, users sign in through Amazon Cognito (optionally federated with the customer’s identity provider) and roles are enforced on the server for every request.</p>
    </>
  );
}

export function AdminPolicy({ data, act, notify }) {
  const p = data.policy;
  const [today, setToday] = useState('2027-06-01');
  const preview = retentionPreview(data, today);
  const toggle = (key, label) => (
    <label className="check-label"><input type="checkbox" checked={p[key]} onChange={e => { if (act(setPolicy, key, e.target.checked).ok) notify(`${label} ${e.target.checked ? 'on' : 'off'}.`); }} /> {label}</label>
  );
  const num = (key, label, min, max) => (
    <label>{label}<input type="number" min={min} max={max} defaultValue={p[key]} key={`${key}-${p[key]}`} onBlur={e => { if (Number(e.target.value) !== p[key] && act(setPolicy, key, e.target.value).ok) notify(`${label} set to ${e.target.value}.`); }} /></label>
  );
  return (
    <>
      <PageHead title="Policy & retention" sub="Workspace-wide controls. Every change is written to the audit log." />
      <div className="pa-grid2">
        <section className="pa-card pa-form">
          <h2>Review controls</h2>
          {toggle('twoPersonApproval', 'Two-person print approval')}
          {toggle('requireCriticalSignoff', 'Critical findings must be fixed, not accepted as-is')}
          {toggle('aiSuggestions', 'AI suggestions (claims and wording)')}
          {num('dailyAiCap', 'Daily AI comparison cap', 0, 500)}
          <p className="pa-hint">Deterministic checks always run. Switching AI off never hides an exact mismatch. AI output is always labelled and always needs a reviewer decision; that gate cannot be switched off.</p>
        </section>
        <section className="pa-card pa-form">
          <h2>Retention</h2>
          {num('retentionArtworkMonths', 'Artwork files and extractions (months)', 6, 120)}
          {num('retentionReportsMonths', 'Exported reports (months)', 12, 120)}
          {num('retentionAuditMonths', 'Audit log (months)', 24, 120)}
          {num('retentionClosedDays', 'Closed reviews (days after approval)', 30, 730)}
          <h3>Preview a retention run</h3>
          <label>As of date<input type="date" value={today} onChange={e => setToday(e.target.value)} /></label>
          <ul className="pa-hint">
            <li>Closed reviews to archive: {preview.closed.length ? preview.closed.join(', ') : 'none'}</li>
            <li>Artwork versions to delete: {preview.versions.length ? preview.versions.join(', ') : 'none'}</li>
            <li>Audit entries to delete: {preview.audit}</li>
          </ul>
          <p className="pa-hint">Preview only; nothing is deleted. In production a scheduled job (EventBridge → Lambda) applies these windows and S3 lifecycle rules expire files.</p>
        </section>
      </div>
    </>
  );
}

export function AdminAudit({ data }) {
  const [q, setQ] = useState('');
  const rows = data.audit.filter(a => `${a.action} ${a.detail} ${displayName(data, a.user)}`.toLowerCase().includes(q.toLowerCase())).reverse();
  return (
    <>
      <PageHead title="Audit log" sub="Append-only record of who did what, and when.">
        <button className="icon-button" onClick={() => download('proofloom-audit.csv', csv([['id', 'time', 'user', 'action', 'detail'], ...data.audit.map(a => [a.id, a.at, displayName(data, a.user), a.action, a.detail])]), 'text/csv')}><Download size={16} aria-hidden="true" /> Export CSV</button>
      </PageHead>
      <div className="pa-filters"><label><span className="sr-only">Filter audit log</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by action, review or person…" /></label></div>
      <div className="pa-card pa-tablewrap">
        <table className="pa-table">
          <thead><tr><th>Time (UTC)</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>{rows.map(a => <tr key={a.id}><td>{fmtDate(a.at)}</td><td>{displayName(data, a.user)}</td><td>{a.action}</td><td>{a.detail}</td></tr>)}</tbody>
        </table>
        {!rows.length && <Empty>No entries match.</Empty>}
      </div>
    </>
  );
}

export function AdminPermissions() {
  const cell = v => (v === true ? <><Check size={14} aria-label="Allowed" /></> : v === false ? <X size={14} aria-label="Not allowed" /> : <small>{v}</small>);
  return (
    <>
      <PageHead title="Permissions" sub="What each role can do. The prototype enforces this matrix on every action; production enforces it on the server." />
      <div className="pa-card pa-tablewrap">
        <table className="pa-table pa-matrix">
          <thead><tr><th>Capability</th><th>Reviewer</th><th>Artwork studio</th><th>Administrator</th></tr></thead>
          <tbody>{PERMISSIONS.map(([label, r]) => <tr key={label}><td>{label}</td><td>{cell(r.reviewer)}</td><td>{cell(r.studio)}</td><td>{cell(r.admin)}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
