// Werkplekinspectie — tests/sync.js: echte login + offline wachtrij + synchronisatie tegen tools/mock_supabase.py.
// Start zelf twee mock-servers (ingevuld en voorbeeldmodus) op SYNC_PORT en SYNC_PORT+1 (standaard 8331/8332).
// Ook: lie-fi (tijdelijke fouten blijven "In wachtrij"), paginering boven max-rows, mislukte foto-download
// (pad blijft, server-foto wordt nooit gewist), opgeslagen XSS via record-jsonb (negatief), gedeeld toestel,
// concept bij geforceerd uitloggen, oude v3-gegevens overnemen, IndexedDB-upgrade geblokkeerd/versionchange,
// ouder/kind-volgorde bij een tijdelijke fout, conflict met een nieuwere serverstand, Nederlandse foutmeldingen,
// lie-fi na herladen (geen "Gesynchroniseerd" zonder contact), opgeslagen XSS via planning (inspecteur → coördinator),
// conflicten per veld samenvoegen (ook met een voorlopende toestelklok; "Niet doorgevoerd" + "Mijn versie toepassen";
// actiehouder offline "Klaar voor toetsing" + verloop), onbekende productcode in de planning, profiel tijdelijk
// onbereikbaar (503) bij herladen en inloggen, gedeeld toestel: tabblad dicht zonder uitloggen → volgende gebruiker
// (ophalen mislukt) ziet niets van de vorige; uitloggen tijdens het ophalen; vraag "Is dit je eigen telefoon?";
// na "Ja" zonder bereik opnieuw openen (service worker) + chip bij een koude start met wachtrij; blijvende weigering
// bekijken en weggooien (leesbare naam); op de server verwijderd → niet vanzelf opnieuw aangemaakt; twee tabbladen
// van verschillende gebruikers tegelijk (ook als een tabblad het storage-event mist); links uit een e-mail (nep-token,
// ander type, ander account, eigen account + Annuleren) wissen niets en loggen niemand als een ander in; PKCE-herstel.
//   cd <scratch> && node /home/user/Werkplekinspectie.nl/webapp/tests/sync.js      → eindigt met "errs []"
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const PORT = +(process.env.SYNC_PORT || 8331);
const BASE = `http://127.0.0.1:${PORT}`, DEMO = `http://127.0.0.1:${PORT + 1}`;
const MOCK = path.join(__dirname, '..', '..', 'tools', 'mock_supabase.py');
const WW = 'Veilig-Wachtwoord-2026';
const errs = [];
const ok = (cond, wat) => { console.log((cond ? 'OK   ' : 'FOUT ') + wat); if (!cond) errs.push(wat); };
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async () => (await fetch(BASE + '/__mock/state')).json();
async function totdat(fn, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch (e) {} await wacht(200); } return false; }
function start(args) {
  const p = spawn('python3', [MOCK, ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((res) => p.stdout.once('data', () => res(p)));
}
function totp(b32) {
  const al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const c of b32.replace(/=+$/, '')) bits += al.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac('sha1', key).update(ctr).digest(), o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}
// JPEG met een EXIF-blok (incl. een herkenbare "GPS"-tekst) dat na het uploaden weg moet zijn
function metExif(jpeg) {
  const tekst = Buffer.from('GPS-GEHEIM 53.2N 5.8E\0');
  const tiff = Buffer.concat([Buffer.from('MM\0\x2a\0\0\0\x08', 'binary'), Buffer.from([0, 0, 0, 0, 0, 0]), tekst]);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const kop = Buffer.from([0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 255]);
  return Buffer.concat([jpeg.subarray(0, 2), kop, app1, jpeg.subarray(2)]);
}
function pagina(ctx, naam) {
  return ctx.newPage().then((p) => {
    p.on('pageerror', (e) => errs.push(naam + ' PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/401|400|403|Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text())) errs.push(naam + ' CONSOLE ' + m.text()); });
    return p;
  });
}
async function token(mail) {
  const r = await fetch(BASE + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: 'mock-anon-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: mail, password: WW }) });
  return (await r.json()).access_token;
}
async function patch(tok, pad, body) {
  const r = await fetch(BASE + '/rest/v1/' + pad, { method: 'PATCH', headers: { apikey: 'mock-anon-key', Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) });
  return r.status;
}
// staat er ergens een on*-attribuut met de payload? (= uit een attribuut gebroken)
const geinjecteerd = (p) => p.evaluate(() => [...document.querySelectorAll('*')].some((n) => [...n.attributes].some((a) => /^on/i.test(a.name) && /__xss/.test(a.value))));
async function verwijder(tok, pad) {
  const r = await fetch(BASE + '/rest/v1/' + pad, { method: 'DELETE', headers: { apikey: 'mock-anon-key', Authorization: 'Bearer ' + tok, Prefer: 'return=minimal' } });
  return r.status;
}
async function rest(tok, pad, body) {
  const r = await fetch(BASE + '/rest/v1/' + pad, { method: 'POST', headers: { apikey: 'mock-anon-key', Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(body) });
  return r.status;
}
const FOTOPAD = /^[0-9a-f-]{36}\/[0-9a-f]{64}\.jpg$/;
async function inloggen(p, mail, ww = WW, onthoud = true) {
  await p.fill('#l-mail', mail); await p.fill('#l-ww', ww);
  if (await p.locator('#l-onthoud').count()) await p.locator('#l-onthoud').setChecked(onthoud);
  await p.click('#l-knop'); await p.waitForTimeout(500);
}

(async () => {
  const mock = await start(['--port', String(PORT)]), demo = await start(['--port', String(PORT + 1), '--demo']);
  const b = await chromium.launch();
  try {
    const opt = { viewport: { width: 390, height: 844 }, serviceWorkers: 'block' };
    // ---------- 1. inlogscherm met backend ----------
    const ctx = await b.newContext(opt), p = await pagina(ctx, 'insp');
    await p.goto(BASE + '/index.html'); await p.waitForTimeout(900);
    ok(await p.locator('#l-mail').count() === 1, 'echt inlogscherm (e-mail + wachtwoord)');
    ok(!(await p.locator('#view').innerText()).includes('Kies je account'), 'geen voorbeeld-accountkiezer met backend');
    ok(await p.locator('#l-onthoud').isChecked() === false, '"Ingelogd blijven" staat standaard uit');
    ok(await p.locator('#l-form[novalidate]').count() === 1, 'inlogformulier: novalidate (eigen Nederlandse meldingen)');
    await p.fill('#l-mail', 'geen-adres'); await p.fill('#l-ww', 'x'); await p.click('#l-knop'); await p.waitForTimeout(200);
    ok(/geldig e-mailadres/.test(await p.locator('#l-fout').innerText()), 'ongeldig e-mailadres: Nederlandse melding');
    await p.evaluate(() => localStorage.removeItem('wpi_login_pogingen'));
    await p.evaluate(() => App.login('u-insp')); await p.waitForTimeout(200);
    ok(await p.evaluate(() => App.user === null), 'App.login(demo-id) werkt niet met backend');

    // ---------- 2. mislukte pogingen → wachttijd + beveiligingsmelding ----------
    for (let i = 0; i < 3; i++) await inloggen(p, 'inspecteur@noardling.test', 'fout-' + i);
    const slot = await p.locator('#l-fout').innerText();
    ok(/Te veel mislukte pogingen\. Probeer het over 0:\d\d opnieuw/.test(slot), 'na 3 fouten wachttijd: ' + slot);
    ok(await p.locator('#l-knop').isDisabled(), 'inlogknop uitgeschakeld tijdens wachttijd');
    await p.evaluate(() => localStorage.setItem('wpi_login_pogingen', JSON.stringify({ n: 4, laatst: 0, sinds: Date.now() - 60000 })));
    await inloggen(p, 'inspecteur@noardling.test', 'nog-fout');   // 5e poging → melding in de wachtrij
    ok((await p.evaluate(() => localStorage.getItem('wpi_beveiliging_wachtrij') || '')).includes('login_herhaald_mislukt'), 'beveiligingsmelding klaargezet na 5 fouten');
    await p.evaluate(() => localStorage.setItem('wpi_login_pogingen', JSON.stringify({ n: 5, laatst: 0, sinds: Date.now() - 60000 })));
    await p.reload(); await p.waitForTimeout(700);

    // ---------- 3. inloggen als inspecteur ----------
    await inloggen(p, 'inspecteur@noardling.test'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => App.user && App.user.role === 'inspecteur' && App.user.full_name === 'Ingrid Inspecteur'), 'ingelogd, rol uit profiles');
    ok(await p.evaluate(() => WPI.USERS.length === 4 && !WPI.USERS.some((u) => u.id === 'u-insp')), 'USERS = actieve profielen (geen demo-accounts)');
    ok(await totdat(async () => (await state()).security_events.some((e) => e.soort === 'login_herhaald_mislukt')), 'report_security_event: login_herhaald_mislukt verstuurd na login');
    ok((await state()).security_events.some((e) => e.soort === 'login_na_mislukte_pogingen'), 'report_security_event: login_na_mislukte_pogingen');
    ok(await p.evaluate(() => !localStorage.getItem('wpi_login_pogingen')), 'teller mislukte pogingen gereset');
    ok(await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('wpi_sessie') || '{}'); return !!s.rt && !JSON.stringify(s).includes('access'); }), 'alleen refresh-token bewaard (geen access-token)');
    // het wachtwoord staat nergens in de browseropslag: localStorage, sessionStorage en ELKE store van ELKE
    // IndexedDB-database van deze origin (nu: wpi met inspecties, acties, planning, concept, outbox, syncmeta)
    const ww = await p.evaluate(async (ww) => {
      const alles = [JSON.stringify(Object.assign({}, localStorage)), JSON.stringify(Object.assign({}, sessionStorage))], stores = [];
      const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: 'wpi' }];
      for (const { name } of dbs) {
        const db = await new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        for (const st of Array.from(db.objectStoreNames)) {
          stores.push(name + '/' + st);
          alles.push(await new Promise((res) => { const q = db.transaction(st, 'readonly').objectStore(st).getAll(); q.onsuccess = () => res(JSON.stringify(q.result)); q.onerror = () => res(''); }));
        }
        db.close();
      }
      return { stores, gevonden: alles.some((t) => t.includes(ww)) };
    }, WW);
    ok(['inspecties', 'acties', 'planning', 'concept', 'outbox', 'syncmeta'].every((s) => ww.stores.includes('wpi/' + s)), 'wachtwoordcheck leest alle IndexedDB-stores (' + ww.stores.join(', ') + ')');
    ok(!ww.gevonden, 'wachtwoord nergens in localStorage/sessionStorage/IndexedDB (alle stores)');
    ok(await p.evaluate(async () => (await WPI.DB.getAll('acties')).every((a) => !a.demo) && (await WPI.DB.getAll('planning')).every((x) => !x.demo)), 'geen fictieve voorbeelddata met backend');
    ok(await totdat(async () => /Gesynchroniseerd/.test(await p.locator('#syncchip').innerText())), 'statuschip: Gesynchroniseerd');

    // ---------- 4. offline een inspectie met foto vastleggen ----------
    const jpeg = Buffer.from(await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.fillStyle = '#2F5D50'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#FCEBD3'; g.fillRect(40, 40, 120, 90); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; }), 'base64');
    const foto = metExif(jpeg);
    ok(foto.includes('Exif') && foto.includes('GPS-GEHEIM'), 'testfoto bevat EXIF');
    await ctx.setOffline(true); await p.waitForTimeout(200);
    await p.evaluate(() => App.startInspectie('DAM', 'P26-168', 'Damwand · RWZI Voorbeeldstad')); await p.waitForTimeout(300);
    await p.fill('#f-taak', 'ze halen de damwand eruit met de kraan'); await p.waitForTimeout(200);
    await p.locator('#taakvs .pick').first().click(); await p.waitForTimeout(300);
    await p.fill('#f-zie', 'hijsband is rafelig en monteur staat onder de last'); await p.waitForTimeout(300);
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => App.addFoto())]);
    await fc.setFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: foto }); await p.waitForTimeout(800);
    ok(await p.evaluate(() => !!(App.state.inspectie.cur && App.state.inspectie.cur.foto)), 'foto toegevoegd');
    ok(/Veilig op dit toestel/.test(await p.locator('#opslag').innerText()), 'opslagchip lopende inspectie: Veilig op dit toestel');
    await p.click('text=Volgende: koppel aan de TRA'); await p.waitForTimeout(500);
    await p.locator('.q .pick').first().click(); await p.waitForTimeout(300);
    await p.click('.seg button.t-A'); await p.waitForTimeout(600);
    await p.click('text=Actievoorstel vastleggen'); await p.waitForTimeout(300);
    await p.click('text=Nee, naar het gesprek met de monteurs'); await p.waitForTimeout(300);
    await p.click('text=Naar afronden'); await p.waitForTimeout(300);
    await p.click('text=Inspectie vastleggen'); await p.waitForTimeout(300);
    if (await p.locator('button:has-text("Toch vastleggen")').count()) { await p.click('button:has-text("Toch vastleggen")'); await p.waitForTimeout(600); }
    const mod = await p.locator('#mod').innerText();
    ok(/klaargezet voor de server/.test(mod) && !/cloud-opslag volgt/.test(mod), 'Vastgelegd-venster noemt de wachtrij');
    const rid = await p.evaluate(async () => (await WPI.DB.all()).map((r) => r.id).find((i) => i.startsWith('WPI-')));
    ok(!!rid, 'inspectie lokaal bewaard: ' + rid);
    ok(/In wachtrij/.test(await p.locator('#syncchip').innerText()), 'statuschip offline: ' + await p.locator('#syncchip').innerText());
    ok(await p.evaluate((id) => App.syncStatus('inspecties', id), rid) === 'wachtrij', 'recordstatus: wachtrij');
    await p.evaluate((id) => { App.closeModal(); location.hash = '#/rapport/' + id; }, rid); await p.waitForTimeout(600);
    ok(/In wachtrij/.test(await p.locator('#view [data-sync]').innerText()), 'rapport toont "In wachtrij"');
    ok((await state()).tables.inspecties[rid] === undefined, 'offline: nog niets op de server');
    await p.screenshot({ path: 'sync-offline.png' });

    // ---------- 5. weer online → Gesynchroniseerd ----------
    await ctx.setOffline(false);
    ok(await totdat(async () => /Gesynchroniseerd/.test(await p.locator('#view [data-sync]').innerText())), 'rapport toont "Gesynchroniseerd"');
    ok(/Gesynchroniseerd/.test(await p.locator('#syncchip').innerText()), 'statuschip online: Gesynchroniseerd');
    await p.screenshot({ path: 'sync-online.png' });
    const s1 = await state(), rij = s1.tables.inspecties[rid];
    ok(!!rij && rij.inspecteur_id === '00000000-0000-4000-8000-000000000001', 'mock ontving de inspectie');
    ok(rij && !JSON.stringify(rij).includes('data:image'), 'geen data-URL in de database (alleen paden)');
    const w0 = rij && rij.record.waarnemingen[0];
    ok(w0 && /^00000000-0000-4000-8000-000000000001\/[0-9a-f]{64}\.jpg$/.test(w0.foto), 'foto als storagepad <uid>/<sha>.jpg: ' + (w0 && w0.foto));
    const f = s1.fotos.find((x) => w0 && x.pad === w0.foto);
    ok(!!f && f.mime === 'image/jpeg' && f.grootte > 500, 'mock ontving de foto');
    ok(f && f.exif === false, 'foto zonder EXIF op de server');
    const ruw = Buffer.from(await (await fetch(BASE + '/storage/v1/object/authenticated/fotos/' + w0.foto, { headers: { apikey: 'mock-anon-key', Authorization: 'Bearer ' + await p.evaluate(() => App.authToken()) } })).arrayBuffer());
    ok(ruw.length > 500 && !ruw.includes('GPS-GEHEIM') && !ruw.includes('Exif'), 'geüploade bytes bevatten geen EXIF/GPS');
    const act = Object.values(s1.tables.acties).find((a) => a.inspectie_id === rid);
    ok(!!act && act.status === 'Voorstel' && act.oordeel === 'A' && act.foto_pad === w0.foto, 'actievoorstel met foto_pad op de server');
    ok(s1.actie_log.some((l) => act && l.actie_id === act.id && /Actievoorstel uit de inspectie/.test(l.wat)), 'actie_log ontvangen');
    ok(await p.evaluate(() => App.syncWachtrij()) === 0, 'wachtrij leeg');

    // ---------- 5b. lie-fi: online, maar de server is onbereikbaar → blijft "In wachtrij" (niet rood) ----------
    await p.route('**/rest/v1/**', (r) => r.abort());
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-liefi', datum: '2026-11-21', code: 'DAM', project: 'P26-201', locatie: 'Gemaal Lie-fi', monteurs: 2, inspecteur: App.user.id, toelichting: '', status: 'gepland' }));
    ok(await totdat(async () => p.evaluate(async () => { const e = (await WPI.DB.getAll('outbox')).find((x) => x.rid === 'PL-liefi'); return e && e.pogingen >= 3; }), 25000), 'lie-fi: minstens 3 mislukte pogingen');
    const lf = await p.locator('#syncchip').innerText();
    ok(/In wachtrij/.test(lf) && !/Mislukt/.test(lf), 'lie-fi: chip blijft "In wachtrij": ' + lf);
    ok(/Geen verbinding met de server/.test(await p.locator('#syncchip').getAttribute('title')), 'lie-fi: uitleg "geen verbinding met de server"');
    await p.unroute('**/rest/v1/**');
    await p.evaluate(() => App.syncNu());
    ok(await totdat(async () => /Gesynchroniseerd/.test(await p.locator('#syncchip').innerText()) && !!(await state()).tables.planning['PL-liefi']), 'lie-fi: daarna vanzelf verstuurd');

    // ---------- 6. weigering → "Mislukt — opnieuw" → opnieuw ----------
    await fetch(BASE + '/__mock/fail?n=1&status=400');
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-test1', datum: '2026-11-20', code: 'DAM', project: 'P26-200', locatie: 'Gemaal Test', monteurs: 2, inspecteur: App.user.id, toelichting: '', status: 'gepland' }));
    ok(await totdat(async () => /Mislukt — opnieuw/.test(await p.locator('#syncchip').innerText())), 'statuschip: Mislukt — opnieuw');
    await p.click('#syncchip'); await p.waitForTimeout(300);
    ok(await totdat(async () => /Gesynchroniseerd/.test(await p.locator('#syncchip').innerText()) && !!(await state()).tables.planning['PL-test1']), 'na "opnieuw": planning op de server');

    // ---------- 6b. weigering met Engelse servertekst → Nederlandse melding ----------
    await p.evaluate(() => WPI.DB.put('acties', { id: 'ACT-nl-1', inspectie_id: null, tekst: 'handmatige actie', oordeel: null, status: 'Open', houder: '00000000-0000-4000-8000-000000000005', toetser: '00000000-0000-4000-8000-000000000002', handmatig: true, log: [] }));
    ok(await totdat(async () => /Mislukt/.test(await p.locator('#syncchip').innerText())), 'FK-weigering: Mislukt — opnieuw');
    await p.evaluate(() => App.syncDetails()); await p.waitForTimeout(200);
    const md = await p.locator('#mod').innerText();
    ok(/verwijst naar iets dat niet \(meer\) op de server staat \(code 23503\)/.test(md) && !/violates|foreign key|constraint/i.test(md), 'synchronisatiedetails: Nederlandse melding i.p.v. Engelse servertekst');
    await p.evaluate(async () => { App.closeModal(); await WPI.DB.del('acties', 'ACT-nl-1'); });
    ok(await totdat(async () => p.evaluate(() => App.syncWachtrij() === 0)), 'na verwijderen: wachtrij leeg');

    // ---------- 6c. tijdelijke fout (503) op de inspectie: de actie wacht en wordt nooit "Mislukt" ----------
    await fetch(BASE + '/__mock/fail?n=1&status=503&pad=/rest/v1/inspecties&methode=POST');
    const pid = 'WPI-' + Date.now(), cid = 'ACT-' + Date.now() + '-1';
    await p.evaluate(async ([pid, cid]) => {
      await WPI.DB.put('inspecties', { id: pid, versie: 3, titel: 'Ouder-kind', code: 'DAM', project: 'P26-500', opgeslagen: new Date().toISOString(), inspecteur_id: App.user.id, inspecteur: App.user.full_name, taken: ['x'], waarnemingen: [] });
      await WPI.DB.put('acties', { id: cid, inspectie_id: pid, tekst: 'kind', oordeel: 'A', status: 'Voorstel', houder: null, toetser: null, handmatig: false, log: [{ t: new Date().toISOString(), wie: App.user.full_name, wat: 'Actievoorstel uit de inspectie' }] });
    }, [pid, cid]);
    let ooitFout = false;
    const ouderKind = await totdat(async () => {
      const e = await p.evaluate(async (cid) => (await WPI.DB.getAll('outbox')).find((x) => x.rid === cid), cid); if (e && (e.fout || e.permanent)) ooitFout = true;
      const st = await state(); return !!st.tables.inspecties[pid] && !!st.tables.acties[cid];
    }, 30000);
    ok((await state()).fail.n === 0, 'de 503 trof de inspectie');
    ok(ouderKind && !ooitFout, 'na de 503: inspectie en actie vanzelf op de server, actie nooit "Mislukt"');
    ok(await totdat(async () => /Gesynchroniseerd/.test(await p.locator('#syncchip').innerText())), 'chip daarna weer Gesynchroniseerd');

    // ---------- 6d. conflict: offline wijziging tegenover een intussen gewijzigde serverstand (per veld samenvoegen) ----------
    const wtok = await token('winfred@noardling.test');
    // (a) verschillende velden: alles blijft (de offline toelichting + monteurs én de nieuwe datum van de coördinator)
    await ctx.setOffline(true);
    await p.evaluate(async () => { const x = await WPI.DB.get('planning', 'PL-test1'); x.toelichting = 'offline notitie'; x.monteurs = 4; await WPI.DB.put('planning', x); });
    await wacht(30);
    ok(await patch(wtok, 'planning?id=eq.PL-test1', { datum: '2026-11-27' }) === 200, 'coördinator wijzigt intussen alleen de datum op de server');
    await ctx.setOffline(false);
    ok(await totdat(async () => { const sv = (await state()).tables.planning['PL-test1']; return sv.datum === '2026-11-27' && sv.toelichting === 'offline notitie' && sv.monteurs === 4; }), 'samengevoegd op de server: nieuwe datum én toelichting/monteurs van het toestel');
    ok(await totdat(async () => p.evaluate(async () => { const x = await WPI.DB.get('planning', 'PL-test1'); return x.datum === '2026-11-27' && x.toelichting === 'offline notitie' && x.monteurs === 4 && App.syncWachtrij() === 0; })), 'samengevoegd op het toestel (niets kwijt)');
    ok(await p.evaluate(() => App.syncConflicten().some((c) => c.id === 'PL-test1' && c.winnaar === 'samengevoegd')), 'conflict gelogd (samengevoegd)');
    ok(await p.locator('#syncconflict').count() === 0, 'samengevoegd: geen melding nodig');
    // (b) zelfde veld aan beide kanten, en de klok van het toestel loopt 10 min vóór: serverstand blijft (geen klok-
    //     vergelijking), het andere veld gaat mee, en jouw waarde wordt bewaard + gemeld + is alsnog toe te passen
    await p.clock.setSystemTime(new Date(Date.now() + 10 * 60000));
    await ctx.setOffline(true);
    await p.evaluate(async () => { const x = await WPI.DB.get('planning', 'PL-test1'); x.toelichting = 'mijn versie'; x.locatie = 'Gemaal Toestel'; await WPI.DB.put('planning', x); });
    ok(await patch(wtok, 'planning?id=eq.PL-test1', { toelichting: 'versie coördinator' }) === 200, 'coördinator wijzigt intussen dezelfde toelichting');
    await ctx.setOffline(false);
    ok(await totdat(async () => { const sv = (await state()).tables.planning['PL-test1']; return sv.toelichting === 'versie coördinator' && sv.locatie === 'Gemaal Toestel'; }), 'zelfde veld: serverstand blijft (ook met voorlopende toestelklok); ander veld gaat mee');
    ok(await totdat(async () => (await p.locator('#syncconflict').count()) === 1), 'melding "Wijziging niet doorgevoerd" verschijnt');
    ok(/Wijziging niet doorgevoerd/.test(await p.locator('#syncconflict').innerText()), 'melding in het Nederlands');
    ok(await p.evaluate(() => App.syncConflicten().some((c) => c.id === 'PL-test1' && c.winnaar === 'server' && c.velden.some((v) => v.veld === 'toelichting' && v.waarde === 'mijn versie') && c.kopie && c.kopie.toelichting === 'mijn versie')), 'jouw waarde én een kopie van jouw versie bewaard');
    ok(await totdat(async () => p.evaluate(async () => (await WPI.DB.get('planning', 'PL-test1')).toelichting === 'versie coördinator')), 'toestel toont daarna de serverstand');
    await p.click('#syncconflict button:has-text("Bekijken")'); await p.waitForTimeout(400);
    const cm = await p.locator('#mod').innerText();
    ok(/Niet doorgevoerd/.test(cm) && /toelichting/.test(cm) && /mijn versie/.test(cm), 'Synchronisatie-venster: "Niet doorgevoerd" met jouw waarde');
    await p.screenshot({ path: 'sync-conflict.png' });
    await p.click('#mod button:has-text("Mijn versie toepassen")');
    ok(await totdat(async () => { const sv = (await state()).tables.planning['PL-test1']; return sv.toelichting === 'mijn versie' && sv.locatie === 'Gemaal Toestel' && sv.datum === '2026-11-27'; }), '"Mijn versie toepassen": alsnog naar de server, de rest blijft');
    ok(await p.evaluate(() => !App.syncConflicten().some((c) => c.open)), 'conflict daarna afgehandeld');
    await p.clock.setSystemTime(new Date());

    // ---------- 6e. actiehouder meldt offline "Klaar voor toetsing" terwijl de coördinator de plandatum wijzigt ----------
    const I = '00000000-0000-4000-8000-000000000001', Wf = '00000000-0000-4000-8000-000000000002';
    ok(await rest(wtok, 'acties?on_conflict=id', [{ id: 'ACT-hdr1', inspectie_id: null, tekst: 'Hijsbanden keuren', oordeel: 'A', status: 'Open', houder: I, toetser: Wf, plandatum: '2026-11-20', handmatig: true },
      { id: 'ACT-hdr2', inspectie_id: null, tekst: 'Afzetting plaatsen', oordeel: 'A', status: 'Open', houder: I, toetser: Wf, plandatum: '2026-11-20', handmatig: true }]) === 201, 'coördinator maakt twee acties met Ingrid als actiehouder');
    await p.evaluate(() => App.syncHaal());
    ok(await totdat(async () => p.evaluate(async () => !!(await WPI.DB.get('acties', 'ACT-hdr1')) && !!(await WPI.DB.get('acties', 'ACT-hdr2')))), 'acties op het toestel van de actiehouder');
    await ctx.setOffline(true);
    await p.evaluate(async (b64) => {
      for (const id of ['ACT-hdr1', 'ACT-hdr2']) {
        const a = await WPI.DB.get('acties', id);
        a.status = 'Klaar voor toetsing'; a.nafoto = 'data:image/jpeg;base64,' + b64;
        (a.log = a.log || []).push({ t: new Date().toISOString(), wie: App.user.full_name, wat: 'Klaar voor toetsing gemeld (' + id + ')' });
        await WPI.DB.put('acties', a);
      }
    }, jpeg.toString('base64'));
    ok(await patch(wtok, 'acties?id=eq.ACT-hdr1', { plandatum: '2026-11-30' }) === 200, 'coördinator verschuift intussen de plandatum van actie 1');
    ok(await patch(wtok, 'acties?id=eq.ACT-hdr2', { status: 'Vervallen' }) === 200, 'coördinator laat actie 2 intussen vervallen');
    await ctx.setOffline(false);
    ok(await totdat(async () => { const a = (await state()).tables.acties['ACT-hdr1']; return a && a.status === 'Klaar voor toetsing' && a.plandatum === '2026-11-30' && FOTOPAD.test(a.nafoto_pad || ''); }), 'actie 1: "Klaar voor toetsing" + na-foto van het toestel én de nieuwe plandatum');
    const lg = (await state()).actie_log;
    ok(lg.some((l) => l.actie_id === 'ACT-hdr1' && l.wat === 'Klaar voor toetsing gemeld (ACT-hdr1)' && l.wie === I), 'actie 1: verlopregel van het toestel op de server');
    ok(await totdat(async () => { const a = (await state()).tables.acties['ACT-hdr2']; return a && a.status === 'Vervallen' && FOTOPAD.test(a.nafoto_pad || ''); }), 'actie 2: besluit "Vervallen" van de coördinator blijft; na-foto gaat wel mee');
    const lg2 = (await state()).actie_log.filter((l) => l.actie_id === 'ACT-hdr2');
    ok(lg2.some((l) => l.wat === 'Klaar voor toetsing gemeld (ACT-hdr2)') && lg2.some((l) => /Niet doorgevoerd vanaf het toestel.*status/.test(l.wat)), 'actie 2: verlopregels altijd verstuurd, met uitleg wat niet doorging');
    ok(await p.evaluate(() => App.syncConflicten().some((c) => c.id === 'ACT-hdr2' && c.open && c.velden.some((v) => v.veld === 'status' && v.waarde === 'Klaar voor toetsing'))), 'actie 2: jouw status bewaard als "Niet doorgevoerd"');
    ok(await totdat(async () => p.evaluate(async () => (await WPI.DB.get('acties', 'ACT-hdr2')).status === 'Vervallen' && App.syncWachtrij() === 0)), 'actie 2: toestel toont "Vervallen"');
    await p.evaluate(async () => { App.closeModal(); for (const c of App.syncConflicten().filter((c) => c.open)) await App.syncConflictWeg(c.cid); App.closeModal(); App.syncConflictSluit(); });
    ok(await p.evaluate(() => !App.syncConflicten().some((c) => c.open)), '"Weggooien" sluit het conflict');

    // ---------- 6f. planning met een productcode die niet in de kennisbank staat ----------
    ok(await rest(wtok, 'planning?on_conflict=id', [{ id: 'PL-onbekend', datum: new Date().toISOString().slice(0, 10), code: 'BESTAAT-NIET', project: 'P26-777', locatie: 'Onbekend', monteurs: 1, inspecteur: I, toelichting: '', status: 'gepland' }]) === 201, 'planning met onbekende productcode via de API');
    await p.evaluate(() => App.syncHaal());
    await p.evaluate(async () => { App.state.inspectie = null; App.planning = await WPI.DB.getAll('planning'); App.startGepland('PL-onbekend'); }); await p.waitForTimeout(300);
    ok(/Product onbekend/.test(await p.locator('#mod').innerText()) && await p.evaluate(() => App.state.inspectie === null), 'onbekend product: Nederlandse uitleg, geen inspectie gestart (geen crash)');
    await p.evaluate(() => App.closeModal());

    // ---------- 6g. blijvend geweigerd (403/RLS): leesbare naam, bekijken en de wijziging weggooien ----------
    await fetch(BASE + '/__mock/fail?n=1&status=403&code=42501&pad=/rest/v1/planning&methode=POST');
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-weiger', datum: '2026-11-24', code: 'DAM', project: 'P26-610', locatie: 'Gemaal Weigering', monteurs: 2, inspecteur: App.user.id, toelichting: 'mag niet', status: 'gepland' }));
    ok(await totdat(async () => /Mislukt — opnieuw/.test(await p.locator('#syncchip').innerText())), 'geweigerd (403): chip "Mislukt — opnieuw"');
    await p.evaluate(() => App.syncDetails()); await p.waitForTimeout(300);
    const gw = await p.locator('#mod').innerText();
    ok(/Gemaal Weigering/.test(gw) && !/PL-weiger/.test(gw), 'Synchronisatie-lijst: leesbare naam i.p.v. het id: ' + gw.replace(/\s+/g, ' ').slice(0, 160));
    ok(/geweigerd door de server: \S/.test(gw) && await p.locator('#mod button:has-text("Bekijken en oplossen")').count() === 1, 'geweigerde wijziging: Nederlandse reden + "Bekijken en oplossen"');
    await p.click('#mod button:has-text("Bekijken en oplossen")'); await p.waitForTimeout(300);
    const gb = await p.locator('#mod').innerText();
    ok(/Wijziging geweigerd/.test(gb) && /Gemaal Weigering/.test(gb) && /mag niet/.test(gb) && /verdwijnt van dit toestel/.test(gb), 'bekijken: wat de wijziging was + gevolg van weggooien');
    await p.click('#mod button:has-text("Wijziging weggooien")'); await p.waitForTimeout(500);
    ok(await totdat(async () => p.evaluate(async () => App.syncWachtrij() === 0 && !(await WPI.DB.get('planning', 'PL-weiger')))), 'weggooien (nieuw record): uit de wachtrij en van het toestel');
    ok(await totdat(async () => !/Mislukt/.test(await p.locator('#syncchip').innerText())), 'weggooien: chip niet meer rood');
    ok(!(await state()).tables.planning['PL-weiger'], 'weggooien: niets naar de server');
    // bestaand record: weggooien zet de laatst bekende serverstand terug
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-terug', datum: '2026-11-26', code: 'DAM', project: 'P26-611', locatie: 'Gemaal Terug', monteurs: 2, inspecteur: App.user.id, toelichting: 'origineel', status: 'gepland' }));
    ok(await totdat(async () => !!(await state()).tables.planning['PL-terug'] && await p.evaluate(() => App.syncWachtrij() === 0)), 'PL-terug op de server');
    await fetch(BASE + '/__mock/fail?n=1&status=403&code=42501&pad=/rest/v1/planning&methode=PATCH');
    await p.evaluate(async () => { const x = await WPI.DB.get('planning', 'PL-terug'); x.toelichting = 'geweigerde wijziging'; await WPI.DB.put('planning', x); });
    ok(await totdat(async () => /Mislukt/.test(await p.locator('#syncchip').innerText())), 'wijziging van een bestaand record geweigerd');
    await p.evaluate(() => App.syncWijziging('planning:PL-terug')); await p.waitForTimeout(300);
    ok(/laatst bekende stand van de server/.test(await p.locator('#mod').innerText()), 'bekijken: gevolg = terug naar de serverstand');
    await p.click('#mod button:has-text("Wijziging weggooien")'); await p.waitForTimeout(500);
    ok(await totdat(async () => p.evaluate(async () => App.syncWachtrij() === 0 && (await WPI.DB.get('planning', 'PL-terug')).toelichting === 'origineel')), 'weggooien (bestaand record): serverstand terug op het toestel');
    ok((await state()).tables.planning['PL-terug'].toelichting === 'origineel', 'server ongewijzigd');
    await p.evaluate(() => App.closeModal());

    // ---------- 7. sessie herstellen na herladen ----------
    await p.reload(); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => !!App.user && App.user.role === 'inspecteur') && await p.locator('#l-mail').count() === 0, 'na herladen nog ingelogd (refresh-token)');

    // ---------- 7a. profiel tijdelijk niet op te halen (503) bij herladen: NIET uitloggen ----------
    await fetch(BASE + '/__mock/fail?n=1&status=503&pad=/rest/v1/profiles&methode=GET');
    await p.reload(); await p.waitForTimeout(1500);
    ok((await state()).fail.n === 0, '503 trof het ophalen van het profiel bij herladen');
    ok(await p.evaluate(() => !!App.user && App.user.role === 'inspecteur') && await p.locator('#l-mail').count() === 0, '503 op profiel bij herladen: verder met het bewaarde profiel (niet naar het inlogscherm)');
    ok(!/niet actief/.test(await p.locator('body').innerText()), '503 op profiel: geen onterechte melding "niet actief"');
    ok(await p.evaluate(() => !!JSON.parse(localStorage.getItem('wpi_sessie') || '{}').rt), '503 op profiel bij herladen: sessie blijft bewaard');

    // ---------- 7b. lie-fi bij het openen: nooit "Gesynchroniseerd" zonder contact met de server ----------
    await p.route(/\/(rest|auth)\/v1\//, (r) => r.abort());
    await p.reload(); await p.waitForTimeout(3500);
    const lc = await p.locator('#syncchip').innerText(), lt = await p.locator('#syncchip').getAttribute('title');
    ok(await p.evaluate(() => !!App.user), 'lie-fi na herladen: verder met de bewaarde gegevens');
    ok(!/Gesynchroniseerd/.test(lc) && /Veilig op dit toestel/.test(lc), 'lie-fi na herladen: chip zegt niet "Gesynchroniseerd": ' + lc);
    ok(/contact met de server/.test(lt || ''), 'lie-fi na herladen: uitleg in de chip: ' + lt);
    await p.unroute(/\/(rest|auth)\/v1\//);
    ok(await totdat(async () => /Gesynchroniseerd/.test(await p.locator('#syncchip').innerText()), 40000), 'server weer bereikbaar: vanzelf "Gesynchroniseerd"');

    // ---------- 8. coördinator haalt op en stelt in ----------
    // extra planningrijen, zodat de paginering (max-rows 2) echt meerdere pagina's nodig heeft
    for (let i = 1; i <= 4; i++) await p.evaluate((i) => WPI.DB.put('planning', { id: 'PL-pag' + i, datum: '2026-12-0' + i, code: 'DAM', project: 'P26-30' + i, locatie: 'Gemaal ' + i, monteurs: 2, inspecteur: App.user.id, toelichting: '', status: 'gepland' }), i);
    ok(await totdat(async () => Object.keys((await state()).tables.planning).length >= 6 && await p.evaluate(() => App.syncWachtrij()) === 0), 'extra planning op de server');
    await fetch(BASE + '/__mock/maxrows?n=2');

    // foto-download mislukt bij het ophalen → pad blijft bewaard, nooit null naar de server
    const ctx2 = await b.newContext(opt), q = await pagina(ctx2, 'winfred');
    await q.route('**/storage/v1/object/authenticated/**', (r) => r.abort());
    await q.goto(BASE + '/index.html'); await q.waitForTimeout(700);
    await inloggen(q, 'winfred@noardling.test');
    ok(await totdat(async () => q.evaluate(async (id) => !!(await WPI.DB.get('inspecties', id)), rid)), 'coördinator: inspectie opgehaald');
    const s8 = await state();
    const tel = await q.evaluate(async () => ({ i: (await WPI.DB.getAll('inspecties')).length, a: (await WPI.DB.getAll('acties')).length, p: (await WPI.DB.getAll('planning')).length }));
    ok(tel.i === Object.keys(s8.tables.inspecties).length && tel.a === Object.keys(s8.tables.acties).length && tel.p === Object.keys(s8.tables.planning).length && tel.p >= 6, 'paginering (max-rows 2): alles opgehaald ' + JSON.stringify(tel));
    const aid = act && act.id;
    const zonder = await q.evaluate(async (id) => { const a = await WPI.DB.get('acties', id); return a && { foto: a.foto, log: (a.log || []).length }; }, aid);
    ok(zonder && FOTOPAD.test(zonder.foto || ''), 'download mislukt: storagepad blijft in het record (niet null): ' + (zonder && zonder.foto));
    ok(zonder && zonder.log >= 2, 'paginering: volledig verloop (actie_log) opgehaald: ' + (zonder && zonder.log));
    await q.evaluate(() => App.go('acties')); await q.waitForTimeout(500);
    await q.evaluate((id) => App.laadActies().then(() => App.openActie(id)), aid); await q.waitForTimeout(400);
    ok(/Foto volgt bij verbinding/.test(await q.locator('#mod').innerText()) && await q.locator('#mod img').count() === 0, 'pad wordt niet als plaatje geladen: "Foto volgt bij verbinding"');
    await q.selectOption('#ai-houder', '00000000-0000-4000-8000-000000000003'); await q.selectOption('#ai-toetser', '00000000-0000-4000-8000-000000000002');
    await q.click('text=Actie instellen'); await q.waitForTimeout(300);
    ok(await totdat(async () => { const a = (await state()).tables.acties[aid]; return a && a.status === 'Open' && a.houder === '00000000-0000-4000-8000-000000000003'; }), 'ingestelde actie (Open, houder Douwe) op de server');
    ok((await state()).tables.acties[aid].foto_pad === w0.foto, 'foto_pad op de server niet gewist na wijziging zonder gedownloade foto');
    await q.unroute('**/storage/v1/object/authenticated/**');
    await q.evaluate(() => App.syncHaal()); await q.waitForTimeout(300);
    const lokaal = await q.evaluate(async (id) => { const a = await WPI.DB.get('acties', id); return a && { foto: (a.foto || '').slice(0, 22), titel: a.inspectie_titel, log: (a.log || []).length, tp: a.terPlaatse }; }, aid);
    ok(lokaal && lokaal.foto === 'data:image/jpeg;base64' && lokaal.titel && lokaal.log >= 3, 'na herstel verbinding: actie met foto (data-URL), titel en verloop: ' + JSON.stringify(lokaal));
    ok(await q.evaluate(async (id) => /^data:image\/jpeg;base64,/.test(((await WPI.DB.get('inspecties', id)).waarnemingen[0] || {}).foto || ''), rid), 'na herstel verbinding: inspectiefoto opgehaald');
    // geen volledige download meer als er niets veranderde
    const n0 = (await state()).requests.length;
    await q.evaluate(() => App.syncHaal());
    const nieuweReq = (await state()).requests.slice(n0);
    ok(nieuweReq.length > 0 && !nieuweReq.some((r) => /select=\*/.test(decodeURIComponent(r.q || ''))), 'ophalen zonder wijzigingen: alleen id/updated_at, geen select=*');
    ok(await q.evaluate(async () => (await WPI.DB.getAll('planning')).length) === tel.p, 'na tweede keer ophalen niets verdwenen');
    await fetch(BASE + '/__mock/maxrows?n=1000');

    // concept blijft bewaard bij geforceerd uitloggen (ander tabblad logt uit) direct na typen
    await q.evaluate(() => { App.closeModal(); App.startInspectie('DAM', 'P26-170', 'Damwand · Concepttest'); }); await q.waitForTimeout(300);
    await q.fill('#f-taak', 'concept dat niet verloren mag gaan');
    const q2 = await ctx2.newPage(); await q2.goto(BASE + '/manifest.json');
    await q2.evaluate(() => localStorage.removeItem('wpi_sessie')); await q.waitForTimeout(1200);
    ok(await q.evaluate(() => App.user === null), 'ander tabblad logt uit → hier ook');
    ok(await q.evaluate(async () => { const c = await WPI.DB.get('concept', 'lopend-00000000-0000-4000-8000-000000000002'); return !!(c && c.ins && /Concepttest/.test(c.ins.titel)); }), 'concept na geforceerd uitloggen nog op het toestel');
    await q2.close();
    await inloggen(q, 'winfred@noardling.test'); await q.waitForTimeout(600);
    ok(await q.evaluate(() => !!(App.state.inspectie && /Concepttest/.test(App.state.inspectie.titel))), 'na opnieuw inloggen is de lopende inspectie terug');
    await q.evaluate(() => { App.state.inspectie = null; App.bewaarConcept(true); }); await q.waitForTimeout(200);

    // ---------- 9. last-write-wins: inspecteur haalt de nieuwe stand op ----------
    await p.evaluate(() => App.syncHaal()); await p.waitForTimeout(400);
    ok(await p.evaluate(async (id) => (await WPI.DB.get('acties', id)).status, aid) === 'Open', 'inspecteur ziet de ingestelde actie na ophalen');

    // ---------- 9b. gedeeld toestel: onverstuurd werk van A (wachtrij + lopende inspectie) ----------
    // Het staat onversleuteld in IndexedDB. Uitloggen: kiezen (synchroniseren / bewaren / wissen); logt daarna een
    // ander in, dan ziet die eerst "Werk van een vorige gebruiker" en wordt het pas na bevestiging gewist,
    // vóórdat er iets op het scherm komt. Annuleren laat het staan voor A.
    const A_ID = '00000000-0000-4000-8000-000000000001';
    const rauw = (pg) => pg.evaluate(() => new Promise((res) => { const r = indexedDB.open('wpi'); r.onsuccess = () => {
      const t = r.result.transaction(['outbox', 'planning', 'concept']), uit = {};
      t.objectStore('outbox').getAll().onsuccess = (e) => { uit.outbox = e.target.result; };
      t.objectStore('planning').getAll().onsuccess = (e) => { uit.planning = e.target.result.map((x) => x.id); };
      t.objectStore('concept').getAll().onsuccess = (e) => { uit.concept = e.target.result.map((x) => x.id); };
      t.oncomplete = () => { r.result.close(); res(uit); }; }; }));
    const vanA = (r) => r.outbox.filter((e) => e.uid === A_ID).length + r.concept.filter((c) => c === 'lopend-' + A_ID).length;
    await ctx.setOffline(true);
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-van-a', datum: '2026-11-25', code: 'DAM', project: 'P26-400', locatie: 'Gemaal A', monteurs: 1, inspecteur: App.user.id, toelichting: 'van A', status: 'gepland' }));
    await p.evaluate(() => App.openAccount()); await p.waitForTimeout(200);
    await p.click('#mod button:has-text("Uitloggen")'); await p.waitForTimeout(400);
    const uitTekst = await p.locator('#mod').innerText();
    ok(/Nog niet alles op de server/.test(uitTekst) && /niet versleuteld/.test(uitTekst) && /iemand anders in, dan wordt het gewist/.test(uitTekst), 'uitloggen met volle wachtrij: eerlijke waarschuwing (onversleuteld, wordt gewist als een ander inlogt)');
    ok(!/onzichtbaar voor anderen|veilig op dit toestel/i.test(uitTekst), 'uitloggen: geen onjuiste belofte meer ("veilig", "onzichtbaar voor anderen")');
    ok(await p.locator('#mod button:has-text("Eerst synchroniseren")').count() === 1 && await p.locator('#mod button:has-text("Bewaren en uitloggen")').count() === 1 && await p.locator('#mod button:has-text("Wissen en uitloggen")').count() === 1, 'uitloggen: kiezen tussen synchroniseren, bewaren en wissen');
    await p.click('#mod button:has-text("Bewaren en uitloggen")'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => App.user === null) && vanA(await rauw(p)) === 1, 'bewaren: A uitgelogd, werk van A nog op het toestel');
    await ctx.setOffline(false); await p.waitForTimeout(200);
    // B logt in: eerst de vraag, A's werk staat er nog; annuleren laat het staan
    await inloggen(p, 'douwe@noardling.test'); await p.waitForTimeout(800);
    ok(await p.evaluate(() => App.user === null) && /Werk van een vorige gebruiker/.test(await p.locator('#view').innerText()), 'B logt in: eerst "Werk van een vorige gebruiker", nog niets van de app te zien');
    ok(vanA(await rauw(p)) === 1, 'B: zolang B niet bevestigt, blijft het werk van A staan');
    await p.click('#view button:has-text("Annuleren")'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => App.user === null) && await p.locator('#l-mail').count() === 1 && vanA(await rauw(p)) === 1, 'B annuleert: terug naar inloggen, werk van A blijft');
    await inloggen(p, 'inspecteur@noardling.test'); await p.waitForTimeout(500);
    ok(await totdat(async () => { const r = (await state()).tables.planning['PL-van-a']; return r && r.gemaakt_door === A_ID && r.toelichting === 'van A'; }), 'A logt weer in: eigen wijziging alsnog verstuurd');
    // nu wél wissen: A bewaart een wijziging én een lopende inspectie, B bevestigt
    await ctx.setOffline(true);
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-van-a2', datum: '2026-11-26', code: 'DAM', project: 'P26-401', locatie: 'Gemaal A2', monteurs: 1, inspecteur: App.user.id, toelichting: 'van A (2)', status: 'gepland' }));
    await p.evaluate(() => { App.startInspectie('DAM', 'P26-401', 'Geheime lopende inspectie', true); App.bewaarConcept(true); }); await p.waitForTimeout(300);
    await p.evaluate(() => App.openAccount()); await p.waitForTimeout(200);
    await p.click('#mod button:has-text("Uitloggen")'); await p.waitForTimeout(400);
    ok(/er loopt nog een inspectie/.test(await p.locator('#mod').innerText()), 'uitloggen: ook de lopende inspectie wordt genoemd');
    await p.click('#mod button:has-text("Bewaren en uitloggen")'); await p.waitForTimeout(500);
    ok(vanA(await rauw(p)) === 2, 'bewaren: wachtrij én concept van A op het toestel');
    await ctx.setOffline(false); await p.waitForTimeout(200);
    await inloggen(p, 'douwe@noardling.test'); await p.waitForTimeout(800);
    await p.click('#view button:has-text("Doorgaan en wissen")'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => App.user && App.user.full_name === 'Douwe de Boer'), 'B (Douwe) ingelogd na bevestigen');
    const naB = await rauw(p);
    ok(vanA(naB) === 0 && !naB.planning.includes('PL-van-a2'), 'B: wachtrij, record en lopende inspectie van A zijn ook in de ruwe IndexedDB weg');
    ok(await p.evaluate(async () => !(await WPI.DB.getAll('concept')).some((c) => c.ins && /Geheime lopende/.test(c.ins.titel || ''))), 'B: de lopende inspectie van A is niet meer te lezen (DevTools: DB.getAll("concept"))');
    await p.waitForTimeout(500);
    ok(!(await state()).tables.planning['PL-van-a2'], 'gewist werk van A is niet verstuurd (ook niet door B)');
    // wissen bij het uitloggen zelf
    await ctx.setOffline(true);
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-van-b', datum: '2026-11-26', code: 'DAM', project: 'P26-402', locatie: 'Gemaal B', monteurs: 1, inspecteur: App.user.id, toelichting: 'van B', status: 'gepland' }));
    await p.evaluate(() => App.openAccount()); await p.waitForTimeout(200);
    await p.click('#mod button:has-text("Uitloggen")'); await p.waitForTimeout(400);
    await p.click('#mod button:has-text("Wissen en uitloggen")'); await p.waitForTimeout(300);
    ok(/kan niet ongedaan/.test(await p.locator('#mod').innerText()), 'wissen: eerst bevestigen (kan niet ongedaan worden gemaakt)');
    await p.click('#mod button:has-text("Ja, wissen en uitloggen")'); await p.waitForTimeout(600);
    const naWis = await rauw(p);
    ok(await p.evaluate(() => App.user === null) && !naWis.outbox.length && !naWis.planning.includes('PL-van-b'), 'wissen en uitloggen: niets van B meer op het toestel');
    await ctx.setOffline(false); await p.waitForTimeout(200);
    await inloggen(p, 'inspecteur@noardling.test'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => App.user && App.user.id === '00000000-0000-4000-8000-000000000001'), 'A logt weer in (geen vraag: er staat geen werk van een ander)');

    // ---------- 9c. offline gewijzigd, intussen op de server verwijderd: NIET vanzelf opnieuw aanmaken ----------
    await p.evaluate(() => WPI.DB.put('planning', { id: 'PL-weg', datum: '2026-11-27', code: 'DAM', project: 'P26-612', locatie: 'Gemaal Verwijderd', monteurs: 2, inspecteur: App.user.id, toelichting: 'eerst', status: 'gepland' }));
    ok(await totdat(async () => !!(await state()).tables.planning['PL-weg'] && await p.evaluate(() => App.syncWachtrij() === 0)), 'PL-weg op de server');
    await ctx.setOffline(true);
    await p.evaluate(async () => { const x = await WPI.DB.get('planning', 'PL-weg'); x.toelichting = 'offline gewijzigd'; await WPI.DB.put('planning', x); });
    ok(await verwijder(await token('winfred@noardling.test'), 'planning?id=eq.PL-weg') === 204 && !(await state()).tables.planning['PL-weg'], 'coördinator verwijdert PL-weg op de server');
    await ctx.setOffline(false);
    await p.evaluate(() => App.syncNu());
    ok(await totdat(async () => p.evaluate(() => App.syncWachtrij() === 0)), 'verwijderd op de server: wachtrij verwerkt');
    await wacht(500);
    ok(!(await state()).tables.planning['PL-weg'], 'verwijderd op de server: record NIET opnieuw aangemaakt');
    ok(await p.evaluate(() => App.syncConflicten().some((c) => c.open && c.weg && c.id === 'PL-weg' && c.kopie && c.kopie.toelichting === 'offline gewijzigd')), 'verwijderd op de server: jouw versie bewaard bij "Niet doorgevoerd"');
    ok(await p.evaluate(async () => !(await WPI.DB.get('planning', 'PL-weg'))), 'verwijderd op de server: niet meer als gewoon record op het toestel');
    await p.evaluate(() => { App.syncConflictSluit(); App.syncDetails(); }); await p.waitForTimeout(300);
    const vw = await p.locator('#mod').innerText();
    ok(/verwijderd op de server/.test(vw) && /Gemaal Verwijderd/.test(vw) && await p.locator('#mod button:has-text("Opnieuw aanmaken")').count() === 1, 'Synchronisatie: "verwijderd op de server" met "Opnieuw aanmaken"');
    await p.click('#mod button:has-text("Opnieuw aanmaken")'); await p.waitForTimeout(300);
    ok(await totdat(async () => { const r = (await state()).tables.planning['PL-weg']; return r && r.toelichting === 'offline gewijzigd'; }), 'bewust "Opnieuw aanmaken": met jouw versie op de server');
    ok(await p.evaluate(() => !App.syncConflicten().some((c) => c.open && c.id === 'PL-weg')), 'conflict daarna gesloten');
    await p.evaluate(() => App.closeModal());

    // ---------- 10. uitloggen ----------
    await p.evaluate(() => App.logout()); await p.waitForTimeout(500);
    ok(/Je bent uitgelogd/.test(await p.locator('#view').innerText()) && await p.evaluate(() => !localStorage.getItem('wpi_sessie')), 'uitgelogd: sessie gewist');
    ok(await p.evaluate(async () => (await WPI.DB.all()).length === 0), 'uitgelogd: gesynchroniseerde inspecties van het toestel gehaald');

    // ---------- 10b. gedeeld toestel: tabblad dicht zonder uitloggen; daarna logt een ander in terwijl het ophalen mislukt ----------
    const Wid = '00000000-0000-4000-8000-000000000002';
    ok(await rest(wtok, 'inspecties?on_conflict=id', [{ id: 'GEHEIM-W', inspecteur_id: Wid, titel: 'Vertrouwelijk W', code: 'DAM', project: 'P26-901', opgeslagen: new Date().toISOString(), record: { versie: 3, titel: 'Vertrouwelijk W', taken: [], waarnemingen: [] } }]) === 201, 'coördinator Winfred heeft een eigen inspectie (GEHEIM-W)');
    const ruweIdb = (pg, id) => pg.evaluate((id) => new Promise((res) => { const r = indexedDB.open('wpi'); r.onsuccess = () => { const t = r.result.transaction('inspecties').objectStore('inspecties').get(id); t.onsuccess = () => { const ja = !!t.result; r.result.close(); res(ja); }; }; }), id);
    const ctxG = await b.newContext(opt), g1 = await pagina(ctxG, 'gedeeld-douwe');
    await g1.goto(BASE + '/index.html'); await g1.waitForTimeout(700);
    await inloggen(g1, 'douwe@noardling.test', WW, false);
    ok(await totdat(async () => g1.evaluate(async () => !!(await WPI.DB.get('inspecties', 'GEHEIM-W')))), 'Douwe (coördinator) haalt GEHEIM-W op');
    await g1.close();   // tabblad dicht, NIET uitgelogd ("Ingelogd blijven" uit)
    const g2 = await pagina(ctxG, 'gedeeld-ingrid');
    await g2.goto(BASE + '/index.html'); await g2.waitForTimeout(1000);
    ok(await g2.locator('#l-mail').count() === 1, 'nieuw tabblad: inlogscherm (sessie was alleen voor dat tabblad)');
    ok(!(await ruweIdb(g2, 'GEHEIM-W')), 'nieuw tabblad: servergegevens van Douwe al van het toestel vóórdat iemand inlogt');
    const geenServer = (r) => r.abort();
    await g2.route('**/rest/v1/inspecties**', geenServer); await g2.route('**/rest/v1/acties**', geenServer);
    await inloggen(g2, 'inspecteur@noardling.test', WW, false); await g2.waitForTimeout(1500);
    ok(await g2.evaluate(() => App.user && App.user.full_name === 'Ingrid Inspecteur'), 'Ingrid logt in terwijl het ophalen mislukt (lie-fi)');
    ok(/Is dit je eigen telefoon/.test(await g2.locator('#mod').innerText().catch(() => '')), 'eerste login van een inspecteur met het vinkje uit: vraag "Is dit je eigen telefoon?"');
    await g2.click('#mod button:has-text("Nee, gedeeld toestel")'); await g2.waitForTimeout(200);
    ok(await g2.evaluate(() => localStorage.getItem('wpi_ingelogd_blijven') === '0' && !localStorage.getItem('wpi_sessie')), '"Nee, gedeeld toestel": refresh-token niet in localStorage');
    ok(!(await ruweIdb(g2, 'GEHEIM-W')), 'GEHEIM-W niet in IndexedDB bij Ingrid');
    await g2.evaluate(() => { App.closeModal(); location.hash = '#/rapport/GEHEIM-W'; }); await g2.waitForTimeout(700);
    ok(!/Vertrouwelijk W/.test(await g2.locator('#view').innerText()), 'rapport-route toont GEHEIM-W niet aan Ingrid');
    await g2.evaluate(() => { location.hash = '#/inspecties'; }); await g2.waitForTimeout(500);
    ok(!/Vertrouwelijk W/.test(await g2.locator('#view').innerText()), 'inspectielijst toont GEHEIM-W niet aan Ingrid');
    // andere gebruiker in hetzelfde tabblad zónder uitloggen en zónder herstart (alleen de wpi_laatste_uid-controle helpt dan)
    await g2.unroute('**/rest/v1/inspecties**', geenServer); await g2.unroute('**/rest/v1/acties**', geenServer);
    await g2.evaluate(() => App.syncHaal());
    ok(await totdat(async () => g2.evaluate(async (id) => !!(await WPI.DB.get('inspecties', id)), rid)), 'Ingrid haalt haar eigen inspectie op');
    await g2.evaluate(() => { App.user = null; App.closeModal(); App.route(); }); await g2.waitForTimeout(300);
    await g2.route('**/rest/v1/inspecties**', geenServer); await g2.route('**/rest/v1/acties**', geenServer);
    await inloggen(g2, 'douwe@noardling.test', WW, false); await g2.waitForTimeout(1200);
    ok(await g2.evaluate(() => App.user && App.user.full_name === 'Douwe de Boer'), 'Douwe logt in hetzelfde tabblad in (ophalen mislukt)');
    ok(!(await ruweIdb(g2, rid)), 'andere gebruiker: gegevens van de vorige gebruiker gewist vóór het scherm verschijnt');
    // uitloggen terwijl het ophalen nog loopt: de lopende ronde schrijft daarna niets meer weg
    await g2.unroute('**/rest/v1/inspecties**', geenServer); await g2.unroute('**/rest/v1/acties**', geenServer);
    const traag = async (r) => { await wacht(2000); r.continue().catch(() => {}); };
    await g2.route(/\/rest\/v1\/inspecties\?select=\*/, traag);
    await g2.evaluate(() => { App.syncHaal(); }); await g2.waitForTimeout(500);
    await g2.evaluate(() => App.logout()); await g2.waitForTimeout(3500);
    ok(!(await ruweIdb(g2, 'GEHEIM-W')) && !(await ruweIdb(g2, rid)), 'uitloggen tijdens het ophalen: niets van de server blijft achter');
    ok(await g2.evaluate(() => new Promise((res) => { const r = indexedDB.open('wpi'); r.onsuccess = () => { const t = r.result.transaction('inspecties').objectStore('inspecties').count(); t.onsuccess = () => { const n = t.result; r.result.close(); res(n === 0); }; }; })), 'uitloggen tijdens het ophalen: inspecties-store leeg');
    await g2.unroute(/\/rest\/v1\/inspecties\?select=\*/, traag);
    // "Ja, ingelogd blijven" op een eigen telefoon
    // (met service worker: de app moet ook zonder bereik opnieuw te openen zijn)
    const ctxJ = await b.newContext({ viewport: opt.viewport }), j = await pagina(ctxJ, 'eigen-telefoon');
    await j.goto(BASE + '/index.html'); await j.waitForTimeout(700);
    await inloggen(j, 'inspecteur@noardling.test', WW, false); await j.waitForTimeout(1200);
    await j.click('#mod button:has-text("Ja, ingelogd blijven")'); await j.waitForTimeout(200);
    ok(await j.evaluate(() => !!JSON.parse(localStorage.getItem('wpi_sessie') || '{}').rt && localStorage.getItem('wpi_ingelogd_blijven') === '1'), '"Ja, ingelogd blijven": refresh-token naar localStorage (app ook zonder bereik te openen)');
    ok(await j.evaluate(() => !!localStorage.getItem('wpi_profiel') && !!localStorage.getItem('wpi_profielen') && !sessionStorage.getItem('wpi_profiel')), '"Ja, ingelogd blijven": ook profiel en collega\'s naar localStorage');
    ok(await totdat(async () => j.evaluate(async (id) => !!(await WPI.DB.get('inspecties', id)) && App.syncWachtrij() === 0, rid)), 'eigen telefoon: eigen inspectie opgehaald');
    await j.evaluate(() => navigator.serviceWorker.ready); await j.waitForTimeout(1500);
    // app dicht en zonder bereik opnieuw open (nieuwe pagina = sessionStorage leeg)
    await j.close(); await ctxJ.setOffline(true);
    let j2 = await pagina(ctxJ, 'eigen-telefoon-offline');
    await j2.goto(BASE + '/index.html'); await j2.waitForTimeout(2000);
    ok(await j2.evaluate(() => !!App.user && App.user.full_name === 'Ingrid Inspecteur') && await j2.locator('#l-mail').count() === 0, 'na "Ja": app zonder bereik opnieuw geopend → nog ingelogd (geen inlogscherm)');
    ok(await j2.evaluate(async (id) => !!(await WPI.DB.get('inspecties', id)), rid), 'na "Ja": eigen gesynchroniseerde gegevens zonder bereik nog op het toestel');
    // koude start met een wijziging in de wachtrij: de chip klopt meteen (niet pas na navigeren)
    await j2.evaluate(() => WPI.DB.put('planning', { id: 'PL-koud', datum: '2026-11-28', code: 'DAM', project: 'P26-613', locatie: 'Gemaal Koud', monteurs: 1, inspecteur: App.user.id, toelichting: '', status: 'gepland' }));
    await j2.close();
    j2 = await pagina(ctxJ, 'eigen-telefoon-koud');
    await j2.goto(BASE + '/index.html'); await j2.waitForTimeout(1500);
    const koud = await j2.locator('#syncchip').innerText().catch(() => '');
    ok(/In wachtrij · 1/.test(koud) && await j2.evaluate(() => App.syncWachtrij()) === 1, 'koude start zonder bereik met 1 wijziging: chip "In wachtrij · 1": ' + koud);
    await ctxJ.setOffline(false);
    ok(await totdat(async () => /Gesynchroniseerd/.test(await j2.locator('#syncchip').innerText()) && !!(await state()).tables.planning['PL-koud'], 25000), 'weer bereik: wachtrij verstuurd, "Gesynchroniseerd"');
    await j2.evaluate(() => App.logout());

    // ---------- 10d. gedeeld toestel, twee tabbladen tegelijk open (IndexedDB is gedeeld) ----------
    const ctxT = await b.newContext(opt), t1 = await pagina(ctxT, 'tab1-douwe'), t2 = await pagina(ctxT, 'tab2-ingrid');
    await t1.goto(BASE + '/index.html'); await t2.goto(BASE + '/index.html'); await t1.waitForTimeout(700);
    await inloggen(t1, 'douwe@noardling.test', WW, false);
    ok(await totdat(async () => t1.evaluate(async () => !!(await WPI.DB.get('inspecties', 'GEHEIM-W')))), 'tab 1: Douwe (coördinator) haalt GEHEIM-W op');
    await inloggen(t2, 'inspecteur@noardling.test', WW, false); await t2.waitForTimeout(1200);
    if (await t2.locator('#mod button:has-text("Nee, gedeeld toestel")').count()) await t2.click('#mod button:has-text("Nee, gedeeld toestel")');
    ok(await t2.evaluate(() => App.user && App.user.full_name === 'Ingrid Inspecteur'), 'tab 2: Ingrid logt in');
    ok(await totdat(async () => t1.evaluate(() => App.user === null)), 'tab 1 logt meteen uit zodra een ander in tab 2 inlogt');
    ok(/iemand anders ingelogd/.test(await t1.locator('#view').innerText()), 'tab 1: Nederlandse uitleg waarom');
    ok(!(await ruweIdb(t2, 'GEHEIM-W')), 'GEHEIM-W van het toestel bij Ingrids login');
    await t1.evaluate(() => App.syncHaal()); await t1.waitForTimeout(1200);
    ok(!(await ruweIdb(t2, 'GEHEIM-W')) && await t2.evaluate(async () => !(await WPI.DB.get('inspecties', 'GEHEIM-W'))), 'routine-ophaalronde in tab 1 zet GEHEIM-W niet terug');
    await t2.evaluate(() => { location.hash = '#/rapport/GEHEIM-W'; }); await t2.waitForTimeout(600);
    ok(!/Vertrouwelijk W/.test(await t2.locator('#view').innerText()), 'tab 2: rapport-route toont GEHEIM-W niet');
    // tab mist het storage-event (bijv. bevroren op de achtergrond): de controle in IndexedDB houdt het tegen
    await t2.evaluate(() => App.logout()); await t2.waitForTimeout(400);
    // (storage-event én visibilitychange in tab 1 onderdrukt: zo'n tabblad merkt de nieuwe gebruiker niet op)
    await t1.addInitScript(() => { window.__slik = true; const slik = (e) => { if (window.__slik) e.stopImmediatePropagation(); }; window.addEventListener('storage', slik, true); document.addEventListener('visibilitychange', slik, true); });
    await t1.reload(); await t1.waitForTimeout(700);
    await inloggen(t1, 'douwe@noardling.test', WW, false);
    ok(await totdat(async () => t1.evaluate(async () => !!App.user && !!(await WPI.DB.get('inspecties', 'GEHEIM-W')))), 'tab 1: Douwe opnieuw ingelogd, GEHEIM-W opgehaald');
    await t1.route('**/rest/v1/planning**', (r) => r.abort());
    await inloggen(t2, 'inspecteur@noardling.test', WW, false); await t2.waitForTimeout(1200);
    ok(await t2.evaluate(() => App.user && App.user.full_name === 'Ingrid Inspecteur') && await t1.evaluate(() => !!App.user), 'tab 1 mist het event en is nog "ingelogd" als Douwe');
    ok(!(await ruweIdb(t2, 'GEHEIM-W')), 'GEHEIM-W gewist bij Ingrids login');
    await t1.evaluate(() => App.syncHaal()); await t1.waitForTimeout(1500);
    ok(!(await ruweIdb(t2, 'GEHEIM-W')), 'ophaalronde van de vorige gebruiker schrijft niets meer weg (eigenaar in IndexedDB)');
    // wachtrij-opdracht van tab 1 (Douwe) kan tab 2 (Ingrid) niet overschrijven, ook niet met een verouderde kopie in het geheugen
    await t1.evaluate(() => WPI.DB.put('planning', { id: 'PL-tab1', datum: '2026-11-29', code: 'DAM', project: 'P26-614', locatie: 'Gemaal Tab 1', monteurs: 1, inspecteur: App.user.id, toelichting: 'van Douwe', status: 'gepland' }));
    ok(await t2.evaluate(async () => { try { await WPI.DB.put('planning', { id: 'PL-tab1', datum: '2026-11-29', code: 'X', inspecteur: App.user.id, status: 'gepland' }); return false; } catch (e) { return true; } }), 'tab 2 kan de wachtrij-opdracht van tab 1 niet overschrijven');
    await t2.evaluate(() => new Promise((res) => { const r = indexedDB.open('wpi'); r.onsuccess = () => { const t = r.result.transaction('outbox', 'readwrite'); t.objectStore('outbox').put({ id: 'planning:PL-ruw', store: 'planning', rid: 'PL-ruw', op: 'put', uid: '00000000-0000-4000-8000-000000000003', t: new Date().toISOString(), versie: 1, pogingen: 0, fout: false, permanent: false, volgende: 0, melding: '', basis: null }); t.oncomplete = () => { r.result.close(); res(); }; }; }));
    ok(await t2.evaluate(async () => { try { await WPI.DB.put('planning', { id: 'PL-ruw', datum: '2026-11-29', code: 'X', inspecteur: App.user.id, status: 'gepland' }); return false; } catch (e) { return true; } }), 'controle zit in de transactie (niet alleen in het geheugen van het tabblad)');
    ok(await t2.evaluate(async () => { const l = await WPI.DB.getAll('outbox'); return l.find((e) => e.rid === 'PL-tab1').uid !== App.user.id && l.find((e) => e.rid === 'PL-ruw').uid !== App.user.id; }), 'wachtrij-opdrachten houden hun eigenaar');
    ok(await t2.evaluate(async () => !(await WPI.DB.get('planning', 'PL-tab1'))), 'tab 2 ziet het record uit de wachtrij van tab 1 niet');
    await t1.evaluate(() => { window.__slik = false; document.dispatchEvent(new Event('visibilitychange')); }); await t1.waitForTimeout(300);
    ok(await t1.evaluate(() => App.user === null) && /iemand anders ingelogd/.test(await t1.locator('#view').innerText()), 'tab 1 weer in beeld: alsnog uitgelogd');
    await t2.evaluate(() => new Promise((res) => { const r = indexedDB.open('wpi'); r.onsuccess = () => { const t = r.result.transaction('outbox', 'readwrite'); t.objectStore('outbox').delete('planning:PL-ruw'); t.oncomplete = () => { r.result.close(); res(); }; }; }));
    await t2.evaluate(() => App.logout()); await ctxT.close();

    // ---------- 11. hoofd: MFA instellen + code ----------
    const ctx3 = await b.newContext(opt), h = await pagina(ctx3, 'bjorn');
    await h.goto(BASE + '/index.html'); await h.waitForTimeout(700);
    await inloggen(h, 'bjorn@noardling.test'); await h.waitForTimeout(400);
    ok(await h.evaluate(() => App.user === null) && /Tweestapsverificatie/.test(await h.locator('h1').innerText()), 'hoofd: tweestapsverificatie gevraagd');
    ok(await h.locator('#view img[alt^="QR"]').count() === 1, 'hoofd: QR-code om de app te koppelen');
    ok(await h.locator('#view img[alt^="QR"]').evaluate((i) => i.complete && i.naturalWidth > 0), 'hoofd: QR-code is echt geladen (geen kapot plaatje)');
    await h.fill('#m-code', '000000'); await h.click('#m-knop'); await h.waitForTimeout(400);
    ok(/klopt niet/.test(await h.locator('#l-fout').innerText()) && await h.evaluate(() => App.user === null), 'verkeerde code geweigerd');
    const geheim = (await h.locator('#view b').last().innerText()).trim();
    await h.fill('#m-code', totp(geheim)); await h.click('#m-knop'); await h.waitForTimeout(900);
    ok(await h.evaluate(() => !!App.user && App.user.role === 'hoofd'), 'hoofd ingelogd na TOTP (aal2)');
    ok(await h.evaluate(() => !localStorage.getItem('wpi_sessie') && !!JSON.parse(sessionStorage.getItem('wpi_sessie') || '{}').rt), 'hoofd: refresh-token nooit in localStorage (ook niet met "Ingelogd blijven")');
    await h.reload(); await h.waitForTimeout(1200);
    ok(await h.evaluate(() => !!App.user && App.user.role === 'hoofd'), 'hoofd: na herladen nog ingelogd (aal2 blijft)');
    await h.evaluate(() => App.openAccount()); await h.waitForTimeout(200);
    ok(/Overal uitloggen/.test(await h.locator('#mod').innerText()), 'account: Overal uitloggen');
    await h.click('text=Overal uitloggen'); await h.waitForTimeout(600);
    ok(/op al je toestellen uitgelogd/.test(await h.locator('#view').innerText()), 'overal uitgelogd');

    // ---------- 12. inactief account en wachtwoord vergeten ----------
    // profiel tijdelijk niet op te halen bij het inloggen: melding "Server niet bereikbaar", sessie NIET ingetrokken
    await fetch(BASE + '/__mock/fail?n=1&status=503&pad=/rest/v1/profiles&methode=GET');
    const uitVoor = (await state()).requests.filter((r) => r.p === '/auth/v1/logout').length;
    await inloggen(h, 'douwe@noardling.test'); await h.waitForTimeout(500);
    const hv = await h.locator('#view').innerText();
    ok(/Server niet bereikbaar, probeer opnieuw/.test(hv) && !/niet actief/.test(hv) && await h.evaluate(() => App.user === null), '503 op profiel bij inloggen: "Server niet bereikbaar, probeer opnieuw" (niet "niet actief")');
    ok((await state()).requests.filter((r) => r.p === '/auth/v1/logout').length === uitVoor, '503 op profiel bij inloggen: sessie niet ingetrokken op de server');
    await inloggen(h, 'douwe@noardling.test'); await h.waitForTimeout(800);
    ok(await h.evaluate(() => !!App.user && App.user.full_name === 'Douwe de Boer'), 'daarna opnieuw inloggen lukt');
    await h.evaluate(() => App.logout()); await h.waitForTimeout(300);
    await inloggen(h, 'inactief@noardling.test'); await h.waitForTimeout(400);
    ok(/niet actief/.test(await h.locator('#view').innerText()) && await h.evaluate(() => App.user === null), 'inactief profiel komt er niet in');
    await h.click('text=Wachtwoord vergeten?'); await h.waitForTimeout(200);
    await h.fill('#v-mail', 'douwe@noardling.test'); await h.click('#v-knop'); await h.waitForTimeout(500);
    ok(/Als dit adres bij ons bekend is/.test(await h.locator('#view').innerText()), 'wachtwoord vergeten: neutrale melding');
    ok((await state()).recover.some((r) => r.email === 'douwe@noardling.test'), 'mock ontving herstelverzoek');

    await h.evaluate(() => App.authScherm('nieuwww')); await h.waitForTimeout(200);
    await h.fill('#n-ww', 'kort'); await h.fill('#n-ww2', 'kort'); await h.click('#view button[type=submit]'); await h.waitForTimeout(200);
    ok(/minstens 12 tekens/.test(await h.locator('#l-fout').innerText()), 'nieuw wachtwoord te kort: Nederlandse melding (geen browserballon)');
    ok(await h.locator('text=Annuleren, terug naar inloggen').count() === 1, 'nieuw wachtwoord: weg terug');
    await h.click('text=Annuleren, terug naar inloggen'); await h.waitForTimeout(300);
    ok(await h.locator('#l-mail').count() === 1, 'nieuw wachtwoord: annuleren → inlogscherm');

    // ---------- 12a. links uit een e-mail (herstel/uitnodiging) kunnen niets wissen en niemand als een ander laten inloggen ----------
    // Aanval (tweede aanvalsronde): #access_token=<onzin>&type=recovery wiste de bewaarde sessie en de gegevens op het
    // toestel; een geldige link van een ANDER account zou de slachtoffer-app als die ander laten werken.
    const ctxL = await b.newContext(opt), L = await pagina(ctxL, 'link');
    await L.goto(BASE + '/index.html'); await L.waitForTimeout(700);
    await inloggen(L, 'inspecteur@noardling.test', WW, true); await L.waitForTimeout(800);
    await L.evaluate(() => App.closeModal && App.closeModal());
    const telL = () => L.evaluate(async () => ({ user: App.user && App.user.id, sessie: !!localStorage.getItem('wpi_sessie'), profiel: !!localStorage.getItem('wpi_profiel'),
      n: (await WPI.DB.all()).length + (await WPI.DB.getAll('acties')).length + (await WPI.DB.getAll('planning')).length }));
    ok(await totdat(async () => (await telL()).n > 0), 'link: ingelogd met "Ingelogd blijven" en gegevens op het toestel');
    const voorL = await telL();
    for (const [naam, hash] of [['nep-token (recovery)', '#access_token=aaa.bbb.ccc&type=recovery'], ['magiclink-type', '#access_token=x&type=magiclink'], ['foutmelding', '#error=access_denied&error_code=otp_expired']]) {
      await L.goto('about:blank'); await L.goto(BASE + '/index.html' + hash); await L.waitForTimeout(1200);   // als een nieuw geopende link (geen hashchange)
      const naL = await telL(), v = await L.locator('#view').innerText();
      ok(naL.user === voorL.user && naL.sessie && naL.profiel && !/Nieuw wachtwoord/.test(v), 'link (' + naam + '): nog steeds ingelogd, bewaarde sessie en profiel intact ' + JSON.stringify(naL));
      ok(naL.n === voorL.n, 'link (' + naam + '): niets van het toestel gewist (' + voorL.n + ' → ' + naL.n + ')');
      ok(!/access_token|error_code/.test(L.url()), 'link (' + naam + '): token/fout weg uit het adres');
    }
    ok(/Link niet gebruikt/.test(await L.locator('#mod').innerText().catch(() => '')), 'link: rustige melding "Link niet gebruikt"');
    await L.evaluate(() => App.closeModal());
    await L.evaluate(() => { location.hash = '#access_token=aaa.bbb.ccc&type=recovery'; }); await L.waitForTimeout(1500);   // link in hetzelfde tabblad
    const naH = await telL();
    ok(naH.user === voorL.user && naH.sessie && naH.n === voorL.n && !/access_token/.test(L.url()), 'link in hetzelfde tabblad (hashchange): ook verwerkt, niets gewist, token weg uit het adres');
    await L.reload(); await L.waitForTimeout(1000);
    ok((await telL()).user === voorL.user, 'link: na herladen nog steeds ingelogd (niet uitgelogd door een link)');
    // geldige link van een ANDER account (bijv. een aanvaller die zijn eigen herstellink stuurt): geweigerd, sessie uit de link ingetrokken
    const anderLink = (await (await fetch(BASE + '/__mock/herstellink?email=winfred@noardling.test&soort=recovery&redirect_to=' + encodeURIComponent(BASE + '/index.html'))).json()).link;
    const anderTok = new URLSearchParams(anderLink.split('#')[1]).get('access_token');
    await L.goto('about:blank'); await L.goto(anderLink); await L.waitForTimeout(1200);
    const naA = await telL();
    ok(naA.user === voorL.user && naA.sessie && !/Nieuw wachtwoord/.test(await L.locator('#view').innerText()), 'link van een ander account: geweigerd, nog steeds als zichzelf ingelogd');
    ok(/ander account/.test(await L.locator('#mod').innerText().catch(() => '')), 'link van een ander account: melding "hoort bij een ander account"');
    const anderSid = JSON.parse(Buffer.from(anderTok.split('.')[1], 'base64url').toString()).session_id;
    ok(((await state()).sessions[anderSid] || {}).revoked === true, 'link van een ander account: die sessie is op de server ingetrokken');
    // geldige link van het EIGEN account: scherm "Nieuw wachtwoord" met het e-mailadres; Annuleren → gewoon weer ingelogd, niets gewist
    const eigenLink = (await (await fetch(BASE + '/__mock/herstellink?email=inspecteur@noardling.test&soort=recovery&redirect_to=' + encodeURIComponent(BASE + '/index.html'))).json()).link;
    await L.goto('about:blank'); await L.goto(eigenLink); await L.waitForTimeout(1200);
    const ve = await L.locator('#view').innerText();
    ok(/Nieuw wachtwoord/.test(ve) && /inspecteur@noardling\.test/.test(ve), 'eigen link: scherm "Nieuw wachtwoord" noemt het account');
    ok((await telL()).sessie, 'eigen link: bewaarde sessie nog niet aangeraakt');
    await L.click('text=Annuleren, terug naar inloggen'); await L.waitForTimeout(1200);
    const naE = await telL();
    ok(naE.user === voorL.user && naE.sessie && naE.n === voorL.n, 'eigen link → Annuleren: weer ingelogd met de bewaarde sessie, niets gewist ' + JSON.stringify(naE));
    await ctxL.close();
    // PKCE: de herstelmail uit de app werkt alleen in de browser die hem aanvroeg
    const ctxP = await b.newContext(opt), P = await pagina(ctxP, 'pkce');
    await P.goto(BASE + '/index.html'); await P.waitForTimeout(700);
    await P.click('text=Wachtwoord vergeten?'); await P.waitForTimeout(200);
    await P.fill('#v-mail', 'winfred@noardling.test'); await P.click('#v-knop'); await P.waitForTimeout(600);
    const rec = (await state()).recover.filter((r) => r.email === 'winfred@noardling.test').pop();
    ok(rec && /^[A-Za-z0-9_-]{43}$/.test(rec.code_challenge || '') && rec.code_challenge_method === 's256', 'PKCE: herstelaanvraag met code_challenge (S256)');
    const pkceLink = (await (await fetch(BASE + '/__mock/herstellink?email=winfred@noardling.test')).json()).link;
    ok(/\?code=/.test(pkceLink), 'PKCE: de link bevat alleen een code (geen token)');
    const ctxQ = await b.newContext(opt), Q = await pagina(ctxQ, 'pkce-ander');   // andere browser: geen code_verifier
    await Q.goto(pkceLink); await Q.waitForTimeout(1200);
    const vq = await Q.locator('#view').innerText();
    ok(!/Nieuw wachtwoord/.test(vq) && /andere browser/.test(vq) && await Q.evaluate(() => App.user === null), 'PKCE: link in een andere browser werkt niet (geen sessie, uitleg)');
    await ctxQ.close();
    const pkceLink2 = (await (await fetch(BASE + '/__mock/herstellink?email=winfred@noardling.test')).json()).link;
    await P.goto(pkceLink2); await P.waitForTimeout(1200);
    ok(/Nieuw wachtwoord/.test(await P.locator('#view').innerText()) && !/code=/.test(P.url()), 'PKCE: in de eigen browser het scherm "Nieuw wachtwoord" (code weg uit het adres)');
    await P.fill('#n-ww', 'Nieuw-Wachtwoord-2026!'); await P.fill('#n-ww2', 'Nieuw-Wachtwoord-2026!'); await P.click('#view button[type=submit]'); await P.waitForTimeout(800);
    ok(/wachtwoord is gewijzigd/.test(await P.locator('#view').innerText()), 'PKCE: nieuw wachtwoord opgeslagen, overal uitgelogd');
    const wnieuw = await (await fetch(BASE + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: 'mock-anon-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'winfred@noardling.test', password: 'Nieuw-Wachtwoord-2026!' }) })).json();
    ok(!!wnieuw.access_token, 'PKCE: inloggen met het nieuwe wachtwoord lukt');
    await fetch(BASE + '/auth/v1/user', { method: 'PUT', headers: { apikey: 'mock-anon-key', Authorization: 'Bearer ' + wnieuw.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: WW }) });   // terugzetten voor de rest van de test
    await ctxP.close();

    // ---------- 12b. opgeslagen XSS via record-jsonb (negatieve test) ----------
    const itok = await token('inspecteur@noardling.test');
    const kwaad = 'x" onerror="window.__xss=localStorage.getItem(\'wpi_sessie\')';
    const st1 = await rest(itok, 'inspecties?on_conflict=id', [{ id: 'XSS1', inspecteur_id: '00000000-0000-4000-8000-000000000001', titel: 'XSS-test', code: 'DAM', project: 'P26-666', opgeslagen: new Date().toISOString(),
      record: { versie: 3, titel: 'XSS-test', taken: ['test'], taak: 'test', inspecteur: 'Björn Sloos', handtekening: kwaad, monteurs: ['Jan'], gesprek: 'g', positief: 'p',
        waarnemingen: [{ id: 'w1', taak: 'test', tekst: 'kijk', foto: kwaad, regel_id: 'DAM-1.03', oordeel: 'C', maatregelen: [], actie: { tekst: '', terPlaatse: 'niets' } },
          { id: 'w2', taak: 'test', tekst: 'svg', foto: 'javascript:window.__xss=9', regel_id: "DAM-1.03');window.__xss=7;('", oordeel: 'V', maatregelen: [], actie: { tekst: 'x', actie_id: "A');window.__xss=6;('", terPlaatse: '<b>' } }] } }]);
    const st2 = await rest(itok, 'inspecties?on_conflict=id', [{ id: "XSS2');window.__xss=3;('", inspecteur_id: '00000000-0000-4000-8000-000000000001', titel: 'XSS-id', opgeslagen: new Date().toISOString(), record: { versie: 3, waarnemingen: [] } }]);
    ok(st1 === 201 && st2 === 201, 'kwaadaardige rijen door de (mock)server geaccepteerd: ' + st1 + '/' + st2);
    const ctx5 = await b.newContext(Object.assign({}, opt, { viewport: { width: 1280, height: 900 } })), x = await pagina(ctx5, 'douwe-xss');
    await x.goto(BASE + '/index.html'); await x.waitForTimeout(700);
    await inloggen(x, 'douwe@noardling.test');
    ok(await totdat(async () => x.evaluate(async () => !!(await WPI.DB.get('inspecties', 'XSS1')))), 'coördinator: XSS1 opgehaald');
    const xr = await x.evaluate(async () => { const r = await WPI.DB.get('inspecties', 'XSS1'); return { f1: r.waarnemingen[0].foto, f2: r.waarnemingen[1].foto, h: r.handtekening, insp: r.inspecteur, rid: r.waarnemingen[1].regel_id, o: r.waarnemingen[1].actie.actie_id, tp: r.waarnemingen[1].actie.terPlaatse, alle: (await WPI.DB.all()).map((i) => i.id) }; });
    ok(xr.f1 === null && xr.f2 === null && xr.h === null, 'fotovelden met ongeldige inhoud → null: ' + JSON.stringify([xr.f1, xr.f2, xr.h]));
    ok(xr.rid === null && xr.o === null, 'ongeldige regel_id/actie_id → null');
    ok(xr.insp === 'Ingrid Inspecteur', 'inspecteur-naam uit inspecteur_id, niet uit het record: ' + xr.insp);
    ok(!xr.alle.some((i) => /__xss/.test(i)), 'rij met kwaadaardig id overgeslagen');
    await x.evaluate(() => { location.hash = '#/inspecties'; }); await x.waitForTimeout(500);
    await x.evaluate(() => { location.hash = '#/rapport/XSS1'; }); await x.waitForTimeout(800);
    const rap = await x.locator('#view').innerText();
    ok(/Ingrid Inspecteur/.test(rap) && !/Björn Sloos/.test(rap), 'rapport noemt de echte inspecteur');
    await x.evaluate(() => document.querySelectorAll('#view *').forEach((n) => ['mouseover', 'focus'].forEach((t) => { try { n.dispatchEvent(new Event(t)); } catch (e) {} })));
    await x.waitForTimeout(300);
    ok(await x.evaluate(() => window.__xss === undefined), 'geen script uitgevoerd (window.__xss niet gezet)');
    ok(await x.locator('#view [onerror]').count() === 0, 'geen onerror-attribuut in het rapport');

    // ---------- 12c. oude v3-gegevens (prototype) → upgrade naar v4 en overnemen ----------
    const ctx6 = await b.newContext(opt), o = await pagina(ctx6, 'oud');
    await o.goto(BASE + '/manifest.json');
    const recent = new Date(Date.now() - 3 * 86400000).toISOString();
    await o.evaluate((recent) => new Promise((res) => { const r = indexedDB.open('wpi', 3); r.onupgradeneeded = () => ['inspecties', 'acties', 'concept', 'planning'].forEach((n) => r.result.createObjectStore(n, { keyPath: 'id' }));
      r.onsuccess = () => { const t = r.result.transaction(['inspecties', 'acties', 'concept'], 'readwrite');
        t.objectStore('inspecties').put({ id: 'WPI-oud1', versie: 3, titel: 'Oude inspectie', code: 'DAM', taken: ['oud'], waarnemingen: [], inspecteur: 'Inspecteur (demo)', inspecteur_id: 'u-insp', opgeslagen: recent });
        t.objectStore('inspecties').put({ id: 'WPI-oud2', versie: 3, titel: 'Heel oude inspectie', code: 'DAM', taken: ['oud'], waarnemingen: [], inspecteur: 'Inspecteur (demo)', inspecteur_id: 'u-insp', opgeslagen: '2026-06-01T10:00:00Z' });
        t.objectStore('acties').put({ id: 'ACT-oud1', inspectie_id: 'WPI-oud1', tekst: 'oude actie', status: 'Afgerond', houder: 'u-coord2', toetser: 'u-coord1', oordeel: 'A',
          log: [{ t: '2026-06-01T10:00:00Z', wie: 'Björn Sloos', wat: 'Ingesteld: actiehouder Douwe de Boer, toetser Winfred Loerts' }, { t: '2026-06-03T10:00:00Z', wie: 'Winfred Loerts', wat: 'Getoetst en akkoord · afgerond' }] });
        t.objectStore('acties').put({ id: 'ACT-oud2', inspectie_id: 'WPI-oud1', tekst: 'open actie', status: 'In uitvoering', houder: 'u-coord2', toetser: 'u-coord1', oordeel: 'V', log: [] });
        t.objectStore('acties').put({ id: 'ACT-oud3', inspectie_id: 'WPI-oud2', tekst: 'actie bij te oude inspectie', status: 'Open', houder: 'u-coord2', toetser: 'u-coord1', oordeel: 'A', log: [] });
        t.objectStore('concept').put({ id: 'lopend-u-coord1', t: '2026-06-02T08:00:00Z', ins: { code: 'DAM', project: 'P26-9', titel: 'Onafgemaakt oud', taak: null, taken: [], stap: 'taak', taakTekst: '', waarnemingen: [], cur: null, voorstel: null, laatste: null, gesprek: '', positief: '', handtekening: null, keuzes: [], plan_id: null, start: '2026-06-02T08:00:00Z' } });
        t.oncomplete = () => { r.result.close(); res(); }; }; }), recent);
    await o.goto(BASE + '/index.html'); await o.waitForTimeout(700);
    await inloggen(o, 'inspecteur@noardling.test');
    ok(await totdat(async () => /Oude gegevens op dit toestel/.test(await o.locator('#mod').innerText())), 'oude gegevens: er wordt gevraagd wat ermee moet');
    const om = await o.locator('#mod').innerText();
    ok(/ouder dan 30 dagen/.test(om) && /hoort bij een inspectie die niet wordt overgenomen/.test(om), 'oude gegevens: wat niet kan wordt uitgelegd');
    ok(/Onafgemaakte inspectie/.test(om) && /Onafgemaakt oud/.test(om), 'oude gegevens: onafgemaakte inspectie (concept van een voorbeeldaccount) wordt genoemd');
    ok(!(await state()).tables.inspecties['WPI-oud1'], 'oude gegevens: niet stilletjes verstuurd');
    await o.click('text=Overnemen en versturen');
    ok(await totdat(async () => { const s = await state(); const i = s.tables.inspecties['WPI-oud1'], a1 = s.tables.acties['ACT-oud1'], a2 = s.tables.acties['ACT-oud2'];
      return i && i.inspecteur_id === '00000000-0000-4000-8000-000000000001' && a1 && a1.status === 'Voorstel' && a1.houder === null && a1.toetser === null && a2 && a2.status === 'Voorstel'; }), 'oude gegevens overgenomen: op eigen naam; acties zonder echte personen terug naar Voorstel');
    const so = await state();
    ok(!so.tables.inspecties['WPI-oud2'] && !so.tables.acties['ACT-oud3'], 'te oude inspectie en de actie daarbij blijven op het toestel');
    const lg1 = so.actie_log.filter((l) => l.actie_id === 'ACT-oud1');
    ok(!lg1.some((l) => l.wat === 'Getoetst en akkoord · afgerond' || /^Ingesteld:/.test(l.wat)), 'oude verlopregels niet opnieuw als nieuwe regels verstuurd');
    ok(lg1.filter((l) => /^Overgenomen uit de voorbeeldversie/.test(l.wat)).length === 1 && lg1.some((l) => /Historie uit de voorbeeldversie \(niet gecontroleerd\).*Getoetst en akkoord.*\(Winfred Loerts\)/.test(l.wat)), 'één samenvattende regel met de oude historie');
    ok(await totdat(async () => o.evaluate(() => App.syncWachtrij() === 0 && !document.querySelector('#syncchip.fout'))), 'overname: niets blijft hangen of "Mislukt"');
    await o.evaluate(() => App.syncOudVraag()); await o.waitForTimeout(300);
    await o.click('text=Verder als mijn lopende inspectie'); await o.waitForTimeout(500);
    ok(await o.evaluate(async () => App.state.inspectie && App.state.inspectie.titel === 'Onafgemaakt oud' && !(await WPI.DB.get('concept', 'lopend-u-coord1')) && !!(await WPI.DB.get('concept', 'lopend-' + App.user.id))), 'onafgemaakte inspectie verder als eigen lopende inspectie');

    // ---------- 12d. opgeslagen XSS via planning: een inspecteur plant voor een coördinator (echte RLS staat dat toe) ----------
    const kwaadP = "x' onpointerdown='window.__xss=localStorage.length//\" onclick=\"window.__xss=2";
    const vandaag = new Date().toISOString().slice(0, 10);
    ok(await rest(itok, 'planning?on_conflict=id', [{ id: 'PL-xss1', datum: vandaag, code: 'DAM', project: kwaadP, locatie: kwaadP, monteurs: 2, inspecteur: '00000000-0000-4000-8000-000000000003', toelichting: kwaadP, status: 'gepland' }]) === 201, 'inspecteur mag planning voor een ander maken (zoals de echte RLS)');
    const ctx8 = await b.newContext(opt), xp = await pagina(ctx8, 'douwe-xss-plan');
    await xp.goto(BASE + '/index.html'); await xp.waitForTimeout(700);
    await inloggen(xp, 'douwe@noardling.test');
    ok(await totdat(async () => xp.evaluate(async () => !!(await WPI.DB.get('planning', 'PL-xss1')))), 'coördinator: planning met payload opgehaald');
    await xp.evaluate(() => { App.closeModal(); App.planning = null; App.go('vandaag'); }); await xp.waitForTimeout(500);
    ok(!(await geinjecteerd(xp)), 'vandaag-scherm: geen geïnjecteerd on*-attribuut');
    await xp.evaluate(() => { App.state.inspectie = { code: 'DAM', titel: 'Lopend', waarnemingen: [{}], taken: [] }; });
    await xp.evaluate(async () => { if (!App.planning) App.planning = await WPI.DB.getAll('planning'); App.startGepland('PL-xss1'); }); await xp.waitForTimeout(300);
    ok(/Er loopt nog een inspectie/.test(await xp.locator('#mod').innerText()), 'venster "Er loopt nog een inspectie"');
    ok(!(await geinjecteerd(xp)) && !/__xss/.test(await xp.locator('#mod .btn.danger').evaluate((k) => [...k.attributes].map((x) => x.name + '=' + x.value).join(' '))), 'geen servertekst in de attributen van de knop (data-action/data-args)');
    await xp.locator('#mod .btn.danger').dispatchEvent('pointerdown'); await xp.click('#mod .btn.danger'); await xp.waitForTimeout(400);
    ok(await xp.evaluate(() => window.__xss === undefined), 'opgeslagen XSS via planning: geen script uitgevoerd');
    ok(await xp.evaluate((k) => !!App.state.inspectie && App.state.inspectie.project === k && App.state.inspectie.plan_id === 'PL-xss1', kwaadP), 'nieuwe inspectie gestart met de projectnaam als gewone tekst');
    await xp.evaluate(() => { App.state.inspectie = null; App.bewaarConcept(true); App.go('planning'); }); await xp.waitForTimeout(500);
    ok(!(await geinjecteerd(xp)) && await xp.evaluate(() => window.__xss === undefined), 'planningscherm: geen geïnjecteerd on*-attribuut');

    // ---------- 13. voorbeeldmodus ongewijzigd ----------
    const ctx4 = await b.newContext(opt), d = await pagina(ctx4, 'demo');
    await d.goto(DEMO + '/index.html'); await d.waitForTimeout(800);
    const dl = await d.locator('#view').innerText();
    ok(/Kies je account/.test(dl) && /Voorbeeld/.test(dl) && await d.locator('#l-mail').count() === 0, 'voorbeeldmodus: accountkiezer met label "Voorbeeld"');
    await d.evaluate(() => App.login('u-insp')); await d.waitForTimeout(500);
    ok(await d.evaluate(() => App.user && App.user.id === 'u-insp'), 'voorbeeldmodus: demo-login werkt');
    ok(await d.locator('#syncchip').count() === 0, 'voorbeeldmodus: geen synchronisatiechip');
    await d.evaluate(() => WPI.DB.put('planning', { id: 'PL-x', datum: '2026-11-20', code: 'DAM', inspecteur: 'u-insp', status: 'gepland' })); await d.waitForTimeout(300);
    ok(await d.evaluate(async () => (await WPI.DB.getAll('outbox')).length === 0), 'voorbeeldmodus: geen wachtrij');
    ok(await d.evaluate(() => App.syncChip('inspecties', 'x')).then((s) => /Veilig op dit toestel/.test(s)), 'voorbeeldmodus: chiptekst zoals vandaag');

    // ---------- 14. IndexedDB-upgrade: geblokkeerd door een ander venster, en versionchange ----------
    const ctx7 = await b.newContext(opt), oudVenster = await pagina(ctx7, 'v3-venster'), nieuw = await pagina(ctx7, 'v4-venster');
    await oudVenster.goto(DEMO + '/manifest.json');
    await oudVenster.evaluate(() => new Promise((res) => { const r = indexedDB.open('wpi', 3); r.onupgradeneeded = () => ['inspecties', 'acties', 'concept', 'planning'].forEach((n) => r.result.createObjectStore(n, { keyPath: 'id' })); r.onsuccess = () => { window.__db = r.result; res(); }; }));
    await nieuw.goto(DEMO + '/index.html'); await nieuw.waitForTimeout(600);
    await nieuw.evaluate(() => { App.login('u-insp'); }); await nieuw.waitForTimeout(800);
    ok(/Sluit andere vensters/.test(await nieuw.locator('#dbmelding').innerText().catch(() => '')), 'upgrade geblokkeerd: melding "Sluit andere vensters"');
    await oudVenster.evaluate(() => window.__db.close());
    ok(await totdat(async () => nieuw.evaluate(() => !!App.user && !document.getElementById('dbmelding'))), 'na sluiten van het oude venster gaat de app verder');
    const v5 = await oudVenster.evaluate(() => new Promise((res) => { const r = indexedDB.open('wpi', 5); r.onsuccess = () => { r.result.close(); res('ok'); }; r.onblocked = () => res('blocked'); r.onerror = () => res('error'); setTimeout(() => res('hangt'), 4000); }));
    ok(v5 === 'ok', 'nieuwere versie (v5) wordt niet geblokkeerd door de open app: ' + v5);
    ok(/opnieuw/i.test(await nieuw.locator('#dbmelding').innerText().catch(() => '')) && await nieuw.locator('#dbmelding button').count() === 1, 'open app vraagt om opnieuw te laden');
  } catch (e) { errs.push('EXC ' + (e.stack || e)); }
  await b.close(); mock.kill(); demo.kill();
  console.log('errs', errs);
})();
