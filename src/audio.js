// Synthesized locally: no audio downloads or network required.
export class BoulderAudio {
  constructor(settings) { this.settings = settings; this.context = null; this.voices=new Set(); this.lastCue=-Infinity; }
  unlock() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
      const ctx = this.context;
      this.master = ctx.createGain(); this.master.gain.value = this.settings.muted ? 0 : this.settings.volume; this.master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), data = buffer.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) { smooth = (smooth + (Math.random() * 2 - 1) * .08) / 1.08; data[i] = smooth * 2; }
      this.noise = ctx.createBufferSource(); this.noise.buffer = buffer; this.noise.loop = true;
      this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 250;
      this.roll = ctx.createGain(); this.roll.gain.value = 0;
      this.noise.connect(this.filter); this.filter.connect(this.roll); this.roll.connect(this.master); this.noise.start();
    }
    this.context.resume().catch(() => {});
  }
  update(velocity, paused) {
    if (!this.context) return;
    const ctx = this.context, speed = Math.min(1, Math.abs(velocity) / 12);
    if(paused||this.settings.muted)this.silence();
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.volume, ctx.currentTime, .03);
    this.roll.gain.setTargetAtTime(paused ? 0 : speed * .2, ctx.currentTime, .07);
    this.filter.frequency.setTargetAtTime(140 + speed * 450, ctx.currentTime, .1);
  }
  push() {
    if (!this.context || this.settings.muted || this.voices.size>=6) return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(105, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + .13);
    gain.gain.setValueAtTime(.18, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .16);
    this.track(osc,gain); osc.start(); osc.stop(ctx.currentTime + .17);
  }
  track(osc,gain){osc.connect(gain);gain.connect(this.master);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};}
  silence(){for(const voice of this.voices){try{voice.stop();}catch{/* Already ended. */}}this.voices.clear();}
  cue(kind){
    if(!this.context||this.settings.muted||this.context.currentTime-this.lastCue<.1)return;
    this.lastCue=this.context.currentTime;
    const notes={purchase:[330,440],milestone:[330,440,660],defiance:[196,392,588],expired:[294],summit:[392,494,587],prestige:[196,294,440]}[kind];
    if(!notes)return;
    for(const [i,note] of notes.entries()){
      if(this.voices.size>=6)break;
      const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+i*.055;
      osc.type='sine';osc.frequency.setValueAtTime(note,start);
      gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.setValueAtTime(.001,start);gain.gain.linearRampToValueAtTime(kind==='prestige'?.12:.075,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+(kind==='prestige'?.65:.24));
      this.track(osc,gain);osc.start(start);osc.stop(start+(kind==='prestige'?.7:.28));
    }
  }
}
