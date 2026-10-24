import {baseWorkerPower} from './progression.js';
import {loadSpinBatch} from './casino-batch.js';
import {applyCasinoPush} from './simulation.js';
import {drainFreeSpins} from './casino-milestones.js';
import { casinoRewardScale } from './casino-rewards.js';
import { queueReveal, loadReveals } from './reel-presentation.js';
// Rewards are settled here, never by the cabinet animation. No stakes or purchases.
export const SYMBOLS=['lightning','laurel','coin','boulder','hourglass','flame','lyre','trident'];
export const SYMBOL_NAMES=['Zeus Lightning','Victory Laurel','Ghost Coin','Enduring Boulder','Hourglass','Golden Flame','Apollo Lyre','Poseidon Trident'];
export const FATES=[{id:'ares',name:'Ares — Strength',effect:'×1.12 manual impulse and +12% push energy for 120s'}, {id:'hermes',name:'Hermes — Prosperity',effect:'×1.08 height earnings and +8% worker energy (capped) for 120s'}, {id:'athena',name:'Athena — Strategy',effect:'×1.1 reel bursts while a relic is equipped, for 120s'}];
export function casinoDefaults(){return {spinClaims:[],freeSpinReserve:0,freeSpinsEarned:0,freeSpinNotice:"",spinBatch:null,spinEnergy:0,spins:0,spinClickCooldown:0,spinsEarned:0,activeSpins:0,holdTokens:0,held:Array(5).fill(false),lastSymbols:[],riskDecision:null,casinoSeed:311617,casinoRolls:0,casinoMountain:'',casinoMask:0,jackpotMeter:0,jackpotWins:0,fatePending:0,blessing:'',blessingRemaining:0,reelEffect:'',reelStrength:1,reelRemaining:0,casinoEvent:null,pendingReels:[],reelOverflow:{count:0,total:0}};}
export function randomCasino(s){s.casinoSeed=(Math.imul(s.casinoSeed,1664525)+1013904223)>>>0;return s.casinoSeed/4294967296;}
export const SYMBOL_WEIGHTS=Array(8).fill(.125),MEGA_ASSIST=.003;
// Eight equally weighted symbols; a disclosed 0.3% earned-spin alignment keeps Mega attainable.
export function rollSymbols(s,summit=false,interactive=false){
 let symbols=Array.from({length:5},()=>{let n=randomCasino(s);return SYMBOLS.find((_,i)=>(n-=SYMBOL_WEIGHTS[i])<0)||SYMBOLS.at(-1);});
 if(interactive&&randomCasino(s)<MEGA_ASSIST)symbols=Array(5).fill(symbols[0]);
 return symbols;
}
export const COMBINATIONS={unmatched:{label:'No match',factor:.65},pair:{label:'One pair',factor:3},twoPair:{label:'Two pair',factor:6},triple:{label:'Three of a kind',factor:10},fullHouse:{label:'Full house',factor:16},four:{label:'Four of a kind',factor:28},five:{label:'Five of a kind',factor:48}};
export function classifyRoll(symbols){
 const groups=SYMBOLS.map(symbol=>({symbol,count:symbols.filter(x=>x===symbol).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count);
 const {symbol,count}=groups[0]||{symbol:'laurel',count:1};
 const kind=count===5?'five':count===4?'four':count===3?(groups[1]?.count===2?'fullHouse':'triple'):count===2?(groups[1]?.count===2?'twoPair':'pair'):'unmatched';
 // Explicit compatibility for already-settled three-reel records and old integrations.
 const special=symbols.length===3&&count===1&&['lightning','coin','hourglass'].every(x=>symbols.includes(x));
 return {symbol,count,kind,label:COMBINATIONS[kind].label,special,factor:symbols.length===3?(count===3?4:count===2?2:special?1.5:1):COMBINATIONS[kind].factor,matched:groups.filter(x=>x.count>=2).map(x=>x.symbol)};
}
export function casinoBonuses(s,kind){
  if(s.casinoDisabled)return [];
  const bonuses=[];
  if(s.reelRemaining>0&&s.reelEffect===kind)bonuses.push(['Divine Reels',s.reelStrength]);
  if(s.blessingRemaining>0&&s.blessing==='ares'&&kind==='click')bonuses.push(['Ares blessing',1.12]);
  if(s.blessingRemaining>0&&s.blessing==='hermes'&&kind==='earn')bonuses.push(['Hermes blessing',1.08]);
  return bonuses;
}
export function casinoFactor(s,kind){return casinoBonuses(s,kind).reduce((n,[,factor])=>n*factor,1);}
export function tickCasino(s,dt){s.reelRemaining=Math.max(0,(s.reelRemaining||0)-dt);s.blessingRemaining=Math.max(0,(s.blessingRemaining||0)-dt);}
export function chooseFate(s,id){if(!s.fatePending||!FATES.some(x=>x.id===id)||s.blessingRemaining>0)return false;s.fatePending--;s.blessing=id;s.blessingRemaining=120;return true;}
function award(s,amount){s.obols=Math.min(1e100,s.obols+amount);s.earned=Math.min(1e100,s.earned+amount);}
export function resolveReel(s,symbols,base,summit=false,interactive=false){
  const outcome=classifyRoll(symbols),equipped=id=>s.relics?.includes(id)&&s.activeRelics?.includes(id);
  const relic=outcome.matched.map(symbol=>({lightning:'zeus',coin:'toll',boulder:'atlas',hourglass:'chronos'}[symbol])).find(id=>id&&equipped(id))||(outcome.special&&equipped('zeus')?'zeus':'');
  const synergy=relic&&(outcome.count>1||outcome.special)?1.15:1;
  const strategy=s.blessingRemaining>0&&s.blessing==='athena'&&s.activeRelics.length?1.1:1;
  const steps=[{label:'Mountain reward base',operation:'base',value:base,result:base}];let total=base;
  const relicName={atlas:'Gauntlet of Atlas',toll:'Charon’s Toll',zeus:'Spark of Zeus',chronos:'Hourglass of Chronos'}[relic];
  for(const [label,factor] of [[symbols.length===5?outcome.label:'Divine Reels',outcome.factor],[relic?`Relic synergy · ${relicName}`:'Relic synergy',synergy],['Athena blessing',strategy]])if(factor!==1){total*=factor;steps.push({label,operation:'multiply',value:factor,result:total});}
  award(s,total);
  let effect='',duration=0;
  if(outcome.count>1||outcome.special){
    effect=outcome.symbol==='lightning'||outcome.symbol==='boulder'?'click':outcome.symbol==='coin'||outcome.symbol==='hourglass'?'worker':'earn';
    const strength=outcome.symbol==='hourglass'?(outcome.count>=3?1.12:1.08):(outcome.count>=3?1.2:1.1);
    duration=outcome.symbol==='hourglass'?30:12;
    // One temporary effect: a new roll replaces it, never extends or multiplies a stack.
    s.reelEffect=effect;s.reelStrength=strength;s.reelRemaining=duration;
  }
  s.casinoRolls++;s.jackpotMeter+=interactive?1:summit?10:5;let jackpot=0;
  if(s.jackpotMeter>=100){s.jackpotMeter-=100;s.jackpotWins++;jackpot=Math.max(base*20,casinoRewardScale(s).base*10);award(s,jackpot);}
  if(s.casinoBatchCollect&&s.spinBatch)s.spinBatch.jackpot+=jackpot;
  if(summit&&(s.runSummits+1)%5===0)s.fatePending=Math.min(Number.MAX_SAFE_INTEGER,s.fatePending+1);
  const mega=interactive&&symbols.length===5&&outcome.count===5;if(mega){s.reelEffect='earn';s.reelStrength=1.2;s.reelRemaining=20;effect='earn';duration=20;}
  const event={mega,id:s.casinoRolls,symbols:[...symbols],summit,...outcome,combination:outcome.kind,relic:synergy>1?relic:'',total,jackpot,effect,duration,strength:effect?s.reelStrength:1,steps,unit:'Obols',kind:'reward'};
  s.casinoEvent=event;if(!s.casinoOffline&&!s.casinoBatchCollect)queueReveal(s,event);return event;
}
export function casinoCheckpoints(s,before,after,fullMountainValue){
  if(s.casinoDisabled||s.runSummits<3)return [];
  const token=String(s.completedClimbs);
  if(s.casinoMountain!==token){s.casinoMountain=token;s.casinoMask=0;}
  const events=[];
  for(const [i,mark] of [25,50,75,100].entries())if(before<mark&&after>=mark&&!(s.casinoMask&(1<<i))){
    s.casinoMask|=1<<i;
    const rolled=rollSymbols(s,mark===100);
    const symbols=s.casinoTestLuck==='poor'?['lightning','laurel','coin','boulder','hourglass']:s.casinoTestLuck==='good'?['coin','coin','coin','coin','coin']:rolled;
    events.push(resolveReel(s,symbols,fullMountainValue*.002,mark===100));
    if(!s.casinoOffline)earnSpinEnergy(s,mark===100?30:15);
  }
  return events;
}
export function loadCasino(s,data){
  const number=(v,max)=>Number.isFinite(v)&&v>=0?Math.min(max,v):0;
  s.casinoSeed=Number.isInteger(data.casinoSeed)?data.casinoSeed>>>0:311617;
  for(const key of ['casinoRolls','jackpotWins','fatePending'])s[key]=Math.floor(number(data[key],Number.MAX_SAFE_INTEGER));
  s.jackpotMeter=number(data.jackpotMeter,99);s.casinoMask=Math.floor(number(data.casinoMask,15));
  s.casinoMountain=typeof data.casinoMountain==='string'&&/^\d{1,100}$/.test(data.casinoMountain)?data.casinoMountain:'';
  s.blessing=FATES.some(x=>x.id===data.blessing)?data.blessing:'';s.blessingRemaining=s.blessing?number(data.blessingRemaining,120):0;
  s.reelEffect=['click','worker','earn'].includes(data.reelEffect)?data.reelEffect:'';s.reelRemaining=s.reelEffect?number(data.reelRemaining,30):0;s.reelStrength=Math.max(1,number(data.reelStrength,1.2));
  // Historical presentations are not replayed on load; the reward was already credited.
  s.casinoEvent=null;
  loadReveals(s,data);
  s.spinEnergy=number(data.spinEnergy,100);s.spins=Math.floor(number(data.spins,Number.MAX_SAFE_INTEGER));s.spinClickCooldown=number(data.spinClickCooldown,1);
  for(const key of ['spinsEarned','activeSpins'])s[key]=Math.floor(number(data[key],Number.MAX_SAFE_INTEGER));
  loadSpinBatch(s,data);
  earnSpinEnergy(s,0,true);
  s.holdTokens=0;s.held=Array(5).fill(false);
  s.lastSymbols=Array.isArray(data.lastSymbols)&&[3,5].includes(data.lastSymbols.length)&&data.lastSymbols.every(x=>SYMBOLS.includes(x))?[...data.lastSymbols]:[];
  // Removed choice: preserve an old pending bonus at its guaranteed BANK value once.
  s.riskDecision=null;const pending=number(data.riskDecision?.bonus,1e100);if(pending>0)award(s,pending);

}

// Energy is earned, never purchased. Existing checkpoint payouts are unchanged.
export function earnSpinEnergy(s,amount,migrate=false){
 if((s.runSummits<3&&migrate!==true)||s.casinoDisabled||!Number.isFinite(amount)||amount<0)return;
 const energy=Math.min(Number.MAX_SAFE_INTEGER,s.spinEnergy+amount),earned=Math.floor(energy/100);
 s.spinEnergy=energy%100;s.spins=Math.min(Number.MAX_SAFE_INTEGER,s.spins+earned);
 s.spinsEarned=Math.min(Number.MAX_SAFE_INTEGER,(s.spinsEarned||0)+earned);
}
export function clickSpinEnergy(s){return Math.min(12,4*(1+.12*s.upgrades[0])*(1+.08*s.divine[0]))*(s.boost>0?1.5:1)*(s.blessing==='ares'&&s.blessingRemaining>0?1.12:1);}
export function workerSpinEnergy(s){
 const power=s.workers.reduce((n,_,i)=>n+baseWorkerPower(s,i),0);
 return power>0?(.15+.15*Math.log2(1+power))*(s.blessing==='hermes'&&s.blessingRemaining>0?1.08:1):0;
}
// Called only after the session accepts a push (125 ms cooldown, no paused/reset input).
export function spinPush(s){earnSpinEnergy(s,clickSpinEnergy(s));}
export const OFFLINE_SPIN_FACTOR=.25;
export function spinProduction(s,dt){earnSpinEnergy(s,dt*workerSpinEnergy(s)*(s.casinoOffline?OFFLINE_SPIN_FACTOR:1));}
export function spinEarned(s,batch=false){
 if(s.casinoDisabled||s.runSummits<3||s.spins<1||s.isResetting||(s.spinBatch&&!batch))return null;
 const rewardScale=casinoRewardScale(s);if(!(rewardScale.base>0))return null;
 s.spins--;s.activeSpins++;
 const symbols=rollSymbols(s,false,true);
 // Simulation stress cases only; this flag is never loaded from player saves.
 if(s.casinoTestLuck==='poor')symbols.splice(0,5,'lightning','laurel','coin','boulder','hourglass');else if(s.casinoTestLuck==='good')symbols.fill('coin');
 const heldMask=Array(5).fill(false);s.held=heldMask;s.holdTokens=0;s.riskDecision=null;s.lastSymbols=[...symbols];
 const event=resolveReel(s,symbols,rewardScale.base,false,true);event.held=heldMask;event.rewardScale=rewardScale;
 event.push=applyCasinoPush(s,event.total+event.jackpot,rewardScale.fullValue);s.casinoEvent=event;
 const queued=s.pendingReels.find(e=>e.id===event.id);if(queued)Object.assign(queued,{held:heldMask,rewardScale:structuredClone(rewardScale),push:structuredClone(event.push)});
 drainFreeSpins(s);earnSpinEnergy(s,0);return event;
}
let oddsCache;
export function reelOdds(){
 if(oddsCache)return {...oddsCache};
 const result=Object.fromEntries(Object.keys(COMBINATIONS).map(k=>[k,0]));
 function visit(out,chance){if(out.length===5){result[classifyRoll(out).kind]+=chance*(1-MEGA_ASSIST);return;}
 SYMBOLS.forEach((symbol,n)=>visit([...out,symbol],chance*SYMBOL_WEIGHTS[n]));}
 visit([],1);result.five+=MEGA_ASSIST;result.mega=result.five;oddsCache=result;return {...result};
}
