export const RELICS=[
  {id:'atlas',name:'Gauntlet of Atlas',icon:'✊',at:5,cost:2500,description:'During Defiance, add 4% of current workforce climbing speed to click impulse, then ×1.15. Workers set the limit.'},
  {id:'toll',name:'Charon’s Toll',icon:'◈',at:8,cost:8000,description:'New 25/50/75/100% checkpoints give Shades ×1.2 power for 10s. Refreshes, never stacks.'},
  {id:'zeus',name:'Spark of Zeus',icon:'ϟ',at:12,cost:25000,description:'Golden Boulder improves to ×1.65 clicks and ×1.35 workforce. Defiance still takes priority.'},
  {id:'chronos',name:'Hourglass of Chronos',icon:'⌛',at:18,cost:100000,description:'After 30s of uninterrupted passive climbing, workforce gains ×1.1. A push or stopping resets it.'},
];
export const RELIC_LIMIT=2;
export function relicDefaults(){return {relics:[],activeRelics:[],tollRemaining:0,passiveSeconds:0};}
export function hasRelic(s,id){return !!s.relics?.includes(id)&&!!s.activeRelics?.includes(id);}
export function relicAvailable(s,id){const r=RELICS.find(x=>x.id===id);return !!r&&s.completedClimbs>=BigInt(r.at);}
export function acquireRelic(s,id){
  const r=RELICS.find(x=>x.id===id);
  if(!r||!relicAvailable(s,id)||s.relics.includes(id)||s.obols<r.cost)return false;
  s.obols-=r.cost;s.relics.push(id);
  if(s.activeRelics.length<RELIC_LIMIT){s.activeRelics.push(id);s.tollRemaining=0;s.passiveSeconds=0;}
  return true;
}
export function selectRelic(s,id){
  if(!s.relics.includes(id))return false;
  if(s.activeRelics.includes(id))s.activeRelics=s.activeRelics.filter(x=>x!==id);
  else {if(s.activeRelics.length>=RELIC_LIMIT)return false;s.activeRelics.push(id);}
  // Swapping cannot store or transfer a charged passive/checkpoint bonus.
  s.tollRemaining=0;s.passiveSeconds=0;return true;
}
export function atlasMultiplier(s){return hasRelic(s,'atlas')&&s.boost>0?1.15:1;}
export function shadeMultiplier(s){return hasRelic(s,'toll')&&s.tollRemaining>0?1.2:1;}
export function chronosMultiplier(s){return hasRelic(s,'chronos')&&s.passiveSeconds>=30?1.1:1;}
export function sparkClickMultiplier(s){return hasRelic(s,'zeus')&&s.goldenBoost>0?1.1:1;}
export function sparkWorkerMultiplier(s){return hasRelic(s,'zeus')&&s.goldenBoost>0?1.08:1;}
export function checkpointRelic(s,before,after){if(hasRelic(s,'toll')&&[25,50,75,100].some(n=>before<n&&after>=n))s.tollRemaining=10;}
