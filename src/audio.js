// Original procedural timbres and short pentatonic gestures; no samples or music files.
export class BoulderAudio {
  constructor(settings){this.settings=settings;this.context=null;this.voices=new Set();this.lastCue=-Infinity;this.lastCoin=-Infinity;this.lastPush=-Infinity;this.lastChain=-Infinity;this.chargeBand=-1;this.variation=0;this.inactive=false;this.unavailable=false;}
  unlock(){
    if(this.unavailable)return false;
    try {
      if(!this.context){
        const Audio=globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext;
        if(!Audio)return false;
        const ctx=this.context=new Audio();
        this.master=ctx.createGain();this.master.gain.value=this.settings.muted?0:this.settings.volume;
        if(ctx.createDynamicsCompressor){this.limiter=ctx.createDynamicsCompressor();this.limiter.threshold.value=-12;this.limiter.knee.value=6;this.limiter.ratio.value=5;this.limiter.attack.value=.003;this.limiter.release.value=.15;this.master.connect(this.limiter);this.limiter.connect(ctx.destination);}else this.master.connect(ctx.destination);
        this.sfx=ctx.createGain();this.sfx.gain.value=this.settings.sfxVolume??.8;this.sfx.connect(this.master);
        const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let smooth=0;
        for(let i=0;i<data.length;i++){smooth=(smooth+(Math.random()*2-1)*.08)/1.08;data[i]=smooth*2;}
        this.noise=ctx.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
        this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=250;
        this.roll=ctx.createGain();this.roll.gain.value=0;this.noise.connect(this.filter);this.filter.connect(this.roll);this.roll.connect(this.sfx);this.noise.start();
      }
      this.context.resume()?.catch(()=>{});this.inactive=false;return true;
    }catch{try{this.context?.close()?.catch(()=>{});}catch{}this.context=null;this.unavailable=true;return false;}
  }
  get audible(){return !!this.context&&(!this.context.state||this.context.state==='running')&&!this.settings.muted&&!this.inactive&&(this.settings.volume??.35)>0&&(this.settings.sfxVolume??.8)>0;}
  update(velocity,paused){
    this.inactive=paused;
    if(!this.context)return;
    const ctx=this.context,speed=Math.min(1,Math.abs(velocity)/12);
    if(paused||this.settings.muted||this.settings.sfxVolume===0||this.settings.volume===0)this.silence();
    this.master.gain.setTargetAtTime(this.settings.muted?0:this.settings.volume,ctx.currentTime,.03);
    this.sfx?.gain.setTargetAtTime(this.settings.sfxVolume??.8,ctx.currentTime,.03);
    this.roll.gain.setTargetAtTime(paused?0:speed*.12,ctx.currentTime,.07);
    this.filter.frequency.setTargetAtTime(140+speed*450,ctx.currentTime,.1);
  }
  track(osc,gain){osc.connect(gain);gain.connect(this.sfx||this.master);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};}
  tone(note,start,duration=.22,level=.055,type='sine'){
    if(!this.audible||this.voices.size>=6)return;
    const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(note,start);
    gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.setValueAtTime(.001,start);gain.gain.linearRampToValueAtTime(level,start+.009);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    this.track(osc,gain);osc.start(start);osc.stop(start+duration+.02);return osc;
  }
  push({charge=0,boost=false,intensity=1}={}){
    if(!this.audible||this.context.currentTime-this.lastPush<.08)return;
    const now=this.context.currentTime;this.lastPush=now;
    const variation=[.97,1,1.025,.99][this.variation++%4];
    const impact=this.tone(96*variation,now,.16,Math.min(.16,.1+intensity*.025));
    impact?.frequency.exponentialRampToValueAtTime(36,now+.14);
    this.mechanical(now,.027);
    const band=boost?4:Math.min(3,Math.floor(charge/3));
    if(band>this.chargeBand)this.tone(293.665*2**([0,2,4,7,9][band]/12),now+.012,.14,.035,'triangle');
    this.chargeBand=band;
  }
  coin(gain){
    if(!this.audible||gain<1||this.context.currentTime-this.lastCoin<.8)return;
    this.lastCoin=this.context.currentTime;this.tone(880,this.lastCoin,.11,.018);this.tone(1320,this.lastCoin+.025,.12,.009);
  }
  mechanical(now,level=.035){const tick=this.tone(760,now,.035,level,'triangle');tick?.frequency.exponentialRampToValueAtTime(220,now+.028);}
  reelTick(){if(!this.audible||this.context.currentTime-(this.lastReelTick??-Infinity)<.14)return;this.lastReelTick=this.context.currentTime;this.mechanical(this.lastReelTick,.012);}
  reelStop(index){if(!this.audible)return;this.mechanical(this.context.currentTime,.035);this.tone([369.994,440,587.33][Math.min(2,index)],this.context.currentTime+.012,.16,.05,'triangle');}
  chain(stage,final=false,strength=1){
    if(!this.audible||this.context.currentTime-this.lastChain<.075)return;
    const now=this.context.currentTime;this.lastChain=now;const weight=Math.min(3,Math.max(1,strength));
    // Make room for the current visual beat, never queue a backlog of tones.
    const needed=final?4:1;
    while(this.voices.size>6-needed){const voice=this.voices.values().next().value;try{voice.stop();}catch{}this.voices.delete(voice);}
    if(final){
      const impact=this.tone(120,now,.15,.075+weight*.015);impact?.frequency.exponentialRampToValueAtTime(45,now+.14);
      for(const [i,note] of [587.33,739.989,1174.66].entries())this.tone(note,now+.025+i*.045,.16,.026+weight*.008,i===1?'sine':'triangle');
    }else this.tone(293.665*2**([0,2,4,7,9,12][Math.min(5,stage)]/12),now,.13,.035+weight*.01,'triangle');
  }
  silence(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
  cue(kind){
    if(!this.audible||this.context.currentTime-this.lastCue<.1)return;
    const notes={consolation:[293.665],hold:[440,659.255],bank:[587.33,880],risk:[293.665,369.994,440],mega:[220,329.628,440,659.255,880,1318.51],reelStart:[220,293.665],reelStop:[440,587.33],blessing:[293.665,440,587.33],jackpot:[293.665,440,587.33,739.989,1174.66],purchase:[369.994,587.33],recruit:[440,659.255],power:[369.994,587.33,739.989],major:[293.665,440,739.989],relic:[440,659.255,880],golden:[587.33,739.989,1174.66],achievement:[293.665,440,587.33],milestone:[293.665,369.994,587.33],defiance:[146.832,293.665,440],expired:[220],summit:[293.665,440,739.989,880],prestige:[146.832,293.665,440,739.989,1174.66]}[kind];
    if(!notes)return;this.lastCue=this.context.currentTime;
    if(['hold','bank','purchase','recruit','power','reelStart','reelStop'].includes(kind))this.mechanical(this.lastCue,.045);
    if(kind==='major')this.tone(90,this.lastCue+.16,.16,.09);
    for(const [i,note] of notes.entries())this.tone(note,this.lastCue+i*.075,kind==='prestige'?.4:.19,kind==='prestige'?.065:.055,i%2?'triangle':'sine');
  }
}
