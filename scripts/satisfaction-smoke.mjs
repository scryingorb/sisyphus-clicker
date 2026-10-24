import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { BALANCE } from '../src/progression.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});

let browser;
const errors=[];
try {
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:800},{width:800,height:620},{width:390,height:844}]) {
    const context=await browser.newContext({viewport});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.drawnGains=[];
      const original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(String(text).startsWith('+')){window.drawnGains.push(text);if(window.drawnGains.length>100)window.drawnGains.shift();}return original.call(this,text,...args);};
    });
    const seed={...newState(),totalPushes:'0',completedClimbs:'0',obols:100,settings:{muted:true,volume:0,reducedMotion:false}};
    await page.addInitScript(s=>localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s)),seed);
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('#resume').click();await page.locator('#push').click();
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(()=>window.drawnGains.some(x=>x.includes('m/s push'))));
    await page.locator('[data-buy="worker"][data-index="0"]').click();
    assert.match(await page.locator('#notification-title').textContent(),/recruited/);
    await page.waitForTimeout(1500);
    assert.ok(await page.evaluate(()=>window.drawnGains.some(x=>x.includes('crew work'))));
    assert.match(await page.locator('#passive-power').textContent(),/1.4 power/);
    const title=await page.locator('#obols').getAttribute('title');
    assert.ok(Number((await page.locator('#obols').textContent()).replaceAll(',',''))<=Number(title.split(' Obols')[0].replaceAll(',',''))+.01);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const bounds=await page.locator('.live-power').boundingBox();assert.ok(bounds.width>0&&bounds.x>=0);
    await page.locator('#game').screenshot({path:'test-results/overhaul-'+viewport.width+'.png'});
    await page.locator('#lifetime-stats summary').click();
    await page.waitForTimeout(150);assert.match(await page.locator('#production-stats').textContent(),/1 workers/);
    await page.locator('#settings').click();await page.locator('#reduced-motion').check();
    await page.locator('#settings-close').click();await page.locator('#resume').click();
    await page.waitForTimeout(150);assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('reduced-motion')),true);
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log('Satisfaction smoke PASS: actual click/worker canvas gains, first recruitment, live stats, no counter overshoot, responsive layouts and reduced-motion setting at 3 sizes.');
}finally{await browser?.close();server.close();}
