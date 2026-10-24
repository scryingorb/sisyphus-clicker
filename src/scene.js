import { drawBackdrop, MATERIALS } from './scene-environments.js';
import { drawWorkforce, workforceLayout, drawPushCrew } from './workforce-scene.js';
import { mountain, format } from './progression.js';
import { GainEffects } from './satisfaction.js';
import { PUSHES_PER_CLIMB } from './state.js';
import { CasinoImpactPresentation } from './casino-impact-presentation.js';

const clamp = x => Math.max(0, Math.min(1, x));
function random(seed) { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }

export class GameScene {
  constructor(canvas, state, portraits = []) {
    this.portraits=portraits;this.effects=[];
    this.casinoImpact=new CasinoImpactPresentation();
    this.gains=new GainEffects();this.arrivals=new Map();
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.state = state;
    this.position = state.climbPushes / PUSHES_PER_CLIMB;
    this.lastPush = -1000; this.pushIntensity=1; this.lastFrame = null; this.dust = [];
    this.angle = 0; this.lastRockProgress = this.position; this.gait = 0; this.rollDust = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = random(74);
    this.stars = Array.from({length:100}, () => [rand(),rand()*.72,rand()]);
    this.stones = Array.from({length:750}, () => [rand(),rand(),rand(),rand()]);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const width=this.canvas.clientWidth || innerWidth;
    this.w = this.canvas.width = Math.round(Math.min(1000, width / 1.6));
    this.h = this.canvas.height = Math.round(this.canvas.clientHeight / (width / this.w));
    this.mobile = this.w < 410;
    this.start = {x:this.w * (this.mobile ? .18 : .29), y:this.h * .68};
    this.end = {x:this.w * .82, y:this.h * (this.mobile ? .47 : .39)};
    this.scale = Math.max(.65, Math.min(1.3, this.w / (this.mobile ? 350 : 850)));
    if(this.arcadeFraming){const wide=width>=1100;this.start={x:this.w*(wide?.22:.19),y:this.h*(wide?.48:.73)};this.end={x:this.w*(wide?.72:.82),y:this.h*(wide?.23:.42)};this.scale=Math.max(.65,Math.min(1.18,this.w/650,this.h/420));}
    this.ctx.imageSmoothingEnabled = false;
  }
  point(progress) { return {x:this.start.x + (this.end.x-this.start.x)*progress, y:this.start.y+(this.end.y-this.start.y)*progress}; }
  mountainLength(){return mountain(this.state).length;}
  arrive(tier,time){this.arrivals.set(tier,time);}
  push(time,intensity=1) {
    this.lastPush = time;
    this.pushIntensity=Math.max(.6,Math.min(2.2,intensity));
    const p = this.point(this.position);
    if(!this.reduced)for (let i=0;i<Math.round(5*this.pushIntensity);i++) this.dust.push({x:p.x-27*this.scale,y:p.y+7*this.scale,vx:(-8-Math.random()*25)*this.pushIntensity,vy:-8-Math.random()*18,life:.4+Math.random()*.5,rock:i%4===0});
    if(this.dust.length>180)this.dust=this.dust.slice(-180);
  }
  casinoPush(award,time){this.casinoSurge={...award,time,visualFrom:this.position};this.push(time*1000,Math.min(2.2,1+award.percent/3));this.comboUntil=time+.8;}
  deferCasinoPush(award){this.casinoImpact.begin(award,this.state);this.casinoSurge=null;}
  revealCasinoPush(time){const award=this.casinoImpact.reveal(time);if(award)this.casinoPush(award,time);return !!award;}
  presentationState(time){return this.casinoImpact.project(this.state,time);}
  finishReset() {if(this.casinoImpact.pending)return;this.casinoSurge=null; this.position = 0; this.lastRockProgress = 0; this.angle = 0; this.dust = []; this.gait = 0; this.lastPush = -1000; }
  celebrate(kind,tier,time){this.effects.push({kind,tier,time});if(this.effects.length>4)this.effects.shift();}
  clearFeedback(){this.casinoImpact.clear();this.casinoSurge=null;this.effects=[];this.gains.clear();this.arrivals.clear();}
  drawGains(time,rock){
    const c=this.ctx,z=this.scale;
    for(const gain of this.gains.active(time)){
      const age=time-gain.time;
      c.globalAlpha=this.reduced?1:Math.min(1,(1.4-age)*2);
      const emphasis=gain.kind==='click'?Math.min(4,Math.log2(1+gain.value/4.8)*2):0;
      const pop=this.reduced?1:1+Math.sin(Math.min(1,age/.22)*Math.PI)*.12;
      c.font=`800 ${Math.max(10,Math.round((12+emphasis)*z*pop))}px sans-serif`;
      c.textAlign='center';const gainColor=gain.kind==='click'?(emphasis>2?'#ff4fa3':'#ffd166'):'#55e6f2';
      const label=gain.kind==='click'?'m/s push':'crew work';
      const text=`+${format(gain.value)} ${label}`;
      const half=(c.measureText(text)?.width||text.length*6)/2+4;
      const x=Math.max(half,Math.min(this.w-half,rock.x+(gain.lane-2)*10*z));
      const y=rock.y-(65+gain.lane*8+(this.reduced?0:age*23))*z;
      c.fillStyle='#17101f';c.fillText(text,x+z,y+2*z);c.fillStyle=gainColor;c.fillText(text,x,y);
    }
    c.globalAlpha=1;
  }
  drawFeedback(time){
    this.effects=this.effects.filter(e=>time-e.time<1.6);
    for(const e of this.effects){
      const age=time-e.time,z=this.scale,c=this.ctx;
      const p=Number.isInteger(e.tier)?workforceLayout(this)[e.tier]:e.kind==='summit'?this.end:{x:this.w*.52,y:this.h*.58};
      const color=e.tier===0||e.kind==='defiance'?'#a8dce2':e.tier===3?'#efaa70':'#e4c88c';
      c.globalAlpha=this.reduced?.75:Math.max(0,1-age/1.6);
      if(this.reduced){c.strokeStyle=color;c.lineWidth=1;c.strokeRect(Math.round(p.x-22*z),Math.round(p.y-30*z),44*z,34*z);}
      else if(e.kind==='jackpot')for(let i=0;i<12;i++){const x=p.x+(i-5.5)*13*z,y=p.y-45*z+age*age*35*z-(i%3)*12*z;this.rect(x,y,4*z,6*z,'#ffaa33');this.rect(x+z,y,2*z,5*z,'#fff0a6');}
      else for(let i=0;i<12;i++){const angle=i*Math.PI/6,r=(12+age*18)*z;this.rect(p.x+Math.cos(angle)*r,p.y-12*z+Math.sin(angle)*r-age*8*z,2*z,2*z,color);}
    }
    this.ctx.globalAlpha=1;
  }
  poly(points, color) {
    const c=this.ctx; c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();
  }
  rect(x,y,w,h,color) { this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h)); }
  draw(time, reset) {
    const actual=this.state,visual=this.presentationState(time/1000);
    this.state=visual;
    try{this.drawWorld(time,visual===actual?reset:null);}finally{this.state=actual;}
  }
  drawWorld(time, reset) {
    const c=this.ctx,w=this.w,h=this.h,s=this.scale,t=time/1000;
    const dt=this.lastFrame===null?0:Math.max(0,Math.min(.05,(time-this.lastFrame)/1000));this.lastFrame=time;
    const impulse=this.reduced?0:Math.max(0,1-(time-this.lastPush)/230)*this.pushIntensity;
    c.save();c.clearRect(0,0,w,h);
    if(impulse)c.translate(Math.round(Math.sin(time*.09)*Math.min(1,impulse)),0);
    const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,mountain(this.state).sky);sky.addColorStop(.6,mountain(this.state).tint);sky.addColorStop(1,'#14201f');c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(const [x,y,a] of this.stars){c.globalAlpha=.2+a*.45+(this.reduced?0:Math.sin(t*.5+x*30)*.1);this.rect(x*w,y*h,a>.9?2:1,1,'#d0c6a0');}c.globalAlpha=1;
    // A stepped moon and thin cloud bands keep the entire environment pixel-native.
    const mx=w*(this.arcadeFraming&&!this.mobile?.12:.73),my=h*.25,mr=22*s;
    for(let y=-mr;y<=mr;y+=2){const width=Math.sqrt(mr*mr-y*y);this.rect(mx-width,my+y,width*2,2,'#b2b9a0');}
    this.rect(mx-9*s,my-6*s,7*s,3*s,'#a2ac97');this.rect(mx+3*s,my+6*s,9*s,4*s,'#a2ac97');
    for(let i=0;i<7;i++){
      const x=((i*.193*w+(this.reduced?0:t*(i%2?1:-1)*.9)+w*2)%(w*1.4))-w*.2;
      const y=h*(.13+i*.053); c.globalAlpha=.15;
      this.rect(x,y,75*s,3*s,'#728780');this.rect(x+17*s,y-3*s,35*s,3*s,'#728780');c.globalAlpha=1;
    }
    const environment=mountain(this.state).environment,material=MATERIALS[environment];
    drawBackdrop(this,environment,t);
    const a=this.start,b=this.end;
    const ridge=[];for(let i=0;i<=64;i++){const p=this.point(i/64);ridge.push([p.x,p.y+(i%3===0?-1:1)]);}
    this.poly([[0,h*.96],[a.x-55*s,a.y+18*s],...ridge,[b.x+22*s,b.y+2*s],[b.x+60*s,b.y+35*s],[w,h*.53],[w,h],[0,h]],material[0]);
    this.poly([[a.x+30*s,a.y+30*s],[b.x,b.y+7*s],[b.x+27*s,b.y+50*s],[w*.68,h],[w*.35,h]],material[1]);
    this.poly([[b.x+35*s,b.y+25*s],[w,h*.54],[w,h],[w*.75,h]],material[2]);
    // Rock strata follow the diagonal ascent, with deterministic chiseled flecks.
    for(const [rx,ry,rz,ra] of this.stones){
      const x=rx*w,y=h*(.39+ry*.61);
      const line=a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
      if(y>line+8*s && x>a.x-55*s && (x<b.x || y>b.y+(x-b.x)*.75))
        this.rect(x,y,(2+rz*10)*s,(1+ra*2)*s,ra>.88?material[3]:ra>.45?material[4]:material[5]);
    }
    c.strokeStyle=material[6];c.lineWidth=2*s;c.beginPath();ridge.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(x,y));c.stroke();
    c.strokeStyle=material[7];c.lineWidth=s;c.beginPath();c.moveTo(a.x,a.y-1);c.lineTo(b.x,b.y-1);c.stroke();
    if(this.arcadeFraming){
      // Deep facets give the ridge a craggy silhouette without static artwork.
      for(let i=0;i<15;i++){const p=this.point(i/14),depth=(34+i%4*19)*s;
        this.poly([[p.x,p.y+7*s],[p.x+18*s,p.y+depth],[p.x+8*s,p.y+depth+46*s],[p.x-9*s,p.y+21*s]],i%2?'#10172655':'#080f2044');
        this.rect(p.x-4*s,p.y+6*s,9*s,2*s,material[3]);
      }
      c.fillStyle='#050b244d';c.fillRect(0,0,w,h);
    }
    // Broken columns mark a summit that offers no escape.
    this.column(b.x+12*s,b.y-1*s,28*s,5*s);this.column(b.x+30*s,b.y+9*s,42*s,7*s);
    this.rect(b.x+24*s,b.y-37*s,20*s,4*s,'#727363');
    if(this.arcadeFraming){
      // Warm path lamps and summit architecture belong to the live scene.
      for(let i=0;i<9;i++){const p=this.point(i/8),x=p.x+8*s,y=p.y-5*s;
        this.rect(x,y-13*s,2*s,13*s,'#9a7747');this.rect(x-2*s,y-14*s,6*s,2*s,'#e3b85f');
        const glow=c.createRadialGradient(x,y-17*s,0,x,y-17*s,17*s);glow.addColorStop(0,'#ffb74355');glow.addColorStop(1,'#ffb74300');c.fillStyle=glow;c.fillRect(x-17*s,y-34*s,34*s,34*s);
        this.rect(x,y-(this.reduced?19:19+Math.sin(t*7+i))*s,2*s,5*s,'#ffe29b');
      }
      this.temple(b.x-16*s,b.y-5*s,.65*s,'#ac9064');
    }
    if(environment===3)for(let i=0;i<45;i++){const p=this.point(i/44);this.rect(p.x,p.y-3*s,5*s,3*s,'#b7ced0');}
    let rockProgress,personProgress;
    if(reset!==null){
      this.position+=(1-this.position)*(1-Math.exp(-dt*18));
      rockProgress=reset<.5?this.position:1-Math.pow(clamp((reset-.5)/1.45),.75);
      personProgress=reset<.85?this.position:1-clamp((reset-.85)/1.9);
    } else {const target=this.state.climbPushes/PUSHES_PER_CLIMB,surge=this.casinoSurge;
      const blend=this.reduced||!surge?1:1-(1-clamp((t-surge.time)/.65))**3;
      this.position=surge&&surge.mountain===this.state.runSummits+1?surge.visualFrom+(target-surge.visualFrom)*blend:target;
      rockProgress=personProgress=this.position;}
    const rock=this.point(rockProgress),person=this.point(personProgress);
    const distance=(rockProgress-this.lastRockProgress)*Math.hypot(this.end.x-this.start.x,this.end.y-this.start.y);
    this.angle+=distance/(31*s);this.lastRockProgress=rockProgress;
    this.gait+=distance/(5*s);
    const speed=reset===null?Math.abs(this.state.boulderVelocity):0;
    if(!this.reduced && dt>0 && speed>.2){
      this.rollDust+=dt*speed*1.5;
      while(this.rollDust>=1){
        this.rollDust--;this.dust.push({x:rock.x+5*s,y:rock.y-3*s,vx:-this.state.boulderVelocity*2,vy:-5-Math.random()*5,life:.25});
      }
    }
    const moving=reset===null && Math.abs(this.state.boulderVelocity)>.08;
    drawWorkforce(this,this.portraits,t,rock,reset===null&&this.state.boulderVelocity>0);
    drawPushCrew(this,t,person,reset===null);
    this.character(person.x,person.y,impulse,t,(reset!==null && reset>.65)||moving,reset!==null && reset<.5);
    c.save();c.translate(rock.x+8*s,rock.y-35*s);c.scale(1+impulse*.025,1-impulse*.025);c.translate(-rock.x-8*s,-rock.y+35*s);
    this.boulder(rock.x,rock.y,this.angle,s);
    if(this.comboUntil>t){c.strokeStyle='#55e6f2';c.lineWidth=2*s;c.globalAlpha=this.reduced?.6:Math.min(.8,(this.comboUntil-t)*2);c.beginPath();c.arc(rock.x+8*s,rock.y-35*s,33*s,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    c.restore();
    for(const p of this.dust){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=22*dt;p.life-=dt;c.globalAlpha=clamp(p.life*1.4);this.rect(p.x,p.y,(p.rock?3:2)*s,2*s,p.rock?'#8f9480':'#bda273');}this.dust=this.dust.filter(p=>p.life>0).slice(-180);c.globalAlpha=1;
    if(impulse){c.globalAlpha=Math.min(.35,impulse*.2);c.strokeStyle='#ead3a0';c.lineWidth=s;c.beginPath();c.arc(rock.x+8*s,rock.y-35*s,34*s,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    for(let i=0;i<16;i++){const x=(i*67.7+(this.reduced?0:t*3))%w,y=h*.60+Math.sin(i*12+(this.reduced?0:t*.2))*h*.22;c.globalAlpha=this.reduced?.12:.12+Math.sin(i+t)*.1;this.rect(x,y,1,1,'#e3ba72');}c.globalAlpha=1;
    // Foreground shale and grass frame the lower edge.
    this.poly([[0,h*.89],[w*.11,h*.85],[w*.22,h*.92],[w*.37,h*.90],[w*.5,h],[0,h]],'#101c1b');
    for(let i=0;i<20;i++){const x=i*w*.012,y=h*.9+Math.sin(i)*5;this.rect(x,y,1,8,'#24302a');this.rect(x-2,y+3,2,1,'#343d30');}
    this.drawFeedback(t);
    this.drawGains(t,rock);
    const surge=this.casinoSurge;
    if(surge&&t-surge.time<3){
      const age=t-surge.time;
      if(!this.reduced&&age<.65){const start=this.mobile?{x:w*.85,y:h}:{x:w,y:h*.3},v=clamp(age/.45);c.strokeStyle='#55e6f2';c.lineWidth=3*s;c.globalAlpha=1-clamp((age-.35)/.3);c.beginPath();c.moveTo(start.x,start.y);c.quadraticCurveTo(w*.6,rock.y-90*s,start.x+(rock.x-start.x)*v,start.y+(rock.y-35*s-start.y)*v);c.stroke();c.globalAlpha=1;}
      if(h>=220&&!this.compactNotifications){const x=Math.max(90*s,Math.min(w-90*s,rock.x)),y=Math.max(45*s,rock.y-92*s);
      c.fillStyle='#11101ded';c.fillRect(x-88*s,y-18*s,176*s,34*s);c.textAlign='center';c.fillStyle='#55e6f2';c.font=`bold ${Math.max(10,12*s)}px sans-serif`;c.fillText('DIVINE PUSH +'+format(surge.percent)+'%',x,y-4*s);c.fillStyle='#fff4df';c.font=`bold ${Math.max(9,10*s)}px sans-serif`;c.fillText('+'+format(surge.distance)+' m awarded',x,y+10*s);}
    }

    if(reset!==null&&reset<1.3){
      const bannerY=h*.54,bannerW=Math.min(w-24,310*s);
      this.rect(w*.5-bannerW/2,bannerY-25*s,bannerW,44*s,'#21172f');
      this.rect(w*.5-bannerW/2,bannerY-25*s,bannerW,2*s,'#ffd166');
      this.rect(w*.5-bannerW/2,bannerY+18*s,bannerW,2*s,'#a77bff');
      c.textAlign='center';c.fillStyle='#ffd166';c.font=`800 ${Math.max(13,Math.round(19*s))}px sans-serif`;
      c.fillText('MOUNTAIN CONQUERED',w*.5,bannerY);
      c.fillStyle='#fff4df';c.font=`bold ${Math.max(9,Math.round(10*s))}px sans-serif`;c.fillText('THE GODS ARE WATCHING',w*.5,bannerY+13*s);
    }
    c.restore();
  }
  column(x,y,height,width){this.rect(x,y-height,width,height,'#555c50');this.rect(x+1,y-height,1,height,'#85836b');this.rect(x-2,y-height-3,width+4,3,'#747760');this.rect(x-2,y-2,width+4,3,'#68705b');}
  temple(x,y,s,color){this.rect(x-2*s,y,65*s,4*s,color);for(let i=0;i<5;i++)this.rect(x+i*13*s,y-25*s,5*s,25*s,color);this.rect(x-3*s,y-30*s,64*s,5*s,color);this.poly([[x-7*s,y-30*s],[x+29*s,y-43*s],[x+64*s,y-30*s]],color);}
  boulder(x,y,angle,s){
    const c=this.ctx,r=31*s,cx=x+8*s,cy=y-r-4*s;
    this.poly([[cx-28*s,y-2*s],[cx+22*s,y-2*s],[cx+30*s,y+3*s],[cx-22*s,y+5*s]],'#100e1b');
    const rand=random(61);
    // Rasterized sphere: lighting stays fixed while mineral patches rotate.
    for(let yy=-32;yy<32;yy+=2)for(let xx=-32;xx<32;xx+=2){
      if(xx*xx+yy*yy>31*31)continue;
      const shade=(-xx*.48-yy*.65)/32;const edge=Math.sqrt(xx*xx+yy*yy)/31;
      const value=Math.round(88+shade*32-(edge>.89?14:0)+rand()*8);
      this.rect(cx+xx*s,cy+yy*s,2*s,2*s,`rgb(${value+(this.state.cosmetics[0]==='gold'?65:this.state.cosmetics[0]==='obsidian'?-35:6)},${value+(this.state.cosmetics[0]==='gold'?35:this.state.cosmetics[0]==='obsidian'?-35:7)},${value+(this.state.cosmetics[0]==='obsidian'?-25:0)})`);
    }
    c.save();c.beginPath();c.arc(cx,cy,r-3*s,0,Math.PI*2);c.clip();
    const rr=random(29);
    for(let i=0;i<55;i++){const px=(rr()-.5)*56,py=(rr()-.5)*56;const rx=px*Math.cos(angle)-py*Math.sin(angle),ry=px*Math.sin(angle)+py*Math.cos(angle);this.rect(cx+rx*s,cy+ry*s,(2+rr()*5)*s,2*s,i%3?'#424a4270':'#97978470');}
    // A rotating bronze seam gives the stone a recognizable axis of travel.
    c.save();c.translate(cx,cy);c.rotate(angle);c.strokeStyle=this.state.cosmetics[0]==='obsidian'?'#a77bff':'#d5b77c';c.lineWidth=2*s;c.beginPath();c.moveTo(-18*s,-19*s);c.lineTo(-7*s,-8*s);c.lineTo(-10*s,5*s);c.lineTo(5*s,18*s);c.stroke();this.rect(-9*s,-9*s,4*s,4*s,'#ffe3a0');c.restore();
    c.restore();this.rect(cx-16*s,cy-27*s,17*s,2*s,'#aaa58a');this.rect(cx-24*s,cy-20*s,7*s,2*s,'#92977e');
  }
  character(x,y,push,t,walking,upright){
    const c=this.ctx,s=this.scale;c.save();c.translate(Math.round(x-28*s),Math.round(y+11*s));c.scale(s,s);
    const gait=walking&&!this.reduced?Math.sin(this.gait)*4:push*3;
    const lean=upright?-3:push*3+(this.state.boulderVelocity<-.2?-1:0);
    const skin='#ce996e',light='#f0c895',shadow='#885b55';
    const limb=(pts,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.lineCap='square';c.beginPath();pts.forEach(([xx,yy],i)=>i?c.lineTo(Math.round(xx),Math.round(yy)):c.moveTo(Math.round(xx),Math.round(yy)));c.stroke();};
    limb([[-4,-13],[-10-gait,-5],[-13-gait,0]],shadow,4);limb([[1,-13],[5+gait,-8],[3+gait,-1]],skin,4);
    this.rect(-17-gait,-1,8,3,'#b3a28b');this.rect(1+gait,-2,8,3,'#d2bb95');
    this.poly([[-8,-23],[1,-24],[4,-13],[-7,-10],[-11,-13]],this.state.cosmetics[1]==='royal'?'#956ca6':this.state.cosmetics[1]==='ash'?'#787978':'#e8d8b3');this.rect(-7,-17,2,5,'#777e6c');
    limb([[-5,-23],[-2+lean,-32],[3+lean,-36]],skin,8);
    limb([[1+lean,-31],[9+lean,-28],[17,-35]],shadow,3);
    limb([[2+lean,-34],[10+lean,-31],[17,-38]],light,3);
    this.rect(1+lean,-43,8,8,skin);this.rect(0+lean,-44,8,3,'#514c3e');this.rect(6+lean,-39,4,3,light);this.rect(4+lean,-36,5,3,'#615640');
    this.rect(-6,-26,7,3,'#d2c5a1');c.restore();
  }
}
