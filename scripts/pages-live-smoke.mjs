import { chromium, request } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import {newState} from '../src/state.js';
import {spinMilestones} from '../src/casino-milestones.js';

const url=process.env.LIVE_SITE_URL || 'https://scryingorb.github.io/sisyphus-clicker/';
const expected=process.env.EXPECTED_REVISION;
assert.equal(new URL(url).pathname,'/sisyphus-clicker/');
assert.equal(new URL(url).protocol,'https:');
const http=await request.newContext();
let browser;
try {
  // Check both the ordinary URL and a fresh request: do not hide stale CDN HTML.
  for(let attempt=0;;attempt++){
    try {
      for(const target of [url,`${url}?deployment=${expected || Date.now()}`]){
        const response=await http.get(target,{headers:{'Cache-Control':'no-cache'}});
        assert.equal(response.status(),200);
        const html=await response.text();
        assert.doesNotMatch(html,/(?:src|href)=["'][^"']*\/src\//,'Raw source HTML is deployed');
        if(expected)assert.ok(html.includes(`content="${expected}"`),'Published revision is stale');
        const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);
        const styles=[...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"/g)].map(m=>m[1]);
        assert.ok(scripts.length&&styles.length,'Compiled JS and CSS must be present');
        for(const asset of [...scripts,...styles]){
          assert.ok(asset.startsWith('/sisyphus-clicker/assets/'),`Wrong base: ${asset}`);
          const result=await http.get(new URL(asset,url).href);
          assert.equal(result.status(),200,asset);
          assert.match(result.headers()['content-type'],asset.endsWith('.css')?/text\/css/:/javascript/);
        }
      }
      break;
    }catch(error){if(attempt===5)throw error;console.log(`Waiting for published build: ${error.message}`);await new Promise(r=>setTimeout(r,10000));}
  }
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)missing.push(`${r.status()} ${r.url()}`);});
  page.on('requestfailed',r=>missing.push(`${r.url()} ${r.failure()?.errorText}`));
  await page.goto(url,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length),0);
  await page.locator('#resume').click();
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.styleSheets.length>0));
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).display),'block');
  const scene=await page.locator('#scene').boundingBox();assert.equal(scene.width,1280);assert.equal(scene.height,800);
  assert.equal(await page.locator('.reel-slot').count(),5);
  assert.ok(await page.locator('#scene').evaluate(canvas=>{
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const colors=new Set();for(let i=0;i<data.length;i+=64)if(data[i+3])colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
    return colors.size>20;
  }),'Canvas must contain rendered scenery');
  const before=await page.locator('#total').textContent();
  await page.locator('#push').click();
  assert.notEqual(await page.locator('#total').textContent(),before,'Game input must work');
  for(const tab of ['workers','upgrades','divine','collection']){
    await page.locator(`[data-tab="${tab}"]`).click();
    await page.locator('#ledger-content img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  }
  await page.locator('[data-tab="workers"]').click();
  const fixture={...newState(),schema:7,runSummits:3,completedClimbs:'3',totalPushes:'0',spins:50,climbPushes:0,highWater:0,goldenCooldown:240,spinClaims:spinMilestones().map(m=>m.id),settings:{muted:true,volume:0,reducedMotion:false}};
  const seed=async()=>{await page.evaluate(s=>localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s)),fixture);await page.reload();await page.locator('#resume').click();};
  await seed();await page.locator('#spin-ready').click();await page.waitForTimeout(200);assert.equal(await page.locator('#casino-push-impact').isVisible(),false);await page.locator('#reel-skip').click();await page.waitForFunction(()=>document.querySelector('#divine-reels').dataset.complete==='true');assert.equal(await page.locator('#casino-push-impact').isVisible(),true);
  await seed();await page.evaluate(()=>{window.batchLabels=[];new MutationObserver(()=>{const t=document.querySelector('#reel-title').textContent;if(/^SPIN \d+ \/ 10$/.test(t)&&!window.batchLabels.includes(t))window.batchLabels.push(t);}).observe(document.querySelector('#reel-title'),{childList:true,subtree:true,characterData:true});});
  await page.locator('#spin-batch').click();await page.waitForFunction(()=>document.querySelector('#divine-reels').dataset.complete==='true');
  assert.equal((await page.evaluate(()=>window.batchLabels)).length,10);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')).activeSpins),10);
  assert.match(await page.locator('#reel-calculation').textContent(),/10 SPINS SETTLED/);
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pages-live.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log(`PASS public site: ${url}; revision ${expected || 'unchecked'}; JS/CSS HTTP 200, artwork, styles, canvas, input, no service worker or failed requests.`);
}finally{await browser?.close();await http.dispose();}
