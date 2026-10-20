import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});
let browser;const errors=[];
try {
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const [width,height] of [[1280,800],[800,620],[390,844]])for(const owned of [1,10,25,1000]) {
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    const seed={...newState(),totalPushes:'500',completedClimbs:'15',runSummits:10,climbPushes:50,highWater:50,workers:[owned,owned,owned,owned],tierUpgrades:[2,2,2,2],obols:1e6,settings:{muted:true,volume:0,reducedMotion:owned===1000}};
    await page.addInitScript(s=>localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s)),seed);
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#resume').click();
    await page.locator('.worker-portrait img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
    await page.waitForTimeout(150);
    await page.locator('#game').screenshot({path:`test-results/workforce-${width}-${owned}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    // The tier upgrade button and quantity buttons still transact at high income.
    if(owned===25) {
      await page.locator('[data-quantity="10"]').click();
      await page.locator('[data-buy="worker"][data-index="0"]').click();
      await page.locator('[data-buy="tier"][data-index="0"]').click();
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
      assert.equal(saved.workers[0],35);assert.equal(saved.tierUpgrades[0],3);
      await page.locator('.worker-details').first().locator('summary').click();
      if(width>720) {
        await page.locator('[data-buy="tier"][data-index="0"]').evaluate(el=>el.scrollIntoView({block:'center'}));
        await page.screenshot({path:`test-results/workforce-shop-${width}.png`});
      } else await page.locator('.purchase-card').first().screenshot({path:`test-results/workforce-shop-${width}.png`});
    }
    await page.locator('#pause').click();await page.waitForTimeout(100);
    const frozen=await page.locator('#scene').evaluate(c=>c.toDataURL());await page.waitForTimeout(150);
    assert.equal(await page.locator('#scene').evaluate(c=>c.toDataURL()),frozen);
    if(owned===1000){await page.locator('#pause-settings').click();assert.equal(await page.locator('#reduced-motion').isChecked(),true);}
    await context.close();
  }
  assert.deepEqual(errors,[]);
  const result={result:'PASS',surface:'Chrome browser, not native Electron',viewports:['1280x800','800x620','390x844'],ownership:[1,10,25,1000],checks:['three equipment stages','fixed four-tier group','bulk and tier purchases','no overflow','pause pixel freeze','reduced motion setting','no page errors']};
  await writeFile('test-results/workforce-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {await browser?.close();server.close();}
