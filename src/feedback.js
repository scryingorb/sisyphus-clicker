import { manualPower } from './satisfaction.js';
import { WORKERS, UPGRADES, TIER_UPGRADES, DIVINE, EQUIPMENT, equipmentStage, milestone, production, format, autoSpeed, mountain } from './progression.js';

// Presentation-only events. Never calls buy(), credit(), prestige() or save().
export function purchaseFeedback(before,after,kind,index,count) {
  const gain=production(after)-production(before);
  const crossed=kind==='worker'?[10,25,50,100].filter(n=>before.workers[index]<n&&after.workers[index]>=n):[];
  const stageChanged=kind==='worker'&&equipmentStage(after.workers[index])>equipmentStage(before.workers[index]);
  const name=(kind==='worker'?WORKERS:kind==='tier'?TIER_UPGRADES:kind==='divine'?DIVINE:UPGRADES)[index];
  const arrival=kind==='worker'&&before.workers[index]===0&&after.workers[index]>0;
  let major=arrival||crossed.length>0||kind==='divine'||gain>=Math.max(1,production(before));
  const comparisons=[];
  const compare=(label,a,b,unit='',lower=false)=>{if(a!==b)comparisons.push({label,before:a,after:b,unit,delta:b-a,percent:a?(b/a-1)*100:null,lower});};
  if(kind==='upgrade'&&index===0||kind==='divine'&&index===0)compare('Click impulse',manualPower(before),manualPower(after),'m/s');
  if(gain>0){compare('Workforce',production(before),production(after),'power');compare('Crew climbing',autoSpeed(before)*mountain(before).length/100,autoSpeed(after)*mountain(after).length/100,'m/s');}
  if(kind==='upgrade'&&index===1)compare('Rollback gravity',100/(1+.2*before.upgrades[1]),100/(1+.2*after.upgrades[1]),'% of terrain',true);
  if(kind==='divine'&&index===2)compare('Earnings multiplier',1+.2*before.divine[2],1+.2*after.divine[2],'×');
  if(kind==='divine'&&index===3)compare('Defiance multiplier',2.5+.25*before.divine[3],2.5+.25*after.divine[3],'×');
  const comparison=comparisons[0],improvement=comparison?.percent===null?100:Math.abs(comparison?.percent||0);
  major||=improvement>=100;
  const strength=major?'major':improvement>=20?'meaningful':'small';
  let detail=gain>0?`+${format(gain)} workforce power`:kind==='upgrade'?UPGRADES[index].effect:kind==='divine'?['+20% manual power','+20% worker output','+20% Obol earnings','+0.25x Defiance multiplier'][index]:'Workforce improved';
  if((kind==='upgrade'&&index===0)||(kind==='divine'&&index===0))detail=`Click impulse: ${format(manualPower(before))} → ${format(manualPower(after))} m/s`;
  if(kind==='upgrade'&&index===1)detail=`Rollback gravity: ${format(100/(1+.2*before.upgrades[1]))}% → ${format(100/(1+.2*after.upgrades[1]))}% of terrain gravity`;
  if(kind==='divine'&&index===2)detail=`Obol earnings: ×${format(1+.2*before.divine[2])} → ×${format(1+.2*after.divine[2])}`;
  if(gain>0)detail+=` (${format(production(before))} → ${format(production(after))})`;
  if(crossed.length) detail+=`. Ownership bonus x${milestone(before.workers[index])} → x${milestone(after.workers[index])}.`;
  if(stageChanged)detail+=` ${EQUIPMENT[index][equipmentStage(after.workers[index])]} unlocked.`;
  return {kind:crossed.length?'milestone':'purchase',key:`${kind}:${index}`,tier:kind==='worker'||kind==='tier'?index:null,stageChanged,arrival,major,strength,comparison,comparisons,title:kind==='worker'?`${count} ${name.name} recruited`:`${typeof name==='string'?name:name.name} improved`,detail,gain,count};
}

export class FeedbackQueue {
  constructor(){this.items=[];this.seen=new Set();this.sequence=0;}
  clear(){this.items=[];}
  emit(event) {
    const id=event.id??++this.sequence;
    if(this.seen.has(id))return false;
    this.seen.add(id);if(this.seen.size>128)this.seen.delete(this.seen.values().next().value);
    if(event.kind==='prestige')this.clear();
    if(event.kind==='golden')this.items=this.items.filter(x=>x.kind!=='golden-ready');
    const message={...event,id,remaining:event.kind==='prestige'?6:4};
    if(event.comparison){this.items=this.items.filter(x=>!x.comparison);this.items.unshift(message);this.items=this.items.slice(0,4);return true;}
    // One response per bulk purchase; rapid repeats of the same card consolidate.
    const same=this.items.findIndex(x=>x.key&&x.key===event.key&&x.kind===event.kind);
    if(same>=0)this.items[same]=message;
    else {if(this.items.length>=4)this.items.splice(1,1);this.items.push(message);}
    return true;
  }
  tick(dt,paused=false){if(!paused&&this.items.length&&Number.isFinite(dt)&&dt>0){this.items[0].remaining-=Math.min(dt,.05);if(this.items[0].remaining<=0)this.items.shift();}}
  get current(){return this.items[0]??null;}
  dismiss(){this.items.shift();}
}

// Presentation clock and history are independent of authoritative game state.
export function comboTiming(snapshot,lead=0){
 const major=snapshot.major||snapshot.steps.length>=4||snapshot.total>=2*Math.max(.001,snapshot.steps[0]?.result||1);
 const rank=snapshot.jackpot||snapshot.mega?2:major?1:0,beat=.4;
 const finalAt=lead+snapshot.steps.length*beat;
 return {rank,beat,finalAt,duration:Math.max(rank===2?6.5:rank===1?5.5:4,finalAt+2.35)};
}
const signature=s=>JSON.stringify([s.eventType,s.kind,s.unit,s.total,s.steps]);
export class ComboHistory {
 constructor(){this.items=[];this.version=0;}
 record(snapshot,eventType='Divine Combo'){
  if(snapshot.steps.length<2&&!snapshot.jackpot)return;
  const item={...structuredClone(snapshot),eventType},key=signature(item);
  if(this.items[0]?.key===key)this.items[0].repeats++;
  else this.items.unshift({...item,key,repeats:1});
  this.items.length=Math.min(5,this.items.length);this.version++;
 }
}
export class ChainFeedback {
 constructor(history=null){this.history=history;this.clear();}
 clear(){this.snapshot=null;this.started=0;}
 get beat(){return .4;}
 finish(time){/* Input never fast-forwards the reading clock. */}
 start(snapshot,time,options={}){
  if(snapshot.steps.length<2)return false;
  const next={...structuredClone(snapshot),...options},timing=comboTiming(next);
  this.history?.record(next,options.eventType||'Divine Combo');
  if(this.snapshot&&time-this.started<comboTiming(this.snapshot).duration){
   if(signature(next)===signature(this.snapshot)||timing.rank<comboTiming(this.snapshot).rank)return false;
  }
  this.snapshot=next;this.started=time;return true;
 }
 view(time,reduced=false){
  if(!this.snapshot)return null;
  const timing=comboTiming(this.snapshot),age=Math.max(0,time-this.started);
  if(age>=timing.duration){this.clear();return null;}
  const index=reduced?this.snapshot.steps.length:Math.min(this.snapshot.steps.length,Math.floor(age/this.beat));
  const final=index===this.snapshot.steps.length,step=this.snapshot.steps[index],fraction=Math.min(1,(age/this.beat-index)/.8);
  const previous=index?this.snapshot.steps[index-1]?.result:this.snapshot.steps[0].result;
  const displayed=final?this.snapshot.total:previous+(step.result-previous)*(1-(1-fraction)**3);
  return {...this.snapshot,index,final,step,displayed,opacity:reduced?1:Math.min(1,(timing.duration-age)/.35)};
 }
}
