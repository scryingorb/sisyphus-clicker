import {advanceSpinBatch} from './casino-batch.js';
import { spinPush } from './casino.js';
import { manualPower } from './satisfaction.js';
import { advanceGolden } from './golden.js';
import { newState } from './state.js';
import { MAX_FRAME_DELTA } from './physics.js';
import { advanceProgress } from './simulation.js';
import { BALANCE, mountain } from './progression.js';
export const FIXED_STEP = 1 / 240;
export const RETURN_DURATION = 2.9;
// One simulation clock drives physics, effects and the summit sequence.
export class GameSession {
  constructor(state) {
    this.metrics={work:0}; this.state = state; this.paused = true; this.time = 0; this.accumulator = 0;
    this.resetElapsed = state.isResetting ? 0 : null;
  }
  pause() { this.paused = true; this.accumulator = 0; }
  resume() { this.paused = false; this.accumulator = 0; }
  push() {
    const s=this.state;
    if(this.paused||s.isResetting||s.clickCooldown>1e-9) return false;
    const scale=100/mountain(s).length;
    s.passiveSeconds=0;
    s.totalPushes++; s.timeSincePush=0;
    s.boulderVelocity=Math.min(12,s.boulderVelocity+manualPower(s)*scale);
    spinPush(s);
    s.clickCooldown=BALANCE.clickInterval;
    if(!s.boost && !s.defianceCooldown && ++s.defiance>=BALANCE.defianceClicks) { s.defiance=0; s.boost=BALANCE.defianceDuration; s.defianceCooldown=BALANCE.defianceCooldown; }
    return true;
  }
  restart() {
    Object.assign(this.state, newState()); this.metrics.work=0;
    this.time = 0; this.accumulator = 0; this.resetElapsed = null; this.pause();
  }
  tick(delta) {
    let completed = false;
    if (this.paused || !Number.isFinite(delta) || delta <= 0) return completed;
    this.accumulator += Math.min(delta, MAX_FRAME_DELTA);
    while (this.accumulator + 1e-10 >= FIXED_STEP) {
      this.accumulator = Math.max(0, this.accumulator - FIXED_STEP);
      this.time += FIXED_STEP;
      if(advanceProgress(this.state,FIXED_STEP,this.metrics)) completed=true;
      advanceGolden(this.state,FIXED_STEP);
      advanceSpinBatch(this.state);
      this.resetElapsed=this.state.isResetting?RETURN_DURATION-this.state.returnRemaining:null;
    }
    return completed;
  }
}
