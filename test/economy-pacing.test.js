import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('real-formula economy gate covers opening, midgame, late challenges, prestige and offline cap',()=>{
  execFileSync(process.execPath,['scripts/progression-sim.mjs','src','test-results/overhaul-economy.json'],{stdio:'pipe'});
  const r=JSON.parse(readFileSync('test-results/overhaul-economy.json','utf8'));
  assert.equal(r.relaxed.events.find(e=>e.event==='first worker').seconds,45);
  assert.ok(r.relaxed.purchaseLog.every(p=>p.kind==='upgrade'&&p.tier===0||p.gain>0));
  assert.ok(r.midgame.length>=10);assert.equal(r.late.mountains.length,40);
  assert.deepEqual(r.relaxed.firstFive.slice(0,3).map(x=>Math.round(x.seconds*10)/10),[62.1,63.3,120.7]);
  assert.equal(r.relaxed.seconds,8164);
  assert.ok(r.golden.finished&&r.golden.goldenClaims>0);
  assert.ok(r.golden.seconds<r.relaxed.seconds&&r.golden.seconds>r.relaxed.seconds*.9);
  assert.ok(r.golden.firstFive.slice(0,3).every(x=>x.seconds>=50&&x.seconds<=180));
  for(const run of Object.values(r.relicRuns)){assert.ok(run.finished&&!run.stalled);assert.ok(run.relics.length>0);assert.ok(run.longestPurchaseGap<=540);}
  assert.ok(r.relicRuns.atlas.seconds>r.relaxed.seconds*.85&&r.relicRuns.atlas.seconds<r.relaxed.seconds*1.1);
  assert.ok(r.relicRuns.combined.seconds>r.relaxed.seconds*.85);
  assert.ok(r.relicRuns.passive.seconds>r.automation.seconds*.85);
  assert.ok(r.relicRuns.returning.seconds<r.second.seconds&&r.relicRuns.returning.seconds>r.second.seconds*.8);
  for(const run of Object.values(r.casinoRuns)){assert.ok(run.finished&&!run.stalled);assert.ok(run.longestPurchaseGap<=540);assert.ok(run.jackpots>0);assert.ok(run.reelUptime>=0&&run.reelUptime<.3);}
  for(const name of ['average','poor','good']){const run=r.casinoRuns[name];assert.ok(run.seconds>r.relaxed.seconds*(name==='good'?.7:.9)&&run.seconds<r.relaxed.seconds);assert.deepEqual(run.firstFive.slice(0,3),r.relaxed.firstFive.slice(0,3));assert.equal(run.events.find(e=>e.event==='first worker').seconds,45);}
  assert.ok(r.casinoRuns.good.seconds<r.casinoRuns.poor.seconds);
  // Forced all-Mega luck is a stress bound; real seeded play remains a substantial progression curve.
  assert.ok(r.casino2Runs.frequent.seconds>3500&&r.casino2Runs.frequent.seconds<4800);
  assert.ok(r.casino2Runs.frequent.casinoMountainContribution>.20&&r.casino2Runs.frequent.casinoMountainContribution<.35);
  for(const [name,run] of Object.entries(r.casino2Runs)){assert.ok(run.finished&&!run.stalled,name);assert.ok(Number.isSafeInteger(run.spinsStored));assert.ok(run.spinsPerHour>60&&run.spinsPerHour<400);assert.ok(run.longestPurchaseGap<=540);if(!['returning','long'].includes(name))assert.deepEqual(run.firstFive.slice(0,3),(name==='workers'?r.automation:r.relaxed).firstFive.slice(0,3));}
  assert.ok(r.casino2Runs.frequent.seconds>r.casinoRuns.average.seconds*.5);assert.ok(Object.values(r.casino2Runs).every(run=>run.holdsUsed===0&&run.riskChoices===0));
  assert.ok(r.casinoRuns.returning.seconds<r.second.seconds&&r.casinoRuns.returning.seconds>r.second.seconds*.8);
});
