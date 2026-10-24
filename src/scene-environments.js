// Original canvas pixel geometry: fixed seeds, bounded detail, no downloaded art.
// These shapes stay behind the shared walking ridge so scenery cannot detach the crew.
export const MATERIALS = [
  ['#36403f','#292e36','#252836','#6c6554','#414e4b','#202933','#af9771','#dfc58b'],
  ['#563b3d','#3c2933','#2c2030','#ac6e4a','#6b4442','#302431','#d98d59','#ffd18b'],
  ['#413751','#2c2840','#252239','#847098','#51475f','#28243a','#ac8ebd','#d0b0e6'],
  ['#426471','#314b5e','#243b50','#8fbfc8','#567f8d','#2a4659','#a5dae4','#d7f0e8'],
  ['#514264','#382e4b','#2c263f','#9984b3','#665578','#302a45','#b8a0d5','#e4c9f2'],
];
export function drawBackdrop(scene,environment,time){
  const {w,h,scale:s,ctx:c}=scene;
  const rect=(...args)=>scene.rect(...args),poly=(...args)=>scene.poly(...args);
  if(environment===0){
    poly([[0,h*.59],[w*.15,h*.52],[w*.27,h*.39],[w*.43,h*.53],[w*.66,h*.47],[w,h*.42],[w,h],[0,h]],'#243331');
    for(let i=0;i<4;i++){const x=w*(i*.28-.1),y=h*(.62+i%2*.07);rect(x,y,w*.34,h,'#1c2b2a');rect(x,y,w*.34,3*s,'#34403a');}
    scene.temple(w*.13,h*.61,.65*s,'#34403a');scene.temple(w*.52,h*.58,.45*s,'#2e3d36');
  } else if(environment===1){
    for(let i=0;i<4;i++){
      const x=w*(i*.32-.12),y=h*(.32+i%2*.1);
      poly([[x,h],[x+w*.13,y],[x+w*.19,y+5*s],[x+w*.37,h]],i%2?'#352b2b':'#49312c');
      poly([[x+w*.135,y+4*s],[x+w*.16,y+30*s],[x+w*.19,y+5*s]],'#8f543a');
      for(let j=0;j<4;j++)rect(x+w*.14-j*5*s,y-j*10*s-12*s,(18+j*10)*s,5*s,'#443735');
    }
  } else if(environment===2){
    rect(0,h*.65,w,h,'#1d2032');
    for(let i=0;i<9;i++){
      const x=w*(i*.14-.04),y=h*(.28+(i*7%5)*.055),width=w*.065;
      rect(x,y,width,h,'#303047');rect(x-3*s,y,width+6*s,5*s,'#505064');rect(x+width*.2,y+8*s,2*s,h*.3,'#43445a');
      if(i%2===0)for(let link=0;link<16;link++){rect(x+width*.7,link*8*s,5*s,6*s,'#686a7b');rect(x+width*.7+s,link*8*s+s,3*s,4*s,'#26283a');}
    }
  } else if(environment===3){
    for(let i=0;i<7;i++){
      const x=w*(i*.19-.15),y=h*(.28+i%3*.065);
      poly([[x,h],[x+w*.15,y],[x+w*.28,h]],'#355363');
      poly([[x+w*.15,y],[x+w*.13,y+h*.24],[x+w*.28,h]],'#263f50');
      poly([[x+w*.15,y],[x+w*.1,y+h*.13],[x+w*.14,y+h*.10],[x+w*.18,y+h*.16]],'#a2bfc4');
    }
  } else {
    for(let i=0;i<8;i++){
      const x=w*(i*.17-.1),y=h*(.51+i%3*.06);
      rect(x,y,w*.25,h,'#49475e');rect(x+w*.035,y-6*s,w*.16,8*s,'#5a566e');
    }
    for(let i=0;i<3;i++){
      const x=w*(.1+i*.34),y=h*(.38+i%2*.09);
      poly([[x-8*s,y],[x+60*s,y],[x+33*s,y+26*s],[x+7*s,y+16*s]],'#343247');
      scene.temple(x,y,.65*s,'#777086');
    }
  }
  // Sparse ash, snow, or wind. Reduced motion keeps their placement static.
  const t=scene.reduced?0:time;
  if(environment===1||environment===3)for(let i=0;i<28;i++)rect((i*73+t*(environment===3?4:1))%w,h*.22+(i*37+t*3)%(h*.42),environment===3?2:1,2,environment===3?'#bed1d5':'#a77a5b');
  if(environment===4)for(let i=0;i<12;i++)rect((i*97+t*12)%w,h*(.24+i*.025),24*s,1,'#9b9aaa');
  c.globalAlpha=1;
}
