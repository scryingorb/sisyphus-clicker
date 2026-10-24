export const GOLDEN={first:75,minCooldown:150,maxCooldown:240,window:30,duration:20,clickMultiplier:1.5,workerMultiplier:1.25,seed:74193};
export function goldenDefaults(){return {goldenCooldown:GOLDEN.first,goldenWindow:0,goldenBoost:0,goldenSeed:GOLDEN.seed,goldenClaims:0};}
function schedule(s){
  s.goldenSeed=(Math.imul(s.goldenSeed||GOLDEN.seed,1664525)+1013904223)>>>0;
  s.goldenCooldown=GOLDEN.minCooldown+(s.goldenSeed/4294967296)*(GOLDEN.maxCooldown-GOLDEN.minCooldown);
}
// Called only by the active session clock. Offline settlement cannot spawn events.
export function advanceGolden(s,dt){
  if(!Number.isFinite(dt)||dt<=0||s.isResetting)return;
  if(s.goldenWindow>0){claimGolden(s);return;}
  s.goldenCooldown=Math.max(0,s.goldenCooldown-dt);
  if(s.goldenCooldown<=1e-9&&s.goldenBoost<=0){s.goldenCooldown=0;s.goldenWindow=GOLDEN.window;claimGolden(s);}
}
export function claimGolden(s){
  if(s.goldenWindow<=0||s.goldenBoost>0||s.isResetting)return false;
  s.goldenWindow=0;s.goldenBoost=GOLDEN.duration;s.goldenClaims++;schedule(s);return true;
}
export function dismissGolden(s){if(s.goldenWindow>0){s.goldenWindow=0;schedule(s);}}
