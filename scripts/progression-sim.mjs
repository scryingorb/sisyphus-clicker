// Canonical pacing harness; accepts the same optional source/output paths.
import './mountain-sim.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const report=JSON.parse(readFileSync(process.argv[3]||'test-results/mountains-after.json','utf8'));
const {relaxed,burst,automation,imperfect,second}=report;
for(const run of [relaxed,burst,automation,imperfect,second]){assert.ok(run.finished&&!run.stalled);assert.ok(run.longestPurchaseGap<=300);}
for(const [i,min,max] of [[0,60,120],[1,60,180],[2,120,180]])assert.ok(relaxed.firstFive[i].seconds>=min&&relaxed.firstFive[i].seconds<=max);
assert.equal(relaxed.events.find(x=>x.event==='first upgrade').seconds,15);
assert.ok(relaxed.events.find(x=>x.event==='first worker').seconds<=45);
assert.ok(relaxed.seconds>=7200&&relaxed.seconds<=14400);
assert.ok(burst.seconds>=7200&&burst.seconds<=14400);
assert.ok(automation.seconds>burst.seconds);
assert.ok(second.seconds<burst.seconds*.85);
for(const row of report.offline){assert.equal(row.seconds,28800);assert.equal(row.purchasesWhileAway,0);}
assert.ok(report.late.finished&&!report.late.stalled);
assert.ok(report.late.longestPurchaseGap<=480);
for(const run of [relaxed,burst,automation,imperfect,second,report.late]) {
  assert.ok(run.mountains.every(x=>x.seconds<(run===report.late?2100:1200)), 'First prestige climbs under 20min; optional post-prestige challenges under 35min');
  assert.ok(run.mountains.slice(7).every((x,i,a)=>!i||x.seconds/a[i-1].seconds<2.5), 'No abrupt later wall');
}
assert.ok(report.oneShade[0].finished&&report.oneShade[0].seconds<300);
assert.ok(relaxed.firstFive.every(x=>x.averageWorkerPower>0));
console.log('Pacing assertions PASS: opening, no stalls, 2-4h first run, viable automation, faster second run, first-run purchase gaps, bounded optional post-prestige waits and 8h offline cap.');
