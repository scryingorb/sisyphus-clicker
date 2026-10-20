import { GameScene } from './scene.js';

// Every repeatable purchase has one stable asset; levels remain separate text.
export const ITEM_ART = {
  upgrade: [new URL('./assets/items/calloused-hands.png',import.meta.url).href,new URL('./assets/items/bronze-cleats.png',import.meta.url).href,new URL('./assets/items/underworld-overseer.png',import.meta.url).href],
  tier: [new URL('./assets/items/stygian-bindings.png',import.meta.url).href,new URL('./assets/items/hauling-discipline.png',import.meta.url).href,new URL('./assets/items/precision-gearing.png',import.meta.url).href,new URL('./assets/items/divine-bellows.png',import.meta.url).href],
  divine: [new URL('./assets/items/titan-grip.png',import.meta.url).href,new URL('./assets/items/eternal-workforce.png',import.meta.url).href,new URL('./assets/items/charons-bargain.png',import.meta.url).href,new URL('./assets/items/unbroken-defiance.png',import.meta.url).href],
};
export function itemHeading(kind,index,title,level,locked=false){return `<div class="item-heading"><div class="item-portrait${locked?' is-locked':''}"><img src="${ITEM_ART[kind][index]}" width="48" height="48" alt="" draggable="false"></div><div><h3>${title}</h3><span class="level-tag">${level>0?'OWNED / ':''}LEVEL ${level}</span></div></div>`;}

const previews=new Map();
export function collectionPreview(item){
  if(previews.has(item.id))return previews.get(item.id);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=80;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  // Use the actual game drawing routines, including cosmetic palette and shape.
  const renderer=Object.create(GameScene.prototype);
  Object.assign(renderer,{ctx,scale:1.3,gait:0,reduced:true,state:{cosmetics:item.kind==='boulder'?[item.id,'linen']:['stone',item.id],boulderVelocity:0}});
  if(item.kind==='boulder')renderer.boulder(32,76,0,1);
  else renderer.character(72,62,0,0,false,true);
  const url=canvas.toDataURL('image/png');previews.set(item.id,url);return url;
}
