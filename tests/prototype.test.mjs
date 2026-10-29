import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('prototype route is prerendered with the reviewer dashboard',async()=>{
 const html=await readFile('dist/app/index.html','utf8');
 assert.match(html,/<title>Interactive prototype — Proofloom<\/title>/);
 assert.match(html,/Prototype · fictional data/);
 assert.match(html,/Good morning, Alex/);
 assert.match(html,/noindex,nofollow/);
 const home=await readFile('dist/index.html','utf8');
 for(const id of ['benefits','use-cases','safeguards','pricing','faq'])assert.match(home,new RegExp(`id="${id}"`),id);
 assert.match(home,/href="\/app"/);
 assert.doesNotMatch(home,/\$\d/,'no invented prices');
});

test('prototype UI end to end in a DOM simulation (not browser layout QA)',async()=>{
 const dom=new JSDOM('<div id="app"></div>',{url:'https://proofloom.space/app'});const w=dom.window;
 globalThis.window=w;globalThis.document=w.document;globalThis.location=w.location;globalThis.localStorage=w.localStorage;
 globalThis.addEventListener=w.addEventListener.bind(w);globalThis.removeEventListener=w.removeEventListener.bind(w);
 globalThis.HTMLElement=w.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let downloads=[];globalThis.URL.createObjectURL=()=>'blob:x';globalThis.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download)};
 const React=await import('react');const {act}=React;const {createRoot}=await import('react-dom/client');const {App}=await import('../.ssr/entry-server.js');
 const root=createRoot(document.getElementById('app'));
 const mount=()=>act(async()=>root.render(React.createElement(App,{path:'/app'})));
 await mount();
 const text=()=>document.body.textContent;
 const btn=s=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(s));
 const click=async el=>{assert.ok(el,'control exists');await act(async()=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true})))};
 const change=async(el,value)=>{const proto=el.tagName==='SELECT'?w.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);await act(async()=>el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true})))};
 const nav=async hash=>{await act(async()=>{w.location.hash=hash;w.dispatchEvent(new w.HashChangeEvent('hashchange'));});};
 const demoAs=name=>change(document.querySelector('[aria-label="Demo as user"]'),[...document.querySelectorAll('[aria-label="Demo as user"] option')].find(o=>o.textContent.startsWith(name)).value);

 assert.match(text(),/Good morning, Alex/);
 await nav('#/reviews/PL-1001/compare');
 assert.match(document.querySelector('.pa-compare').textContent,/Quantity differs: 450 ml in the specification, 500 ml on the artwork/);
 await nav('#/reviews/PL-1001/findings');
 await click([...document.querySelectorAll('.pa-findings button')].find(b=>b.textContent.includes('Marketing claim')));
 assert.match(document.querySelector('.pa-finding').textContent,/Dermatologically tested/);
 await click(btn('Confirm as finding'));
 assert.equal(text().includes('Suggested · needs decision'),false);
 await click(btn('Send 4 to studio'));
 assert.match(text(),/4 corrections sent to the artwork studio/);
 // Exports
 await click(btn('Report'));await click(btn('Findings CSV'));
 assert.deepEqual(downloads,['PL-1001-report.txt','PL-1001-findings.csv']);
 // Role switch: the studio sees requests and uploads a corrected version.
 await demoAs('Jo Lindqvist');
 assert.equal(w.location.hash,'#/studio');
 assert.match(text(),/Orchard Hand Wash/);
 await nav('#/reviews/PL-1001');
 assert.match(text(),/Not available for this role/);
 await nav('#/studio/PL-1001');
 const input=label=>[...document.querySelectorAll('.pa-form label')].find(l=>l.textContent.startsWith(label)).querySelector('input');
 await change(input('Net quantity'),'450 ml');await change(input('Product code'),'OHW-450');await change(input('Storage'),'Store in a cool, dry place.');
 await change(document.querySelector('.pa-form textarea'),'Made with citrus & garden herbs\npH balanced');
 await act(async()=>document.querySelector('.pa-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true})));
 assert.match(text(),/Artwork v4 uploaded/);
 // Persistence across a remount.
 await act(async()=>root.unmount());
 const root2=createRoot(document.getElementById('app'));
 await act(async()=>root2.render(React.createElement(App,{path:'/app'})));
 await demoAs('Alex Rivera');
 await nav('#/reviews/PL-1001/decision');
 assert.match(text(),/Latest artwork \(v4\) compared/);
 await click(document.querySelector('.check-label input'));
 await click(btn('Record print decision'));
 assert.match(text(),/A second reviewer must confirm/);
 await demoAs('Sam Okafor');
 await nav('#/reviews/PL-1001/decision');
 await click(document.querySelector('.check-label input'));
 await click(btn('Confirm as second approver'));
 assert.match(text(),/Approved for print/);
 // Admin sees the audit trail; reset restores the seed.
 await demoAs('Priya Nair');
 await nav('#/admin/audit');
 assert.match(text(),/Print decision confirmed \(second approver\)/);
 await click(btn('Reset demo data'));
 assert.equal(localStorage.getItem('proofloom-prototype-v1'),null);
 await nav('#/reviews/PL-1001/findings');
 assert.match(text(),/Suggested · needs decision/);
 await act(async()=>root2.unmount());dom.window.close();
});
