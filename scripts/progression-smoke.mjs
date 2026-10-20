import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { BALANCE } from '../src/progression.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':file.endsWith('.png')?'image/png':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}`;
  await mkdir('test-results',{recursive:true});
  await page.goto(url);await page.locator('#resume').click();await page.locator('#push').click();
  assert.equal(await page.locator('#total').textContent(),'1');
  assert.equal(await page.locator('.worker-portrait.is-locked').count(),3);
  await page.locator('#pause').click();
  const seed={...newState(),totalPushes:'50',completedClimbs:'15',runSummits:BALANCE.prestigeAt,bestRun:BALANCE.prestigeAt,obols:1000,workers:[1,0,0,0],lastSeen:Date.now()-60000};
  await page.addInitScript(s=>localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s)),seed);
  await page.reload();assert.match(await page.locator('#offline-summary').textContent(),/While away/);
  await page.locator('#resume').click();
  assert.equal(await page.locator('.worker-portrait.is-locked').count(),0);
  await page.locator('.worker-portrait img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  assert.equal(await page.locator('.worker-portrait img').evaluateAll(imgs=>imgs.every(img=>img.naturalWidth>0 && getComputedStyle(img).imageRendering==='pixelated')),true);
  assert.equal(await page.locator('.worker-portrait img').evaluateAll(imgs=>imgs.every(img=>{ const c=document.createElement('canvas'); c.width=c.height=64; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,64,64); const pixels=ctx.getImageData(0,0,64,64).data; let clear=false,solid=false; for(let i=3;i<pixels.length;i+=4){clear ||= pixels[i]===0;solid ||= pixels[i]>128;} return clear&&solid; })),true);
  for(const [width,height] of [[1280,800],[800,620],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:`test-results/workers-unlocked-${width}.png`,fullPage:true});
    for(let i=0;i<4;i++) {
      const card=page.locator('.purchase-card').nth(i);
      await card.screenshot({path:`test-results/worker-${i}-${width}.png`});
      assert.equal(await card.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    }
  }
  await page.setViewportSize({width:1280,height:800});
  await page.locator('[data-buy="worker"][data-index="0"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));assert.equal(saved.workers[0],2);
  await page.locator('[data-tab="collection"]').click();await page.locator('[data-cosmetic="gold"]').click();
  await page.locator('[data-tab="divine"]').click();await page.locator('#prestige-open').click();assert.match(await page.locator('#prestige-preview').textContent(),/Gain exactly 8/);
  await page.locator('#prestige-cancel').click();await page.locator('#prestige-open').click();await page.locator('#prestige-confirm').click();
  const reset=await page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));assert.equal(reset.favor,8);assert.equal(reset.obols,0);assert.equal(reset.cosmetics[0],'gold');assert.deepEqual(reset.workers,[0,0,0,0]);
  await page.locator('[data-divine="1"]').click();assert.match(await page.locator('#ledger-content').textContent(),/Eternal WorkforceOWNED \/ LEVEL 1/);
  await page.locator('[data-tab="workers"]').click();
  await mkdir('test-results',{recursive:true});
  for(const [width,height] of [[1280,800],[800,620],[390,844]]){
    await page.setViewportSize({width,height});await page.screenshot({path:`test-results/progression-${width}.png`,fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.deepEqual(errors,[]);console.log('Progression browser smoke passed: input, offline summary, purchases, cosmetics, prestige cancel/confirm, divine purchase, 3 viewport sizes, no page errors.');
}finally{await browser?.close();server.close();}
