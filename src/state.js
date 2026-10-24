import {loadSpinMilestones} from './casino-milestones.js';
import { loadCasino } from './casino.js';
import { RELICS, RELIC_LIMIT } from './relics.js';
import { clickImpulse, ROLLBACK_DELAY } from './physics.js';
import { GOLDEN } from './golden.js';
import { progressionDefaults, BALANCE, discover, summitReward, WORKERS, cosmeticUnlocked, COLLECTION, STORIES, ACHIEVEMENTS } from './progression.js';

export const PUSHES_PER_CLIMB = 100;
// Keep the original storage key so the name correction preserves existing saves.
export const SAVE_KEY = 'sysyphus-clicker-v1';
export function newState() { return { ...progressionDefaults(), totalPushes: 0n, climbPushes: 0, completedClimbs: 0n, isResetting: false, boulderVelocity: 0, timeSincePush: ROLLBACK_DELAY }; }
export function loadState(storage) {
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (!data) return newState();
    const totalPushes = BigInt(data.totalPushes), completedClimbs = BigInt(data.completedClimbs);
    if (totalPushes < 0n || completedClimbs < 0n || !Number.isFinite(data.climbPushes) || data.climbPushes < 0 || data.climbPushes > PUSHES_PER_CLIMB) return newState();
    const s={ ...newState(), totalPushes, completedClimbs, climbPushes: data.climbPushes, isResetting: data.climbPushes === PUSHES_PER_CLIMB };
    if(data.settings&&typeof data.settings.muted==='boolean'&&typeof data.settings.reducedMotion==='boolean'&&Number.isFinite(data.settings.volume)) s.settings={muted:data.settings.muted,reducedMotion:data.settings.reducedMotion,volume:Math.max(0,Math.min(1,data.settings.volume))};
    if(s.settings&&Number.isFinite(data.settings.sfxVolume))s.settings.sfxVolume=Math.max(0,Math.min(1,data.settings.sfxVolume));
    const number=(v,max=BALANCE.maxValue)=>Number.isFinite(v)&&v>=0?Math.min(max,v):0;
    if(data.schema>=2) {
      s.relics=RELICS.filter(r=>Array.isArray(data.relics)&&data.relics.includes(r.id)).map(r=>r.id);
      s.activeRelics=s.relics.filter(id=>Array.isArray(data.activeRelics)&&data.activeRelics.includes(id)).slice(0,RELIC_LIMIT);
      s.tollRemaining=s.activeRelics.includes('toll')?number(data.tollRemaining,10):0;
      s.passiveSeconds=s.activeRelics.includes('chronos')?number(data.passiveSeconds,30):0;
      for(const [key,cap] of [['goldenCooldown',GOLDEN.maxCooldown],['goldenWindow',GOLDEN.window],['goldenBoost',GOLDEN.duration]])if(Number.isFinite(data[key]))s[key]=number(data[key],cap);
      s.goldenSeed=Math.floor(number(data.goldenSeed,4294967295))||GOLDEN.seed;
      s.goldenClaims=Math.floor(number(data.goldenClaims,Number.MAX_SAFE_INTEGER));
      if(s.goldenBoost>0)s.goldenWindow=0;
      for(const key of ['obols','favor','lifetimeFavor','earned','lifetimeDistance']) s[key]=number(data[key]);
      for(const key of ['runSummits','bestRun']) s[key]=Math.floor(number(data[key],1e6));
      for(const [key,size,max] of [['workers',4,1000],['tierUpgrades',4,10],['upgrades',3,100],['divine',4,100]]) s[key]=Array.from({length:size},(_,i)=>Math.floor(number(data[key]?.[i],max)));
      s.legacyEnvironmentCycle=data.schema<4||data.legacyEnvironmentCycle===true;
      // Preserve thresholds earned in the old run, including unlocked but unbought tiers.
      s.workerUnlocks=WORKERS.map((w,i)=>s.workers[i]>0||s.runSummits>=w.unlock||(data.schema<4?s.runSummits>=[0,1,3,5][i]:data.workerUnlocks?.[i]===true));
      s.prestigeThreshold=(data.schema<4?s.runSummits>=15:data.prestigeThreshold===15)?15:BALANCE.prestigeAt;
      s.highWater=Math.max(s.climbPushes,number(data.highWater,100));
      s.lastSeen=number(data.lastSeen,8.64e15);
      s.defiance=Math.floor(number(data.defiance,BALANCE.defianceClicks-1)); s.boost=number(data.boost,BALANCE.defianceDuration);
      s.defianceCooldown=Math.max(s.boost,number(data.defianceCooldown,BALANCE.defianceCooldown));
      s.clickCooldown=number(data.clickCooldown,BALANCE.clickInterval);
      s.returnRemaining=s.isResetting?Math.max(.001,number(data.returnRemaining,2.9)||2.9):0;
      s.discoveries=STORIES.filter(x=>Array.isArray(data.discoveries)&&data.discoveries.includes(x.title)).map(x=>x.title);
      s.achievements=ACHIEVEMENTS.map(a=>a.name).filter(x=>Array.isArray(data.achievements)&&data.achievements.includes(x));
      s.unlockedCosmetics=COLLECTION.filter((c,i)=>data.unlockedCosmetics?.includes(c.id)||completedClimbs>=BigInt(data.schema<5?[0,1,5,0,2,8][i]:c.at)).map(c=>c.id);
      if(data.schema<5)for(const [i,story] of STORIES.entries())if(completedClimbs>=BigInt([1,3,5,10][i])&&!s.discoveries.includes(story.title))s.discoveries.push(story.title);
      s.cosmetics=s.cosmetics.map((fallback,i)=>COLLECTION.some(x=>x.id===data.cosmetics?.[i]&&x.kind===(i?'outfit':'boulder')&&cosmeticUnlocked(s,x.id))?data.cosmetics[i]:fallback);
    } else {
      // Preserve legacy height/counters; start the new economy on its introductory slope.
      s.highWater=s.climbPushes;
    }
    if(!data.schema){
      s.unlockedCosmetics=COLLECTION.filter((c,i)=>completedClimbs>=BigInt([0,1,5,0,2,8][i])).map(c=>c.id);
      s.discoveries=STORIES.filter((story,i)=>completedClimbs>=BigInt([1,3,5,10][i])).map(story=>story.title);
    }
    loadCasino(s,data);
    loadSpinMilestones(s,data);
    discover(s); return s;
  } catch { return newState(); }
}
export function saveState(storage, state, now = Date.now()) {
  now=Math.max(state.lastSeen||0,Number.isFinite(now)?now:Date.now());
  try { storage.setItem(SAVE_KEY, JSON.stringify({ ...state, schema:7, lastSeen:now, totalPushes: String(state.totalPushes), completedClimbs: String(state.completedClimbs) })); state.lastSeen=now; return true; } catch { return false; }
}
export function pushState(state) {
  if (state.isResetting) return false;
  state.totalPushes += 1n;
  clickImpulse(state);
  return true;
}
export function finishClimb(state) {
  if (!state.isResetting) return;
  state.completedClimbs += 1n;
  summitReward(state);
  state.climbPushes = 0;
  state.isResetting = false;
  state.boulderVelocity = 0;
  state.timeSincePush = ROLLBACK_DELAY;
  state.returnRemaining = 0;
}
