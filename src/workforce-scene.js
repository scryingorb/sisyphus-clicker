import { equipmentStage } from './progression.js';

export const WORKFORCE_BUDGET = 4; // One representative per tier, never per owned worker.
export function workforceLayout(scene) {
  return [0,.28,.57,.9].map((progress,tier)=>{
    const p=scene.point(progress), size=24*scene.scale;
    return {tier,x:p.x,y:p.y+48*scene.scale,size};
  });
}

export function drawWorkforce(scene,portraits,time,rock,working) {
  const {ctx:c,state:s,scale:z}=scene;
  const phase=scene.reduced||!working?0:time;
  const line=(x1,y1,x2,y2,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1),Math.round(y1));c.lineTo(Math.round(x2),Math.round(y2));c.stroke();};
  for(const station of workforceLayout(scene)) {
    const {tier:i,x,y,size}=station;
    if(!s.workers[i])continue;
    const stage=equipmentStage(s.workers[i]), color=i===0?'#91cbd1':i===1&&stage<2?'#9c8159':'#c29860';
    const top=scene.point([0,.28,.57,.9][i]);
    // Terraces are inset below the walking surface. Cables meet the actual rock,
    // while the representatives remain clear of Sisyphus and the footer controls.
    scene.rect(x-18*z,y,38*z,4*z,'#646452');
    scene.rect(x-16*z,y+4*z,3*z,7*z,'#3c4639');
    scene.rect(x+15*z,y+4*z,3*z,7*z,'#3c4639');
    line(x+12*z,y-9*z,top.x+10*z,top.y+3*z,color);
    line(top.x+10*z,top.y+3*z,rock.x+8*z,rock.y+3*z,i===0?'#739da1':'#6c6e54');
    // Original shop portraits retain their identities at every equipment stage.
    const portrait=portraits[i];
    const bob=i===0?Math.round(Math.sin(phase*2)*z):0;
    if(portrait?.complete&&portrait.naturalWidth) c.drawImage(portrait,Math.round(x-16*z),Math.round(y-size+bob),Math.round(size),Math.round(size));
    scene.rect(x+9*z,y-14*z,3*z,14*z,color);
    scene.rect(x+7*z,y-14*z,12*z,3*z,color);
    // The capstan turns in four discrete pixel poses, driven only by scene time.
    const turn=Math.floor(phase*5)%4;
    const gear=(gx,gy,r)=>{
      scene.rect(gx-r,gy-r,r*2,r*2,i===0?'#365b5c':'#66513b');
      scene.rect(gx-r+z,gy-r+z,r*2-2*z,r*2-2*z,color);
      line(gx+(turn%2?-r:0),gy+(turn%2?0:-r),gx+(turn%2?r:0),gy+(turn%2?0:r),'#29322b',z);
      scene.rect(gx-z,gy-z,2*z,2*z,'#e0bc7d');
    };
    gear(x+14*z,y-8*z,4*z);
    if(i===0) line(x-3*z,y-14*z,x+14*z,y-8*z,'#b7e4df');
    if(i===1) line(x+3*z,y,x+12*z,y-14*z,color,2*z);
    if(i===2) {
      gear(x+7*z,y-8*z,(stage?4:3)*z);
      if(stage>=1)scene.rect(x+3*z,y-4*z,18*z,2*z,'#ae925b');
    }
    if(stage>=1) {
      scene.rect(x-18*z,y-3*z,38*z,2*z,color);
      line(x+8*z,y,x+19*z,y-19*z,color,2*z);
      gear(x+18*z,y-18*z,3*z);
    }
    if(stage>=2) {
      scene.rect(x+5*z,y-26*z,17*z,3*z,color);
      scene.rect(x+20*z,y-25*z,2*z,25*z,color);
      gear(x+10*z,y-22*z,4*z);
      if(i===0) for(let n=0;n<5;n++)scene.rect(x+(9+n*2)*z,y-(23-n*3)*z,2*z,2*z,'#b7e4df');
    }
    if(i===3) {
      scene.rect(x-10*z,y-11*z,10*z,7*z,'#7c4e32');
      scene.rect(x-8*z,y-9*z,6*z,(phase&&turn%2?3:4)*z,'#f0b35f');
      if(stage>=1)scene.rect(x-19*z,y-20*z,5*z,18*z,'#987249');
      if(stage>=2)scene.rect(x-19*z,y-23*z,18*z,3*z,'#d8b979');
    }
  }
}
