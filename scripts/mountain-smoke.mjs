import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});
let browser;const errors=[];
try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  async function open(overrides,viewport){
    const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const seed={...newState(),totalPushes:'0',completedClimbs:'0',settings:{muted:true,volume:.35,reducedMotion:true},...overrides};
    await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#resume').click();return {context,page};
  }
  for(const [width,height] of [[1280,800],[800,620],[390,844]])for(let n=0;n<5;n++){
    const {page,context}=await open({runSummits:n,completedClimbs:String(n),climbPushes:50,highWater:50,workers:[n?10:1,n===4?1:0,0,0],upgrades:[1,0,n?1:0]}, {width,height});
    await page.locator('#mountain-goal summary').click();
    assert.match(await page.locator('#next-mountain').textContent(),/No entry fee|no entry fee/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(width>720)assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
    await page.screenshot({path:`test-results/mountain-${n+1}-${width}.png`,fullPage:width<=720});
    for(const card of await page.locator('.purchase-card').all())assert.equal(await card.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await context.close();
  }
  for(const n of [0,1,27,28]){
    const {page,context}=await open({runSummits:n,completedClimbs:String(n)}, {width:390,height:844});
    await page.locator('[data-tab="divine"]').click();assert.equal(await page.locator('#prestige-open').isDisabled(),n<28);
    assert.equal(await page.locator('progress[aria-label="Climbs toward prestige"]').getAttribute('value'),String(n));
    if(n===27)await page.locator('.prestige-overview').screenshot({path:'test-results/prestige-locked-27.png'});
    if(n===28){await page.locator('#prestige-open').click();await page.locator('#prestige-confirm').click();await page.locator('[data-tab="divine"]').click();assert.equal(await page.locator('#prestige-open').isDisabled(),true);}
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Mountain smoke PASS: first five environments and goal previews at three sizes; prestige locked at 0/1/27, available at 28, locked again after confirmation; no page errors.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
