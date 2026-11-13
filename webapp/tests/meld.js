const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
for (const vp of [{width:390,height:844},{width:1280,height:800}]){
const ctx=await b.newContext({viewport:vp});await ctx.grantPermissions(['notifications'],{origin:''+(process.env.BASE||'http://localhost:8140')+''});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__n=[];const O=ServiceWorkerRegistration.prototype.showNotification;ServiceWorkerRegistration.prototype.showNotification=function(t,o){window.__n.push(t);return O.call(this,t,o)};});
await p.goto(''+(process.env.BASE||'http://localhost:8140')+'/index.html');await p.waitForTimeout(1200);
await p.evaluate(()=>App.login('u-hoofd2'));await p.waitForTimeout(1500);   // een hoofd dat zelf inspecteert (geen rol inspecteur meer)
console.log(vp.width,'meldingen',await p.evaluate(()=>App.meldingen().map(m=>m.id+' | '+m.titel)));
console.log('bel',await p.locator('#belnr').textContent(),'alert',await p.locator('#alert').innerText(),'sys',await p.evaluate(()=>window.__n));
await p.screenshot({path:'m-'+vp.width+'.png'});
await p.evaluate(()=>App.openMeldingen());await p.waitForTimeout(300);await p.screenshot({path:'mp-'+vp.width+'.png'});
await p.click('text=Alles gelezen');await p.waitForTimeout(300);
const belweg=await p.evaluate(()=>document.getElementById('belnr').classList.contains('hidden'));console.log('bel na gelezen hidden?',belweg);if(!belweg)errs.push('bel blijft zichtbaar na Alles gelezen');
// tweede check mag niet opnieuw systeemmelding geven
await p.evaluate(()=>App.checkMeldingen());await p.waitForTimeout(300);console.log('sys totaal',await p.evaluate(()=>window.__n.length));
// iedereen in het team mag instellen: het hoofd, en ook de QHSE-manager (geen staf, inspecteert niet)
await p.evaluate(()=>{App.closeModal();App.openActie('ACT-demo4')});await p.waitForTimeout(200);
const nform=await p.locator('#ai-houder').count();console.log('instelform voor het hoofd:',nform);if(nform<1)errs.push('hoofd kan een voorstel niet instellen');
await p.evaluate(()=>{App.closeModal();return App.login('u-qhse')});await p.waitForTimeout(600);
await p.evaluate(()=>App.openActie('ACT-demo4'));await p.waitForTimeout(200);
const qform=await p.locator('#ai-houder').count(),qhouders=await p.locator('#ai-houder option').allInnerTexts();console.log('instelform voor de QHSE-manager:',qform);if(qform<1)errs.push('QHSE-manager kan een voorstel niet instellen');
if(qhouders.some(t=>/Gijs Gefingeerd|Hanna Hypothese/.test(t)))errs.push('QHSE-manager of beheerder staat in de actiehouder-kiezer: '+qhouders.join(', '));
await p.evaluate(()=>{App.closeModal();return App.login('u-hoofd2')});await p.waitForTimeout(600);
await p.evaluate(()=>App.go('inspecties'));await p.waitForTimeout(300);
await p.evaluate(()=>App.startInspectie('DAM','x','t',true));await p.waitForTimeout(300);
const alweg=await p.evaluate(()=>document.getElementById('alert').classList.contains('hidden'));console.log('alert tijdens inspectie verborgen:',alweg);if(!alweg)errs.push('alert zichtbaar tijdens inspectie');
console.log('errs',errs);await ctx.close();}
await b.close()})();
