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
test('audio is lazy, tolerates unavailable/blocked APIs, and creates separate Master/SFX buses',()=>{
  const previous=globalThis.window;let created=0;
  const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}});
  const node=()=>({gain:param(),frequency:param(),connect(){},disconnect(){},start(){},stop(){}});
  class Context {
    constructor(){created++;this.currentTime=0;this.sampleRate=10;this.destination={};this.state='running';}
    createGain(){return node();}createBuffer(){return {getChannelData:()=>new Float32Array(20)};}createBufferSource(){return node();}createBiquadFilter(){return node();}createOscillator(){return node();}
    resume(){return Promise.resolve();}
  }
  try{
    globalThis.window={AudioContext:Context};const settings={volume:.4,sfxVolume:.25,muted:false},audio=new BoulderAudio(settings);assert.equal(created,0);audio.cue('relic');assert.equal(created,0);
    assert.ok(audio.unlock());assert.equal(created,1);assert.equal(audio.sfx.gain.value,.25);audio.unlock();assert.equal(created,1);
    audio.coin(100);const count=audio.voices.size;audio.coin(100);assert.equal(audio.voices.size,count);
    audio.silence();for(let i=0;i<100;i++){audio.context.currentTime+=.1;audio.push({charge:i%12,intensity:2});audio.chain(i%5);}assert.ok(audio.voices.size<=6);
    settings.sfxVolume=0;audio.update(0,false);assert.equal(audio.voices.size,0);audio.cue('golden');assert.equal(audio.voices.size,0);assert.equal(audio.sfx.gain.value,0);
    settings.sfxVolume=.5;audio.context.state='suspended';audio.chain(0);assert.equal(audio.voices.size,0);
    globalThis.window={};assert.equal(new BoulderAudio(settings).unlock(),false);
    globalThis.window={AudioContext:class {constructor(){throw Error('unavailable');}}};const broken=new BoulderAudio(settings);assert.equal(broken.unlock(),false);assert.doesNotThrow(()=>{broken.push();broken.update(0,false);broken.cue('relic');});
  }finally{globalThis.window=previous;}
});

test('arcade beats have bounded scheduling, threshold notes, and stronger finite finales',()=>{
 const settings={muted:false,volume:.35,sfxVolume:.8},audio=new BoulderAudio(settings),events=[];
 const param=()=>({setValueAtTime(){},linearRampToValueAtTime(v){events.push(['level',v]);},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 audio.context={state:'running',currentTime:1,createGain:()=>({gain:param(),connect(){},disconnect(){}}),createOscillator:()=>({frequency:param(),connect(){},disconnect(){},start(t){events.push(['start',t]);},stop(t){if(t)events.push(['stop',t]);}})};audio.master={gain:param()};audio.roll={gain:param()};audio.filter={frequency:param()};
 const pushCount=charge=>{audio.silence();events.length=0;audio.context.currentTime+=.2;audio.push({charge});return events.filter(e=>e[0]==='start').length;};
 assert.equal(pushCount(3),3);assert.equal(pushCount(3.1),2);assert.equal(pushCount(6),3);
 audio.silence();events.length=0;audio.reelTick();audio.reelTick();assert.equal(audio.voices.size,1);
 for(const cue of ['reelStart','reelStop','blessing','jackpot']){audio.silence();audio.context.currentTime+=1;audio.cue(cue);assert.ok(audio.voices.size>0&&audio.voices.size<=6);}
 audio.silence();events.length=0;audio.chain(4,true,3);assert.equal(audio.voices.size,4);
 assert.ok(events.filter(e=>e[0]==='start').every(e=>e[1]<=audio.context.currentTime+.12));
 assert.ok(events.filter(e=>e[0]==='stop').every(e=>e[1]<=audio.context.currentTime+.31));
 assert.ok(events.filter(e=>e[0]==='level').every(e=>e[1]<=.16));
 for(let i=0;i<100;i++){audio.context.currentTime+=.08;audio.chain(i%5,i%3===0,3);assert.ok(audio.voices.size<=6);}
 settings.volume=0;audio.update(0,false);assert.equal(audio.voices.size,0);audio.chain(3,true,3);assert.equal(audio.voices.size,0);
});
