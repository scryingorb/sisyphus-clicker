import { advanceProgress } from './simulation.js';
import { quote, WORKERS, UPGRADES, TIER_UPGRADES, format } from './progression.js';

export const FORECAST_SECONDS=300;
export function timeLabel(seconds) {
  const n=Math.ceil(seconds);return n<60?`${n}s`:`${Math.floor(n/60)}m ${n%60}s`;
}
// One bounded forward projection serves the whole visible shop. It uses the
// live integrator, including rollback, high water, summit rewards and expiry.
// No speculative clicks, purchases, or future bonus events are assumed.
export function purchaseForecasts(s,quantity=1,paused=false) {
  const entries=[];
  for(const [kind,items] of [['worker',WORKERS],['upgrade',UPGRADES],['tier',TIER_UPGRADES]])items.forEach((_,i)=>{
    let offer=quote(s,kind,i,quantity),single=false;
    if(quantity==='max'&&!offer.count&&offer.reason==='Not enough Obols'){offer=quote(s,kind,i,1);single=true;}
    const available=offer.count>0&&Number.isFinite(offer.cost);
    entries.push({key:`${kind}:${i}`,cost:offer.cost,seconds:null,single,
      text:!available?'Unavailable':offer.cost<=s.obols?'Ready':paused?'Paused':!s.workers.some(Boolean)?'Keep pushing — no idle income':null});
  });
  const pending=entries.filter(x=>x.text===null);
  if(pending.length){
    const projection=structuredClone(s);
    for(let step=1;step<=FORECAST_SECONDS*10&&pending.length;step++){
      advanceProgress(projection,.1);
      for(let i=pending.length-1;i>=0;i--)if(projection.obols>=pending[i].cost){
        const item=pending[i];item.seconds=step/10;item.text=`~${timeLabel(item.seconds)} idle`;pending.splice(i,1);
      }
    }
    for(const item of pending)item.text='Over 5m idle';
  }
  return new Map(entries.map(x=>[x.key,{...x,text:(x.single?'Next single: ':'')+x.text}]));
}
export function benefitText(p) {
  const lines=[];
  if(p.afterClickEnergy>p.beforeClickEnergy)lines.push(`Spin Energy / push: ${format(p.beforeClickEnergy)} -> ${format(p.afterClickEnergy)}`);
  if(p.afterWorkerEnergy>p.beforeWorkerEnergy)lines.push(`Passive energy / sec: ${format(p.beforeWorkerEnergy)} -> ${format(p.afterWorkerEnergy)}`);
  if(p.gain>0)lines.push(`Workforce: ${format(p.beforePower)} → ${format(p.afterPower)} power (+${format(p.gain)})`);
  if(p.afterClick!==p.beforeClick)lines.push(`Click impulse: ${format(p.beforeClick)} → ${format(p.afterClick)} m/s (${p.afterClick>=p.beforeClick?'+':''}${format((p.afterClick/p.beforeClick-1)*100)}%)`);
  if(p.afterGravity!==p.beforeGravity)lines.push(`Rollback gravity: ${format(p.beforeGravity*100)}% → ${format(p.afterGravity*100)}% of terrain gravity`);
  if(p.afterIncome!==p.beforeIncome)lines.push(`Steady new-height income: ${format(p.beforeIncome)} → ${format(p.afterIncome)} Obols/s`);
  return lines;
}
