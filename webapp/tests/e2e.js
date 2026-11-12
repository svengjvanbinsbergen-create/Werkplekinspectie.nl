const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
const S=(n)=>p.screenshot({path:n+'.png'});
const ev=(f,a)=>p.evaluate(f,a);
await p.goto(''+(process.env.BASE||'http://localhost:8140')+'/index.html');await p.waitForTimeout(800);
await ev(()=>App.login('u-insp'));await p.waitForTimeout(400);
await ev(()=>App.startInspectie('DAM','P26-168','Damwand · RWZI Voorbeeldstad'));await p.waitForTimeout(300);
await p.fill('#f-taak','ze halen de damwand eruit met de kraan');await p.waitForTimeout(200);
console.log('taakvs', await p.locator('#taakvs .pick').count(), await p.locator('#taakvs .waarom').first().textContent().catch(()=>'-'));
await p.locator('#taakvs .pick').first().click();await p.waitForTimeout(300);
await p.fill('#f-zie','hijsband is rafelig en monteur staat onder de last');await p.waitForTimeout(500);
console.log('opslag:', await p.locator('#opslag').textContent());
await S('t1-zie');
await p.click('text=Volgende: koppel aan de TRA');await p.waitForTimeout(600);
await S('t2-koppel');
console.log('picks', await p.locator('.pick .gebruik').count(), await p.locator('.q .waarom').allTextContents());
await p.locator('.q .pick').first().click();await p.waitForTimeout(300);
await p.click('.seg button.t-A');await p.waitForTimeout(700);
console.log('actie tekst:', await p.inputValue('#f-actie'));
await S('t3-actie');
await p.click('text=Actievoorstel vastleggen');await p.waitForTimeout(300);
await p.click('text=Nee, naar het gesprek met de monteurs');await p.waitForTimeout(300);
await p.click('text=Naar afronden');await p.waitForTimeout(300);
await S('t4-klaar');
// herstel na herladen
await p.reload();await p.waitForTimeout(900);
console.log('na reload lopend:', await ev(()=>!!App.state.inspectie && App.state.inspectie.stap));
await ev(()=>App.goIns());await p.waitForTimeout(300);
await p.click('text=Inspectie vastleggen');await p.waitForTimeout(300);
console.log('modal:', await p.locator('#mod').innerText().then(t=>t.slice(0,200)));
await p.click('button:has-text("Toch vastleggen")');await p.waitForTimeout(500);
console.log('na opslaan:', (await p.locator('#mod').innerText()).slice(0,200));
const rid=await ev(async()=>{const r=await (await indexedDB.databases(), null);return null});
// Winfred stelt in
await ev(()=>{App.closeModal();return App.login('u-winfred')});await p.waitForTimeout(600);
await S('t5-vandaag-winfred');
await ev(()=>{App.actFilter='instellen';App.go('acties')});await p.waitForTimeout(500);
await S('t6-instellen');
const ids=await ev(()=>App.acties.filter(a=>a.status==='Voorstel').map(a=>a.id));console.log('voorstellen',ids);
const nid=ids.find(i=>!i.includes('demo'));
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(300);
console.log('MOD', JSON.stringify((await p.locator('#mod').innerText()).slice(0,400)), 'ov', await ev(()=>document.getElementById('ov').className), errs);
await p.selectOption('#ai-houder','u-douwe');await p.selectOption('#ai-toetser','u-douwe');
await p.click('text=Actie instellen');await p.waitForTimeout(200);
console.log('fout:', await p.locator('#ai-fout').textContent());
await S('t7-fout');
await p.selectOption('#ai-toetser','u-winfred');await p.click('text=Actie instellen');await p.waitForTimeout(400);
console.log('status na instellen', await ev((id)=>App.acties.find(a=>a.id===id).status,nid));
// Douwe voert uit
await ev(()=>App.login('u-douwe'));await p.waitForTimeout(400);
await ev((id)=>{App.go('acties');},nid);await p.waitForTimeout(400);
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(300);
await S('t8-houder');
await p.click('text=Klaar voor toetsing, zonder foto');await p.waitForTimeout(400);
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(200);
console.log('douwe ziet:', (await p.locator('#mod .hint').textContent()));
// Winfred toetst
await ev(()=>{App.closeModal();return App.login('u-winfred')});await p.waitForTimeout(400);
await ev(()=>{App.actFilter='toetsen';App.go('acties')});await p.waitForTimeout(400);
await S('t9-toetsen');
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(200);
await p.click('text=Niet akkoord · terug naar actiehouder');await p.waitForTimeout(200);
console.log('reden-fout:', await p.locator('#ai-fout').textContent());
await p.click('text=Akkoord na toetsing · afronden');await p.waitForTimeout(400);
console.log('eind', await ev((id)=>{const a=App.acties.find(a=>a.id===id);return a.status+' | '+a.log.map(l=>l.wat).join(' / ')},nid));
// rapport
const rep=await ev(async()=>{const all=await new Promise(r=>{const q=indexedDB.open('wpi');q.onsuccess=()=>{const g=q.result.transaction('inspecties').objectStore('inspecties').getAll();g.onsuccess=()=>r(g.result)}});return all[0].id});
await ev((id)=>{location.hash='#/rapport/'+id},rep);await p.waitForTimeout(700);
await p.screenshot({path:'t10-rapport.png',fullPage:true});
// dashboard + weergave
await ev(()=>{App.dashFilter.locatie='';App.go('dashboard')});await p.waitForTimeout(500);
await ev(()=>{App.pref={veld:true,zon:true};App.pasPrefToe();App.startInspectie('DAM','x','Damwand test',true)});await p.waitForTimeout(400);
await S('t11-veldzon');
console.log('ERRS',errs);
await b.close();})();
