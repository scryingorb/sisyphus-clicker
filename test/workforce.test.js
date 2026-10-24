import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, saveState, loadState } from '../src/state.js';
import { production, workerPower, crossBonus, equipmentStage, purchasePreview, buy, prestige, BALANCE } from '../src/progression.js';
import { GameSession } from '../src/session.js';
import { advanceProgress, settleOffline } from '../src/simulation.js';
import { drawWorkforce, workforceLayout, WORKFORCE_BUDGET } from '../src/workforce-scene.js';

test('one-way links add within a relationship and multiply tier training and milestones',()=>{
  const s=newState();s.workers=[10,20,10,6];s.tierUpgrades[0]=2;
  assert.equal(crossBonus(s,0),1.7);assert.equal(crossBonus(s,1),2.2);assert.equal(crossBonus(s,2),2);assert.equal(crossBonus(s,3),1);
  assert.equal(workerPower(s,0),1.4*10*2*2*1.7);
  const engine=workerPower(s,3);s.workers[0]=1000;assert.equal(workerPower(s,3),engine);
});
test('Buy Max crossing all milestones and bulk cross-tier gains exactly match preview',()=>{
  for(const kind of ['worker','tier','upgrade'])for(const q of kind==='worker'?[1,10,'max']:[1]) {
    const s=newState();s.runSummits=15;s.workers=[9,9,4,2];s.obols=1e100;
    const untouched=structuredClone(s);
    const i=kind==='upgrade'?2:1,before=production(s),preview=purchasePreview(s,kind,i,q);
    assert.deepEqual(s,untouched);
    assert.equal(buy(s,kind,i,q),true);assert.equal(production(s)-before,preview.gain);
    if(q==='max')assert.equal(s.workers[1],1000);
  }
});
test('schema 2 migration preserves assets; schema 4 round trip derives equipment and output',()=>{
  const s=newState();s.workers=[9,10,25,1000];s.tierUpgrades=[1,2,3,4];s.defiance=7;s.defianceCooldown=32;s.boost=3;
  let raw;const store={getItem:()=>raw,setItem:(_,v)=>raw=v};saveState(store,s,1000);
  const loaded=loadState(store);assert.equal(production(loaded),production(s));assert.deepEqual(loaded.workers.map(equipmentStage),[0,1,2,2]);assert.equal(loaded.defianceCooldown,32);
  const data=JSON.parse(raw);data.schema=2;delete data.tierUpgrades;delete data.defianceCooldown;raw=JSON.stringify(data);
  const migrated=loadState(store);assert.deepEqual(migrated.workers,s.workers);assert.deepEqual(migrated.tierUpgrades,[0,0,0,0]);assert.ok(Number.isFinite(production(migrated)));
});
test('prestige clears tier training, links, equipment and cooldown while retaining divine levels',()=>{
  const s=newState();s.runSummits=BALANCE.prestigeAt;s.workers=[100,100,100,100];s.tierUpgrades=[4,4,4,4];s.divine=[1,2,3,4];s.defianceCooldown=45;
  assert.equal(prestige(s),true);assert.equal(production(s),0);assert.deepEqual(s.tierUpgrades,[0,0,0,0]);assert.deepEqual(s.workers.map(equipmentStage),[0,0,0,0]);assert.equal(crossBonus(s,0),1);assert.equal(s.defianceCooldown,0);assert.deepEqual(s.divine,[1,2,3,4]);
});
test('Defiance charge persists idle; pause freezes timers; summit and offline never renew a boost',()=>{
  const s=newState();s.workers[0]=1;s.defiance=7;advanceProgress(s,1);assert.equal(s.defiance,7);
  s.boost=12;s.defianceCooldown=60;const g=new GameSession(s),before=structuredClone(s);g.tick(.05);assert.deepEqual(s,before);
  s.isResetting=true;s.climbPushes=100;s.returnRemaining=.05;advanceProgress(s,.05);assert.equal(s.runSummits,1);assert.ok(s.boost<12);assert.ok(s.defianceCooldown<60);
  s.lastSeen=1000;settleOffline(s,121000);assert.equal(s.boost,0);assert.equal(s.defianceCooldown,0);assert.equal(s.defiance,7);
  g.resume();g.push();assert.equal(s.defiance,8);
  s.defianceCooldown=2;const charge=s.defiance;for(let n=0;n<5;n++){advanceProgress(s,.15);g.push();}assert.equal(s.defiance,charge);
});
test('late-game workforce drawing is bounded, deterministic and never mutates production state',()=>{
  const s=newState();s.workers=[1000,1000,1000,1000];let images=0,lines=0;
  const ctx=new Proxy({drawImage:()=>images++,lineTo:()=>lines++},{get:(o,k)=>k in o?o[k]:()=>{}});
  const scene={state:s,ctx,scale:1,reduced:false,point:p=>({x:70+300*p,y:350-100*p}),rect:()=>{}};
  const portraits=Array.from({length:4},()=>({complete:true,naturalWidth:1280})),before=structuredClone(s);
  drawWorkforce(scene,portraits,1,{x:250,y:300},true);assert.equal(images,WORKFORCE_BUDGET);assert.ok(lines<50);assert.deepEqual(s,before);
  assert.equal(workforceLayout(scene).length,4);
  scene.reduced=true;images=0;drawWorkforce(scene,portraits,100,{x:250,y:300},true);assert.equal(images,4);assert.deepEqual(s,before);
});
test('reduced motion removes all workforce animation and frozen scene time yields identical drawing',()=>{
  const s=newState();s.workers=[25,25,25,25];let calls=[];
  const ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args])});
  const scene={state:s,ctx,scale:.65,reduced:true,point:p=>({x:44+156*p,y:270-80*p}),rect:(...args)=>calls.push(['rect',...args])};
  const capture=t=>{calls=[];drawWorkforce(scene,[],t,{x:120,y:230},true);return calls;};
  assert.deepEqual(capture(1),capture(10));scene.reduced=false;assert.deepEqual(capture(3),capture(3));assert.notDeepEqual(capture(1),capture(1.3));
  for(const station of workforceLayout(scene)) {
    assert.ok(station.x-18*scene.scale>=0);assert.ok(station.x+22*scene.scale<244);
    assert.ok(station.y+11*scene.scale<320); // Above mobile footer.
  }
});
test('all tiers, training and exhausted Defiance agree online and offline without new Golden events over multiple cycles',()=>{
  const s=newState();s.goldenCooldown=1201;s.workers=[50,25,10,5];s.tierUpgrades=[3,3,2,1];s.boost=12;s.defianceCooldown=60;s.lastSeen=1000;
  const offline=structuredClone(s),g=new GameSession(s);g.resume();for(let i=0;i<1200*20;i++)g.tick(.05);
  settleOffline(offline,1201000);assert.ok(Math.abs(s.obols-offline.obols)/s.obols<.01);assert.equal(s.runSummits,offline.runSummits);assert.equal(s.boost,0);assert.equal(offline.boost,0);assert.ok(s.runSummits>=10);
});
