// Werkplekinspectie — tests/inactief.js: uitloggen na 2 uur zonder activiteit (vervangt de sessie-time-box van het
// Supabase Pro-plan; js/auth.js, INACTIEF_MS). Met een nepklok (Playwright page.clock):
//   1. voorbeeldmodus, telefoon: na 2 uur niets doen uitgelogd, lopende inspectie bewaard als concept en terug na inloggen;
//   2. activiteit (toets, tik, scroll) houdt je ingelogd; activiteit in een ANDER tabblad ook (gedeelde tijdstempel);
//   3. terugkomen na meer dan 2 uur (herladen met een bewaarde voorbeeld-login, of tabblad weer zichtbaar): meteen uit;
//   3b. klok die voorliep en is teruggezet (NTP/handmatig): de tijdstempel in de toekomst gaat terug naar nu, dus uit na 2 uur;
//   3c. localStorage onbruikbaar (lezen/schrijven gooit, of vol met een oude waarde): klok in het geheugen, dus wel uit na
//       2 uur niets en niet uit midden in het werk;
//   3d. twee tabbladen met dezelfde lopende inspectie: na het uitloggen blijft het nieuwste werk (geen oude kopie erover);
//   4. met backend (tools/mock_supabase.py op SYNC_PORT+2), computer: uitgelogd met de melding, sessie weg, de
//      wachtrij (outbox) en de lopende inspectie blijven bewaard en gaan mee bij de volgende login.
//   BASE=http://127.0.0.1:<poort> SYNC_PORT=<p> node tests/inactief.js     → eindigt met "errs []"
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8140';
const MPORT = +(process.env.SYNC_PORT || 8331) + 2, MBASE = `http://127.0.0.1:${MPORT}`;
const MOCK = path.join(__dirname, '..', '..', 'tools', 'mock_supabase.py');
const errs = [];
const ok = (c, wat, extra) => { console.log((c ? 'OK   ' : 'FOUT ') + wat + (!c && extra !== undefined ? ' · ' + JSON.stringify(extra).slice(0, 300) : '')); if (!c) errs.push(wat); };
const MIN = 60 * 1000, UUR = 60 * MIN;
const MELDING = 'Je bent na 2 uur zonder activiteit uitgelogd.';
(async () => {
  const b = await chromium.launch();
  const pagina = async (ctx, naam) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(naam + ' PAGEERR ' + e.message)); return p; };
  const T0 = new Date('2026-11-16T08:00:00');
  try {
    // ---------- 1 en 2: voorbeeldmodus, telefoon ----------
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const p = await pagina(ctx, 'tel');
    await p.clock.install({ time: T0 });
    await p.goto(BASE + '/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => App.login('u-coord1')); await p.waitForTimeout(500);
    ok(await p.evaluate(() => App.INACTIEF_MS) === 2 * 60 * 60 * 1000, 'één constante: INACTIEF_MS = 2 uur');
    await p.evaluate(() => { App.startInspectie('DAM', 'Testproject', 'test', true); App.state.inspectie.notitie = 'nog niet vastgelegd'; App.bewaarConcept(true); });
    await p.clock.runFor(1000);
    await p.clock.runFor(1 * UUR + 50 * MIN);
    await p.keyboard.press('Shift'); await p.clock.runFor(1000);
    await p.clock.runFor(30 * MIN);
    ok(await p.evaluate(() => App.user && App.user.id === 'u-coord1'), 'na 1:50 een toets en daarna 30 min: nog ingelogd (activiteit telt)');
    await p.mouse.wheel(0, 200); await p.clock.runFor(16 * 1000);
    await p.clock.runFor(1 * UUR + 30 * MIN);
    ok(await p.evaluate(() => !!App.user), 'scrollen telt ook als activiteit');
    // tweede tabblad: daar werken houdt dit tabblad ook ingelogd
    const p2 = await pagina(ctx, 'tel2');
    await p2.clock.install({ time: await p.evaluate(() => Date.now()) });
    await p2.goto(BASE + '/index.html'); await p2.waitForTimeout(600);
    ok(await p2.evaluate(() => App.user && App.user.id === 'u-coord1'), 'tweede tabblad: zelfde voorbeeld-login');
    await p2.mouse.click(5, 300); await p2.clock.runFor(1000);   // p zelf staat al 1,5 uur stil
    // (de nepklok hoort bij de context, dus bij beide tabbladen: één runFor per stap; 3 × 50 min = 2,5 uur)
    for (let i = 0; i < 3; i++) { await p.clock.runFor(50 * MIN); await p2.mouse.click(5, 300); await p.clock.runFor(16 * 1000); }
    await p.clock.runFor(2 * MIN);
    ok(await p.evaluate(() => !!App.user), 'activiteit in een ander tabblad (2,5 uur) houdt ook dit tabblad ingelogd');
    await p2.close();
    // nu echt 2 uur niets
    await p.clock.runFor(2 * UUR + 2 * MIN);
    const v = await p.locator('#view').innerText();
    ok(await p.evaluate(() => App.user === null) && v.includes(MELDING), 'na 2 uur niets doen: uitgelogd, inlogscherm met de melding', v.slice(0, 200));
    ok(v.includes('Je lopende inspectie is bewaard; log opnieuw in om verder te gaan.'), 'melding stelt gerust: de lopende inspectie is bewaard', v.slice(0, 300));
    const concept = await p.evaluate(async () => { const c = await WPI.DB.get('concept', 'lopend-u-coord1'); return c && c.ins && c.ins.notitie; });
    ok(concept === 'nog niet vastgelegd', 'lopende inspectie bewaard als concept', concept);
    await p.screenshot({ path: 'inactief-telefoon.png' });
    await p.evaluate(() => App.login('u-coord1')); await p.waitForTimeout(400);
    ok(await p.evaluate(() => App.state.inspectie && App.state.inspectie.notitie === 'nog niet vastgelegd'), 'opnieuw inloggen: de inspectie gaat verder waar hij was');
    ok(!(await p.locator('#view').innerText()).includes(MELDING), 'na opnieuw inloggen: geen melding meer');
    // ---------- 3: terugkomen na meer dan 2 uur ----------
    await p.evaluate(() => localStorage.setItem('wpi_laatste_activiteit', String(Date.now() - 3 * 60 * 60 * 1000)));
    await p.reload(); await p.waitForTimeout(800);
    const v3 = await p.locator('#view').innerText();
    ok(await p.evaluate(() => App.user === null) && v3.includes(MELDING), 'herladen na 3 uur (bewaarde voorbeeld-login): meteen uitgelogd met de melding');
    await p.evaluate(() => App.login('u-hoofd')); await p.waitForTimeout(400);
    // tabblad 2 uur en een seconde weg (telefoon op slot: geen timers), dan weer zichtbaar
    await p.clock.setSystemTime(new Date(Date.parse(await p.evaluate(() => new Date().toISOString())) + 2 * UUR + 1000));
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(200);
    ok(await p.evaluate(() => App.user === null), 'tabblad weer zichtbaar na meer dan 2 uur: meteen uitgelogd');
    ok(!(await p.locator('#view').innerText()).includes('lopende inspectie is bewaard'), 'zonder open inspectie: geen zin over een bewaarde inspectie');
    await ctx.close();

    // ---------- 3b: klok liep voor en is teruggezet ----------
    {
      const cs = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const k = await pagina(cs, 'klok');
      await k.clock.install({ time: new Date(T0.getTime() + 24 * UUR) });   // klok loopt een dag voor
      await k.goto(BASE + '/index.html'); await k.waitForTimeout(600);
      await k.evaluate(() => App.login('u-coord1')); await k.waitForTimeout(300);
      await k.mouse.click(5, 300); await k.clock.runFor(1000);
      ok(await k.evaluate(() => +localStorage.getItem('wpi_laatste_activiteit')) > T0.getTime() + 23 * UUR, 'klok: laatste activiteit staat (verkeerd) een dag vooruit');
      await k.clock.setSystemTime(T0);   // klok gecorrigeerd (NTP of handmatig)
      await k.clock.runFor(1 * UUR + 55 * MIN);
      ok(await k.evaluate(() => !!App.user && +localStorage.getItem('wpi_laatste_activiteit') < Date.now()), 'klok teruggezet: de tijdstempel in de toekomst is teruggezet op het moment van de correctie');
      await k.clock.runFor(10 * MIN);
      await k.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await k.waitForTimeout(200);
      ok(await k.evaluate(() => App.user === null), 'klok teruggezet en daarna 2 uur niets gedaan: uitgelogd (niet pas na voorsprong + 2 uur)');
      // een kleine correctie (NTP: een paar minuten) logt niemand uit
      await k.evaluate(() => App.login('u-coord1')); await k.waitForTimeout(200);
      await k.mouse.click(5, 300); await k.clock.runFor(1000);
      await k.clock.setSystemTime(new Date(Date.parse(await k.evaluate(() => new Date().toISOString())) - 2 * MIN));
      await k.clock.runFor(1000);
      await k.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await k.waitForTimeout(200);
      ok(await k.evaluate(() => !!App.user), 'klok 2 minuten teruggezet (gewone NTP-correctie): nog ingelogd');
      await cs.close();
    }

    // ---------- 3c: localStorage onbruikbaar (privévenster, geblokkeerd, vol): de klok telt in het geheugen door ----------
    {
      const blok = (modus) => `(() => { const K = 'wpi_laatste_activiteit', g = Storage.prototype.getItem, z = Storage.prototype.setItem;
        ${modus === 'vol' ? "try { z.call(localStorage, K, String(Date.now() - 3 * 3600000)); } catch (e) {}" : ''}
        Storage.prototype.getItem = function (k) { if (k === K && '${modus}' === 'kapot') throw new DOMException('geblokkeerd', 'SecurityError'); return g.call(this, k); };
        Storage.prototype.setItem = function (k, v) { if (k === K) throw new DOMException('vol', 'QuotaExceededError'); return z.call(this, k, v); }; })()`;
      for (const modus of ['kapot', 'vol']) {
        const cs = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        await cs.addInitScript(blok(modus));
        const k = await pagina(cs, 'opslag-' + modus);
        await k.clock.install({ time: T0 });
        await k.goto(BASE + '/index.html'); await k.waitForTimeout(600);
        await k.evaluate(() => App.login('u-coord1')); await k.waitForTimeout(300);
        if (modus === 'vol') {
          ok(await k.evaluate(() => +localStorage.getItem('wpi_laatste_activiteit') < Date.now() - 2 * 3600000), 'opslag vol: er staat een oude waarde die niet te overschrijven is');
          for (let i = 0; i < 3; i++) { await k.clock.runFor(50 * MIN); await k.mouse.click(5, 300); await k.clock.runFor(16 * 1000); }
          ok(await k.evaluate(() => App.user && App.user.id === 'u-coord1'), 'opslag vol (oude waarde leesbaar): wie doorwerkt, wordt niet midden in het werk uitgelogd');
        }
        await k.clock.runFor(1 * UUR + 50 * MIN);
        ok(await k.evaluate(() => !!App.user), 'opslag ' + modus + ': na 1:50 niets nog ingelogd');
        await k.clock.setSystemTime(new Date(Date.parse(await k.evaluate(() => new Date().toISOString())) + 4 * UUR));
        await k.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await k.waitForTimeout(200);
        ok(await k.evaluate(() => App.user === null) && (await k.locator('#view').innerText()).includes(MELDING),
          'opslag ' + modus + ': na ruim 2 uur niets toch uitgelogd (klok in het geheugen, niet "nooit uitloggen")');
        await cs.close();
      }
    }

    // ---------- 3d: twee tabbladen, beide uitgelogd: het nieuwste werk blijft (geen oude kopie eroverheen) ----------
    {
      const cs = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const a = await pagina(cs, 'tabA');
      await a.clock.install({ time: T0 });
      await a.goto(BASE + '/index.html'); await a.waitForTimeout(600);
      await a.evaluate(() => App.login('u-coord1')); await a.waitForTimeout(300);
      await a.evaluate(() => { App.startInspectie('DAM', 'Testproject', 'twee tabs', true); App.state.inspectie.notitie = 'v1'; App.bewaarConcept(true); });
      await a.clock.runFor(1000);
      const t2 = await pagina(cs, 'tabB');
      await t2.clock.install({ time: await a.evaluate(() => Date.now()) });
      await t2.goto(BASE + '/index.html'); await t2.waitForTimeout(600);
      ok(await t2.evaluate(() => App.state.inspectie && App.state.inspectie.notitie === 'v1'), 'tweede tabblad: dezelfde lopende inspectie');
      await t2.evaluate(() => { App.state.inspectie.notitie = 'v2'; App.bewaarConcept(true); });
      await a.clock.runFor(1000);
      ok(await a.evaluate(async () => (await WPI.DB.get('concept', 'lopend-u-coord1')).ins.notitie) === 'v2', 'tabblad B bewaarde v2 op het toestel');
      await a.clock.runFor(2 * UUR + 3 * MIN); await a.waitForTimeout(300);
      ok(await a.evaluate(() => App.user === null) && await t2.evaluate(() => App.user === null), 'beide tabbladen uitgelogd');
      const nu2 = await a.evaluate(async () => (await WPI.DB.get('concept', 'lopend-u-coord1')).ins.notitie);
      ok(nu2 === 'v2', 'het nieuwste werk (v2) blijft; het oude tabblad zet zijn kopie (v1) er niet overheen', nu2);
      await a.evaluate(() => App.login('u-coord1')); await a.waitForTimeout(300);
      ok(await a.evaluate(() => App.state.inspectie && App.state.inspectie.notitie === 'v2'), 'opnieuw inloggen: verder met v2');
      // en het andere geval: het tabblad met het nieuwste werk is ook het tabblad dat het concept heeft (één tabblad)
      await a.evaluate(() => { App.state.inspectie.notitie = 'v3'; });   // gewijzigd zonder bewaren: bij uitloggen alsnog bewaard
      await a.evaluate(() => App.logout()); await a.waitForTimeout(300);
      ok(await a.evaluate(async () => (await WPI.DB.get('concept', 'lopend-u-coord1')).ins.notitie) === 'v3', 'één tabblad: uitloggen bewaart de laatste stand (niets kwijt)');
      await cs.close();
    }

    // ---------- 4: met backend, computer ----------
    // snel falen (niet tot de time-out van run-all wachten) als de mock niet start, bijv. omdat MPORT al bezet is
    const bezet = await new Promise((r) => { const sk = net.connect(MPORT, '127.0.0.1'); sk.once('connect', () => { sk.destroy(); r(true); }); sk.once('error', () => r(false)); });
    if (bezet) throw new Error(`poort ${MPORT} (SYNC_PORT+2) is al in gebruik: de mock-Supabase kan niet starten`);
    const mock = spawn('python3', [MOCK, '--port', String(MPORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
    try {
      await new Promise((r, f) => {
        const tm = setTimeout(() => f(new Error('mock-Supabase gaf binnen 20 s geen teken van leven (poort ' + MPORT + ')')), 20000);
        mock.stdout.once('data', () => { clearTimeout(tm); r(); });
        mock.once('error', (e) => { clearTimeout(tm); f(new Error('mock-Supabase start niet: ' + e.message)); });
        mock.once('exit', (c) => { clearTimeout(tm); f(new Error('mock-Supabase stopte meteen (code ' + c + '); poort ' + MPORT + ' bezet?')); });
      });
      const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      const w = await pagina(c2, 'web');
      await w.clock.install({ time: new Date() });
      await w.goto(MBASE + '/index.html'); await w.waitForTimeout(800);
      await w.fill('#l-mail', 'carla@noardling.test'); await w.fill('#l-ww', 'Veilig-Wachtwoord-2026'); await w.locator('#l-onthoud').setChecked(true);
      await w.click('#l-knop'); await w.clock.runFor(3000); await w.waitForTimeout(800);
      ok(await w.evaluate(() => App.user && App.user.full_name === 'Carla Proef'), 'backend: ingelogd');
      await c2.setOffline(true);
      await w.evaluate(async () => { await WPI.DB.put('planning', { id: 'PL-' + Date.now() + '-inact', datum: new Date().toISOString().slice(0, 10), code: 'DAM', inspecteur: App.user.id, status: 'gepland' });
        App.startInspectie('DAM', 'Project', 'x', true); App.state.inspectie.notitie = 'offline bezig'; App.bewaarConcept(true); });
      await w.clock.runFor(1000);
      const voor = await w.evaluate(() => App.syncWachtrij());
      await w.clock.runFor(2 * UUR + 2 * MIN);
      const vw = await w.locator('#view').innerText();
      ok(await w.evaluate(() => App.user === null) && vw.includes(MELDING), 'backend: na 2 uur uitgelogd met de melding', vw.slice(0, 200));
      ok(vw.includes('lopende inspectie is bewaard') && vw.includes('Zonder internet kun je pas weer inloggen als je bereik hebt'), 'backend zonder bereik: melding zegt dat het werk bewaard is en dat inloggen bereik vraagt', vw.slice(0, 400));
      ok(await w.evaluate(() => !localStorage.getItem('wpi_sessie') && !sessionStorage.getItem('wpi_sessie')), 'backend: bewaarde sessie weg');
      const ob = await w.evaluate(() => new Promise((res) => { const r = indexedDB.open('wpi'); r.onsuccess = () => { const q = r.result.transaction('outbox').objectStore('outbox').getAll(); q.onsuccess = () => res(q.result.length); }; }));
      ok(voor >= 1 && ob === voor, 'backend: de wachtrij is niet gewist (' + ob + ' van ' + voor + ')');
      await w.screenshot({ path: 'inactief-web.png' });
      await c2.setOffline(false);
      await w.fill('#l-mail', 'carla@noardling.test'); await w.fill('#l-ww', 'Veilig-Wachtwoord-2026'); await w.click('#l-knop');
      await w.clock.runFor(5000); await w.waitForTimeout(2500); await w.clock.runFor(3000); await w.waitForTimeout(1000);
      ok(await w.evaluate(() => App.user && App.state.inspectie && App.state.inspectie.notitie === 'offline bezig'), 'backend: opnieuw ingelogd, de lopende inspectie is terug');
      const st = await (await fetch(MBASE + '/__mock/state')).json();
      ok(Object.keys(st.tables.planning).some((k) => /-inact$/.test(k)), 'backend: de wijziging uit de wachtrij is alsnog verstuurd');
      await c2.close();
    } finally { mock.kill(); }
  } catch (e) { errs.push('EXC ' + (e && e.message)); console.log('FOUT onverwacht: ' + (e && e.stack)); }
  await b.close();
  console.log('errs ' + JSON.stringify(errs));
  process.exit(errs.length ? 1 : 0);
})();
