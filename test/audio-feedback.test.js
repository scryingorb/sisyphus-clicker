import test from 'node:test';
import assert from 'node:assert/strict';
import { BoulderAudio } from '../src/audio.js';
test('cue voices are bounded, respect mute and volume, and stop on pause',()=>{
  const settings={muted:false,volume:.2},audio=new BoulderAudio(settings);
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}});
  const voice=()=>({frequency:param(),connect(){},disconnect(){},start(){},stop(){this.stopped=true;}});
  audio.context={currentTime:1,createOscillator:voice,createGain:()=>({gain:param(),connect(){},disconnect(){}})};
  audio.master={gain:param()};audio.roll={gain:param()};audio.filter={frequency:param()};
  for(let i=0;i<20;i++){audio.context.currentTime+=.2;audio.cue('milestone');}
  assert.equal(audio.voices.size,6);const active=[...audio.voices];
  audio.update(10,true);assert.ok(active.every(v=>v.stopped));assert.equal(audio.voices.size,0);assert.equal(audio.roll.gain.value,0);assert.equal(audio.master.gain.value,.2);
  settings.muted=true;audio.context.currentTime++;audio.cue('prestige');audio.push();assert.equal(audio.voices.size,0);audio.update(0,false);assert.equal(audio.master.gain.value,0);
});
