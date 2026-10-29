import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../src/app/seed.mjs';
import * as A from '../src/app/actions.mjs';
import {reviewStatus,AI_PENDING} from '../src/app/engine.mjs';

const t=(n=0)=>new Date(Date.UTC(2026,9,28,9,n)).toISOString();
const R='PL-1001';
const find=(d,label)=>A.reviewById(d,R).findings.find(f=>f.label===label);

test('full review loop: triage, studio correction, automatic re-check, two-person decision',()=>{
 const d=seed();
 const r=()=>A.reviewById(d,R);
 // Studio and admin cannot triage; reviewers can.
 assert.throws(()=>A.sendToStudio(d,'u-jo',R,['F01'],'',t()),A.PermissionError);
 assert.throws(()=>A.sendToStudio(d,'u-priya',R,['F01'],'',t()),A.PermissionError);
 A.decideSuggestion(d,'u-alex',R,'F04',true,'',t(1));
 assert.equal(find(d,'Marketing claim').status,'Open');
 assert.throws(()=>A.acceptFinding(d,'u-alex',R,'F03','too short',t()),/at least 10/);
 A.sendToStudio(d,'u-alex',R,['F01','F02','F03','F04'],'Please match spec v2',t(2));
 assert.equal(reviewStatus(r()),'With artwork studio');
 // Reviewers cannot upload artwork; the studio fixes two of four issues.
 const v3=r().versions.at(-1);
 assert.throws(()=>A.uploadVersion(d,'u-alex',R,v3.fields,v3.claims,'',t()),A.PermissionError);
 A.uploadVersion(d,'u-jo',R,{...v3.fields,quantity:'450 ml',code:'OHW-450'},v3.claims,'Quantity and code fixed',t(3));
 assert.equal(r().comparedVersion,4,'re-check runs automatically on upload');
 assert.equal(find(d,'Net quantity').status,'Verified fixed');
 assert.equal(find(d,'Net quantity').verifiedIn,4);
 assert.equal(find(d,'Storage').status,'Still present');
 assert.equal(find(d,'Marketing claim').status,'Still present');
 assert.throws(()=>A.recordDecision(d,'u-alex',R,t()),/unresolved/);
 // Second upload fixes the rest.
 A.uploadVersion(d,'u-jo',R,{...r().versions.at(-1).fields,storage:'Store in a cool, dry place.'},['Made with citrus & garden herbs','pH balanced'],'Storage added, claim removed',t(4));
 assert.ok(r().findings.every(f=>f.status==='Verified fixed'));
 assert.equal(reviewStatus(r()),'Ready for decision');
 // Two-person approval: same person cannot confirm; studio cannot decide.
 assert.throws(()=>A.recordDecision(d,'u-jo',R,t()),A.PermissionError);
 A.recordDecision(d,'u-alex',R,t(5));
 assert.equal(reviewStatus(r()),'Awaiting second approval');
 assert.throws(()=>A.recordDecision(d,'u-alex',R,t(6)),/different reviewer/);
 A.recordDecision(d,'u-sam',R,t(7));
 assert.equal(reviewStatus(r()),'Approved for print');
 assert.equal(r().decision.version,5);
 assert.throws(()=>A.uploadVersion(d,'u-jo',R,{},[],'',t()),/closed/);
 const actions=d.audit.map(a=>a.action);
 for(const a of ['AI suggestion confirmed','Correction requested','Artwork version uploaded','Comparison run','Print decision recorded (first approver)','Print decision confirmed (second approver)'])assert.ok(actions.includes(a),a);
 assert.match(A.reviewReport(d,r()),/Approved for print: artwork v5 by Alex Rivera/);
});

test('a new upload revokes a pending first approval',()=>{
 const d=seed();
 const id='PL-1001';
 for(const f of A.reviewById(d,id).findings){if(f.status===AI_PENDING)A.decideSuggestion(d,'u-alex',id,f.id,false,'Claim is supported by test report TR-12.',t());else A.acceptFinding(d,'u-alex',id,f.id,'Accepted for sample purposes only.',t());}
 // Policy blocks waiving the critical quantity finding.
 assert.throws(()=>A.recordDecision(d,'u-alex',id,t()),/critical/);
 A.setPolicy(d,'u-priya','requireCriticalSignoff',false,t());
 A.recordDecision(d,'u-alex',id,t(1));
 assert.equal(A.reviewById(d,id).decision.final,false);
 const v=A.reviewById(d,id).versions.at(-1);
 A.uploadVersion(d,'u-jo',id,v.fields,v.claims,'Re-export',t(2));
 assert.equal(A.reviewById(d,id).decision,null);
 assert.ok(d.audit.some(a=>a.action==='Pending print decision revoked'));
});

test('specification gate, editing, AI cap and admin policy bounds',()=>{
 const d=seed();
 const id='PL-1003';
 assert.throws(()=>A.runComparison(d,'u-alex',id,t()),/Confirm the specification/);
 A.editSpecField(d,'u-alex',id,'storage','Reseal after opening. Store in a dry place.',t());
 A.confirmSpec(d,'u-alex',id,t());
 assert.throws(()=>A.editSpecField(d,'u-alex',id,'storage','x',t()),/confirmed/);
 d.aiUsedToday=d.policy.dailyAiCap;
 A.runComparison(d,'u-alex',id,t());
 assert.equal(A.reviewById(d,id).findings.length,0,'0.25 kg matches 250 g; nothing else differs');
 assert.match(d.audit.at(-1).detail,/daily AI cap reached/);
 assert.throws(()=>A.setPolicy(d,'u-priya','dailyAiCap',9999,t()),/between/);
 assert.throws(()=>A.setPolicy(d,'u-alex','dailyAiCap',5,t()),A.PermissionError);
 assert.throws(()=>A.setRole(d,'u-priya','u-priya','reviewer',t()),/own administrator/);
 A.setRole(d,'u-priya','u-jo','reviewer',t());
 assert.equal(A.userById(d,'u-jo').role,'reviewer');
 const preview=A.retentionPreview(d,'2027-06-01');
 assert.deepEqual(preview.closed,['PL-0998']);
});

test('creating a review requires a reviewer and starts unconfirmed',()=>{
 const d=seed();
 const input={product:'Test Balm',fields:[{key:'f1',label:'Net quantity',kind:'quantity',value:'4.8 g',critical:true}],artwork:{f1:'5 g'},approvedClaims:[],claims:[]};
 assert.throws(()=>A.createReview(d,'u-jo',input,t()),A.PermissionError);
 const id=A.createReview(d,'u-alex',input,t());
 assert.equal(id,'PL-1004');
 A.confirmSpec(d,'u-alex',id,t());
 A.runComparison(d,'u-alex',id,t());
 assert.equal(A.reviewById(d,id).findings[0].severity,'critical');
});
