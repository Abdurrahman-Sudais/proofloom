import React,{useState} from 'react';
import {ArrowUpRight,Mail,Send} from 'lucide-react';
import {leadPayload,validateLead,hubspotConfig} from './lead.mjs';
const email='tolu@proofloom.space';
const Icon=({icon:I,...p})=><I size={18} aria-hidden="true" {...p}/>;
const empty={name:'',email:'',company:'',companyType:'',role:'',volume:'',message:'',consent:false,marketing:false,website:''};

export default function Contact(){
 const [lead,setLead]=useState(empty);const [state,setState]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);
 const hubspot=hubspotConfig();
 const set=(k,v)=>setLead(l=>({...l,[k]:v}));
 const text=`Hello Proofloom,\n\nName: ${lead.name}\nEmail: ${lead.email}\nCompany: ${lead.company}\nCompany type: ${lead.companyType}\nRole: ${lead.role}\nArtwork versions reviewed per month: ${lead.volume}\n\n${lead.message}\n\nI would like to discuss early access and pricing.`;
 async function copy(){try{await navigator.clipboard.writeText(text);setState('Message copied. Paste it into your email application and send it.');}catch{setState('Copy unavailable. Select and copy the message preview below.');}}
 async function submit(e){
  e.preventDefault();setError('');setState('');
  if(lead.website)return; // honeypot: bots fill hidden fields
  const problem=validateLead(lead);if(problem){setError(problem);return;}
  if(!hubspot){
   window.location.href=`mailto:${email}?subject=${encodeURIComponent('Proofloom early access & pricing inquiry')}&body=${encodeURIComponent(text)}`;
   setState('Email draft requested. You must send it through your email application. Nothing has been submitted here.');return;
  }
  setBusy(true);
  try{
   const r=await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(hubspot.portalId)}/${encodeURIComponent(hubspot.formGuid)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(leadPayload(lead,{pageUri:location.href.split('#')[0],pageName:document.title},hubspot))});
   if(!r.ok)throw new Error(`HubSpot responded ${r.status}`);
   setSent(true);
  }catch{setError(`Sorry, that could not be sent. Please try again, or email ${email}.`);}
  finally{setBusy(false);}
 }
 return <section id="early-access" className="contact-section wrap"><div><p className="eyebrow">LET’S LOOK AT YOUR REVIEW PROCESS</p><h2>Your next print run<br/>deserves a <em>closer look.</em></h2><p>Proofloom is building a workspace for packaging review. Tell us what you check today and where revisions get difficult.</p><p>Request early access or request pricing.<br/>Availability and pricing will be discussed by email.</p><a className="email" href={`mailto:${email}`}>{email} <ArrowUpRight size={22}/></a></div>
 {sent?<div className="contact-form contact-done" role="status" tabIndex={-1}><h3>Thank you.</h3><p>Your request has been received. Next step: we will email you to arrange a walkthrough with your own specifications.</p></div>:
 <form className="contact-form" noValidate onSubmit={submit}>
  <label>Your name *<input required autoComplete="name" value={lead.name} onChange={e=>set('name',e.target.value)}/></label>
  <label>Work email *<input required type="email" autoComplete="email" value={lead.email} onChange={e=>set('email',e.target.value)}/></label>
  <div className="form-pair"><label>Company *<input required autoComplete="organization" value={lead.company} onChange={e=>set('company',e.target.value)}/></label>
  <label>Company type *<select required value={lead.companyType} onChange={e=>set('companyType',e.target.value)}><option value="">Choose…</option>{['Consumer-product brand','Packaging printer','Contract manufacturer','Design or artwork agency','Retailer (own label)','Other'].map(o=><option key={o}>{o}</option>)}</select></label></div>
  <div className="form-pair"><label>Your role<input autoComplete="organization-title" value={lead.role} onChange={e=>set('role',e.target.value)} placeholder="Packaging manager, QA…"/></label>
  <label>Artwork versions reviewed per month<select value={lead.volume} onChange={e=>set('volume',e.target.value)}><option value="">Choose…</option>{['Under 20','20–100','100–500','500+'].map(o=><option key={o}>{o}</option>)}</select></label></div>
  <label>What does your team review? *<textarea required value={lead.message} onChange={e=>set('message',e.target.value)} placeholder="Labels, cartons, specifications… Please do not include confidential artwork or customer data." maxLength="3000"/></label>
  <div className="hp" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={lead.website} onChange={e=>set('website',e.target.value)}/></label></div>
  <label className="check-label"><input type="checkbox" checked={lead.consent} onChange={e=>set('consent',e.target.checked)}/> <span>I agree that Proofloom may use these details to reply to this request. *</span></label>
  <label className="check-label"><input type="checkbox" checked={lead.marketing} onChange={e=>set('marketing',e.target.checked)}/> <span>Also send me occasional product updates (optional).</span></label>
  <p className="form-error" role="alert">{error}</p>
  <div className="actions">{hubspot?<button className="button" disabled={busy}>{busy?'Sending…':'Request early access'} <Icon icon={Send}/></button>:<><button className="button">Open email draft <Icon icon={Mail}/></button><button type="button" className="text-link" onClick={copy}>Copy message</button></>}</div>
  <p className="muted">{hubspot?'Submitting sends these details to Proofloom’s customer-relationship system so we can reply. See the privacy notes.':'Opens your email application. Review and send the message yourself; this website does not deliver emails.'}</p>
  <p role="status">{state}</p>
  {!hubspot&&<details><summary>Message preview / copy fallback</summary><pre className="message-preview">{text}</pre></details>}
 </form>}</section>}
