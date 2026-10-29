import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Circle } from 'lucide-react';
import { UNRESOLVED, AI_PENDING } from './engine.mjs';

export const fmtDate = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
export const fmtDay = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const show = v => (Array.isArray(v) ? v.join(', ') : v || '—');

export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="pa-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="pa-head-actions">{children}</div>}
    </div>
  );
}

export const AiBadge = ({ children = 'AI-suggested' }) => <span className="pa-badge ai"><Sparkles size={12} aria-hidden="true" /> {children}</span>;

export function Severity({ level }) {
  return <span className={`pa-sev ${level}`}>{level}</span>;
}

const STATUS_TONE = {
  Open: 'warn', 'Still present': 'bad', 'Sent to studio': 'info', [AI_PENDING]: 'ai', 'Verified fixed': 'ok', 'Accepted with reason': 'muted', Dismissed: 'muted',
  'Approved for print': 'ok', 'Awaiting second approval': 'info', 'Ready for decision': 'ok', 'In review': 'warn', 'With artwork studio': 'info', 'Comparison pending': 'warn', 'Confirm specification': 'warn',
};

export function Status({ value }) {
  const tone = STATUS_TONE[value] || 'muted';
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' || tone === 'warn' ? AlertTriangle : Circle;
  return <span className={`pa-status ${tone}`}><Icon size={12} aria-hidden="true" /> {value}</span>;
}

export const isUnresolved = f => UNRESOLVED.includes(f.status) || f.status === AI_PENDING;

export function Kpi({ value, label, href }) {
  const body = <><b>{value}</b><span>{label}</span></>;
  return href ? <a className="pa-kpi link" href={href}>{body}</a> : <div className="pa-kpi">{body}</div>;
}

export function Empty({ children }) {
  return <p className="pa-empty">{children}</p>;
}

/** Horizontal stacked bar with an accessible text equivalent. */
export function StackBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="pa-stack" role="img" aria-label={parts.map(p => `${p.label}: ${p.value}`).join(', ')}>
      {parts.filter(p => p.value).map(p => <span key={p.label} className={p.tone} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.value}`} />)}
    </div>
  );
}
