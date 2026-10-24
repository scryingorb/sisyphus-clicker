import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newState} from '../src/state.js';
import {rollSymbols,classifyRoll,COMBINATIONS} from '../src/casino.js';
import {spinMilestones} from '../src/casino-milestones.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});
function fixture(reduced=false,height=10){return {...newState(),spinClaims:spinMilestones().map(m=>m.id),runSummits:3,completedClimbs:'3',totalPushes:'0',spins:213,climbPushes:height,highWater:height,goldenCooldown:240,jackpotMeter:99,settings:{muted:true,volume:0,reducedMotion:reduced}};}
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const [width,height] of [[1920,1080],[1600,900],[1366,768],[1280,800],[390,844]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const seed=fixture(width===1280);seed.obols=10000;
  await page.addInitScript(s=>{localStorage.setItem('sysyphus-clicker-v1',window.name||JSON.stringify(s));window.name='';},seed);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#resume').click();
  const fits=async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width>=1100){const mountain=await page.locator('#game').boundingBox(),casino=await page.locator('#casino-cabinet').boundingBox();assert.ok(mountain.x===0&&mountain.y===0&&mountain.width===width&&mountain.height===height,'full-screen live mountain');assert.ok(casino.x>mountain.x&&casino.y>height*.35,'floating lower casino');assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),'no page scroll at '+width+' '+JSON.stringify(await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,h:innerHeight,body:document.body.getBoundingClientRect().toJSON(),scrollY}))));for(const id of ['#scene','#spin-ready','#spin-batch','.reel-stop','#progression']){const rect=await page.locator(id).first().boundingBox();if(!rect&&id==='.reel-stop'&&await page.locator('#divine-reels').getAttribute('data-batch')==='true')continue;assert.ok(rect.y>=0&&rect.y+rect.height<=height+1,id+' visible');}}};
  await fits();await page.screenshot({path:`test-results/reference-idle-${width}.png`,fullPage:true});
  await page.locator('#spin-ready').click();await page.waitForTimeout(250);if(width!==1280){assert.equal(await page.locator('#arcade-link').isVisible(),false,'no impact at spin click');assert.equal(await page.locator('#casino-push-impact').isVisible(),false,'reward waits for reveal');}if(width===1600){await page.waitForFunction(()=>document.querySelector('#divine-reels').dataset.complete==='true');assert.equal(await page.locator('#casino-push-impact').isVisible(),true,'natural reveal shows reward');assert.equal(await page.locator('#arcade-link').isVisible(),true,'natural reveal launches impact');}
  if(width===1920)await page.screenshot({path:'test-results/reference-trail.png',fullPage:true});
  if(width!==1280&&width!==1600){await page.locator('.reel-stop').nth(4).click();await page.waitForTimeout(140);assert.equal(await page.locator('.reel-slot').nth(4).getAttribute('data-stopped'),'true');await page.locator('#reel-skip').click();}
  await page.waitForTimeout(150);await fits();if(width>=1100){assert.ok((await page.locator('#reel-calculation').boundingBox()).height>=29,'readable scrollable calculation');const title=await page.locator('#casino-cabinet>h2').boundingBox(),energy=await page.locator('#spin-energy').boundingBox();assert.ok(title.y+title.height<=energy.y+2,'marquee does not cover energy');}await page.screenshot({path:`test-results/reference-win-${width}.png`,fullPage:true});
  await page.locator('#reel-skip').click();for(let pending=0;pending<12&&await page.locator('#spin-batch').isDisabled();pending++){await page.locator('#spin-ready').click();await page.locator('#reel-skip').click();await page.waitForTimeout(120);if(await page.locator('#reel-skip').isVisible())await page.locator('#reel-skip').click();await page.waitForTimeout(50);}await page.evaluate(()=>{window.batchLabels=[];new MutationObserver(()=>{const t=document.querySelector('#reel-title').textContent;if(/^SPIN \d+ \/ 10$/.test(t)&&!window.batchLabels.includes(t))window.batchLabels.push(t);}).observe(document.querySelector('#reel-title'),{childList:true,subtree:true,characterData:true});});await page.locator('#spin-batch').click();if(width!==1280){await page.waitForTimeout(250);assert.equal(await page.locator('#arcade-link').isVisible(),false,'batch impact waits for all ten results');assert.equal(await page.locator('#casino-push-impact').isVisible(),false);assert.match(await page.locator('#reel-title').textContent(),/SPIN [1-9] \/ 10/);}await page.waitForTimeout(1900);await fits();await page.screenshot({path:`test-results/reference-batch-${width}.png`,fullPage:true});
  assert.match(await page.locator('#reel-calculation').textContent(),/10 SPINS SETTLED/);if(width!==1280)assert.equal((await page.evaluate(()=>window.batchLabels)).length,10,'all ten rapid results displayed');
  await page.locator('[data-buy="worker"][data-index="0"]').click();
  await page.locator('.tier-upgrade').first().locator('summary').first().click();await page.locator('[data-buy="tier"][data-index="0"]').click();
  for(const tab of ['upgrades','collection','divine','workers'])await page.locator('[data-tab="'+tab+'"]').click();
  await page.locator('#shop-toggle').click();assert.equal(await page.locator('#shop-toggle').getAttribute('aria-expanded'),'false');await page.locator('#shop-toggle').click();await page.screenshot({path:`test-results/reference-shop-${width}.png`,fullPage:true});await fits();if(width===1280)assert.equal(await page.locator('#arcade-link').isVisible(),false);
  if(width===1366){await page.evaluate(s=>{window.name=JSON.stringify({...s,climbPushes:99.9,highWater:99.9});},seed);await page.reload();await page.locator('#resume').click();await page.locator('#spin-ready').click();await page.waitForTimeout(3200);await page.screenshot({path:'test-results/reference-summit.png',fullPage:true});assert.equal(await page.locator('#notification').isVisible(),true);await fits();}
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Unified arcade PASS: five sizes, desktop viewport fit, STOP, single/batch results, purchases, training, tabs, reduced motion and screenshots.');
}finally{await browser?.close();server.close();}

