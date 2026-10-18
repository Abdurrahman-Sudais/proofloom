import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {render} from '../.ssr/entry-server.js';

test('team section contains only confirmed names, roles and initials',()=>{
 const doc=new JSDOM(render('/')).window.document;
 const section=doc.querySelector('#leadership');
 assert.equal(section.querySelector('h2').textContent,'The People Building Proofloom');
 const cards=[...section.querySelectorAll('.founder-card')];
 assert.equal(cards.length,2);
 assert.deepEqual(cards.map(c=>c.querySelector('h3').textContent),['Tolu Akinwale','Michael Ugwu']);
 assert.deepEqual(cards.map(c=>c.querySelector('.founder-role').textContent),['Founder & CEO','Co-founder & CTO']);
 assert.deepEqual(cards.map(c=>c.querySelector('.founder-initials').textContent),['TA','MU']);
 assert.equal(section.querySelectorAll('img,a,form,.founder-bio').length,0);
 assert.equal(section.contains(doc.querySelector('#demo')),false);
 assert.equal(section.contains(doc.querySelector('#early-access')),false);
 assert.equal(section.previousElementSibling.id,'architecture');
 assert.equal(section.nextElementSibling.id,'early-access');
 assert.ok(doc.querySelector('#teams'));
 const footerLink=[...doc.querySelectorAll('footer a')].find(a=>a.textContent==='Team');
 assert.equal(footerLink.getAttribute('href'),'/#leadership');
 const nav=doc.querySelector('[aria-label="Main navigation"]');
 assert.equal([...nav.querySelectorAll('a')].find(a=>a.textContent==='Team').getAttribute('href'),'/#leadership');
});

test('responsive CSS specifies equal desktop columns and a mobile stack',async()=>{
 const css=await readFile('src/style.css','utf8');
 const team=css.slice(css.indexOf('/* Dedicated team section:'));
 assert.match(team,/\.founder-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(team,/@media\(max-width:760px\)\{[\s\S]*\.founder-grid\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(team,/\.founder-card\{min-width:0/);
 assert.match(team,/overflow-wrap:anywhere/);
 // These are CSS definition checks; jsdom cannot measure real device layout.
});


test('generated HTML includes leadership and matching destinations',async()=>{
 const html=await readFile('dist/index.html','utf8');
 const doc=new JSDOM(html).window.document;
 assert.equal(doc.querySelectorAll('#leadership').length,1);
 assert.equal(doc.querySelectorAll('#leadership .founder-card').length,2);
 assert.equal(doc.querySelector('#leadership h3').textContent,'Tolu Akinwale');
 assert.equal(doc.querySelectorAll('a[href="/#leadership"]').length,2);
 assert.equal(doc.querySelectorAll('a[href="/#team"]').length,0);
});
