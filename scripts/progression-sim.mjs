// Canonical pacing harness; accepts the same optional source/output paths.
import './mountain-sim.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const report=JSON.parse(readFileSync(process.argv[3]||'test-results/mountains-after.json','utf8'));
const {relaxed,burst,automation,imperfect,second}=report;
for(const run of [relaxed,burst,automation,imperfect,second]){assert.ok(run.finished&&!run.stalled);assert.ok(run.longestPurchaseGap<=300);}
for(const [i,min,max] of [[0,45,90],[1,60,120],[2,120,240]])assert.ok(relaxed.firstFive[i].seconds>=min&&relaxed.firstFive[i].seconds<=max);
assert.equal(relaxed.events.find(x=>x.event==='first upgrade').seconds,15);
assert.ok(relaxed.events.find(x=>x.event==='first worker').seconds<=45);
assert.ok(relaxed.seconds>=7200&&relaxed.seconds<=14400);
assert.ok(burst.seconds>=7200&&burst.seconds<=14400);
assert.ok(automation.seconds>burst.seconds);
assert.ok(second.seconds<burst.seconds*.85);
for(const row of report.offline){assert.equal(row.seconds,28800);assert.equal(row.purchasesWhileAway,0);}
console.log('Pacing assertions PASS: opening, no stalls, 2-4h first run, viable automation, faster second run, purchase gaps and 8h offline cap.');
