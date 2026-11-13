const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
const S=(n)=>p.screenshot({path:n+'.png'});
const ev=(f,a)=>p.evaluate(f,a);
await p.goto(''+(process.env.BASE||'http://localhost:8140')+'/index.html');await p.waitForTimeout(800);
await ev(()=>App.login('u-hoofd2'));   // inspecteert: hoofd met functie Manager Projects (de rol inspecteur bestaat niet meer)
await p.waitForTimeout(400);
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
if (await p.locator('#kv-tp-groep').count()) await p.locator('#kv-tp-groep .kvlak').nth(3).click();   // direct gevaar: eerst "Wat heb je ter plaatse gedaan?" kiezen (vastleggen zonder antwoord kan niet meer, js/inspectie.js)
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
const naOpslaan=await p.locator('#mod').innerText();console.log('na opslaan:', naOpslaan.slice(0,200));
// "Vastgelegd": in de voorbeeldmodus eerlijk dat er geen server is (de tekst staat op één plek: App.vastgelegdTekst in js/sync.js)
if(!/Vastgelegd/.test(naOpslaan)||!/voorbeeldmodus: er is geen server/.test(naOpslaan)||/cloud-opslag volgt/.test(naOpslaan))errs.push('Vastgelegd-venster: tekst klopt niet in de voorbeeldmodus: '+naOpslaan.slice(0,160));
const rid=await ev(async()=>{const r=await (await indexedDB.databases(), null);return null});
// Winfred stelt in
await ev(()=>{App.closeModal();return App.login('u-coord1')});await p.waitForTimeout(600);
await S('t5-vandaag-winfred');
await ev(()=>{App.actFilter='instellen';App.go('acties')});await p.waitForTimeout(500);
await S('t6-instellen');
const ids=await ev(()=>App.acties.filter(a=>a.status==='Voorstel').map(a=>a.id));console.log('voorstellen',ids);
const nid=ids.find(i=>!i.includes('demo'));
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(300);
console.log('MOD', JSON.stringify((await p.locator('#mod').innerText()).slice(0,400)), 'ov', await ev(()=>document.getElementById('ov').className), errs);
await p.selectOption('#ai-houder','u-coord2');await p.selectOption('#ai-toetser','u-coord2');
await p.click('text=Actie instellen');await p.waitForTimeout(200);
const fout1=await p.locator('#ai-fout').textContent();console.log('fout:', fout1);if(!fout1.trim())errs.push('METHODE: toetser = actiehouder niet geweigerd');
await S('t7-fout');
await p.selectOption('#ai-toetser','u-coord1');await p.click('text=Actie instellen');await p.waitForTimeout(400);
const st1=await ev((id)=>App.acties.find(a=>a.id===id).status,nid);console.log('status na instellen', st1);if(st1!=='Open')errs.push('METHODE: status na instellen '+st1+', verwacht Open');
// Douwe voert uit
await ev(()=>App.login('u-coord2'));await p.waitForTimeout(400);
await ev((id)=>{App.go('acties');},nid);await p.waitForTimeout(400);
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(300);
await S('t8-houder');
await p.click('text=Klaar voor toetsing, zonder foto');await p.waitForTimeout(400);
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(200);
console.log('douwe ziet:', (await p.locator('#mod .hint').textContent()));
// Winfred toetst
await ev(()=>{App.closeModal();return App.login('u-coord1')});await p.waitForTimeout(400);
await ev(()=>{App.actFilter='toetsen';App.go('acties')});await p.waitForTimeout(400);
await S('t9-toetsen');
await ev((id)=>App.openActie(id),nid);await p.waitForTimeout(200);
await p.click('text=Niet akkoord · terug naar actiehouder');await p.waitForTimeout(200);
const fout2=await p.locator('#ai-fout').textContent();console.log('reden-fout:', fout2);if(!fout2.trim())errs.push('METHODE: niet akkoord zonder reden niet geweigerd');
await p.click('text=Akkoord na toetsing · afronden');await p.waitForTimeout(400);
const eind=await ev((id)=>{const a=App.acties.find(a=>a.id===id);return a.status+' | '+a.log.map(l=>l.wat).join(' / ')},nid);console.log('eind', eind);if(!/^Afgerond \|/.test(eind)||!/Getoetst en akkoord/.test(eind))errs.push('METHODE: na akkoord van de toetser niet Afgerond: '+eind.slice(0,80));
// rapport
const rep=await ev(async()=>{const all=await new Promise(r=>{const q=indexedDB.open('wpi');q.onsuccess=()=>{const g=q.result.transaction('inspecties').objectStore('inspecties').getAll();g.onsuccess=()=>r(g.result)}});return all[0].id});
await ev((id)=>{location.hash='#/rapport/'+id},rep);await p.waitForTimeout(700);
await p.screenshot({path:'t10-rapport.png',fullPage:true});
// meerdere foto's per waarneming (overzicht + detail): beide moeten in het rapport staan
{const png=async(k)=>Buffer.from(await ev((k)=>{const c=document.createElement('canvas');c.width=320;c.height=240;const g=c.getContext('2d');g.fillStyle=k;g.fillRect(0,0,320,240);return c.toDataURL('image/png').split(',')[1]},k),'base64');
await ev(()=>{App.startInspectie('DAM','P26-168','Foto-test',true);App.kiesTaak(App.data.kennisbank.DAM.regels[0].taak)});await p.waitForTimeout(300);
await p.fill('#f-zie','afzetting bij de bouwput is weg');
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('.fotogroot')]);
await fc.setFiles([{name:'a.png',mimeType:'image/png',buffer:await png('#c00')},{name:'b.png',mimeType:'image/png',buffer:await png('#0a0')}]);await p.waitForTimeout(900);
const nf=await ev(()=>App.fotoLijst(App.state.inspectie.cur).length);if(nf!==2)errs.push('FOTO: 2 foto\'s verwacht bij de waarneming, '+nf);
await ev(()=>{App.state.inspectie.cur.regel_id=App.state.inspectie.cur.regel_id||App.data.kennisbank.DAM.regels[0].id;App.oordeel('C')});await p.waitForTimeout(300);
await ev(()=>App.bewaarInspectie(true));await p.waitForTimeout(800);await ev(()=>App.closeModal());await p.waitForTimeout(500);
const nr=await p.locator('#rap .rapfotos img').count();console.log('rapport-fotos:',nr);if(nr!==2)errs.push('RAPPORT: 2 foto\'s bij één waarneming verwacht, gevonden '+nr);}
// dashboard + weergave
await ev(()=>{App.dashFilter.locatie='';App.go('dashboard')});await p.waitForTimeout(500);
await ev(()=>{App.pref={veld:true,zon:true};App.pasPrefToe();App.startInspectie('DAM','x','Damwand test',true)});await p.waitForTimeout(400);
await S('t11-veldzon');
console.log('ERRS',errs);
await b.close();})();
