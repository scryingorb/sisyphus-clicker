import { WORKERS,COLLECTION,STORIES,mountain,workerUnlocked,cosmeticUnlocked,summitRewardBase,earningMultiplier,format } from './progression.js';

// Read-only projections of the exact conditions used by discover/summitReward.
// Goals are suggestions, never gates or a second reward-settlement path.
export function summitPreview(s){
  const next={...s,runSummits:s.runSummits+1},total=s.completedClimbs+1n;
  const access=WORKERS.filter((_,i)=>!workerUnlocked(s,i)&&workerUnlocked(next,i)).map(w=>w.name);
  const cosmetics=COLLECTION.filter(c=>!cosmeticUnlocked(s,c.id)&&total>=BigInt(c.at)).map(c=>c.name);
  const stories=STORIES.filter(x=>!s.discoveries.includes(x.title)&&total>=BigInt(x.at)).map(x=>x.title);
  return {obols:Math.min(1e100-s.obols,summitRewardBase(s)*earningMultiplier(s)),access,cosmetics,stories,next:mountain(next),nextReward:summitRewardBase(next)*earningMultiplier(next)};
}
export function mountainGoal(s){
  const initial=[
    {title:'Recruit your first Shade',value:s.workers[0],target:1,benefit:'A Shade climbs without clicks; pushes still help.'},
    {title:'Train an Underworld Overseer',value:s.upgrades[2],target:1,benefit:'Buying this upgrade adds 25% workforce power.'},
    {title:'Improve Stygian Bindings',value:s.tierUpgrades[0],target:1,benefit:'Buying this training adds 50% Shade power.'},
    {title:'Gather 10 Restless Shades',value:s.workers[0],target:10,benefit:'Ownership doubles Shade output and unlocks the anchored rig.'},
    {title:'Recruit a Condemned Laborer',value:s.workers[1],target:1,benefit:'Access is unlocked; recruitment still costs Obols.'},
  ];
  if(s.runSummits<5&&initial[s.runSummits].value<initial[s.runSummits].target)return initial[s.runSummits];
  const tier=WORKERS.findLastIndex((_,i)=>workerUnlocked(s,i)),owned=s.workers[tier];
  const target=[1,10,25,50,100].find(n=>n>owned);
  if(s.runSummits<5||!target){
    const checkpoint=[25,50,75,100].find(n=>n>s.highWater)||100;
    return {title:s.isResetting?'Enjoy the summit':'Reach the next mountain checkpoint',value:Math.min(checkpoint,Math.floor(s.highWater)),target:checkpoint,benefit:`Reach ${checkpoint}% of the slope. Higher ground earns Obols; completed checkpoints are kept through rollback.`};
  }
  return {title:`Gather ${target} ${WORKERS[tier].name}`,value:owned,target,benefit:target===1?'Recruit this tier to add its power.':'Ownership milestones double this tier; training and older crews also help.'};
}
export function rewardText(preview){
  return [`+${format(preview.obols)} Obols`,...preview.access.map(x=>`Purchase access: ${x}`),...preview.cosmetics.map(x=>`Cosmetic: ${x}`),...preview.stories.map(x=>`Story: ${x}`)].join('. ');
}
