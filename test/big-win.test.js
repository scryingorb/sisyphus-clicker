import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {resolveReel} from '../src/casino.js';
import {nextReveal,completeReveal,reelMotion,REVEAL_LIMIT} from '../src/reel-presentation.js';
import {purchaseFeedback} from '../src/feedback.js';
import {buy,production,manualPower} from '../src/progression.js';
test('pending reveals preserve every paid event, reload mid-spin safely, and never credit again',()=>{
 const s=newState();resolveReel(s,['coin','coin','coin'],100);resolveReel(s,['lightning','lightning','coin'],100);const money=s.obols;
 let raw;const store={getItem:()=>raw,setItem:(_,v)=>raw=v};saveState(store,s,1000);const restored=loadState(store);assert.equal(restored.pendingReels.length,2);assert.deepEqual(nextReveal(restored).symbols,['coin','coin','coin']);
 const event=nextReveal(restored);assert.ok(completeReveal(restored,event));assert.equal(completeReveal(restored,event),false);assert.equal(restored.obols,money);assert.equal(nextReveal(restored).id,2);
 saveState(store,restored,1000);assert.equal(loadState(store).pendingReels.length,1);
});
test('large backlogs aggregate settled values without overwriting queued outcomes or growing DOM work',()=>{
 const s=newState();for(let i=0;i<100;i++)resolveReel(s,['coin','laurel','boulder'],10);assert.equal(s.pendingReels.length,REVEAL_LIMIT);assert.equal(s.reelOverflow.count,100-REVEAL_LIMIT);
 const money=s.obols;let revealed=0;while(nextReveal(s)){const e=structuredClone(nextReveal(s));revealed+=e.total+e.jackpot;assert.ok(completeReveal(s,e));}assert.equal(revealed,money);assert.equal(s.obols,money);
});
test('reel travel is continuous, monotonic, staggered and centers the predetermined cell',()=>{
 for(let i=0;i<3;i++){let previous=0;for(let t=0;t<2;t+=.01){const m=reelMotion(t,i);assert.ok(m.position>=previous);previous=m.position;}assert.equal(previous,18+i*2);assert.equal(reelMotion(0,i,false,true).stopped,true);}
 assert.ok(reelMotion(1.2,0).stopped);assert.equal(reelMotion(1.2,1).stopped,false);assert.ok(reelMotion(1.45,1).stopped);assert.equal(reelMotion(1.45,2).stopped,false);
});
test('purchase comparisons use exact transaction state for bulk workers and click upgrades',()=>{
 const s=newState();s.obols=1e6;const before=structuredClone(s);assert.ok(buy(s,'worker',0,10));const feedback=purchaseFeedback(before,s,'worker',0,10);assert.equal(feedback.comparison.before,production(before));assert.equal(feedback.comparison.after,production(s));assert.equal(feedback.comparison.percent,null);assert.equal(feedback.strength,'major');
 const clickBefore=structuredClone(s);assert.ok(buy(s,'upgrade',0,1));const click=purchaseFeedback(clickBefore,s,'upgrade',0,1);assert.equal(click.comparison.before,manualPower(clickBefore));assert.equal(click.comparison.after,manualPower(s));assert.ok(click.comparisons.every(x=>x.before!==x.after));
});
