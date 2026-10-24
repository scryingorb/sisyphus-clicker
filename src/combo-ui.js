import { relicIcon } from './relic-art.js';
import { format, powerBreakdown } from './progression.js';
import { RELICS, hasRelic } from './relics.js';

export function comboSource(step){
  const label=step.label;
  const id=label.includes('Atlas')?'atlas':label.includes('Toll')?'toll':label.includes('Zeus')?'zeus':label.includes('Chronos')?'chronos':null;
  const relic=RELICS.find(r=>r.id===id);
  return {id,name:relic?.name??(step.operation==='base'?'Base':label),icon:relic?.icon??(label==='Defiance'?'↑':label==='Golden Boulder'?'◆':'◈'),reason:label.startsWith('Relic synergy')?'Matching reel symbol; equipped relic':label.includes('Atlas')?(step.operation==='add'?'4% of crew climbing speed':'During Defiance'):label.includes('Toll')?'New checkpoint · Shades only':label.includes('Chronos')?'30s passive climbing':label.includes('Zeus')?'Golden Boulder active':step.operation==='base'?label:''};
}
export const comboValue=step=>step.operation==='multiply'?`×${Number(step.value.toFixed(4))}`:step.operation==='add'?`+${format(step.value)}`:format(step.value);
export function comboRows(snapshot,index=snapshot.steps.length,compact=false){
  return snapshot.steps.map((step,i)=>{
    const source=comboSource(step);
    return `<div class="combo-row" data-operation="${step.operation}" ${i>index||compact&&i>0&&i<Math.min(index,snapshot.steps.length-1)-1?'hidden':''} ${i===index?'data-current="true"':''}><span class="combo-icon" aria-hidden="true">${source.id?relicIcon(source.id):source.icon}</span><span class="combo-source">${source.name}<small>${source.reason}</small></span><b>${comboValue(step)} <span aria-label="equals">→</span> ${format(step.result)}</b></div>`;
  }).join('');
}
export function relicCondition(s,id){
  if(!hasRelic(s,id))return s.relics.includes(id)?'Resting · activate in a free slot':'Not awakened';
  if(id==='atlas')return s.boost>0?`Active · Defiance ${Math.ceil(s.boost)}s · adds crew speed, then ×1.15`:'Equipped · build Defiance to activate';
  if(id==='toll')return s.tollRemaining>0?`Active · ×1.2 Shades · ${Math.ceil(s.tollRemaining)}s remaining`:'Equipped · reach a new 25% checkpoint';
  if(id==='zeus')return s.goldenBoost>0?`Active · Golden ${Math.ceil(s.goldenBoost)}s · ×1.65 clicks${s.boost>0?' · Defiance overrides Golden crew':' · ×1.35 crew'}`:'Equipped · automatic Golden Boulder boost';
  return s.passiveSeconds>=30?'Active · ×1.1 workforce':`Equipped · ${Math.floor(s.passiveSeconds)}/30s passive uphill`;
}
export function liveComboHTML(s){
  const equipped=RELICS.filter(r=>hasRelic(s,r.id));
  return `<p>${equipped.length?equipped.map(r=>`${relicIcon(r.id)} ${r.name}: ${relicCondition(s,r.id)}`).join('<br>'):'No relics equipped · awaken relics in Gods.'}</p>${['click','worker'].map(kind=>{
    const snapshot=powerBreakdown(s,kind);
    return `<h3>${kind==='click'?'Push impulse':'Workforce'} · ${format(snapshot.total)} ${snapshot.unit}</h3>${comboRows(snapshot)}`;
  }).join('')}<p>Live values. Permanent upgrades are included in Base. Defiance replaces the Golden workforce bonus; it does not multiply it.</p>`;
}
