import { WORKERS, UPGRADES, TIER_UPGRADES, DIVINE, EQUIPMENT, equipmentStage, milestone, production, format } from './progression.js';

// Presentation-only events. Never calls buy(), credit(), prestige() or save().
export function purchaseFeedback(before,after,kind,index,count) {
  const gain=production(after)-production(before);
  const crossed=kind==='worker'?[10,25,50,100].filter(n=>before.workers[index]<n&&after.workers[index]>=n):[];
  const stageChanged=kind==='worker'&&equipmentStage(after.workers[index])>equipmentStage(before.workers[index]);
  const name=(kind==='worker'?WORKERS:kind==='tier'?TIER_UPGRADES:kind==='divine'?DIVINE:UPGRADES)[index];
  let detail=gain>0?`+${format(gain)} workforce power`:kind==='upgrade'?UPGRADES[index].effect:kind==='divine'?['+20% manual power','+20% worker output','+20% Obol earnings','+0.25x Defiance multiplier'][index]:'Workforce improved';
  if(crossed.length) detail+=`. Ownership bonus x${milestone(before.workers[index])} → x${milestone(after.workers[index])}.`;
  if(stageChanged)detail+=` ${EQUIPMENT[index][equipmentStage(after.workers[index])]} unlocked.`;
  return {kind:crossed.length?'milestone':'purchase',key:`${kind}:${index}`,tier:kind==='worker'||kind==='tier'?index:null,stageChanged,title:kind==='worker'?`${count} ${name.name} recruited`:`${typeof name==='string'?name:name.name} improved`,detail,gain,count};
}

export class FeedbackQueue {
  constructor(){this.items=[];this.seen=new Set();this.sequence=0;}
  clear(){this.items=[];}
  emit(event) {
    const id=event.id??++this.sequence;
    if(this.seen.has(id))return false;
    this.seen.add(id);if(this.seen.size>128)this.seen.delete(this.seen.values().next().value);
    if(event.kind==='prestige')this.clear();
    const message={...event,id,remaining:event.kind==='prestige'?6:4};
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
