import test from 'node:test';
import assert from 'node:assert/strict';
import { FeedbackQueue,purchaseFeedback } from '../src/feedback.js';
import { newState } from '../src/state.js';
import { buy,production,UPGRADES,TIER_UPGRADES,DIVINE } from '../src/progression.js';
import { ITEM_ART } from '../src/item-art.js';
import { readFile } from 'node:fs/promises';

test('feedback deduplicates, consolidates bulk responses, caps backlog and freezes when paused',()=>{
  const q=new FeedbackQueue();q.emit({id:'a',kind:'purchase',key:'worker:0'});
  assert.equal(q.emit({id:'a',kind:'purchase'}),false);
  q.emit({id:'b',kind:'purchase',key:'worker:0',count:10});assert.equal(q.items.length,1);assert.equal(q.current.count,10);
  q.tick(1,true);assert.equal(q.current.remaining,4);
  for(let i=0;i<20;i++)q.emit({id:`event${i}`,kind:'milestone'});assert.equal(q.items.length,4);
  q.emit({id:'prestige',kind:'prestige'});assert.equal(q.items.length,1);
  for(let i=0;i<121;i++)q.tick(.05);assert.equal(q.current,null);
});
test('bulk milestone feedback reports actual gain and never changes state or grants rewards',()=>{
  const s=newState();s.obols=1e10;s.workers[0]=9;const before=structuredClone(s);
  assert.ok(buy(s,'worker',0,10));const after=structuredClone(s);
  const event=purchaseFeedback(before,s,'worker',0,10);
  assert.equal(event.kind,'milestone');assert.equal(event.stageChanged,true);assert.equal(event.gain,production(s)-production(before));assert.equal(event.count,10);
  purchaseFeedback(before,s,'worker',0,10);assert.deepEqual(s,after);
});
test('every ordinary, tier and divine purchase maps to a unique local 64px PNG',async()=>{
  const paths=[];
  for(const [kind,defs] of Object.entries({upgrade:UPGRADES,tier:TIER_UPGRADES,divine:DIVINE})){
    assert.equal(ITEM_ART[kind].length,defs.length);
    for(const url of ITEM_ART[kind]){const data=await readFile(new URL(url));assert.equal(data.toString('ascii',1,4),'PNG');assert.equal(data.readUInt32BE(16),64);assert.equal(data.readUInt32BE(20),64);paths.push(url);}
  }
  assert.equal(new Set(paths).size,11);
});
