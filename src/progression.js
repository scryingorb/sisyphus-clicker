// All economic tuning lives here. Height remains normalized to 0..100 for the renderer.
export const BALANCE = { heightObols: .65, summitObols: 24, offlineCap: 28800, clickInterval: .125, defianceClicks: 12, defianceDuration: 12, defianceCooldown: 60, defianceMultiplier: 2.5, manualImpulse: 4.8, manualWithWorkers: .2, prestigeAt: 28, prestigeFavor: 8, lengthGrowth: 1.15, resistanceGrowth: .10, maxOwned: 1000, maxValue: 1e100 };
export const WORKERS = [
  { name: 'Restless Shades', description: 'Forgotten hands pull an unbreakable rope.', cost: 65, power: 1.2, growth: 1.13, unlock: 0 },
  { name: 'Condemned Laborers', description: 'Shared punishment becomes shared purpose.', cost: 900, power: 8, growth: 1.145, unlock: 4 },
  { name: 'Bronze Automatons', description: 'Bronze sinews never tire.', cost: 6000, power: 80, growth: 1.16, unlock: 10 },
  { name: 'Engines of Hephaestus', description: 'Stolen divine machinery turns against fate.', cost: 40000, power: 900, growth: 1.175, unlock: 17 },
];
export const UPGRADES = [
  { name: 'Calloused Hands', cost: 20, growth: 1.65, effect: '+25% manual impulse per level' },
  { name: 'Bronze Cleats', cost: 30, growth: 1.75, effect: 'Gravity divided by 1 + 0.2 × level' },
  { name: 'Underworld Overseer', cost: 150, growth: 2.05, effect: '+25% workforce per level' },
];
export const DIVINE = ['Titan Grip', 'Eternal Workforce', 'Charon’s Bargain', 'Unbroken Defiance'];
export const TIER_UPGRADES = [
  {name:'Stygian Bindings',cost:200,growth:2.6},
  {name:'Hauling Discipline',cost:2500,growth:2.8},
  {name:'Precision Gearing',cost:16000,growth:3},
  {name:'Divine Bellows',cost:100000,growth:3.2},
];
export const EQUIPMENT = [
  ['Spectral rope','Anchored hauling rig','Glowing chain mechanism'],
  ['Wooden supports','Reinforced winch','Bronze hauling assembly'],
  ['Basic gearing','Large transmission','Mechanical rig'],
  ['Small furnace','Reinforced boiler','Divine forge'],
];
export const CROSS_TIERS = [
  {source:1,target:0,every:10,bonus:.35},
  {source:2,target:1,every:5,bonus:.6},
  {source:3,target:2,every:3,bonus:.5},
];
export function equipmentStage(owned) { return owned>=25?2:owned>=10?1:0; }
export function crossBonus(s,i) { return 1+CROSS_TIERS.filter(x=>x.target===i).reduce((sum,x)=>sum+Math.floor(s.workers[x.source]/x.every)*x.bonus,0); }
export function crossDescription(i) { const x=CROSS_TIERS.find(x=>x.source===i); return x?`Every ${x.every} ${WORKERS[i].name} adds ${x.bonus*100}% to ${WORKERS[x.target].name} output. Bonuses add within this link, then multiply other bonuses.`:`Shades receive +${CROSS_TIERS[0].bonus*100}% output per ${CROSS_TIERS[0].every} Laborers (additive within this link).`; }
function purchaseArray(s,kind) { return kind==='worker'?s.workers:kind==='tier'?s.tierUpgrades:s.upgrades; }
// Preview and buying share quote(), purchaseArray() and production(). No cached bonuses.
export function purchasePreview(s,kind,i,q=1) {
  const offer=quote(s,kind,i,q);
  const next={...s,workers:[...s.workers],upgrades:[...s.upgrades],tierUpgrades:[...s.tierUpgrades]};
  if(offer.count) purchaseArray(next,kind)[i]+=offer.count;
  return {...offer, gain:production(next)-production(s), speedGain:autoSpeed(next)-autoSpeed(s)};
}
export const ENVIRONMENTS = [
  { name: 'The Condemned Slope', resistance: 1, gravity: 1, sky: '#10191e', tint: '#263637', effect: 'Ordinary gravity. Learn the weight.' },
  { name: 'The Ashen Ascent', resistance: 1.04, gravity: 1.15, sky: '#251919', tint: '#594035', effect: 'Ash: 15% stronger gravity, 4% resistance.' },
  { name: 'The Chainbound Peaks', resistance: 1.08, gravity: 1.1, sky: '#141624', tint: '#37354b', effect: 'Chains: 8% resistance, 10% stronger gravity.' },
  { name: 'The Frozen Heights', resistance: 1.06, gravity: 1.4, sky: '#162a36', tint: '#55757b', effect: 'Ice: 40% stronger rollback. Cleats help.' },
  { name: 'The Storm of Olympus', resistance: 1.12, gravity: 1.25, sky: '#211d31', tint: '#595169', effect: 'Headwinds: 12% resistance, 25% stronger gravity.' },
];
export const COLLECTION = [
  { id: 'stone', kind: 'boulder', name: 'Ancient Stone', at: 0 },
  { id: 'obsidian', kind: 'boulder', name: 'Obsidian Heart', at: 1 },
  { id: 'gold', kind: 'boulder', name: 'Sunken Gold', at: 14 },
  { id: 'linen', kind: 'outfit', name: 'Worn Linen', at: 0 },
  { id: 'ash', kind: 'outfit', name: 'Ashen Mantle', at: 4 },
  { id: 'royal', kind: 'outfit', name: 'Defiant Purple', at: 22 },
];
export const STORIES = [
  { at: 1, title: 'Charon', text: '“An obol earned, not begged. Perhaps you are learning.”' },
  { at: 3, title: 'Persephone', text: '“Even here, something can grow. Look at all those hands.”' },
  { at: 8, title: 'Hades', text: '“You may begin again. You will not return unchanged.”' },
  { at: 18, title: 'Hephaestus', text: '“A machine is only as eternal as the will that drives it.”' },
];
export function progressionDefaults() { return { schema: 5, unlockedCosmetics: ['stone','linen'], legacyEnvironmentCycle: false, workerUnlocks: [true,false,false,false], prestigeThreshold: BALANCE.prestigeAt, tierUpgrades: [0,0,0,0], defianceCooldown: 0, obols: 0, workers: [0,0,0,0], upgrades: [0,0,0], divine: [0,0,0,0], favor: 0, lifetimeFavor: 0, runSummits: 0, bestRun: 0, highWater: 0, earned: 0, defiance: 0, boost: 0, clickCooldown: 0, lastSeen: 0, returnRemaining: 0, cosmetics: ['stone','linen'], discoveries: [], achievements: [] }; }
export const OPENING_DISTANCES = [235,400,1300,4000,7500];
export function mountain(s) {
  const n=s.runSummits,environment=n%5,base=ENVIRONMENTS[environment],penalty=Math.min(1,n/12);
  const beyond=Math.max(0,n-4);
  const length=n<5?OPENING_DISTANCES[n]:Math.min(1e90,7500*(1+.28*beyond+.035*beyond*beyond)*1.12**Math.min(beyond,1000));
  const gravity=1+(base.gravity-1)*penalty, terrain=1+(base.resistance-1)*penalty;
  return {...base,environment,length,gravity,resistance:terrain*(1+.05*n*n+.18*beyond*beyond),cycle:Math.floor(n/5)+1,
    effect:environment===0?'Firm stone. Workers hold the load; clicks add momentum.':`${base.name}: ${Math.round((gravity-1)*10000)/100}% extra gravity, ${Math.round((terrain-1)*10000)/100}% terrain resistance. ${n<12?'Environmental penalties grow gently through mountain 13.':'Full environmental strength.'}`};
}
export function heightRate(s) { const n=s.runSummits;return n<5?[105,180,300,500,800][n]/mountain(s).length:Math.min(BALANCE.heightObols,.2+.05*(n-4)); }
export function milestone(n) { return 2 ** [10,25,50,100].filter(x=>n>=x).length; }
export function workerPower(s,i) { return WORKERS[i].power*s.workers[i]*milestone(s.workers[i])*(1+.25*s.upgrades[2])*(1+.2*s.divine[1])*(1+.5*s.tierUpgrades[i])*crossBonus(s,i); }
export function production(s) { return WORKERS.reduce((v,_,i)=>v+workerPower(s,i),0)*(s.boost>0?BALANCE.defianceMultiplier+.25*s.divine[3]:1); }
export function earningMultiplier(s) { return 1+.2*s.divine[2]; }
export function autoSpeed(s) { const m=mountain(s); return Math.min(12,production(s)/m.resistance*100/m.length); }
export function credit(s,n) { n=Math.max(0,n)*earningMultiplier(s); s.obols=Math.min(BALANCE.maxValue,s.obols+n); s.earned=Math.min(BALANCE.maxValue,s.earned+n); }
export function quote(s,kind,i,quantity=1) {
  const config=kind==='worker'?WORKERS:kind==='tier'?TIER_UPGRADES:kind==='upgrade'?UPGRADES:[], item=config[i];
  if(!item) return { count:0, cost:Infinity, reason:'Unknown purchase' };
  const owned=purchaseArray(s,kind)[i];
  if(kind==='tier'&&!s.workers[i]) return {count:0,cost:item.cost,reason:'Own this worker first'};
  if(kind==='worker'&&!workerUnlocked(s,i)) return {count:0,cost:Infinity,reason:`Reach ${item.unlock} summits this run`};
  const limit=kind==='worker'?BALANCE.maxOwned:kind==='tier'?10:100;
  let count=0,cost=0; const requested=quantity==='max'?limit:quantity;
  if(![1,10,'max'].includes(quantity)) return {count:0,cost:Infinity,reason:'Invalid quantity'};
  while(count<requested && owned+count<limit) {
    const next=Math.ceil(item.cost*item.growth**(owned+count));
    if(quantity==='max'&&cost+next>s.obols) break;
    cost+=next; count++;
  }
  if(!count) return {count:0,cost:0,reason:owned>=limit?'Maximum level reached':'Not enough Obols'};
  return {count,cost,reason:cost>s.obols?`Need ${format(cost-s.obols)} more Obols`:''};
}
export function buy(s,kind,i,q=1) { const offer=quote(s,kind,i,q); if(!offer.count||offer.reason) return false; s.obols-=offer.cost; purchaseArray(s,kind)[i]+=offer.count; return true; }
export function workerUnlocked(s,i) { return !!s.workerUnlocks?.[i]||s.runSummits>=WORKERS[i].unlock||s.workers[i]>0; }
export function prestigeRequirement(s) { return s.prestigeThreshold||BALANCE.prestigeAt; }
export function cosmeticUnlocked(s,id) { return s.unlockedCosmetics?.includes(id)||COLLECTION.some(c=>c.id===id&&s.completedClimbs>=BigInt(c.at)); }
export function discover(s) {
  s.unlockedCosmetics=COLLECTION.filter(c=>cosmeticUnlocked(s,c.id)).map(c=>c.id);
  s.workerUnlocks=WORKERS.map((_,i)=>workerUnlocked(s,i));
  const total=Number(s.completedClimbs);
  for(const story of STORIES) if(total>=story.at&&!s.discoveries.includes(story.title)) s.discoveries.push(story.title);
  for(const [at,name] of [[1,'First Summit'],[5,'Gods Take Notice'],[10,'Eternal Ascent']]) if(total>=at&&!s.achievements.includes(name)) s.achievements.push(name);
}
export function summitRewardBase(s) { const n=s.runSummits;return BALANCE.summitObols*(1+n*.35+.06*n**3); }
export function summitReward(s) {
  credit(s,summitRewardBase(s)); s.runSummits++; s.bestRun=Math.max(s.bestRun,s.runSummits); s.highWater=0; discover(s);
}
export function favorGain(s) { const at=prestigeRequirement(s);return s.runSummits<at?0:Math.floor((s.runSummits/at)**1.5*BALANCE.prestigeFavor); }
export function prestige(s) {
  const gain=favorGain(s); if(!gain) return false;
  Object.assign(s,{legacyEnvironmentCycle:false,workerUnlocks:[true,false,false,false],prestigeThreshold:BALANCE.prestigeAt,obols:0,workers:[0,0,0,0],tierUpgrades:[0,0,0,0],defianceCooldown:0,upgrades:[0,0,0],runSummits:0,highWater:0,climbPushes:0,boulderVelocity:0,isResetting:false,returnRemaining:0,defiance:0,boost:0,clickCooldown:0,timeSincePush:.35});
  s.favor+=gain; s.lifetimeFavor+=gain; return true;
}
export function buyDivine(s,i) { if(!Number.isInteger(i)||i<0||i>3||s.divine[i]>=100) return false; const cost=2**(s.divine[i]+1); if(s.favor<cost) return false; s.favor-=cost; s.divine[i]++; return true; }
export function format(n) { return n>0&&n<.01?'<0.01':n<1e6?(Math.floor(n*100)/100).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}):n.toExponential(3); }
