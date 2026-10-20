import { chromium } from 'playwright';
import { readFile,writeFile } from 'node:fs/promises';
const {items}=JSON.parse(await readFile('src/assets/items/prompts.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage();
  for(const item of items){
    const src='data:image/png;base64,'+(await readFile(item.source)).toString('base64');
    const output=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,64,64);return c.toDataURL('image/png').split(',')[1];},src);
    await writeFile(`src/assets/items/${item.name}.png`,Buffer.from(output,'base64'));
  }
}finally{await browser.close();}
