/* Werkplekinspectie — js/sync.js
   Synchronisatie met Supabase (alleen als js/config.js is ingevuld; anders doet dit bestand niets
   en blijft de app precies zoals het prototype: alles alleen op dit toestel).

   Werking ("outbox"):
   1. Elke DB.put/DB.del op inspecties, acties of planning wordt lokaal bewaard én als opdracht in de
      IndexedDB-store "outbox" gezet, in één transactie (nooit het een zonder het ander). Eén opdracht per record
      (store:id): tien wijzigingen achter elkaar = één upload van de laatste stand. Een opdracht
      houdt de gebruiker die hem maakte (uid) en wordt alleen door die gebruiker verstuurd.
   2. Zodra er verbinding is en iemand is ingelogd, gaat de wachtrij naar PostgREST
      (upsert op id met Prefer: resolution=merge-duplicates — idempotent, dus opnieuw sturen kan
      altijd). Volgorde: inspecties → acties (+ actie_log) → planning. Een actie of planning die bij
      een inspectie hoort die zelf nog in de wachtrij staat, wacht daarop (anders weigert de server
      hem: FK 23503 / 42501). Mislukt het door het netwerk of de server (0/401/408/429/5xx, 54000),
      dan blijft het "In wachtrij" en volgt een nieuwe poging met oplopende wachttijd (2 s … 5 min);
      bij 0/401/429/502-504 stopt de ronde. Alleen een echte weigering (400/403/409/422) wordt
      "Mislukt — opnieuw" en wacht op de gebruiker, met een Nederlandse melding (nlMelding).
      Bestaat het record al op de server, dan alleen bijwerken als de server sindsdien niet veranderde
      (PATCH …&updated_at=eq.<laatst gezien>). Veranderde de server intussen wél, dan wordt per veld
      samengevoegd met de basis (de serverstand van vóór jouw wijziging, bewaard in de wachtrij-opdracht):
      wat alleen hier veranderde gaat mee, wat alleen op de server veranderde blijft, en een veld dat aan
      beide kanten anders is houdt de serverstand — jouw waarde wordt dan bewaard en getoond
      (melding + Synchronisatie → "Niet doorgevoerd", met "Mijn versie toepassen"). Nooit op klokken
      vergeleken (toestel- en serverklok lopen niet gelijk). Nieuwe actie_log-regels gaan altijd mee.
   3. Foto's (en de handtekening) gaan eerst naar Storage-bucket "fotos" onder <uid>/<sha256>.<ext>;
      in de database staat alleen dat pad. EXIF/XMP (o.a. GPS) wordt verwijderd: fotoDataURL
      tekent elke foto opnieuw via een canvas (dat schrijft geen metadata); vóór het uploaden
      controleert sanerFoto() dat nog eens en codeert zo nodig opnieuw. Een foto die de server al
      heeft wordt nooit met null overschreven (lege fotovelden worden niet meegestuurd).
   4. Ophalen bij inloggen, bij terugkomen in de app (max. elke 5 min) en via "Synchroniseren":
      eerst per tabel alleen (id, updated_at) — gepagineerd op id, dus ook boven de max-rows van
      PostgREST compleet — en daarna alleen de gewijzigde rijen. Een record met een eigen wijziging in de
      wachtrij wordt nooit door het ophalen overschreven (dat voegt het versturen samen, zie 2).
      Het verloop (actie_log) komt incrementeel (id > laatst gezien).
   5. Alles wat van de server komt is onbetrouwbare invoer (een andere gebruiker kan het record
      hebben geschreven): id's, datums, keuzelijsten en fotovelden worden gecontroleerd; een
      fotoveld is alleen een geldig storagepad of data:image/(jpeg|png|webp);base64 — al het
      andere wordt null. De naam van de inspecteur komt altijd uit inspecteur_id, nooit uit het record.
   6. Gedeeld toestel: records die nog in de wachtrij van een andere gebruiker staan zijn voor de
      ingelogde gebruiker onzichtbaar en niet te wijzigen; ze gaan mee zodra die ander weer inlogt.
      Alles wat van de server kwam wordt van het toestel gehaald (syncWisLokaal) bij uitloggen, bij het
      openen zonder geldige sessie (tabblad dicht zonder uitloggen) en vóór het inloggen van een andere
      gebruiker dan de vorige — vóórdat er iets op het scherm komt. Een ophaal- of verstuurronde die
      daarvóór begon schrijft daarna niets meer weg (generatie-teller).
      Meerdere tabbladen tegelijk (IndexedDB is gedeeld, het geheugen niet): logt in een ander tabblad
      iemand anders in, dan logt dit tabblad meteen uit (js/auth.js, "storage"-event + bij terugkomen).
      Daarnaast staat de huidige gebruiker als "eigenaar" in IndexedDB, en elke schrijfactie van
      serverdata controleert dat in dezelfde transactie: een tabblad van de vorige gebruiker kan na het
      wissen niets meer terugzetten, ook als het het event mist. De wachtrij-opdracht wordt bij elke
      wijziging in de transactie zelf gelezen (nooit een opdracht van een ander overschrijven), en de
      kopie in het geheugen wordt vóór elke ronde en na een wijziging in een ander tabblad (BroadcastChannel)
      opnieuw ingelezen.
   7. Versturen en ophalen lopen nooit tegelijk (anders kan een srv:-stand van de een die van de ander overschrijven).
   8. Verwijderd op de server (alleen het Hoofd mag dat; bijv. een fout record of een AVG-verzoek) terwijl hier
      nog een wijziging klaarstond: NIET vanzelf opnieuw aanmaken. De versie van de gebruiker komt bij
      Synchronisatie → "Niet doorgevoerd" met "Opnieuw aanmaken" / "Weggooien". Alleen echt nieuwe records
      (nooit eerder op de server gezien) worden met een upsert aangemaakt.
   9. Een blijvende weigering (400/403/409/422, bijv. RLS) staat met een leesbare naam in Synchronisatie,
      met "Bekijken en oplossen": opnieuw proberen, of de wijziging weggooien (terug naar de laatst bekende
      serverstand, of — nooit op de server geweest — van het toestel).
   Status per record: "Veilig op dit toestel" → "In wachtrij" → "Gesynchroniseerd" / "Mislukt — opnieuw".
   De chip bovenin zegt alleen "Gesynchroniseerd" als de server echt is bereikt (laatste contact gelukt);
   anders "Veilig op dit toestel" met uitleg. */
(function () {
  "use strict";
  const { $, esc, DB } = window.WPI;
  const App = window.App;
  const CFG = window.WPI_CONFIG || {};
  const BASIS = String(CFG.supabaseUrl || "").replace(/\/+$/, "");
  const actief = () => !!(BASIS && CFG.supabaseAnonKey);
  const STORES = ["inspecties", "acties", "planning"];          // store-naam = tabelnaam
  const VOLGORDE = { inspecties: 0, acties: 1, planning: 2 };
  const nu = () => new Date().toISOString();
  const isVoorbeeld = (id) => /(^|-)demo/.test(String(id));    // fictieve voorbeelddata nooit versturen
  const FOTOPAD = /^(fotos\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,200}\.(jpe?g|png|webp)$/i;
  const DATAIMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const BEELDTYPE = /^image\/(jpeg|png|webp)$/;
  const VEILIG_ID = /^[A-Za-z0-9._:-]{1,120}$/;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const PAGINA = 1000;   // = standaard max-rows van Supabase; kleiner ingesteld werkt ook (keyset tot een lege pagina)

  // ---------------- controle van binnenkomende waarden ----------------
  const vId = (v) => (typeof v === "string" && VEILIG_ID.test(v) ? v : null);
  const vUuid = (v) => (typeof v === "string" && UUID.test(v) ? v : null);
  const vDatum = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const vEnum = (v, l) => (l.includes(v) ? v : null);
  const vTekst = (v) => (v == null ? null : typeof v === "object" ? null : String(v));
  const vTijd = (v) => (typeof v === "string" && !isNaN(Date.parse(v)) ? v : null);
  const OORDEEL = ["C", "A", "V", "NVT"], STATUS = ["Voorstel", "Open", "In uitvoering", "Klaar voor toetsing", "Afgerond", "Vervallen"];
  const PRIOS = ["direct", "kort", "planmatig"], TERPLAATSE = ["niets", "maatregel", "gecorrigeerd"];
  const BEELD = new Set(["foto", "nafoto", "handtekening"]);
  const VERBODEN = new Set(["__proto__", "constructor", "prototype"]);
  const lijstVan = (v, f) => (Array.isArray(v) ? v.filter(f) : []);
  const isTekst = (x) => typeof x === "string", isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);

  // ---------------- HTTP naar Supabase ----------------
  class SbFout extends Error {
    constructor(status, body, msg) { super(msg || ("HTTP " + status)); this.status = status; this.body = body; }
  }
  // tijdelijk = later vanzelf opnieuw proberen; anders wacht het op de gebruiker
  const pgCode = (e) => String((e && e.body && (e.body.code || e.body.error_code)) || "");
  const tijdelijk = (e) => !e || !e.status || e.status === 401 || e.status === 408 || e.status === 429 || e.status >= 500
    || pgCode(e) === "54000";   // "Te veel nieuwe … in het afgelopen uur": later lukt het wel
  // na deze fouten heeft de rest van de wachtrij nu ook geen zin (geen netwerk, geen sessie, server overbelast)
  const stopRonde = (e) => !e || !e.status || [401, 429, 502, 503, 504].includes(e.status);
  // Servermeldingen voor de gebruiker: de eigen triggers melden in het Nederlands; teksten van
  // PostgREST/Postgres/Storage zijn Engels en worden vertaald (de ruwe tekst gaat alleen naar de console).
  const VERTAAL = [
    [/row-level security|permission denied|not allowed|unauthori[sz]ed|forbidden/i, "Je hebt geen rechten voor deze wijziging"],
    [/foreign key|is not present in table/i, "Dit record verwijst naar iets dat niet (meer) op de server staat"],
    [/invalid input syntax for type uuid/i, "Ongeldige verwijzing naar een persoon"],
    [/invalid input (syntax|value)|enum/i, "Een waarde heeft een ongeldige vorm"],
    [/check constraint/i, "Een waarde voldoet niet aan de regels van de server"],
    [/not-null constraint|null value in column/i, "Een verplicht veld ontbreekt"],
    [/duplicate key|already exists|duplicate/i, "Dit record bestaat al op de server"],
    [/value too long|too long for type/i, "Een tekst is te lang"],
    [/jwt|token/i, "Je sessie is verlopen; log opnieuw in"],
    [/payload too large|too large|maximum allowed size|exceeded/i, "Te groot om te versturen"],
    [/mime type|content type/i, "Dit bestandstype wordt niet geaccepteerd"],
    [/not found|does not exist|could not find/i, "Niet gevonden op de server"],
  ];
  const ENGELS = /\b(the|violates|invalid|error|failed|denied|request|column|relation|constraint|unexpected|cannot|must|should|syntax)\b/i;
  function nlMelding(e) {
    const ruw = String((e && e.message) || "").slice(0, 300), code = pgCode(e) || (e && e.status ? "HTTP " + e.status : "");
    const m = VERTAAL.find(([re]) => re.test(ruw));
    if (m) return m[1] + (code ? " (code " + code + ")" : "");
    if (!ruw || ENGELS.test(ruw) || /^HTTP \d+$/.test(ruw)) return "De server weigerde deze wijziging" + (code ? " (code " + code + ")" : "");
    return ruw;   // Nederlandse melding van de eigen databaseregels (supabase/migrations)
  }

  async function sb(pad, opt = {}) {
    const { method = "GET", headers = {}, body, auth = true, raw = false, timeout = 25000 } = opt;
    for (let poging = 0; ; poging++) {
      const h = Object.assign({ apikey: CFG.supabaseAnonKey }, headers);
      if (auth) {
        const tok = App.authToken ? await App.authToken() : null;
        if (!tok) throw new SbFout(401, null, "Niet ingelogd");
        h.Authorization = "Bearer " + tok;
      }
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), timeout);
      let r;
      try { r = await fetch(BASIS + pad, { method, headers: h, body, signal: ctl.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }); }
      catch (e) { throw new SbFout(0, null, "Geen verbinding met de server"); }
      finally { clearTimeout(tm); }
      if (r.status === 401 && auth && poging === 0 && App.authVernieuw && await App.authVernieuw()) continue;
      if (!r.ok) {
        let b = null; try { b = await r.json(); } catch (e) {}
        throw new SbFout(r.status, b, (b && (b.message || b.msg || b.error_description || b.error)) || "HTTP " + r.status);
      }
      if (raw) return r;
      const t = r.status === 204 ? "" : await r.text();
      return t ? JSON.parse(t) : null;
    }
  }
  const json = (o) => JSON.stringify(o);

  // ---------------- metadata (IndexedDB-store "syncmeta", ook in het geheugen) ----------------
  // srv:<store>:<id>       laatst bekende updated_at van de server   foto:<sha>  storagepad
  // fotomist:<store>:<id>  een foto kon niet worden opgehaald → bij de volgende keer opnieuw
  // logn:<actie-id>        aantal logregels dat al op de server staat
  // logcursor:<uid>        hoogste actie_log.id die deze gebruiker al heeft    conflicten  [{t, store, id, winnaar}]
  // eigenaar                wie nu op dit toestel is ingelogd (gedeeld door alle tabbladen; zie schrijfVanServer)
  const META = new Map();
  const OB = new Map();   // outbox: "<store>:<id>" -> opdracht
  const p0 = DB.put.bind(DB), d0 = DB.del.bind(DB), g0 = DB.get.bind(DB), ga0 = DB.getAll.bind(DB);
  // META en OB zijn een kopie in het geheugen van dit tabblad; IndexedDB is gedeeld door alle tabbladen.
  // Daarom: opnieuw inlezen vóór elke verstuur-/ophaalronde en zodra een ander tabblad iets wijzigde
  // (BroadcastChannel). Een kopie die tijdens het inlezen hier werd gewijzigd, wordt niet overschreven.
  let klaarGeladen = null, verouderd = false, wijzig = 0;
  async function herlaad() {
    for (let i = 0; i < 4; i++) {
      const v0 = wijzig;
      let m, o;
      try { [m, o] = await Promise.all([ga0("syncmeta"), ga0("outbox")]); } catch (e) { return; }
      if (v0 !== wijzig && i < 3) continue;   // intussen hier gewijzigd: opnieuw lezen
      META.clear(); m.forEach((x) => META.set(x.id, x.v));
      OB.clear(); o.forEach((x) => OB.set(x.id, x));
      return;
    }
  }
  const laad = (vers) => {
    if (vers || verouderd || !klaarGeladen) { verouderd = false; klaarGeladen = herlaad(); }
    return klaarGeladen;
  };
  let kanaal = null;
  try { kanaal = window.BroadcastChannel ? new BroadcastChannel("wpi-sync") : null; } catch (e) {}
  const meldTabbladen = () => { try { if (kanaal) kanaal.postMessage("veranderd"); } catch (e) {} };
  if (kanaal) kanaal.onmessage = () => { verouderd = true; if (actief()) laad().then(() => toonStatus()); };
  async function zetMeta(k, v) {
    wijzig++;
    if (v === undefined) { if (!META.has(k)) return; META.delete(k); try { await d0("syncmeta", k); } catch (e) {} return; }
    META.set(k, v); try { await p0("syncmeta", { id: k, v }); } catch (e) {}
  }
  // ---- gedeeld toestel, meerdere tabbladen tegelijk ----
  // "eigenaar" (in IndexedDB, dus voor alle tabbladen gelijk) = de gebruiker die het laatst op dit toestel
  // inlogde. Een tabblad van een eerdere gebruiker dat nog openstaat, schrijft niets meer van de server
  // weg zodra een ander inlogde: de controle zit in dezelfde IndexedDB-transactie als het schrijven,
  // dus er is geen moment waarop het tóch nog lukt (het wissen van de nieuwe gebruiker komt daarna).
  const tx = (stores, fn) => DB.open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(stores, "readwrite"); let uit;
    t.oncomplete = () => res(uit);
    t.onerror = () => rej(t.error);
    t.onabort = () => (t.error ? rej(t.error) : res(uit));
    fn(t, (v) => { uit = v; });
  }));
  function zetEigenaar(uid) {
    wijzig++;
    if (uid) META.set("eigenaar", uid); else META.delete("eigenaar");
    return tx(["syncmeta"], (t) => { const s = t.objectStore("syncmeta"); if (uid) s.put({ id: "eigenaar", v: uid }); else s.delete("eigenaar"); }).catch(() => {});
  }
  // record van de server + srv:-stand in één transactie, alleen als <uid> nog de eigenaar is.
  // true = geschreven; "ander" = een ander is intussen eigenaar (niets geschreven); "wachtrij" = er staat
  // (net, bijv. vanuit een ander tabblad) een eigen wijziging in de wachtrij: die gaat voor; "fout" = IndexedDB-fout.
  function schrijfVanServer(store, rec, k, srvT, uid, ookMetWachtrij) {
    wijzig++;
    return tx([store, "syncmeta", "outbox"], (t, klaar) => {
      const sm = t.objectStore("syncmeta"), r = sm.get("eigenaar"), o = t.objectStore("outbox").get(k);
      o.onsuccess = () => {   // (verzoeken in één transactie worden op volgorde afgehandeld: r is al klaar)
        const e = r.result && r.result.v;
        if (e && e !== uid) { klaar("ander"); t.abort(); return; }
        if (o.result && !(ookMetWachtrij && o.result.uid === uid)) { klaar("wachtrij"); return; }
        if (srvT !== undefined) sm.put({ id: "srv:" + k, v: srvT });
        t.objectStore(store).put(rec);
        klaar(true);
      };
    }).then((u) => { if (u === true && srvT !== undefined) META.set("srv:" + k, srvT); if (u === "wachtrij") verouderd = true; return u || "fout"; }).catch(() => "fout");
  }
  const nogEigenaar = (uid) => tx(["syncmeta"], (t, klaar) => { const r = t.objectStore("syncmeta").get("eigenaar"); r.onsuccess = () => { const e = r.result && r.result.v; klaar(!e || e === uid); }; }).catch(() => true);

  // ---------------- DB omwikkelen: lokaal bewaren + in de wachtrij ----------------
  // record staat nog in de wachtrij van een andere gebruiker op dit toestel?
  const vanAnder = (store, id) => { const e = OB.get(store + ":" + id); return !!(e && App.user && e.uid && e.uid !== App.user.id); };
  class AnderFout extends Error {}
  DB.putLokaal = p0; DB.delLokaal = d0;   // zonder wachtrij (voor binnenkomende serverdata)
  DB.put = async function (store, obj) {
    const volg = actief() && STORES.includes(store) && obj && obj.id != null && !obj.demo && !isVoorbeeld(obj.id);
    if (volg) { await laad(); if (vanAnder(store, obj.id)) throw new AnderFout("Dit record staat nog in de wachtrij van een andere gebruiker op dit toestel."); }
    if (!volg) return p0(store, obj);
    obj.updated_at = nu();                 // tijdstip van de wijziging op dit toestel (voor last-write-wins)
    return schrijfMetOpdracht(store, obj.id, "put", obj);
  };
  DB.del = async function (store, id) {
    const volg = actief() && STORES.includes(store) && !isVoorbeeld(id);
    if (volg) { await laad(); if (vanAnder(store, id)) throw new AnderFout("Dit record staat nog in de wachtrij van een andere gebruiker op dit toestel."); }
    if (!volg) return d0(store, id);
    return schrijfMetOpdracht(store, id, "del");
  };
  // lezen: records uit de wachtrij van een andere gebruiker zijn onzichtbaar (gedeeld toestel)
  DB.get = async function (store, id) {
    const r = await g0(store, id);
    if (r && actief() && STORES.includes(store)) { await laad(); if (vanAnder(store, id)) return undefined; }
    return r;
  };
  DB.getAll = async function (store) {
    const l = await ga0(store);
    if (!actief() || !STORES.includes(store)) return l;
    await laad();
    return l.filter((x) => !(x && vanAnder(store, x.id)));
  };
  // record en wachtrij-opdracht in ÉÉN IndexedDB-transactie: er bestaat nooit een lokale wijziging
  // zonder opdracht (of andersom). Mislukt het, dan krijgt de aanroeper de fout (opslag mislukt).
  async function schrijfMetOpdracht(store, rid, op, obj) {
    await laad();
    const id = store + ":" + rid, mij = App.user ? App.user.id : null, srvBekend = META.has("srv:" + id);
    // De bestaande opdracht wordt IN de transactie gelezen (niet uit het geheugen): een ander tabblad kan
    // hem net hebben gemaakt. De oorspronkelijke eigenaar blijft eigenaar; een opdracht van een andere
    // gebruiker wordt nooit overschreven of op een ander overgezet.
    // basis = de laatst bekende serverstand van dit record (zoals het op dit toestel stond vóór de eerste
    // wijziging in de wachtrij). Daarmee kan een conflict per veld worden samengevoegd (zie samenvoegen()).
    wijzig++;
    const e = await tx([store, "outbox"], (t, klaar) => {
      const ob = t.objectStore("outbox"), st = t.objectStore(store), r = ob.get(id);
      r.onsuccess = () => {
        const oud = r.result;
        if (oud && oud.uid && mij && oud.uid !== mij) { klaar("ander"); t.abort(); return; }
        const verder = (basis) => {
          const n = { id, store, rid, op, uid: (oud && oud.uid) || mij, t: nu(), versie: (oud ? oud.versie : 0) + 1, pogingen: 0, fout: false, permanent: false, volgende: 0, melding: "", basis };
          if (op === "put") st.put(obj); else st.delete(rid);
          ob.put(n); klaar(n);
        };
        if (oud) return verder(oud.basis || null);
        if (!srvBekend) return verder(null);
        const b = st.get(rid); b.onsuccess = () => verder(b.result || null);
      };
    }).catch((err) => { throw err || new Error("Opslaan op dit toestel is afgebroken"); });
    if (e === "ander") { verouderd = true; throw new AnderFout("Dit record staat nog in de wachtrij van een andere gebruiker op dit toestel."); }
    if (!e) throw new Error("Opslaan op dit toestel is afgebroken");
    OB.set(id, e);
    meldTabbladen();
    planSync();
  }

  // ---------------- foto's ----------------
  function ontleed(dataUrl) {
    const m = /^data:(image\/[a-z+.-]+);base64,(.*)$/i.exec(dataUrl || "");
    if (!m) return null;
    let bin; try { bin = atob(m[2]); } catch (e) { return null; }
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return { mime: m[1].toLowerCase(), bytes: b };
  }
  async function sha256(bytes) {
    if (window.crypto && crypto.subtle) {
      const h = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
      return Array.from(h, (x) => x.toString(16).padStart(2, "0")).join("");
    }
    let a = 0x811c9dc5, b = 0x01000193;   // terugval zonder secure context (alleen lokaal testen)
    for (let i = 0; i < bytes.length; i++) { a = Math.imul(a ^ bytes[i], 16777619) >>> 0; b = Math.imul(b ^ bytes[i], 2246822519) >>> 0; }
    return (a.toString(16) + b.toString(16)).padStart(64, "0");
  }
  // bevat het bestand nog metadata (EXIF/XMP/IPTC in JPEG; eXIf/tEXt/iTXt/zTXt in PNG)?
  function heeftMetadata({ mime, bytes: b }) {
    if (mime === "image/jpeg" || mime === "image/jpg") {
      let i = 2;
      while (i + 4 < b.length && b[i] === 0xff) {
        const mk = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
        if (mk === 0xda || mk === 0xd9) break;                       // start of scan: geen headers meer
        if (mk === 0xe1 || mk === 0xed || mk === 0xec) return true;  // APP1 (EXIF/XMP), APP13 (IPTC), APP12
        i += 2 + len;
      }
      return false;
    }
    if (mime === "image/png") {
      let i = 8;
      while (i + 8 < b.length) {
        const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
        const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
        if (["eXIf", "tEXt", "iTXt", "zTXt", "tIME"].includes(type)) return true;
        if (type === "IEND") break;
        i += 12 + len;
      }
      return false;
    }
    return true;   // onbekend formaat: altijd opnieuw coderen
  }
  function herCodeer(dataUrl, mime) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        res(c.toDataURL(mime === "image/png" ? "image/png" : "image/jpeg", 0.85));
      };
      img.onerror = () => rej(new SbFout(422, null, "Foto onleesbaar"));
      img.src = dataUrl;
    });
  }
  async function sanerFoto(dataUrl) {
    let f = ontleed(dataUrl);
    if (!f) throw new SbFout(422, null, "Foto onleesbaar");
    if (heeftMetadata(f) || !BEELDTYPE.test(f.mime)) f = ontleed(await herCodeer(dataUrl, f.mime));
    return f;
  }
  const kaalPad = (p) => String(p).replace(/^fotos\//, "");
  // data-URL → pad in bucket "fotos" (eenmalig uploaden; daarna uit syncmeta)
  async function uploadFoto(dataUrl, uid) {
    const orig = ontleed(dataUrl); if (!orig) return null;
    const sha = await sha256(orig.bytes), bekend = META.get("foto:" + sha);
    if (bekend) return bekend;
    const f = await sanerFoto(dataUrl);
    const ext = f.mime === "image/png" ? "png" : f.mime === "image/webp" ? "webp" : "jpg";
    const pad = uid + "/" + sha + "." + ext;
    try {
      await sb("/storage/v1/object/fotos/" + pad, { method: "POST", headers: { "Content-Type": f.mime, "x-upsert": "true", "cache-control": "3600" }, body: new Blob([f.bytes], { type: f.mime }), timeout: 60000 });
    } catch (e) {
      const dubbel = e.status === 409 || (e.body && String(e.body.statusCode) === "409");
      if (!dubbel) throw e;   // bestaat al (zelfde inhoud, zelfde naam) = goed
    }
    await zetMeta("foto:" + sha, pad);
    return pad;
  }
  // fotoveld → pad voor de database: storagepad blijft, data-URL wordt geüpload, de rest wordt null
  async function naarPad(v, uid) {
    if (typeof v !== "string" || !v) return null;
    if (FOTOPAD.test(v)) return kaalPad(v);
    if (v.startsWith("data:image/")) return uploadFoto(v, uid);
    return null;
  }
  const blobNaarDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(blob); });
  // pad → data-URL; null als het niet lukt (netwerk, of geen toegestaan beeldformaat)
  async function haalFoto(pad) {
    try {
      pad = kaalPad(pad);
      const r = await sb("/storage/v1/object/authenticated/fotos/" + pad, { raw: true, timeout: 60000 });
      const kop = String(r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const blob = await r.blob(), type = String(blob.type || kop).split(";")[0].trim().toLowerCase();
      if (!BEELDTYPE.test(type) || !BEELDTYPE.test(kop)) return null;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const d = await blobNaarDataUrl(new Blob([bytes], { type }));
      if (typeof d !== "string" || !DATAIMG.test(d)) return null;
      await zetMeta("foto:" + await sha256(bytes), pad);
      return d;
    } catch (e) { return null; }
  }
  // alle data-URL's in een (kopie van een) record vervangen door hun pad
  async function fotosNaarPaden(o, uid) {
    if (typeof o === "string") return o.startsWith("data:image/") ? await uploadFoto(o, uid) : o;
    if (Array.isArray(o)) { const u = []; for (const x of o) u.push(await fotosNaarPaden(x, uid)); return u; }
    if (o && typeof o === "object") { const u = {}; for (const k of Object.keys(o)) u[k] = await fotosNaarPaden(o[k], uid); return u; }
    return o;
  }
  // omgekeerd: welke foto's heeft het lokale record al (pad → data-URL)
  async function lokaleFotos(o, uit = new Map()) {
    if (typeof o === "string" && o.startsWith("data:image/")) { const f = ontleed(o); if (f) { const p = META.get("foto:" + await sha256(f.bytes)); if (p) uit.set(kaalPad(p), o); } }
    else if (o && typeof o === "object") for (const k of Object.keys(o)) await lokaleFotos(o[k], uit);
    return uit;
  }
  // één fotoveld van de server: geldig pad → foto (lukt ophalen niet: pad bewaren en later opnieuw),
  // geldige data-URL → blijft; al het andere → null
  async function beeld(v, lokaal, ctx) {
    if (typeof v !== "string") return null;
    if (DATAIMG.test(v)) return v;
    if (!FOTOPAD.test(v)) return null;
    const p = kaalPad(v), d = lokaal.get(p) || await haalFoto(p);
    if (d) return d;
    ctx.mist = true; return p;
  }
  // record-jsonb van de server schoonmaken (diep)
  async function schoon(o, lokaal, ctx, sleutel, ouder) {
    if (typeof o === "string") {
      if (BEELD.has(sleutel) || ouder === "fotos") return beeld(o, lokaal, ctx);
      if (sleutel === "id" || /_id$/.test(sleutel || "")) return vId(o);
      if (sleutel === "oordeel") return vEnum(o, OORDEEL);
      return o;
    }
    if (BEELD.has(sleutel) || ouder === "fotos") return null;
    if (Array.isArray(o)) { const u = []; for (const x of o.slice(0, 2000)) u.push(await schoon(x, lokaal, ctx, sleutel, ouder)); return u; }
    if (o && typeof o === "object") {
      const u = {};
      for (const k of Object.keys(o)) if (!VERBODEN.has(k)) u[k] = await schoon(o[k], lokaal, ctx, k, sleutel);
      return u;
    }
    return typeof o === "number" || typeof o === "boolean" || o == null ? o : null;
  }

  // ---------------- versturen ----------------
  const leeg = (v) => (v === undefined || v === "" ? null : v);
  async function naarRij(store, rec, uid) {
    if (store === "inspecties") {
      const record = await fotosNaarPaden(rec, uid);
      delete record.updated_at;
      return { id: rec.id, inspecteur_id: rec.inspecteur_id || uid, titel: rec.titel || "Inspectie", code: leeg(rec.code), project: leeg(rec.project),
        opgeslagen: rec.opgeslagen || nu(), record, plan_id: leeg(rec.plan_id) };
    }
    if (store === "acties") {
      const rij = { id: rec.id, inspectie_id: leeg(rec.inspectie_id), tekst: rec.tekst || "", oordeel: leeg(rec.oordeel), ref: leeg(rec.ref), waarneming: leeg(rec.waarneming),
        prio: leeg(rec.prio), status: rec.status || "Voorstel", houder: leeg(rec.houder), toetser: leeg(rec.toetser), plandatum: leeg(rec.plandatum),
        handmatig: !!rec.handmatig };
      // fotovelden alleen meesturen als er een foto is: een upsert zonder kolom laat de foto op de server staan
      const fp = await naarPad(rec.foto, uid), np = await naarPad(rec.nafoto, uid);
      if (fp) rij.foto_pad = fp;
      if (np) rij.nafoto_pad = np;
      return rij;
    }
    return { id: rec.id, datum: rec.datum, code: rec.code, project: leeg(rec.project), locatie: leeg(rec.locatie), monteurs: rec.monteurs == null || rec.monteurs === "" ? null : +rec.monteurs,
      inspecteur: rec.inspecteur, toelichting: leeg(rec.toelichting), status: rec.status || "gepland", inspectie_id: leeg(rec.inspectie_id) };
  }
  // ---------------- conflicten: per veld samenvoegen ----------------
  // Vergelijken gebeurt op de inhoud (kolommen van de server), nooit op klokken: de klok van het toestel
  // en die van de server lopen niet gelijk. B = basis (laatst bekende serverstand op dit toestel),
  // L = de wijziging hier, S = de huidige serverstand.
  //   alleen hier gewijzigd          → gaat mee naar de server
  //   alleen op de server gewijzigd  → serverstand blijft
  //   aan beide kanten anders        → serverstand blijft (iemand anders besliste intussen), maar jouw waarde
  //                                    wordt bewaard en getoond (Synchronisatie → "Niet doorgevoerd"),
  //                                    met een knop om hem alsnog toe te passen.
  // Het verloop (actie_log) is append-only: jouw regels gaan altijd mee.
  const KOLOM = {
    planning: ["datum", "code", "project", "locatie", "monteurs", "inspecteur", "toelichting", "status", "inspectie_id"],
    acties: ["inspectie_id", "tekst", "oordeel", "ref", "waarneming", "prio", "status", "houder", "toetser", "plandatum", "handmatig", "foto_pad", "nafoto_pad"],
    inspecties: ["titel", "code", "project", "plan_id"],
  };
  const FOTOKOLOM = { foto_pad: "foto", nafoto_pad: "nafoto" };   // kolom → veld op het toestel
  // velden in record-jsonb die de server/het ophalen zelf bepaalt (geen inhoud van de inspecteur)
  const RECORD_NIET = new Set(["updated_at", "inspecteur", "inspecteur_id", "id", "titel", "code", "project", "plan_id", "opgeslagen"]);
  // vergelijkbare vorm: foto's als pad (data-URL → bekend pad of "nieuw:<sha>"), "" = null
  async function vorm(v) {
    if (v === undefined || v === "") return null;
    if (typeof v === "string") {
      if (v.startsWith("data:image/")) { const f = ontleed(v); if (!f) return null; const sha = await sha256(f.bytes); return META.get("foto:" + sha) ? kaalPad(META.get("foto:" + sha)) : "nieuw:" + sha; }
      return FOTOPAD.test(v) ? kaalPad(v) : v;
    }
    if (Array.isArray(v)) { const u = []; for (const x of v) u.push(await vorm(x)); return u; }
    if (v && typeof v === "object") { const u = {}; for (const k of Object.keys(v)) u[k] = await vorm(v[k]); return u; }
    return v;
  }
  // stabiele JSON: sleutels gesorteerd (jsonb ordent ze anders), null/ontbrekend gelijk
  const stabiel = (v) => Array.isArray(v) ? "[" + v.map(stabiel).join(",") + "]"
    : v && typeof v === "object" ? "{" + Object.keys(v).filter((k) => v[k] != null).sort().map((k) => JSON.stringify(k) + ":" + stabiel(v[k])).join(",") + "}"
    : JSON.stringify(v == null ? null : v);
  const gelijk = (a, b) => stabiel(a) === stabiel(b);
  // record op het toestel → kolommen (zonder uploaden)
  async function rijVorm(store, rec) {
    if (!rec) return null;
    const r = {};
    if (store === "inspecties") {
      r.titel = rec.titel || "Inspectie"; r.code = leeg(rec.code); r.project = leeg(rec.project); r.plan_id = leeg(rec.plan_id);
      r.record = {}; for (const k of Object.keys(rec)) if (!RECORD_NIET.has(k)) r.record[k] = rec[k];
    } else if (store === "acties") {
      for (const k of KOLOM.acties) r[k] = FOTOKOLOM[k] ? rec[FOTOKOLOM[k]] || null : leeg(rec[k]);
      r.handmatig = !!rec.handmatig; r.status = rec.status || "Voorstel";
    } else {
      for (const k of KOLOM.planning) r[k] = leeg(rec[k]);
      r.monteurs = rec.monteurs == null || rec.monteurs === "" ? null : +rec.monteurs; r.status = rec.status || "gepland";
    }
    return vorm(r);
  }
  // rij van de server → dezelfde vorm
  async function srvVorm(store, s) {
    const r = {};
    for (const k of KOLOM[store]) r[k] = s[k];
    if (store === "inspecties") { r.record = {}; const rc = isObj(s.record) ? s.record : {}; for (const k of Object.keys(rc)) if (!RECORD_NIET.has(k) && !VERBODEN.has(k)) r.record[k] = rc[k]; }
    if (store === "acties") r.handmatig = !!s.handmatig;
    return vorm(r);
  }
  const kolommenVan = (store, ...rijen) => store !== "inspecties" ? KOLOM[store]
    : KOLOM.inspecties.concat([...new Set(rijen.filter(Boolean).flatMap((r) => Object.keys(r.record || {})))].map((k) => "record." + k));
  const waardeVan = (r, k) => (!r ? null : k.startsWith("record.") ? (r.record || {})[k.slice(7)] : r[k]);
  const veldVan = (k) => (k.startsWith("record.") ? k.slice(7) : FOTOKOLOM[k] || k);   // kolom → veld op het toestel
  async function samenvoegen(e, rec, rij) {
    const pad = "/rest/v1/" + e.store, idq = "?id=eq." + encodeURIComponent(e.rid);
    for (let poging = 0; poging < 3; poging++) {
      const nu0 = await sb(pad + "?select=*&id=eq." + encodeURIComponent(e.rid));
      const s = Array.isArray(nu0) ? nu0[0] : null;
      if (!s || !vTijd(s.updated_at)) return { weg: true };   // niet (meer) op de server: gewoon opnieuw aanbieden
      const B = e.basis ? await rijVorm(e.store, e.basis) : null, L = await rijVorm(e.store, rec), S = await srvVorm(e.store, s);
      const body = {}, verloren = [], mee = [];
      let record = null;
      for (const k of kolommenVan(e.store, B, L, S)) {
        const l = waardeVan(L, k), sv = waardeVan(S, k);
        if (gelijk(l, sv)) continue;                               // al gelijk
        if (B && gelijk(l, waardeVan(B, k))) continue;             // alleen op de server gewijzigd: die blijft
        if (!B || !gelijk(sv, waardeVan(B, k))) { verloren.push(k); continue; }   // beide kanten: server blijft, jouw waarde bewaard
        if (k.startsWith("record.")) {                             // alleen hier gewijzigd: meenemen
          const kk = k.slice(7); record = record || Object.assign({}, isObj(s.record) ? s.record : {});
          if (rij.record[kk] === undefined) delete record[kk]; else record[kk] = rij.record[kk];
        } else if (FOTOKOLOM[k] && rij[k] == null) continue;      // een foto op de server nooit met null overschrijven
        else body[k] = rij[k] === undefined ? null : rij[k];
        mee.push(k);
      }
      if (record) body.record = record;
      if (Object.keys(body).length) {
        const r = await sb(pad + idq + "&updated_at=eq." + encodeURIComponent(s.updated_at), { method: "PATCH", body: json(body), headers: { "Content-Type": "application/json", Prefer: "return=representation" } });
        if (!Array.isArray(r) || !r.length) continue;              // intussen wéér gewijzigd: opnieuw vergelijken
      }
      // srv: blijft op de stand vóór het samenvoegen, zodat het ophalen de samengevoegde stand binnenhaalt
      await zetMeta("srv:" + e.id, s.updated_at);
      await conflict(e.store, e.rid, verloren.length ? "server" : "samengevoegd", { mee, verloren, rec, uid: e.uid });
      return { verloren, mee };
    }
    throw new SbFout(0, null, "De server werd tegelijk gewijzigd; volgt vanzelf opnieuw");
  }

  async function stuur(e, uid) {
    if (e.op === "del") {
      await sb("/rest/v1/" + e.store + "?id=eq." + encodeURIComponent(e.rid), { method: "DELETE", headers: { Prefer: "return=minimal" } });
      await zetMeta("srv:" + e.id, undefined);
      return {};
    }
    const rec = await g0(e.store, e.rid); if (!rec) return {};
    const rij = await naarRij(e.store, rec, uid);
    const upsert = () => sb("/rest/v1/" + e.store + "?on_conflict=id", { method: "POST", body: json([rij]),
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" } });
    // Kennen we de serverstand al, dan alleen bijwerken als de server sindsdien NIET is veranderd
    // (PATCH …&updated_at=eq.<laatst gezien>). Anders: per veld samenvoegen (samenvoegen()).
    const srvT = META.get("srv:" + e.id);
    let res, uit = { rec };
    if (srvT) {
      const q = "?id=eq." + encodeURIComponent(e.rid) + "&updated_at=eq." + encodeURIComponent(srvT);
      res = await sb("/rest/v1/" + e.store + q, { method: "PATCH", body: json(rij), headers: { "Content-Type": "application/json", Prefer: "return=representation" } });
      if (!Array.isArray(res) || !res.length) {
        const m = await samenvoegen(e, rec, rij);
        if (m.weg) {
          // Stond op de server en is er nu niet meer: verwijderd (alleen het Hoofd mag dat, bijv. een fout
          // record of een AVG-verwijderverzoek) of geen toegang meer. NOOIT vanzelf opnieuw aanmaken: de
          // gebruiker beslist (Synchronisatie → "Niet doorgevoerd" → "Opnieuw aanmaken"); zijn versie blijft bewaard.
          await conflict(e.store, e.rid, "server", { uid, rec, weg: true, reden: "verwijderd op de server" });
          return { weg: true, rec };
        }
        res = null; uit = Object.assign(uit, m, { server: true });
      }
    } else res = await upsert();
    const srv = Array.isArray(res) ? res[0] : res;
    if (srv && srv.updated_at) await zetMeta("srv:" + e.id, srv.updated_at);
    if (e.store === "acties") {   // nieuwe regels van het verloop (append-only; tijd en auteur zet de server) — altijd, ook bij een conflict
      const n = META.get("logn:" + rec.id) || 0, nieuw = (rec.log || []).slice(n).filter((l) => l && l.wat).map((l) => String(l.wat).slice(0, 2000));
      if (uit.verloren && uit.verloren.length) nieuw.push(("Niet doorgevoerd vanaf het toestel (intussen door iemand anders gewijzigd): "
        + uit.verloren.map((k) => VELDNAAM[veldVan(k)] || veldVan(k)).join(", ") + ". Bewaard bij de gebruiker.").slice(0, 2000));
      if (nieuw.length) await sb("/rest/v1/actie_log", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: json(nieuw.map((wat) => ({ actie_id: rec.id, wie: uid, wat }))) });
      await zetMeta("logn:" + rec.id, (rec.log || []).length);
    }
    return uit;
  }
  const wacht = (n) => Math.min(300000, 2000 * 2 ** Math.max(0, n - 1)) * (0.75 + Math.random() * 0.5);

  let bezig = null, nogmaals = false, timer = null, laatsteOk = null, laatsteFout = null, cspFout = false;
  // verhoogd bij elk wissen van de servergegevens op dit toestel (uitloggen, andere gebruiker, geen sessie):
  // een lopende ophaal- of verstuurronde van daarvóór schrijft daarna niets meer op het toestel
  let generatie = 0;
  // "Gesynchroniseerd" alleen als de server echt is bereikt en het laatste contact niet mislukte
  const serverBereikt = () => !!laatsteOk && (!laatsteFout || laatsteOk >= laatsteFout);
  const contactOk = () => { laatsteOk = new Date(); };
  const contactFout = (e) => { if (!e || !e.status || e.status === 401 || e.status >= 500 || e.status === 429) laatsteFout = new Date(); };
  function planSync(ms = 400) { if (!actief()) return; clearTimeout(timer); timer = setTimeout(() => syncNu(), ms); toonStatus(); }
  // een actie of planning die bij een inspectie hoort die zelf nog in de wachtrij staat (nog niet op de
  // server), wacht daarop: anders weigert de server hem (FK 23503 / 42501 "alleen de inspecteur …")
  async function wachtOpOuder(e, uid) {
    if (e.op !== "put" || e.store === "inspecties") return null;
    const rec = await g0(e.store, e.rid), iid = rec && rec.inspectie_id;
    if (!iid) return null;
    const pe = OB.get("inspecties:" + iid);
    return pe && pe.uid === uid && pe.op === "put" ? pe : null;
  }
  // is een weigering waarschijnlijk alleen een kwestie van volgorde (de inspectie staat nog niet op de server)?
  async function ouderOntbreekt(e, err) {
    if (e.store === "inspecties" || !["23503", "42501"].includes(pgCode(err))) return false;
    const rec = await g0(e.store, e.rid), iid = rec && rec.inspectie_id;
    return !!iid && !META.has("srv:inspecties:" + iid);
  }
  async function syncNu(opt = {}) {
    if (!actief()) return;
    await laad();
    if (haalBezig) { try { await haalBezig; } catch (e) {} }   // nooit tegelijk met ophalen (srv:-standen)
    if (!App.user || !navigator.onLine) { toonStatus(); return; }
    if (bezig) { nogmaals = true; return bezig; }
    let haalNodig = false;
    bezig = (async () => {
      const uid = App.user.id, gen = generatie;
      await laad(true);   // de wachtrij en srv:-standen zoals ze nu in IndexedDB staan (andere tabbladen)
      if (gen !== generatie || !App.user || App.user.id !== uid) return;
      const t = Date.now();
      const lijst = [...OB.values()].filter((e) => e.uid === uid && (opt.forceer || (!e.permanent && (opt.direct || !e.volgende || e.volgende <= t))))
        .sort((a, b) => (VOLGORDE[a.store] - VOLGORDE[b.store]) || (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
      for (const e of lijst) {
        if (!navigator.onLine || !App.user || App.user.id !== uid || gen !== generatie) break;
        const versie = e.versie;
        const ouder = await wachtOpOuder(e, uid);
        if (ouder) {   // niet versturen en niet als fout tellen; gaat mee zodra de inspectie op de server staat
          const cur = OB.get(e.id);
          if (cur && cur.versie === versie) { cur.melding = "wacht tot de inspectie op de server staat"; cur.fout = false; cur.permanent = false; cur.volgende = 0; try { await p0("outbox", cur); } catch (x) {} }
          continue;
        }
        try {
          const uitkomst = await stuur(e, uid) || {};
          const cur = OB.get(e.id);
          wijzig++;
          if (cur && cur.versie === versie) { OB.delete(e.id); await d0("outbox", e.id); }   // anders: tussendoor gewijzigd → nog een keer
          else if (cur && uitkomst.rec && !uitkomst.weg) { cur.basis = uitkomst.rec; try { await p0("outbox", cur); } catch (x) {} }   // wat net verstuurd is, is de nieuwe basis
          meldTabbladen();
          if (uitkomst.server) haalNodig = true;   // samengevoegd: de stand van de server ophalen
          if (uitkomst.verloren && uitkomst.verloren.length) meldConflict();
          if (uitkomst.weg) {
            // niet meer op de server: ook niet meer als gewoon record op het toestel (de versie van de
            // gebruiker staat bij "Niet doorgevoerd"); een nieuwere wijziging in de wachtrij blijft staan
            if (!OB.has(e.id)) { try { await d0(e.store, e.rid); } catch (x) {} await zetMeta("srv:" + e.id, undefined); await zetMeta("fotomist:" + e.id, undefined); if (e.store === "acties") await zetMeta("logn:" + e.rid, undefined); }
            meldConflict(); App.acties = null; App.planning = null;
          }
          // intussen uitgelogd of een ander logde in (ander tabblad, gedeeld toestel): wat nu op de server
          // staat niet op het toestel laten staan
          if ((gen !== generatie || !(await nogEigenaar(uid))) && !OB.has(e.id) && e.op === "put") { try { await d0(e.store, e.rid); } catch (x) {} await zetMeta("srv:" + e.id, undefined); }
          contactOk();
        } catch (err) {
          contactFout(err);
          const cur = OB.get(e.id); if (!cur || cur.versie !== versie) continue;
          let tijd = tijdelijk(err);
          // weigering omdat de bijbehorende inspectie (nog) niet op de server staat: later opnieuw (max. 6 keer)
          if (!tijd && cur.pogingen < 6 && await ouderOntbreekt(e, err)) tijd = true;
          // netwerk/server tijdelijk weg: gewoon in de wachtrij laten staan (geen rood); alleen een weigering is "Mislukt"
          cur.pogingen++; cur.permanent = !tijd; cur.fout = !tijd;
          cur.volgende = tijd ? Date.now() + wacht(cur.pogingen) : 0;
          cur.melding = !tijd ? nlMelding(err)
            : !err.status ? "geen verbinding met de server"
            : err.status === 429 || pgCode(err) === "54000" ? "de server vraagt even te wachten"
            : err.status >= 500 || err.status === 408 ? "server tijdelijk niet bereikbaar (" + err.status + ")"
            : err.status === 401 ? "sessie wordt vernieuwd"
            : "wacht tot de inspectie op de server staat";
          wijzig++; try { await p0("outbox", cur); } catch (x) {}
          if (window.console) console.warn("[sync] " + e.id + ": " + (err.message || err) + " → " + cur.melding);
          if (stopRonde(err)) break;   // geen netwerk, geen sessie of server overbelast: de rest heeft nu ook geen zin
        }
        toonStatus();
      }
    })().finally(() => {
      bezig = null; toonStatus(); volgendeTimer();
      if (haalNodig) setTimeout(() => syncHaal(), 0);   // conflict: de nieuwere serverstand ophalen
      if (nogmaals) { nogmaals = false; planSync(50); }
    });
    return bezig;
  }
  function volgendeTimer() {
    const uid = App.user && App.user.id;
    const vlg = [...OB.values()].filter((e) => e.uid === uid && !e.permanent && e.volgende).map((e) => e.volgende);
    if (vlg.length) { clearTimeout(timer); timer = setTimeout(() => syncNu(), Math.max(500, Math.min(...vlg) - Date.now())); }
  }

  // ---------------- ophalen (last-write-wins) ----------------
  let haalBezig = null, laatsteHaal = 0, haalPogingen = 0, haalTimer = null;
  // conflictregel; bij "server" (een waarde van jou is niet doorgevoerd) met jouw waarden en een kopie van
  // jouw versie, zodat er niets stil verdwijnt. Alleen zichtbaar voor de gebruiker van wie de wijziging was.
  async function conflict(store, id, winnaar, info) {
    const { mee = [], verloren = [], rec = null, uid = null, reden = "", weg = false } = info || {};
    const c = { cid: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), t: nu(), uid, store, id, winnaar, mee, reden, weg, open: verloren.length > 0 || (weg && !!rec),
      velden: verloren.map((k) => { const v = veldVan(k); return { kolom: k, veld: v, waarde: rec ? rec[v] === undefined ? null : rec[v] : null }; }),
      kopie: (verloren.length || weg) && rec ? rec : null };
    // een record dat op de server verdween: alleen de nieuwste versie van de gebruiker tonen
    let l = (META.get("conflicten") || []).map((x) => (weg && x.weg && x.open && x.store === store && x.id === id && x.uid === uid ? Object.assign({}, x, { open: false, kopie: null }) : x)).concat([c]);
    // begrensd: de 40 nieuwste regels; alleen open conflicten houden hun kopie
    l = l.slice(-40).map((x) => (x.open ? x : Object.assign({}, x, { kopie: null })));
    await zetMeta("conflicten", l);
    if (window.console) console.warn(`[sync] conflict ${store}/${id}: ${winnaar}` + (verloren.length ? " — niet doorgevoerd: " + verloren.join(", ") : "") + (mee.length ? " — samengevoegd: " + mee.join(", ") : ""));
  }
  const VELDNAAM = { datum: "datum", code: "product", project: "project", locatie: "locatie", monteurs: "monteurs", inspecteur: "inspecteur", toelichting: "toelichting",
    status: "status", inspectie_id: "inspectie", tekst: "actietekst", oordeel: "oordeel", ref: "referentie", waarneming: "waarneming", prio: "prioriteit", houder: "actiehouder",
    toetser: "toetser", plandatum: "plandatum", handmatig: "handmatig", foto: "foto", nafoto: "na-foto", titel: "titel", plan_id: "planning", waarnemingen: "waarnemingen",
    gesprek: "gesprek met de monteurs", positief: "positieve punten", handtekening: "handtekening", taken: "taken", keuzes: "keuzes", open_punten: "open punten", taak: "taak" };
  const SOORT = { inspecties: "Inspectie", acties: "Actie", planning: "Planning" };
  const mijnConflicten = () => (META.get("conflicten") || []).filter((c) => c.open && App.user && c.uid === App.user.id);
  // korte melding bovenin (geen venster: niet midden in een inspectie storen)
  function meldConflict() {
    if (!App.user || !mijnConflicten().length) return;
    let m = $("syncconflict");
    if (!m) {
      m = document.createElement("div"); m.id = "syncconflict"; m.setAttribute("role", "status");
      m.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom, 0px));z-index:9998;max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:14px 16px;box-shadow:0 6px 24px rgba(0,0,0,.15);line-height:1.4";
      document.body.appendChild(m);
    }
    m.innerHTML = `<div style="font-weight:700;margin-bottom:4px">Wijziging niet doorgevoerd</div>
      <div class="s" style="margin-bottom:10px">Iemand anders wijzigde hetzelfde tegelijk. De stand van de server blijft; jouw versie is bewaard op dit toestel.</div>
      <button class="btn primary" style="width:auto;padding:10px 16px" onclick="App.syncConflictSluit();App.syncDetails()">Bekijken</button>
      <button class="btn ghost" style="width:auto;padding:10px 16px;margin-left:8px" onclick="App.syncConflictSluit()">Later</button>`;
  }
  const toonWaarde = (v) => {
    if (v == null || v === "") return "(leeg)";
    if (typeof v === "string") return v.startsWith("data:image/") || FOTOPAD.test(v) ? "(foto)" : vUuid(v) ? window.WPI.naam(v) : kort0(v);
    if (Array.isArray(v)) return v.length + (v.length === 1 ? " item" : " items");
    if (typeof v === "boolean") return v ? "ja" : "nee";
    return typeof v === "object" ? "(gewijzigd)" : String(v);
  };
  const kort0 = (s) => (s.length > 120 ? s.slice(0, 117) + "…" : s);
  // leesbare naam van een record (nooit alleen een id als er iets beters is)
  const datumNl = (d) => { const t = Date.parse(d || ""); return isNaN(t) ? "" : new Date(t).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }); };
  function leesbaar(store, r, id) {
    r = r || {};
    const delen = store === "planning" ? [r.code ? (App.productNaam ? App.productNaam(r.code) : r.code) : "", datumNl(r.datum), r.locatie]
      : store === "acties" ? [r.tekst ? kort0(String(r.tekst)) : "", r.inspectie_titel]
      : [r.titel, r.project, datumNl(r.opgeslagen)];
    const t = delen.filter((x) => x && typeof x === "string").join(" · ");
    return t || (store === "acties" ? "Actie zonder tekst" : "Zonder naam") + " (" + String(id || r.id || "?").slice(0, 40) + ")";
  }
  const recordNaam = (c) => leesbaar(c.store, c.kopie, c.id);
  // keyset-paginering op id: compleet, ook als de server minder rijen per verzoek teruggeeft dan gevraagd
  async function pagineer(tabel, select, extra, vanaf) {
    const uit = []; let na = vanaf;
    for (let i = 0; i < 100000; i++) {
      const r = await sb(`/rest/v1/${tabel}?select=${select}&order=id.asc&limit=${PAGINA}${extra || ""}` + (na != null && na !== "" ? "&id=gt." + encodeURIComponent(na) : ""));
      if (!Array.isArray(r) || !r.length) break;
      uit.push(...r);
      const laatste = r[r.length - 1].id;
      if (laatste == null || String(laatste) === String(na)) break;
      na = laatste;
    }
    return uit;
  }
  const inLijst = (ids) => "in.(" + ids.map((i) => '"' + i + '"').join(",") + ")";
  async function perStuk(ids, fn) { const uit = []; for (let i = 0; i < ids.length; i += 50) uit.push(...await fn(ids.slice(i, i + 50))); return uit; }
  async function verwerk(store, lijst, rijen, maak, uid, gen) {
    let n = 0;
    const gestopt = () => gen !== generatie || !App.user || App.user.id !== uid;
    const opServer = new Set(lijst.map((r) => r.id));
    for (const row of rijen) {
      if (gestopt()) return n;                                   // intussen uitgelogd of andere gebruiker
      if (!row || !vId(row.id) || !vTijd(row.updated_at)) continue;
      const k = store + ":" + row.id;
      // een wijziging van dit toestel in de wachtrij wordt nooit door het ophalen overschreven: bij het
      // versturen wordt hij per veld samengevoegd met de serverstand (samenvoegen()); daarna komt die hier
      if (OB.has(k)) continue;
      const lokaal = await g0(store, row.id);
      if (lokaal && META.get("srv:" + k) === row.updated_at && !META.get("fotomist:" + k)) continue;   // ongewijzigd
      const ctx = { mist: false };
      const rec = await maak(row, lokaal, ctx);
      if (gestopt() || OB.has(k)) { if (gestopt()) return n; continue; }
      // record + srv:-stand in één transactie, alleen als deze gebruiker nog de eigenaar van het toestel is
      // (anders logde intussen een ander in, bijv. in een ander tabblad): syncWisLokaal ziet dit record dus altijd
      const u = await schrijfVanServer(store, rec, k, row.updated_at, uid);
      if (u === "ander") { generatie++; return n; }
      if (u !== true) continue;
      await zetMeta("fotomist:" + k, ctx.mist ? true : undefined); n++;
    }
    if (gestopt() || !(await nogEigenaar(uid))) return n;          // een ander is intussen eigenaar: niets meer aanraken
    for (const mk of [...META.keys()]) {                          // op de server verdwenen (of geen toegang meer)
      if (!mk.startsWith("srv:" + store + ":")) continue;
      const id = mk.slice(5 + store.length);
      if (!opServer.has(id) && !OB.has(store + ":" + id)) { await d0(store, id); await zetMeta(mk, undefined); await zetMeta("fotomist:" + store + ":" + id, undefined); n++; }
    }
    return n;
  }
  const logRegel = (l, naam) => ({ t: vTijd(l.t) || nu(), wie: naam(l.wie), wat: vTekst(l.wat) || "" });
  async function syncHaal() {
    if (!actief() || !App.user || !navigator.onLine) return 0;
    if (haalBezig) return haalBezig;
    haalBezig = (async () => {
      await laad();
      if (bezig) { try { await bezig; } catch (e) {} }   // nooit tegelijk met versturen (srv:-standen)
      if (!App.user) return 0;
      const uid = App.user.id, naam = window.WPI.naam, gen = generatie;
      await laad(true);   // wachtrij en srv:-standen zoals ze nu in IndexedDB staan (andere tabbladen)
      if (gen !== generatie || !App.user || App.user.id !== uid || !(await nogEigenaar(uid))) return 0;
      const gestopt = () => gen !== generatie || !App.user || App.user.id !== uid;   // intussen uitgelogd / ander
      // 1. per tabel alle (id, updated_at) die ik mag zien; 2. alleen wat nieuw of gewijzigd is volledig ophalen
      const lijsten = await Promise.all(STORES.map((t) => pagineer(t, "id,updated_at")));
      const rijen = {};
      for (let i = 0; i < STORES.length; i++) {
        const t = STORES[i], lok = new Set((await ga0(t)).map((x) => x.id));
        const nodig = lijsten[i].filter((r) => vId(r.id) && (!lok.has(r.id) || META.get("srv:" + t + ":" + r.id) !== r.updated_at || META.get("fotomist:" + t + ":" + r.id))).map((r) => r.id);
        rijen[t] = await perStuk(nodig, (ids) => pagineer(t, "*", "&id=" + encodeURIComponent(inLijst(ids))));
      }
      // verloop: alleen nieuwe regels (id > cursor); van gewijzigde acties het hele verloop
      const ck = "logcursor:" + uid, cursor = META.get(ck) || 0;
      const nieuweLogs = await pagineer("actie_log", "id,actie_id,t,wie,wat", "", cursor || null);
      const gewijzigd = new Set(rijen.acties.map((r) => r.id));
      let logs = nieuweLogs;
      if (cursor) {
        const ids = [...new Set([...gewijzigd, ...nieuweLogs.map((l) => l.actie_id)])].filter(vId);
        logs = await perStuk(ids, (c) => pagineer("actie_log", "id,actie_id,t,wie,wat", "&actie_id=" + encodeURIComponent(inLijst(c))));
      }
      const logPer = new Map();
      logs.forEach((l) => { if (!l || !vId(l.actie_id)) return; if (!logPer.has(l.actie_id)) logPer.set(l.actie_id, []); logPer.get(l.actie_id).push(l); });
      const maxLog = nieuweLogs.reduce((m, l) => Math.max(m, +l.id || 0), cursor);

      let n = 0;
      n += await verwerk("inspecties", lijsten[0], rijen.inspecties, async (row, lokaal, ctx) => {
        const rec = await schoon(isObj(row.record) ? row.record : {}, await lokaleFotos(lokaal || {}), ctx, "", "");
        rec.waarnemingen = lijstVan(rec.waarnemingen, isObj);
        rec.waarnemingen.forEach((w) => { if (w.actie != null && !isObj(w.actie)) w.actie = null; if (w.maatregelen != null) w.maatregelen = lijstVan(w.maatregelen, isTekst); });
        ["taken", "monteurs", "open_punten"].forEach((k) => { if (rec[k] != null) rec[k] = lijstVan(rec[k], isTekst); });
        if (rec.keuzes != null) rec.keuzes = lijstVan(rec.keuzes, isObj);
        if (rec.oordelen != null) { const o = {}; if (isObj(rec.oordelen)) for (const [k, v] of Object.entries(rec.oordelen)) if (vId(k) && OORDEEL.includes(v)) o[k] = v; rec.oordelen = o; }
        if (rec.versie != null && typeof rec.versie !== "number") rec.versie = +rec.versie || 3;
        // wie de inspectie deed komt van de server (inspecteur_id), nooit uit de vrije tekst van het record
        return Object.assign(rec, { id: row.id, inspecteur_id: vUuid(row.inspecteur_id), titel: vTekst(row.titel) || "Inspectie", code: vTekst(row.code), project: vTekst(row.project),
          opgeslagen: vTijd(row.opgeslagen), plan_id: vId(row.plan_id) || rec.plan_id || null, inspecteur: naam(vUuid(row.inspecteur_id)), updated_at: row.updated_at });
      }, uid, gen);
      n += await verwerk("acties", lijsten[1], rijen.acties, async (row, lokaal, ctx) => {
        const b = lokaal || {}, iid = vId(row.inspectie_id), bron = iid ? await g0("inspecties", iid) : null, fotos = await lokaleFotos(b);
        const w = bron && (bron.waarnemingen || []).find((x) => x && x.actie && x.actie.actie_id === row.id);
        const a = Object.assign({}, b, { id: row.id, inspectie_id: iid, tekst: vTekst(row.tekst) || "", oordeel: vEnum(row.oordeel, OORDEEL), ref: vTekst(row.ref), waarneming: vTekst(row.waarneming),
          prio: vEnum(row.prio, PRIOS), status: vEnum(row.status, STATUS) || "Voorstel", houder: vUuid(row.houder), toetser: vUuid(row.toetser), plandatum: vDatum(row.plandatum),
          handmatig: !!row.handmatig, updated_at: row.updated_at });
        delete a.demo;
        a.inspectie_titel = bron ? bron.titel : row.handmatig ? "Handmatig aangemaakt" : b.inspectie_titel || "";
        if (bron) a.inspecteur = bron.inspecteur;
        a.terPlaatse = vEnum((w && w.actie.terPlaatse) || b.terPlaatse, TERPLAATSE) || "niets";
        a.foto = row.foto_pad ? await beeld(row.foto_pad, fotos, ctx) : null;
        a.nafoto = row.nafoto_pad ? await beeld(row.nafoto_pad, fotos, ctx) : null;
        const lg = logPer.get(row.id);
        if (lg) { a.log = lg.map((l) => logRegel(l, naam)); await zetMeta("logn:" + row.id, a.log.length); }
        return a;
      }, uid, gen);
      // nieuwe verlogregels bij acties die zelf niet veranderden
      for (const [aid, lg] of logPer) {
        if (gewijzigd.has(aid)) continue;
        const k = "acties:" + aid, e = OB.get(k); if (e && e.uid !== uid) continue;
        const a = await g0("acties", aid); if (!a) continue;
        if (gestopt()) return n;
        const onverstuurd = e ? (a.log || []).slice(META.get("logn:" + aid) || 0) : [];
        a.log = lg.map((l) => logRegel(l, naam)).concat(onverstuurd);
        const u = await schrijfVanServer("acties", a, k, undefined, uid, true);   // eigen onverstuurde regels zitten erin
        if (u === "ander") { generatie++; return n; }
        if (u !== true) continue;
        await zetMeta("logn:" + aid, lg.length); n++;
      }
      n += await verwerk("planning", lijsten[2], rijen.planning, async (row, lokaal) => Object.assign({}, lokaal || {}, {
        id: row.id, datum: vDatum(row.datum), code: vTekst(row.code), project: vTekst(row.project) || "", locatie: vTekst(row.locatie) || "",
        monteurs: Number.isFinite(+row.monteurs) && row.monteurs != null ? +row.monteurs : null, inspecteur: vUuid(row.inspecteur),
        toelichting: vTekst(row.toelichting) || "", status: vEnum(row.status, ["gepland", "uitgevoerd"]) || "gepland", inspectie_id: vId(row.inspectie_id),
        gemaakt_door: vUuid(row.gemaakt_door), updated_at: row.updated_at }), uid, gen);
      if (gestopt()) return n;
      await zetMeta(ck, maxLog || undefined);
      laatsteHaal = Date.now(); contactOk(); haalPogingen = 0;
      if (n) {   // schermen opnieuw laten laden (niet midden in een inspectie of met een venster open)
        App.acties = null; App.planning = null;
        const ov = $("ov");
        if (App.user && App._page !== "inspectie" && !(ov && ov.classList.contains("on"))) App.route();
      }
      return n;
    })().catch((e) => {
      if (window.console) console.warn("[sync] ophalen mislukt: " + (e.message || e));
      contactFout(e);
      // server (nog) niet bereikt: vanzelf opnieuw proberen, oplopend tot 5 min
      if (tijdelijk(e) && App.user) { clearTimeout(haalTimer); haalTimer = setTimeout(() => { haalTimer = null; syncHaal(); }, wacht(++haalPogingen)); }
      return 0;
    }).finally(() => { haalBezig = null; toonStatus(); });
    return haalBezig;
  }

  // ---------------- oude gegevens (prototype/voorbeeldversie) op dit toestel ----------------
  // records zonder serverstand en zonder wachtrij-opdracht: nooit verstuurd, van onbekende eigenaar;
  // plus een onafgemaakte inspectie (concept) van een voorbeeldaccount ("lopend-u-…", geen echte uuid)
  async function oudeRecords() {
    await laad();
    const uit = {};
    for (const s of STORES) uit[s] = (await ga0(s)).filter((x) => x && x.id != null && !x.demo && !isVoorbeeld(x.id) && !META.has("srv:" + s + ":" + x.id) && !OB.has(s + ":" + x.id));
    let c = []; try { c = await ga0("concept"); } catch (e) {}
    uit.concepten = c.filter((x) => x && /^lopend-/.test(String(x.id)) && !vUuid(String(x.id).slice(7)) && x.ins && typeof x.ins === "object");
    return uit;
  }
  const telOud = (o) => STORES.reduce((n, s) => n + o[s].length, 0) + (o.concepten || []).length;
  const DAG = 86400000;
  // een echte, actieve collega (uit public.profiles) die actiehouder/toetser mag zijn
  const bekend = (id) => !!vUuid(id) && (window.WPI.USERS || []).some((x) => x.id === id && x.role !== "qhse");
  // wat kan de server aannemen? (supabase/migrations/0002: inspecties_controle_nieuw, acties_controle_nieuw)
  async function overnamePlan(o, u) {
    const recent = (r) => { const t = Date.parse(r.opgeslagen || ""); return !isNaN(t) && t > Date.now() - 29 * DAG && t < Date.now() + 5 * 60000; };
    const insp = o.inspecties.filter(recent), teOud = o.inspecties.filter((r) => !recent(r));
    const mijn = new Set(insp.map((r) => r.id));
    (await ga0("inspecties")).forEach((r) => { if (r && r.inspecteur_id === u.id && META.has("srv:inspecties:" + r.id)) mijn.add(r.id); });
    const acties = o.acties.filter((a) => !a.inspectie_id || mijn.has(a.inspectie_id)), los = o.acties.filter((a) => a.inspectie_id && !mijn.has(a.inspectie_id));
    return { inspecties: insp, teOud, acties, los, planning: o.planning, mijn };
  }
  const kortDatum = (t) => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) + " "; };
  const meervoud = (n, een, veel) => n + " " + (n === 1 ? een : veel);
  // ---------------- status ----------------
  const TEKST = { lokaal: "✓ Veilig op dit toestel", wachtrij: "In wachtrij", ok: "✓ Gesynchroniseerd", fout: "Mislukt — opnieuw" };
  const KLASSE = { lokaal: "ok", wachtrij: "", ok: "ok", fout: "fout" };
  function statusVan(store, id) {
    const e = OB.get(store + ":" + id);
    if (e) return e.fout ? "fout" : "wachtrij";
    return META.has("srv:" + store + ":" + id) ? "ok" : "lokaal";
  }
  function totaal() {
    const uid = App.user && App.user.id, mijn = [...OB.values()].filter((e) => e.uid === uid);
    if (mijn.some((e) => e.fout)) return { s: "fout", n: mijn.length, mijn };
    if (mijn.length) return { s: "wachtrij", n: mijn.length, mijn };
    return { s: navigator.onLine && serverBereikt() ? "ok" : "lokaal", n: 0, mijn };
  }
  function uitlegLokaal() {
    if (!navigator.onLine) return "Offline — je gegevens staan veilig op dit toestel en gaan mee zodra er verbinding is";
    if (laatsteFout) return "Geen contact met de server sinds " + tijd(laatsteFout) + " — je gegevens staan veilig op dit toestel; de app probeert het vanzelf opnieuw";
    return "Nog geen contact met de server — je gegevens staan veilig op dit toestel";
  }
  const tijd = (d) => d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const chipHtml = (s, extra, attr) => `<span class="opslag ${KLASSE[s]}" ${attr || ""}${s === "fout" ? ` role="button" tabindex="0" style="cursor:pointer" onclick="event.stopPropagation();App.syncOpnieuw()"` : ""}>${esc(TEKST[s] + (extra || ""))}</span>`;
  function toonStatus() {
    if (!actief()) return;
    const c = $("syncchip");
    if (c) {
      const t = totaal(), wachtend = t.mijn.filter((e) => !e.fout && e.pogingen > 0);
      c.className = "opslag " + KLASSE[t.s]; c.dataset.status = t.s;
      c.textContent = TEKST[t.s] + (t.s === "wachtrij" ? " · " + t.n : "");
      c.title = t.s === "fout" ? "Tik om opnieuw te versturen"
        : t.s === "wachtrij" && (!navigator.onLine || wachtend.length) ? "Geen verbinding met de server — je wijzigingen staan veilig op dit toestel en gaan vanzelf mee"
        : t.s === "lokaal" ? uitlegLokaal()
        : laatsteOk ? "Laatst gesynchroniseerd " + tijd(laatsteOk) : "";
    }
    document.querySelectorAll("[data-sync]").forEach((x) => {
      const [store, ...rest] = x.dataset.sync.split(":"), s = statusVan(store, rest.join(":"));
      if (x.dataset.status !== s) x.outerHTML = chipHtml(s, "", `data-sync="${esc(x.dataset.sync)}" data-status="${s}"`);
    });
  }

  // ---------------- UI-koppelingen (alleen met backend) ----------------
  // een foto die nog niet kon worden opgehaald staat als storagepad in het record: niet als plaatje laden
  function verbergPaden(root) {
    (root || document).querySelectorAll("img[src]").forEach((img) => {
      if (!FOTOPAD.test(img.getAttribute("src") || "")) return;
      const s = document.createElement("span");
      s.className = "s"; s.textContent = "Foto volgt bij verbinding";
      s.style.cssText = "display:inline-block;padding:8px 10px;border-radius:10px;background:var(--mist, #EEF2EF)";
      img.replaceWith(s);
    });
  }
  let uiKlaar = false;
  function installeerUI() {
    if (uiKlaar || !actief()) return; uiKlaar = true;
    // statuschip in de bovenbalk (alle wijzigingen van deze gebruiker)
    const acct0 = App.renderAcct;
    App.renderAcct = function () {
      acct0.apply(this, arguments);
      const a = $("acct"); if (!a) return;
      if (!this.user) { a.innerHTML = ""; return; }
      const box = a.firstElementChild;
      if (box) box.insertAdjacentHTML("afterbegin", `<span id="syncchip" class="opslag" role="status" aria-live="polite" style="cursor:pointer" onclick="App.syncChipKlik()"></span>`);
      toonStatus();
      laad().then(toonStatus);   // koude start: de wachtrij staat pas na het inlezen van IndexedDB in het geheugen
    };
    // rapport: status van dit record
    const rap0 = App.view_rapport;
    if (rap0) App.view_rapport = async function (parts) {
      await rap0.apply(this, arguments);
      const h = document.querySelector("#view h1"), id = parts && parts[0];
      if (h && id && !document.querySelector("#view [data-sync]")) h.insertAdjacentHTML("afterend", `<div style="margin:-10px 0 14px">${App.syncChip("inspecties", id)}</div>`);
    };
    // "Vastgelegd"-venster: met backend klopt "cloud-opslag volgt" niet meer
    const mod0 = App.openModal;
    App.openModal = function (title, sub, body) {
      if (title === "Vastgelegd" && /cloud-opslag volgt/.test(sub || "")) sub = "Veilig bewaard op dit toestel en klaargezet voor de server. Zonder bereik gaat het mee zodra er weer verbinding is.";
      return mod0.call(this, title, sub, body);
    };
    // (hier en niet bij het laden: js/inspectie.js wordt ná dit bestand geladen)
    // Een planning (of inspectie) van de server kan een productcode hebben die niet in de kennisbank van
    // deze app staat (de server controleert dat niet; ook een inspecteur mag planning aanmaken). Dan geen
    // inspectie starten (die heeft de TRA-regels nodig) maar uitleggen wat er aan de hand is.
    const start0 = App.startInspectie;
    if (start0) App.startInspectie = function (code) {
      const kb = (this.data && this.data.kennisbank) || {};
      if (typeof code !== "string" || !Object.prototype.hasOwnProperty.call(kb, code) || !kb[code] || !Array.isArray(kb[code].regels)) {
        return this.openModal("Product onbekend", "Voor dit product (" + String(code == null ? "zonder code" : code).slice(0, 40) + ") staat geen TRA in de app, dus een inspectie kan niet starten.",
          `<div class="s" style="margin-bottom:12px;line-height:1.45">Vraag de coördinator de planning aan te passen naar een product uit de lijst. Je kunt ook zelf een inspectie starten via <b>Andere inspectie starten</b> op Vandaag.</div>
           <button class="btn primary" onclick="App.closeModal()">Sluiten</button>`);
      }
      return start0.apply(this, arguments);
    };
    if (window.MutationObserver) {
      const mo = new MutationObserver(() => verbergPaden());
      ["view", "ov"].forEach((id) => { const n = $(id); if (n) mo.observe(n, { childList: true, subtree: true }); });
    }
  }
  if (actief()) {
    const route0 = App.route;
    let eersteKeer = true;
    App.route = function () {
      installeerUI();
      // sessie hersteld zonder serververbinding (offline/lie-fi bij het openen): snel opnieuw proberen
      if (eersteKeer && App.user) { eersteKeer = false; setTimeout(() => { if (App.user && !serverBereikt() && !haalBezig) syncHaal(); }, 2000); }
      return route0.apply(this, arguments);
    };
    window.addEventListener("online", () => { toonStatus(); syncNu({ direct: true }); });
    window.addEventListener("offline", toonStatus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !App.user) return;
      syncNu({ direct: true }); if (Date.now() - laatsteHaal > 5 * 60000) syncHaal();
    });
    // elke minuut: wachtrij versturen, en zolang de server nog niet (opnieuw) is bereikt ook ophalen
    setInterval(() => { if (!App.user) return; if (OB.size) syncNu(); if (!serverBereikt() && navigator.onLine && !haalTimer) syncHaal(); }, 60000);
    // CSP blokkeert de server? Dan is het project-adres niet (goed) in de CSP gezet (zie js/config.js)
    document.addEventListener("securitypolicyviolation", (e) => {
      if (String(e.blockedURI || "").startsWith(BASIS)) { cspFout = true; if (window.console) console.error("[sync] De Content-Security-Policy blokkeert " + BASIS + " — zet dit adres in connect-src (index.html, _headers, netlify.toml, vercel.json)."); }
    });
  }

  Object.assign(App, {
    syncActief: actief,
    // status van één record: "lokaal" | "wachtrij" | "ok" | "fout"
    syncStatus(store, id) { return actief() ? statusVan(store, id) : "lokaal"; },
    syncStatusTekst(store, id) { return TEKST[this.syncStatus(store, id)]; },
    // chip voor in een scherm; werkt zichzelf bij. Zonder backend: de vertrouwde tekst van vandaag.
    syncChip(store, id) {
      const s = this.syncStatus(store, id);
      return chipHtml(s, "", actief() ? `data-sync="${esc(store + ":" + id)}" data-status="${s}"` : "");
    },
    syncWachtrij() { return actief() ? [...OB.values()].filter((e) => App.user && e.uid === App.user.id).length : 0; },
    syncConflicten() { return (META.get("conflicten") || []).slice(); },
    syncConflictSluit() { const m = $("syncconflict"); if (m) m.remove(); },
    // jouw bewaarde waarden alsnog toepassen: als nieuwe wijziging bovenop de huidige serverstand
    // (de server controleert opnieuw of het mag, bijv. wie een actie mag toetsen)
    async syncConflictToepassen(cid) {
      const l = META.get("conflicten") || [], c = l.find((x) => x.cid === cid);
      if (!c || !App.user || c.uid !== App.user.id) return;
      await syncHaal();
      const rec = await DB.get(c.store, c.id);
      if (!rec) { this.closeModal(); return this.openModal("Niet meer beschikbaar", "Dit record staat niet (meer) op de server of je hebt er geen toegang meer toe.", `<button class="btn primary" onclick="App.closeModal()">Sluiten</button>`); }
      c.velden.forEach((v) => { if (!VERBODEN.has(v.veld)) rec[v.veld] = v.waarde; });
      if (c.store === "acties") (rec.log = Array.isArray(rec.log) ? rec.log : []).push({ t: nu(), wie: App.user.full_name, wat: "Eerder niet doorgevoerde wijziging alsnog toegepast: " + c.velden.map((v) => VELDNAAM[v.veld] || v.veld).join(", ") });
      try { await DB.put(c.store, rec); } catch (e) { return; }
      await zetMeta("conflicten", l.map((x) => (x.cid === cid ? Object.assign({}, x, { open: false, kopie: null, toegepast: nu() }) : x)));
      this.acties = null; this.planning = null; this.closeModal(); this.route();
    },
    // record dat op de server verdween terwijl hier een wijziging klaarstond: de gebruiker kiest bewust om
    // het met zijn versie opnieuw aan te maken (de server controleert opnieuw of dat mag)
    async syncConflictHerstel(cid) {
      const l = META.get("conflicten") || [], c = l.find((x) => x.cid === cid);
      if (!c || !c.weg || !c.kopie || !App.user || c.uid !== App.user.id) return;
      await laad(true);
      const k = c.store + ":" + c.id, rec = JSON.parse(JSON.stringify(c.kopie));
      if (OB.has(k) && OB.get(k).uid !== App.user.id) return;
      await zetMeta("srv:" + k, undefined); await zetMeta("fotomist:" + k, undefined);   // = nieuw record: gewoon aanbieden
      if (c.store === "acties") {
        rec.log = Array.isArray(rec.log) ? rec.log : [];
        await zetMeta("logn:" + c.id, rec.log.length);   // de oude regels niet opnieuw (op naam van wie nu herstelt) versturen
        rec.log.push({ t: nu(), wie: App.user.full_name, wat: "Opnieuw aangemaakt vanaf het toestel, nadat de actie op de server was verwijderd" });
      }
      try { await DB.put(c.store, rec); } catch (e) { return; }
      await zetMeta("conflicten", l.map((x) => (x.cid === cid ? Object.assign({}, x, { open: false, kopie: null, hersteld: nu() }) : x)));
      this.acties = null; this.planning = null; this.closeModal(); this.route();
    },
    // een door de server geweigerde wijziging (400/403/409/422, bijv. geen rechten): bekijken en oplossen
    async syncWijziging(id) {
      await laad();
      const e = OB.get(id);
      if (!e || !App.user || e.uid !== App.user.id) return this.syncDetails();
      let r = null; try { r = await g0(e.store, e.rid); } catch (x) {}
      const rec = r || e.basis || {}, opServer = META.has("srv:" + e.id);
      const V = e.store === "planning" ? [["Product", rec.code ? (App.productNaam ? App.productNaam(rec.code) : rec.code) : ""], ["Datum", datumNl(rec.datum)], ["Locatie", rec.locatie], ["Project", rec.project], ["Inspecteur", rec.inspecteur], ["Monteurs", rec.monteurs], ["Toelichting", rec.toelichting], ["Status", rec.status]]
        : e.store === "acties" ? [["Actie", rec.tekst], ["Inspectie", rec.inspectie_titel], ["Status", rec.status], ["Actiehouder", rec.houder], ["Toetser", rec.toetser], ["Plandatum", datumNl(rec.plandatum)], ["Oordeel", rec.oordeel]]
        : [["Titel", rec.titel], ["Project", rec.project], ["Vastgelegd", datumNl(rec.opgeslagen)], ["Waarnemingen", Array.isArray(rec.waarnemingen) ? rec.waarnemingen.length : null], ["Inspecteur", rec.inspecteur_id]];
      const velden = V.filter(([, v]) => v != null && v !== "").map(([k, v]) => `<div class="row"><span class="grow"><span class="s">${esc(k)}</span><div class="t">${esc(toonWaarde(v))}</div></span></div>`).join("");
      const gevolg = e.op === "del" ? "Weggooien = het record niet verwijderen: de stand van de server komt terug op dit toestel."
        : opServer ? "Weggooien = jouw wijziging vervalt; dit record gaat terug naar de laatst bekende stand van de server."
        : "Weggooien = dit record staat nog niet op de server en verdwijnt van dit toestel.";
      this.openModal("Wijziging geweigerd", (SOORT[e.store] || e.store) + " · " + leesbaar(e.store, rec, e.rid),
        `<div class="hint" style="margin-bottom:12px;line-height:1.45"><b>${e.op === "del" ? "Verwijderen" : "Bijwerken"} geweigerd door de server:</b> ${esc(e.melding || "onbekende reden")}.
           Opnieuw proberen helpt alleen als de oorzaak is opgelost (bijv. als je de rechten hebt gekregen).</div>
         ${velden ? `<div class="listcard" style="margin-bottom:12px">${velden}</div>` : ""}
         <div class="s" style="margin-bottom:12px;line-height:1.45">${esc(gevolg)}</div>
         <button class="btn primary" onclick="App.closeModal();App.syncOpnieuw()">Opnieuw proberen</button>
         <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.syncWeggooien('${esc(e.id)}')">Wijziging weggooien</button>
         <button class="linkknop" style="margin-top:10px" onclick="App.syncDetails()">Terug</button>`);
    },
    async syncWeggooien(id) {
      await laad(true);
      const e = OB.get(id);
      if (!e || !App.user || e.uid !== App.user.id || !STORES.includes(e.store)) return this.syncDetails();
      const opServer = META.has("srv:" + e.id), terug = opServer && e.basis ? e.basis : null;
      wijzig++;
      const gedaan = await tx([e.store, "outbox"], (t, klaar) => {
        const ob = t.objectStore("outbox"), r = ob.get(id);
        r.onsuccess = () => {
          if (!r.result || r.result.versie !== e.versie) { klaar(false); return; }   // intussen opnieuw gewijzigd
          ob.delete(id);
          if (terug) t.objectStore(e.store).put(terug);
          else if (!opServer) t.objectStore(e.store).delete(e.rid);
          klaar(true);
        };
      }).catch(() => false);
      if (gedaan) {
        OB.delete(id); meldTabbladen();
        if (!opServer && e.store === "acties") await zetMeta("logn:" + e.rid, undefined);
        // stond het op de server maar was er geen basis: de serverstand opnieuw laten ophalen
        if (opServer && !terug) { await zetMeta("srv:" + e.id, undefined); try { await d0(e.store, e.rid); } catch (x) {} }
      }
      this.acties = null; this.planning = null; toonStatus();
      this.closeModal();
      if (App.user && [...OB.values()].some((x) => x.uid === App.user.id && x.fout)) this.syncDetails(); else this.route();
      if (opServer) syncHaal();
    },
    async syncConflictWeg(cid) {
      const l = META.get("conflicten") || [];
      await zetMeta("conflicten", l.map((x) => (x.cid === cid && App.user && x.uid === App.user.id ? Object.assign({}, x, { open: false, kopie: null }) : x)));
      this.closeModal(); if (mijnConflicten().length) this.syncDetails();
    },
    async syncStart() {
      if (!actief() || !App.user) return;
      await laad(); await syncHaal(); await syncNu({ direct: true });
      // oude, nooit verstuurde gegevens op dit toestel: één keer per sessie vragen wat ermee moet
      const o = await oudeRecords(), n = telOud(o), sk = "wpi_oud_gevraagd_" + App.user.id;
      let gevraagd = false; try { gevraagd = !!sessionStorage.getItem(sk); } catch (e) {}
      const ov = $("ov");
      if (n && !gevraagd && App._page !== "inspectie" && !(ov && ov.classList.contains("on"))) {
        try { sessionStorage.setItem(sk, "1"); } catch (e) {}
        this.syncOudVraag(o);
      }
    },
    syncNu(opt) { return syncNu(opt || { direct: true }); },
    syncHaal,
    async syncOpnieuw() {
      OB.forEach((e) => { if (App.user && e.uid === App.user.id) { e.fout = false; e.permanent = false; e.volgende = 0; e.pogingen = 0; } });
      toonStatus(); await syncNu({ forceer: true }); await syncHaal();
    },
    syncChipKlik() { return totaal().s === "fout" ? this.syncOpnieuw() : this.syncDetails(); },
    async syncDetails() {
      const t = totaal(), mijn = t.mijn, oud = telOud(await oudeRecords()), con = mijnConflicten();
      const soort = SOORT;
      const conRij = (c) => c.weg ? `<div class="row" data-conflict="${esc(c.cid)}"><span class="grow"><span class="t">${esc(SOORT[c.store] || c.store)} · ${esc(recordNaam(c))}</span>
        <div class="s">${esc(kortDatum(c.t))}${esc(tijd(new Date(c.t)))} · <b>verwijderd op de server</b> (door het Hoofd Service &amp; Montage, of je hebt er geen toegang meer toe). Jouw wijziging is daarom niet verstuurd; jouw versie is bewaard op dit toestel.</div>
        <div style="margin-top:8px"><button class="btn ghost" style="width:auto;padding:8px 14px" onclick="App.syncConflictHerstel('${esc(c.cid)}')">Opnieuw aanmaken</button>
        <button class="linkknop" style="margin-left:8px" onclick="App.syncConflictWeg('${esc(c.cid)}')">Weggooien</button></div></span></div>`
        : `<div class="row" data-conflict="${esc(c.cid)}"><span class="grow"><span class="t">${esc(SOORT[c.store] || c.store)} · ${esc(recordNaam(c))}</span>
        <div class="s">${esc(kortDatum(c.t))}${esc(tijd(new Date(c.t)))} · jouw versie: ${c.velden.map((v) => esc(VELDNAAM[v.veld] || v.veld) + " <b>" + esc(toonWaarde(v.waarde)) + "</b>").join(" · ")}</div>
        <div style="margin-top:8px"><button class="btn ghost" style="width:auto;padding:8px 14px" onclick="App.syncConflictToepassen('${esc(c.cid)}')">Mijn versie toepassen</button>
        <button class="linkknop" style="margin-left:8px" onclick="App.syncConflictWeg('${esc(c.cid)}')">Weggooien</button></div></span></div>`;
      const namen = new Map();
      for (const e of mijn.slice(0, 20)) { let r = null; try { r = await g0(e.store, e.rid); } catch (x) {} namen.set(e.id, leesbaar(e.store, r || e.basis, e.rid)); }
      const rij = (e) => `<div class="row" data-wachtrij="${esc(e.id)}"><span class="grow"><span class="t">${soort[e.store] || e.store} · ${esc(namen.get(e.id) || e.rid)}</span>
        <div class="s">${e.op === "del" ? "Verwijderen" : "Bijwerken"} · ${e.fout ? "geweigerd door de server" + (e.melding ? ": " + esc(e.melding) : "") : e.pogingen ? "in de wachtrij — " + esc(e.melding || "geen verbinding met de server") + "; volgt vanzelf" : "wacht op verbinding"}</div>
        ${e.fout ? `<div style="margin-top:8px"><button class="btn ghost" style="width:auto;padding:8px 14px" onclick="App.syncWijziging('${esc(e.id)}')">Bekijken en oplossen</button></div>` : ""}</span></div>`;
      this.openModal("Synchronisatie", !navigator.onLine ? "Geen verbinding — wijzigingen blijven veilig op dit toestel staan." : serverBereikt() ? "Verbonden met de server" : uitlegLokaal() + ".",
        `<div style="margin-bottom:12px">${chipHtml(t.s, t.s === "wachtrij" ? " · " + t.n : "")}${laatsteOk ? `<span class="s" style="margin-left:8px">laatst ${tijd(laatsteOk)}</span>` : ""}</div>
         ${cspFout ? `<div class="hint" style="margin-bottom:12px">De beveiligingsinstellingen (CSP) van deze website blokkeren de server. Vraag de beheerder het project-adres toe te voegen.</div>` : ""}
         ${mijn.length ? `<div class="listcard" style="margin-bottom:12px">${mijn.slice(0, 20).map(rij).join("")}</div>` : ""}
         ${con.length ? `<div style="font-weight:700;margin:4px 0 4px">Niet doorgevoerd</div>
           <div class="s" style="margin-bottom:8px;line-height:1.45">Iemand anders wijzigde of verwijderde hetzelfde intussen; de stand van de server is gebleven. Jouw versie staat hieronder en is bewaard op dit toestel.</div>
           <div class="listcard" style="margin-bottom:12px">${con.slice(-10).reverse().map(conRij).join("")}</div>` : ""}
         ${oud ? `<div class="hint" style="margin-bottom:12px">${oud} ${oud === 1 ? "record" : "records"} uit de voorbeeldversie ${oud === 1 ? "staat" : "staan"} alleen op dit toestel en ${oud === 1 ? "wordt" : "worden"} niet verstuurd. <button class="linkknop" onclick="App.syncOudVraag()">Bekijken</button></div>` : ""}
         <button class="btn primary" onclick="App.closeModal();App.syncOpnieuw()">Nu synchroniseren</button>`);
    },
    // oude gegevens: overnemen (komen op jouw naam en gaan naar de server) of laten staan
    async syncOudVraag(o) {
      o = o || await oudeRecords();
      const u = App.user; if (!u) return;
      const pl = await overnamePlan(o, u), con = o.concepten || [];
      this._oudeConcepten = con;
      const delen = [pl.inspecties.length && meervoud(pl.inspecties.length, "inspectie", "inspecties"), pl.acties.length && meervoud(pl.acties.length, "actie", "acties"),
        pl.planning.length && meervoud(pl.planning.length, "planning", "planningen")].filter(Boolean).join(", ");
      const blijft = [pl.teOud.length && meervoud(pl.teOud.length, "inspectie is", "inspecties zijn") + " ouder dan 30 dagen en kan niet meer naar de server",
        pl.los.length && meervoud(pl.los.length, "actie hoort", "acties horen") + " bij een inspectie die niet wordt overgenomen"].filter(Boolean);
      if (!delen && !blijft.length && !con.length) return this.closeModal();
      const c0 = con[0], ci = c0 && c0.ins;
      const conceptHtml = !c0 ? "" : `<div class="hint" style="margin:12px 0;line-height:1.45"><b>Onafgemaakte inspectie</b> uit de voorbeeldversie: ${esc(ci.titel || "zonder titel")} · ${meervoud((ci.waarnemingen || []).length, "waarneming", "waarnemingen")}${c0.t ? " · " + esc(kortDatum(c0.t).trim()) : ""}.
          ${App.state.inspectie ? "Je hebt zelf al een lopende inspectie; rond die eerst af. Deze blijft op dit toestel staan." : `Alleen verdergaan als <b>jij</b> deze inspectie bent begonnen.
          <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.syncNeemConceptOver(0)">Verder als mijn lopende inspectie</button>`}</div>`;
      this.openModal("Oude gegevens op dit toestel", (delen ? "Uit de voorbeeldversie van de app: " + delen + ". " : "") + "Deze staan alleen hier en gaan niet naar de server.",
        `${delen ? `<div class="s" style="margin-bottom:12px;line-height:1.45">Neem ze alleen over als <b>jij</b> deze inspecties zelf hebt gedaan: ze komen op jouw naam.
           Acties gaan terug naar <b>Voorstel</b>, zodat actiehouder en toetser ze echt opnieuw doorlopen (alleen open acties met echte collega's als actiehouder en toetser blijven Open).
           De oude historie komt als één regel bij de actie; niets wordt achteraf op naam van een ander gezet.</div>` : ""}
         ${blijft.length ? `<div class="s" style="margin-bottom:12px;line-height:1.45">${blijft.map((x) => esc(x) + ".").join(" ")} Dit blijft alleen op dit toestel.</div>` : ""}
         ${conceptHtml}
         ${delen ? `<button class="btn primary" onclick="App.syncNeemOver()">Overnemen en versturen</button>` : ""}
         <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.closeModal()">Laten staan (alleen op dit toestel)</button>`);
    },
    async syncNeemOver() {
      const u = App.user; if (!u || !actief()) return;
      const o = await oudeRecords(), pl = await overnamePlan(o, u);
      for (const r of pl.inspecties) { r.inspecteur_id = u.id; r.inspecteur = u.full_name; try { await DB.put("inspecties", r); } catch (e) {} }
      for (const a of pl.acties) {
        const was = a.status || "Voorstel";
        const mensenOk = bekend(a.houder) && bekend(a.toetser) && a.houder !== a.toetser;
        // ter plaatse gecorrigeerd in je eigen (overgenomen) inspectie: de inspecteur zag het herstel zelf en is de toetser
        const terPlaatse = was === "Afgerond" && a.terPlaatse === "gecorrigeerd" && !a.houder && a.inspectie_id && pl.mijn.has(a.inspectie_id);
        if (terPlaatse) { a.toetser = u.id; a.houder = null; }
        else if (!(was === "Open" && mensenOk)) {
          // alles wat verder was dan Open, of zonder echte actiehouder/toetser: opnieuw als Voorstel instellen
          a.status = "Voorstel"; a.houder = null; a.toetser = null; a.plandatum = null; a.nafoto = null;
        }
        // de oude regels NIET opnieuw versturen (de server zet er de huidige gebruiker en tijd bij):
        // één samenvattende regel, op naam van wie overneemt
        const oud = (Array.isArray(a.log) ? a.log : []).filter((l) => l && l.wat).map((l) => kortDatum(l.t) + String(l.wat) + (l.wie ? " (" + l.wie + ")" : "")).join("; ");
        a.log = [{ t: nu(), wie: u.full_name, wat: ("Overgenomen uit de voorbeeldversie" + (a.status !== was ? "; was \u201c" + was + "\u201d, nu \u201c" + a.status + "\u201d" : "")
          + (oud ? ". Historie uit de voorbeeldversie (niet gecontroleerd): " + oud : "")).slice(0, 1900) }];
        try { await DB.put("acties", a); } catch (e) {}
      }
      for (const p of pl.planning) {
        if (!bekend(p.inspecteur)) p.inspecteur = u.id;
        if (p.inspectie_id && !pl.mijn.has(p.inspectie_id)) p.inspectie_id = null;   // alleen je eigen inspectie koppelen
        try { await DB.put("planning", p); } catch (e) {}
      }
      this.acties = null; this.planning = null; this.closeModal(); this.route();
    },
    // onafgemaakte inspectie uit de voorbeeldversie verder als je eigen lopende inspectie
    async syncNeemConceptOver(i) {
      const c = (this._oudeConcepten || [])[i], u = App.user;
      if (!c || !u || App.state.inspectie) return this.closeModal();
      try { await DB.put("concept", { id: "lopend-" + u.id, ins: c.ins, t: nu() }); await DB.del("concept", c.id); } catch (e) { return; }
      App.state.inspectie = c.ins; this._oudeConcepten = null;
      this.closeModal(); if (this.goIns) this.goIns(); else location.hash = "#/inspectie";
    },
    // fictieve voorbeelddata hoort niet bij echte gebruikers
    async syncWisVoorbeeld() {
      try { localStorage.setItem("wpi_demo_acties", "1"); localStorage.setItem("wpi_demo_plan", "1"); } catch (e) {}
      for (const s of ["acties", "planning"]) {
        let l = []; try { l = await ga0(s); } catch (e) {}
        for (const x of l) if (x.demo || isVoorbeeld(x.id)) { try { await d0(s, x.id); } catch (e) {} }
      }
      this.acties = null; this.planning = null;
    },
    // Wat al veilig op de server staat van dit toestel halen (gedeelde toestellen). Gebeurt bij uitloggen,
    // bij het openen zonder geldige sessie (tabblad dicht zonder uitloggen) en vóór het inloggen van een
    // andere gebruiker dan de vorige (js/auth.js). Wat nog in de wachtrij staat blijft (verborgen voor
    // anderen) en gaat mee bij de volgende login van de eigenaar — er gaat dus nooit iets verloren.
    async syncWisLokaal(uid) {
      if (!actief()) return;
      generatie++;   // synchroon, vóór de eerste await: een lopende ronde schrijft vanaf nu niets meer
      clearTimeout(haalTimer); haalTimer = null;
      const m0 = $("syncconflict"); if (m0) m0.remove();
      await laad(true);   // vers uit IndexedDB: ook wat een ander tabblad net ophaalde
      for (const mk of [...META.keys()]) {
        const m = /^srv:(inspecties|acties|planning):(.+)$/.exec(mk); if (!m) continue;
        if (OB.has(m[1] + ":" + m[2])) continue;
        try { await d0(m[1], m[2]); } catch (e) {}
        await zetMeta(mk, undefined); await zetMeta("fotomist:" + m[1] + ":" + m[2], undefined);
        if (m[1] === "acties") await zetMeta("logn:" + m[2], undefined);
      }
      // de verloop-cursors horen bij de gewiste gegevens (van iedereen): volgende keer het hele verloop
      for (const mk of [...META.keys()]) if (/^logcursor:/.test(mk)) await zetMeta(mk, undefined);
      laatsteOk = null; laatsteHaal = 0;
      this.acties = null; this.planning = null;
      meldTabbladen();
    },
    // wie nu op dit toestel inlogt (js/auth.js, vóór syncWisLokaal): tabbladen van een eerdere gebruiker
    // schrijven vanaf nu niets meer van de server weg (zie schrijfVanServer)
    syncEigenaar(uid) { return actief() ? zetEigenaar(uid) : Promise.resolve(); },
    // dit tabblad stopt meteen met synchroniseren (in een ander tabblad logde iemand anders in); niets wissen:
    // de gegevens in IndexedDB horen nu bij die ander
    syncStop() {
      if (!actief()) return;
      generatie++;
      clearTimeout(haalTimer); haalTimer = null; clearTimeout(timer); timer = null;
      const m0 = $("syncconflict"); if (m0) m0.remove();
      verouderd = true; laatsteOk = null; laatsteHaal = 0;
      this.acties = null; this.planning = null;
    },
  });
  // voor elke <img src> in de schermen: alleen een eigen foto (data:image/jpeg|png|webp;base64) of een
  // storagepad dat nog wordt opgehaald; al het andere (ook in voorbeeldmodus) wordt een lege src
  const fotoSrc = (v) => (typeof v === "string" && (DATAIMG.test(v) || FOTOPAD.test(v)) ? v : "");
  Object.assign(window.WPI, { sb, SbFout, sbActief: actief, sanerFoto, heeftMetadata, fotoSrc });
})();
