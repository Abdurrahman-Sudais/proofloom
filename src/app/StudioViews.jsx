import React, { useState } from 'react';
import { Upload, ArrowRight } from 'lucide-react';
import { uploadVersion, commentFinding, displayName } from './actions.mjs';
import { PageHead, Severity, Status, Empty, fmtDate, show } from './ui.jsx';

const requested = r => r.findings.filter(f => ['Sent to studio', 'Still present'].includes(f.status));

export function StudioQueue({ data }) {
  const reviews = data.reviews.filter(r => !r.decision?.final && requested(r).length);
  return (
    <>
      <PageHead title="Correction requests" sub="Corrections reviewers have sent to the artwork studio. You see the requested changes, not the whole review." />
      {reviews.length ? reviews.map(r => (
        <section className="pa-card" key={r.id} aria-labelledby={`h-${r.id}`}>
          <div className="pa-row between">
            <div><h2 id={`h-${r.id}`}>{r.product}</h2><p className="pa-hint">{r.id} · {r.pack} · current artwork v{r.versions.at(-1).v}</p></div>
            <a className="button small" href={`#/studio/${r.id}`}><Upload size={16} aria-hidden="true" /> Prepare corrected version</a>
          </div>
          <ul className="pa-requests">
            {requested(r).map(f => (
              <li key={f.id}>
                <Severity level={f.severity} /> <strong>{f.label}</strong>: change <del>{show(f.actual)}</del> to match <ins>{show(f.expected)}</ins>
                <Status value={f.status} />
                {f.comments.length > 0 && <small>Latest note from {displayName(data, f.comments.at(-1).by)}: “{f.comments.at(-1).text}”</small>}
              </li>
            ))}
          </ul>
        </section>
      )) : (
        <div className="pa-card"><Empty>No corrections are waiting. When a reviewer sends findings to the studio they appear here. Try it: switch “Demo as” to Alex Rivera, open Orchard Hand Wash and choose “Send to studio”.</Empty></div>
      )}
    </>
  );
}

export function StudioUpload({ data, id, act, notify, go }) {
  const review = data.reviews.find(r => r.id === id);
  const latest = review?.versions.at(-1);
  const [fields, setFields] = useState(() => (latest ? Object.fromEntries(review.spec.fields.map(f => [f.key, show(latest.fields[f.key]) === '—' ? '' : show(latest.fields[f.key])])) : {}));
  const [claims, setClaims] = useState(latest ? latest.claims.join('\n') : '');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState({});
  if (!review) return <div className="pa-card"><Empty>Review not found.</Empty></div>;
  if (review.decision?.final) return <div className="pa-card"><Empty>This review is closed: artwork v{review.decision.version} was approved for print.</Empty></div>;
  const asks = requested(review);
  function submit(e) {
    e.preventDefault();
    const payload = Object.fromEntries(review.spec.fields.map(f => [f.key, f.kind === 'list' ? fields[f.key].split(',').map(s => s.trim()).filter(Boolean) : fields[f.key].trim()]));
    const res = act(uploadVersion, review.id, payload, claims.split('\n').map(s => s.trim()).filter(Boolean), note.trim());
    if (res.ok) {
      notify(`Artwork v${res.result} uploaded. The automatic re-check has run; the reviewer will see what is fixed and what remains.`);
      go('#/studio');
    }
  }
  return (
    <>
      <PageHead title={`Corrected artwork for ${review.product}`} sub={`${review.id} · current version v${latest.v}. In production you upload the file and text is extracted; here you edit the text the new file contains.`} />
      <div className="pa-split">
        <form className="pa-card pa-form" onSubmit={submit}>
          <h2>Artwork v{latest.v + 1}</h2>
          {review.spec.fields.map(f => (
            <label key={f.key}>{f.label}{f.kind === 'list' && ' (comma-separated)'}
              <input value={fields[f.key]} onChange={e => setFields(s => ({ ...s, [f.key]: e.target.value }))} className={asks.some(a => a.key === f.key) ? 'pa-flag' : ''} />
            </label>
          ))}
          <label>Claims on pack (one per line)<textarea value={claims} onChange={e => setClaims(e.target.value)} /></label>
          <label>Version note<input value={note} onChange={e => setNote(e.target.value)} placeholder="What changed?" maxLength={200} /></label>
          <button className="button small"><Upload size={16} aria-hidden="true" /> Upload v{latest.v + 1} and re-check</button>
        </form>
        <section className="pa-card" aria-labelledby="asks">
          <h2 id="asks">Requested corrections</h2>
          {asks.length ? (
            <ul className="pa-requests">
              {asks.map(f => (
                <li key={f.id}>
                  <Severity level={f.severity} /> <strong>{f.label}</strong>
                  <p>Specification: <ins>{show(f.expected)}</ins><br />Current artwork: <del>{show(f.actual)}</del></p>
                  {f.comments.map((c, i) => <small key={i}>{displayName(data, c.by)} · {fmtDate(c.at)}: {c.text}</small>)}
                  <form className="pa-comment-form" onSubmit={e => { e.preventDefault(); const t = (comment[f.id] || '').trim(); if (t && act(commentFinding, review.id, f.id, t).ok) setComment(s => ({ ...s, [f.id]: '' })); }}>
                    <label><span className="sr-only">Reply about {f.label}</span><input value={comment[f.id] || ''} onChange={e => setComment(s => ({ ...s, [f.id]: e.target.value }))} placeholder="Reply to the reviewer…" maxLength={500} /></label>
                    <button className="icon-button" disabled={!(comment[f.id] || '').trim()}>Reply <ArrowRight size={14} aria-hidden="true" /></button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <Empty>No corrections requested for this review.</Empty>}
          <p className="pa-hint">Fields with requested corrections are outlined. After upload, the same deterministic checks run again: anything no longer detected is marked “Verified fixed”; anything still there is flagged “Still present”.</p>
        </section>
      </div>
    </>
  );
}
