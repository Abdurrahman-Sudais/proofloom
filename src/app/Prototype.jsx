import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, LayoutDashboard, FileStack, FilePlus2, Brush, Gauge, Users, SlidersHorizontal, ScrollText, ShieldCheck } from 'lucide-react';
import { seed } from './seed.mjs';
import { PermissionError } from './actions.mjs';
import { asset } from '../assets.mjs';
import { ReviewerDashboard, ReviewList, NewReview, ReviewDetail } from './ReviewerViews.jsx';
import { StudioQueue, StudioUpload } from './StudioViews.jsx';
import { AdminOverview, AdminUsers, AdminPolicy, AdminAudit, AdminPermissions } from './AdminViews.jsx';

const STORE = 'proofloom-prototype-v1';
const HOME = { reviewer: '#/dashboard', studio: '#/studio', admin: '#/admin' };
const NAV = {
  reviewer: [['#/dashboard', 'Dashboard', LayoutDashboard], ['#/reviews', 'Reviews', FileStack], ['#/reviews/new', 'New review', FilePlus2]],
  studio: [['#/studio', 'Correction requests', Brush]],
  admin: [['#/admin', 'Overview', Gauge], ['#/admin/users', 'Users & roles', Users], ['#/admin/policy', 'Policy & retention', SlidersHorizontal], ['#/admin/audit', 'Audit log', ScrollText], ['#/admin/permissions', 'Permissions', ShieldCheck]],
};
const ROLE_LABEL = { reviewer: 'Reviewer', studio: 'Artwork studio', admin: 'Administrator' };

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data?.version === 1) return parsed;
    }
  } catch { /* storage unavailable: fall back to seed */ }
  return null;
}

function save(state) {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* demo still works without persistence */ }
}

export default function Prototype() {
  // Render the deterministic seed first (matches the prerendered HTML), then restore saved state.
  const [data, setData] = useState(seed);
  const [userId, setUserId] = useState('u-alex');
  const [route, setRoute] = useState('#/dashboard');
  const [toast, setToast] = useState(null);
  const [persisted, setPersisted] = useState(true);
  const mainRef = useRef(null);

  useEffect(() => {
    const saved = load();
    if (saved) { setData(saved.data); setUserId(saved.userId); }
    try { localStorage.setItem(STORE + '-probe', '1'); localStorage.removeItem(STORE + '-probe'); } catch { setPersisted(false); }
    const sync = () => setRoute(location.hash || '#/dashboard');
    sync();
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const user = data.users.find(u => u.id === userId) || data.users[0];

  // Keep the route valid for the current role.
  const section = route.startsWith('#/admin') ? 'admin' : route.startsWith('#/studio') ? 'studio' : 'reviewer';
  const allowed = section === user.role;

  function go(hash) {
    if (location.hash !== hash) location.hash = hash;
    setRoute(hash);
    mainRef.current?.focus();
  }

  function notify(text, tone = 'ok') {
    setToast({ text, tone, at: Date.now() });
  }

  /** Apply an action from actions.mjs to a copy of the data, persist it, and report errors as a toast. */
  function act(fn, ...args) {
    const draft = structuredClone(data);
    try {
      const result = fn(draft, user.id, ...args, new Date().toISOString());
      setData(draft);
      save({ data: draft, userId: user.id });
      return { ok: true, result };
    } catch (e) {
      notify(e instanceof PermissionError ? `Not permitted: ${e.message}` : e.message, 'bad');
      return { ok: false };
    }
  }

  function switchUser(id) {
    const next = data.users.find(u => u.id === id);
    setUserId(id);
    save({ data, userId: id });
    go(HOME[next.role]);
    notify(`Now viewing as ${next.name} (${ROLE_LABEL[next.role]}).`);
  }

  function reset() {
    const fresh = seed();
    setData(fresh);
    setUserId('u-alex');
    try { localStorage.removeItem(STORE); } catch { /* ignore */ }
    go('#/dashboard');
    notify('Demo data restored to the original fictional sample.');
  }

  const ctx = { data, user, act, go, notify, route };
  const parts = route.replace(/^#\//, '').split('/');
  let page;
  if (!allowed) {
    page = (
      <div className="pa-card pa-denied">
        <h1>Not available for this role</h1>
        <p>{user.name} is signed in as {ROLE_LABEL[user.role]}. This area belongs to another role, and in production the server would refuse the request too.</p>
        <a className="button small" href={HOME[user.role]}>Go to your home page</a>
      </div>
    );
  } else if (section === 'admin') {
    page = { users: <AdminUsers {...ctx} />, policy: <AdminPolicy {...ctx} />, audit: <AdminAudit {...ctx} />, permissions: <AdminPermissions {...ctx} /> }[parts[1]] || <AdminOverview {...ctx} />;
  } else if (section === 'studio') {
    page = parts[1] ? <StudioUpload {...ctx} id={parts[1]} /> : <StudioQueue {...ctx} />;
  } else if (parts[0] === 'reviews' && parts[1] === 'new') {
    page = <NewReview {...ctx} />;
  } else if (parts[0] === 'reviews' && parts[1]) {
    page = <ReviewDetail {...ctx} id={parts[1]} tab={parts[2] || 'findings'} />;
  } else if (parts[0] === 'reviews') {
    page = <ReviewList {...ctx} />;
  } else {
    page = <ReviewerDashboard {...ctx} />;
  }

  return (
    <div className="pa">
      <a className="skip" href="#pa-main">Skip to content</a>
      <header className="pa-top">
        <a href="/" className="pa-back" aria-label="Back to the Proofloom website"><ArrowLeft size={16} aria-hidden="true" /><img src={asset('/brand/logo-dark.svg')} alt="Proofloom" width="120" height="27" /></a>
        <span className="pa-tag">Prototype · fictional data</span>
        <div className="pa-top-actions">
          <label className="pa-demo-as"><span>Demo as</span>
            <select value={user.id} onChange={e => switchUser(e.target.value)} aria-label="Demo as user">
              {data.users.map(u => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role]}</option>)}
            </select>
          </label>
          <button type="button" className="icon-button" onClick={reset}><RotateCcw size={16} aria-hidden="true" /> Reset demo data</button>
        </div>
      </header>
      <div className="pa-body">
        <nav className="pa-side" aria-label="Prototype navigation">
          <div className="pa-who"><span className="avatar">{user.initials}</span><div><strong>{user.name}</strong><small>{user.title}</small></div></div>
          {NAV[user.role].map(([href, label, Icon]) => {
            const current = href === route || (href === '#/reviews' && /^#\/reviews\/(?!new)/.test(route));
            return <a key={href} href={href} aria-current={current ? 'page' : undefined}><Icon size={16} aria-hidden="true" /> {label}</a>;
          })}
          <p className="pa-side-note">All people, products and barcodes are invented. Changes are saved in this browser{persisted ? '' : ' (storage unavailable: changes last until reload)'}.</p>
        </nav>
        <main id="pa-main" className="pa-main" tabIndex={-1} ref={mainRef}>{page}</main>
      </div>
      <div className={`pa-toast ${toast ? toast.tone : ''}`} role="status" aria-live="polite">{toast?.text}</div>
    </div>
  );
}
