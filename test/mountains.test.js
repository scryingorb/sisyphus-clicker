import test from 'node:test';
import assert from 'node:assert/strict';
import { newState,finishClimb,loadState,saveState } from '../src/state.js';
import { BALANCE,mountain,prestige,favorGain,cosmeticUnlocked } from '../src/progression.js';
import { GameSession } from '../src/session.js';
import { advanceProgress } from '../src/simulation.js';
import { summitPreview } from '../src/mountain-goals.js';

test('prestige requires 28 completed climbs each run; ordinary summits never reset purchases',()=>{
  const s=newState();s.workers[0]=3;s.upgrades[0]=2;s.obols=70;s.completedClimbs=100n;
  for(let n=1;n<=28;n++){
    s.isResetting=true;finishClimb(s);
    assert.equal(s.runSummits,n);assert.equal(s.workers[0],3);assert.equal(s.upgrades[0],2);assert.equal(s.favor,0);
    assert.equal(favorGain(s),n===28?8:0);
    if(n<28){const before=structuredClone(s);assert.equal(prestige(s),false);assert.deepEqual(s,before);}
  }
  assert.ok(s.obols>70);assert.equal(prestige(s),true);assert.equal(s.runSummits,0);assert.equal(s.completedClimbs,128n);
  s.isResetting=true;finishClimb(s);assert.equal(prestige(s),false);assert.equal(s.favor,8);
});
test('opening push moves visibly; one untrained Shade climbs from rest without clicks',()=>{
  const s=newState(),g=new GameSession(s);g.resume();g.push();
  for(let i=0;i<240;i++)advanceProgress(s,1/240);
  assert.ok(s.climbPushes>1,'at least one percent visible movement after one second');
  const times=[];
  for(const count of [1,2]){
    const a=newState();a.workers[0]=count;let time=0;
    while(!a.runSummits&&time<300){advanceProgress(a,.05);time+=.05;}
    assert.equal(a.runSummits,1);assert.equal(a.totalPushes,0n);assert.equal(a.boost,0);times.push(time);
  }
  assert.ok(times[1]<times[0]*.6);
});
test('mountain distances and fixed-workforce climb difficulty increase across every transition',()=>{
  let lastLength=0,lastWork=0;const environments=[];
  for(let n=0;n<60;n++){
    const m=mountain({...newState(),runSummits:n});
    assert.ok(m.length>lastLength);assert.ok(m.length*m.resistance>lastWork);
    lastLength=m.length;lastWork=m.length*m.resistance;if(n<5)environments.push(m.environment);
  }
  assert.deepEqual(environments,[0,1,2,3,4]);assert.ok(mountain({...newState(),runSummits:1}).gravity<1.02);
});
test('summit preview matches settlement; cosmetic and story rewards occur once and survive prestige',()=>{
  const s=newState(),preview=summitPreview(s);assert.deepEqual(preview.cosmetics,['Obsidian Heart']);assert.deepEqual(preview.stories,['Charon']);
  s.isResetting=true;finishClimb(s);assert.equal(s.obols,preview.obols);assert.ok(cosmeticUnlocked(s,'obsidian'));
  const settled=structuredClone(s);finishClimb(s);assert.deepEqual(s,settled);
  let raw;const store={getItem:()=>raw,setItem:(_,v)=>raw=v};saveState(store,s,1000);const loaded=loadState(store);
  assert.deepEqual(summitPreview(loaded).cosmetics,[]);assert.deepEqual(summitPreview(loaded).stories,[]);
  loaded.runSummits=BALANCE.prestigeAt;prestige(loaded);assert.ok(cosmeticUnlocked(loaded,'obsidian'));assert.ok(loaded.discoveries.includes('Charon'));
  assert.deepEqual(summitPreview(loaded).cosmetics,[]);assert.deepEqual(summitPreview(loaded).stories,[]);
});
test('schema 4 preserves unequipped cosmetics and old story thresholds without granting another summit',()=>{
  const data={...newState(),schema:4,totalPushes:'90',completedClimbs:'10',runSummits:10,climbPushes:42,highWater:60,obols:99};
  const s=loadState({getItem:()=>JSON.stringify(data)});
  assert.ok(cosmeticUnlocked(s,'gold'));assert.ok(cosmeticUnlocked(s,'royal'));assert.ok(s.discoveries.includes('Hephaestus'));
  assert.equal(s.climbPushes,42);assert.equal(s.highWater,60);assert.equal(s.obols,99);assert.equal(s.runSummits,10);
  const m=mountain(s);assert.ok(m.length>0);assert.deepEqual(summitPreview(s).cosmetics,[]);
});
