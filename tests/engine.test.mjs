import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkField,validGtin,parseQuantity,similarity,suggest,decisionBlockers,reviewStatus,csv} from '../src/app/engine.mjs';
import {seed} from '../src/app/seed.mjs';

const cases=JSON.parse(await readFile('backend/tests/fixtures/cases.json','utf8'));

test('field rules match the shared fixtures used by the Python Lambda',()=>{
 for(const c of cases.fields){
  const issues=checkField(c.field,c.actual);
  assert.deepEqual(issues.map(i=>i.type),c.types,c.name);
  if(c.severity)assert.equal(issues[0].severity,c.severity,`${c.name}: severity`);
 }
});

test('GS1 check digits',()=>{
 for(const g of cases.gtin.valid)assert.equal(validGtin(g),true,g);
 for(const g of cases.gtin.invalid)assert.equal(validGtin(g),false,g);
});

test('quantities convert units and keep dimension',()=>{
 assert.deepEqual(parseQuantity('0,45 L'),{value:450,dimension:'volume'});
 assert.deepEqual(parseQuantity('4.8 g'),{value:4.8,dimension:'mass'});
 assert.equal(parseQuantity('no unit'),null);
});

test('claim suggestions point to the nearest approved claim',()=>{
 const spec={fields:[],approvedClaims:['High in fibre','Made with whole oats']};
 const s=suggest(spec,{fields:{},claims:['High in fibre','Made with wholegrain oats','No added sugar']});
 assert.equal(s.length,2);
 assert.equal(s[0].expected,'Made with whole oats');
 assert.equal(s[1].expected,'No matching approved claim');
 assert.ok(similarity('Made with whole oats','Made with wholegrain oats')>=0.5);
});

test('seeded reviews are produced by the engine and gate decisions correctly',()=>{
 const d=seed();
 const orchard=d.reviews.find(r=>r.id==='PL-1001');
 assert.deepEqual(orchard.findings.map(f=>[f.label,f.expected,f.actual]),[['Net quantity','450 ml','500 ml'],['Product code','OHW-450','OHW-500'],['Storage','Store in a cool, dry place.','Not present'],['Marketing claim','No matching approved claim','Dermatologically tested']]);
 assert.equal(reviewStatus(orchard),'In review');
 assert.equal(decisionBlockers(orchard,d.policy).length,2);
 const salt=d.reviews.find(r=>r.id==='PL-1003');
 assert.equal(reviewStatus(salt),'Confirm specification');
 const meadow=d.reviews.find(r=>r.id==='PL-0998');
 assert.equal(reviewStatus(meadow),'Approved for print');
 assert.equal(meadow.findings[0].status,'Verified fixed');
 assert.equal(meadow.findings[0].verifiedIn,2);
});

test('csv escapes quotes, commas and newlines',()=>{
 assert.equal(csv([['a','b,c'],['say "hi"','x\ny']]),'a,"b,c"\n"say ""hi""","x\ny"');
});
