import test from 'node:test';
import assert from 'node:assert/strict';
import { ChainFeedback, ComboHistory, comboTiming } from '../src/feedback.js';
import { comboRows, comboSource, comboValue, relicCondition, liveComboHTML } from '../src/combo-ui.js';
import { newState } from '../src/state.js';
import { powerBreakdown, manualPower } from '../src/progression.js';

test('combo count-up is bounded, reaches genuine intermediates, and resolves at readable intervals and holds the complete result',()=>{
 const s=newState();s.workers[0]=10;s.relics=s.activeRelics=['atlas','zeus'];s.boost=12;s.goldenBoost=20;
 const snapshot=powerBreakdown(s,'click'),chain=new ChainFeedback();chain.start(snapshot,0);
 assert.equal(snapshot.total,manualPower(s));assert.ok(chain.beat>=.3&&chain.beat<=.45);
 for(let i=1;i<snapshot.steps.length;i++){
  const initial=chain.view(i*chain.beat+.000001),end=chain.view((i+.9)*chain.beat);
  assert.ok(initial.displayed>=snapshot.steps[i-1].result);assert.ok(end.displayed<=snapshot.steps[i].result);assert.ok(end.displayed>=initial.displayed);
  assert.ok(Math.abs(end.displayed-snapshot.steps[i].result)<1e-9);
 }
 assert.equal(chain.view(snapshot.steps.length*.4+.001).displayed,snapshot.total);assert.ok(chain.view(snapshot.steps.length*.4+.001).final);
 assert.equal(chain.view(.01,true).displayed,snapshot.total);
 for(let i=0;i<100;i++)chain.finish(.85+i*.001);
 assert.ok(chain.view(3).final);assert.equal(chain.view(comboTiming(snapshot).duration),null);
});

test('presentation names real sources, labels operations, and explains conditional relics',()=>{
 const s=newState();s.relics=s.activeRelics=['atlas','zeus'];s.workers[0]=10;s.boost=12;s.goldenBoost=20;
 const snapshot=powerBreakdown(s,'click'),before=structuredClone(s),html=comboRows(snapshot);
 assert.match(html,/Gauntlet of Atlas/);assert.match(html,/Spark of Zeus/);assert.match(html,/data-operation="add"/);
 assert.equal(comboSource(snapshot.steps[1]).id,'atlas');assert.equal(comboValue(snapshot.steps[2]),'\u00d71.15');
 assert.match(liveComboHTML(s),/Defiance overrides Golden crew/);assert.match(relicCondition(s,'atlas'),/12s/);
 s.boost=0;assert.match(relicCondition(s,'atlas'),/build Defiance/);s.boost=12;assert.deepEqual(s,before);
});

test('normal, major and jackpot reading clocks retain accurate results and reduce motion without shortening lifetime',()=>{
 const base={kind:'click',unit:'m/s',total:15,steps:[{label:'Base',operation:'base',value:10,result:10},{label:'Defiance',operation:'multiply',value:1.5,result:15}]};
 for(const [extra,duration] of [[{},4],[{major:true},5.5],[{jackpot:100},6.5]]){
  const snapshot={...base,...extra},chain=new ChainFeedback();chain.start(snapshot,0);const timing=comboTiming(snapshot);
  assert.equal(timing.duration,duration);assert.ok(timing.duration-.35-timing.finalAt>=2);
  assert.equal(chain.view(duration-.36).displayed,15);assert.equal(chain.view(duration-.01,true).displayed,15);assert.equal(chain.view(duration,true),null);
 }
 const long={...base,steps:Array(10).fill(base.steps[1])};assert.ok(comboTiming(long).duration>=6.35);
});
test('repeated events do not restart playback; priority and five-entry history preserve missed calculations',()=>{
 const history=new ComboHistory(),chain=new ChainFeedback(history),snapshot={kind:'worker',unit:'power',total:15,steps:[{label:'Base',operation:'base',value:10,result:10},{label:'Relic',operation:'multiply',value:1.5,result:15}]};
 chain.start(snapshot,0);for(let i=0;i<50;i++)assert.equal(chain.start(snapshot,1+i*.01),false);
 assert.equal(chain.started,0);assert.equal(history.items.length,1);assert.equal(history.items[0].repeats,51);
 chain.start(snapshot,2,{major:true,eventType:'Golden Boulder'});assert.equal(chain.start({...snapshot,total:16},3),false);assert.equal(chain.started,2);
 for(let i=0;i<8;i++)history.record({...snapshot,total:100+i},'Divine Reels');assert.equal(history.items.length,5);assert.equal(history.items[0].total,107);assert.deepEqual(history.items[0].steps,snapshot.steps);
 snapshot.steps[0].result=999;assert.equal(history.items[0].steps[0].result,10);
});
