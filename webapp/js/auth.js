/* Werkplekinspectie — js/auth.js
   Inloggen. Wordt na alle modules en vóór start.js geladen.

   ZONDER backend (js/config.js leeg): de voorbeeld-login van het prototype (accountkiezer met
   fictieve accounts), duidelijk gemarkeerd als "Voorbeeld". Verder verandert er niets.

   MET backend (Supabase Auth, direct via /auth/v1 — geen externe bibliotheek):
   - e-mail + wachtwoord; "Wachtwoord vergeten?" stuurt een herstelmail (altijd dezelfde melding,
     zodat niet te achterhalen is welke adressen bestaan); de link uit die mail opent hier het
     scherm "Nieuw wachtwoord" en logt daarna alle sessies uit. De herstelmail gebruikt PKCE: de link
     (?code=…) is alleen in te wisselen in de browser die hem aanvroeg (code_verifier in localStorage).
     Een link met #access_token (uitnodiging, of herstel via het Supabase-dashboard) wordt eerst bij de
     server gecontroleerd. Een link kan NOOIT een bewaarde sessie of de gegevens op dit toestel wissen,
     en hoort hij bij een ander account dan wie hier bewaard ingelogd is, dan wordt hij geweigerd
     (geen "inloggen als een ander" via een link van een buitenstaander). Zie verwerkLink().
   - rol uit public.profiles (nooit uit de client); inactieve profielen komen er niet in.
   - de beheerrollen (hoofd, QHSE-manager, beheerder) moeten tweestapsverificatie (TOTP, aal2) doorlopen;
     zonder gekoppelde app wordt die eerst ingesteld (QR-code). RLS dwingt aal2 af voor beheerroutes en volledige
     inzage (public.mfa_ok(), is_beheer_admin(), migratie 0008). Een profiel zonder rol (nieuw uitgenodigd) of met
     de oude rol "inspecteur" komt er niet in: een hoofd, de QHSE-manager of de beheerder kiest eerst een rol.
   - sessie: access-JWT alleen in het geheugen; refresh-token standaard in sessionStorage (weg zodra
     de app/het tabblad sluit). Alleen met "Ingelogd blijven" (standaard UIT; de keuze wordt per
     toestel onthouden) in localStorage. Afweging: een inspecteur in het veld moet de app zonder bereik
     opnieuw kunnen openen, en daarvoor moet het token de herstart overleven; maar XSS kan alles in
     localStorage/sessionStorage lezen (script-src is inmiddels strikt: 'self', geen inline handlers,
     zie _headers; XSS blijft toch de grootste dreiging) en een gestolen refresh-token is een langdurige overname. Daarom:
     - de beheerrollen (MFA, beheerrechten) krijgen NOOIT een bewaard refresh-token, ook niet met het vinkje;
     - het token wordt pas bewaard na een volledige login (profiel + rol + zo nodig MFA);
     - korte JWT (Supabase: 1 uur), refresh-token-rotatie met hergebruikdetectie, "Overal uitloggen";
     - uitloggen na 2 uur zonder activiteit (onderaan, INACTIEF_MS), in beide modi: het Supabase FREE-plan heeft
       geen sessie-time-box of inactiviteits-timeout op de server (dat is Pro); dit is de vervangende maatregel.
     Een HttpOnly-cookie vraagt een eigen server/Edge Function (volgende stap nu script-src strak is).
   - "Ingelogd blijven" staat standaard uit (gedeelde toestellen). Een inspecteur die voor het eerst op een
     toestel inlogt met het vinkje uit krijgt daarna één keer de vraag "Is dit je eigen telefoon?", zodat
     hij bewust kan kiezen om de app ook zonder bereik opnieuw te kunnen openen. "Ja" zet dan het
     refresh-token én het bewaarde profiel en de collega's in localStorage (alles wat herstel() zonder bereik nodig heeft).
   - twee tabbladen tegelijk op één toestel: logt in het ene tabblad iemand anders in (wpi_laatste_uid
     verandert), dan logt het andere meteen uit — zonder de gegevens in IndexedDB of de bewaarde sessie
     van die ander te wissen. Ook bij terugkomen in een tabblad dat het event miste (zie ook js/sync.js, punt 6).
     Omgekeerd wist een NIEUW tabblad (of een link uit een e-mail) nooit iets zolang er in een ander tabblad iemand
     ingelogd is: elk ingelogd tabblad houdt een slot vast (Web Locks "wpi-actief:<uid>", vanzelf weg als het
     tabblad sluit; terugval: BroadcastChannel), en een tabblad zonder eigen sessie kijkt dat eerst na. Met
     "Ingelogd blijven" uit staat de sessie per tabblad (sessionStorage): zonder deze controle wiste een tweede
     tabblad op "/" de opgehaalde gegevens van wie in het eerste tabblad aan het werk was (zie actiefElders()).
   - gedeeld toestel: na het sluiten zonder uitloggen (geen sessie meer bij het openen) en bij een andere
     gebruiker dan de vorige (localStorage "wpi_laatste_uid") worden eerst de servergegevens op dit
     toestel gewist (App.syncWisLokaal), pas daarna komt er iets op het scherm.
   - werk dat nog NIET op de server staat (wachtrij en lopende inspectie) staat onversleuteld in IndexedDB.
     Uitloggen met zulk werk: kiezen tussen "Eerst synchroniseren", "Bewaren" (alleen op je eigen telefoon) en
     "Wissen" (gedeeld toestel). Logt daarna een ANDER in, dan ziet die eerst "Werk van een vorige gebruiker"
     en wordt dat werk gewist vóórdat er iets op het scherm komt (App.syncWisAnderen); annuleren kan.
     Restrisico (zie docs/beveiligingsrapport.md): wie "Bewaren" kiest op een gedeeld toestel, laat het werk
     leesbaar achter voor iemand met toegang tot het toestel (DevTools) tot de volgende login.
   - lukt het ophalen van het profiel tijdelijk niet (geen netwerk, time-out, 401/408/429/5xx), dan wordt
     er NIET uitgelogd: bij herstellen verder met het bewaarde profiel, bij inloggen "Server niet
     bereikbaar, probeer opnieuw". Alleen een definitief antwoord (geen profiel / actief = false /
     onbekende rol / 403) weigert de toegang en trekt de sessie in.
   - automatisch vernieuwen 60 s vóór het verlopen, één tegelijk (ook over tabbladen heen).
   - na mislukte pogingen een oplopende wachttijd op dit toestel (3 → 30 s, daarna verdubbelend tot
     15 min) en een beveiligingsmelding (report_security_event). Die RPC vraagt een ingelogde
     gebruiker; meldingen over mislukte pogingen worden daarom bewaard en bij de eerstvolgende
     geslaagde login op dit toestel verstuurd. De echte bescherming tegen raden zit op de server
     (Supabase rate limits per IP/e-mail, CAPTCHA); dit is extra en geeft de gebruiker uitleg. */
(function () {
  "use strict";
  const { $, el, esc, svg, USERS, ROL, act, actSluit, op } = window.WPI;
  const App = window.App;
  const CFG = window.WPI_CONFIG || {};
  const actief = () => !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const sb = (...a) => window.WPI.sb(...a);
  const K_RT = "wpi_sessie", K_PROF = "wpi_profiel", K_PROFS = "wpi_profielen", K_POG = "wpi_login_pogingen", K_SEC = "wpi_beveiliging_wachtrij";
  const K_KEUZE = "wpi_ingelogd_blijven";   // alleen de keuze van het vinkje (geen geheim)
  const K_LAATSTE = "wpi_laatste_uid";       // wie het laatst op dit toestel was ingelogd (geen geheim)
  const K_PKCE = "wpi_pkce";                 // code_verifier van de laatste herstelaanvraag in deze browser (PKCE)
  const ROLLEN = window.WPI.ROLLEN;                    // hoofd, coordinator, qhse, beheerder (js/kern.js)
  const MFA_ROLLEN = ["hoofd", "qhse", "beheerder"];    // beheerrollen: altijd tweestapsverificatie

  // ---------------- sessie ----------------
  // klaar = volledige login voltooid; pas dan mag het refresh-token worden bewaard
  const S = { at: null, exp: 0, rt: null, uid: null, aal: null, onthoud: false, klaar: false, factors: [], scherm: null, melding: "", mfa: null, scope: null };
  function jwt(t) {
    try { const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(escape(atob(p + "===".slice((p.length + 3) % 4))))); }
    catch (e) { return {}; }
  }
  const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const opslag = (onthoud) => (onthoud ? localStorage : sessionStorage);
  function lees(k) {
    for (const [st, onthoud] of [[localStorage, true], [sessionStorage, false]]) {
      try { const v = JSON.parse(st.getItem(k) || "null"); if (v) return { v, onthoud }; } catch (e) {}
    }
    return null;
  }
  function schrijf(k, v) {
    try { opslag(S.onthoud).setItem(k, JSON.stringify(v)); opslag(!S.onthoud).removeItem(k); } catch (e) {}
  }
  function wisOpslag() { [K_RT, K_PROF, K_PROFS].forEach((k) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }); }
  let vTimer = null;
  function zetSessie(d, bewaar = true) {
    S.at = d.access_token; S.rt = d.refresh_token || S.rt;
    const p = jwt(S.at);
    S.exp = d.expires_at ? d.expires_at * 1000 : p.exp ? p.exp * 1000 : Date.now() + (d.expires_in || 3600) * 1000;
    S.uid = (d.user && d.user.id) || p.sub; S.aal = p.aal || "aal1";
    if (d.user && d.user.factors) S.factors = d.user.factors;
    if (bewaar && S.klaar) schrijf(K_RT, { rt: S.rt, uid: S.uid });
    clearTimeout(vTimer);
    vTimer = setTimeout(() => vernieuw(), Math.max(5000, S.exp - Date.now() - 60000));
  }
  // alleen het geheugen leegmaken (bij een tijdelijke storing: de bewaarde sessie blijft voor een volgende poging)
  function vergeetGeheugen() { clearTimeout(vTimer); Object.assign(S, { at: null, exp: 0, rt: null, uid: null, aal: null, klaar: false, factors: [], mfa: null }); }
  function wisSessie() { vergeetGeheugen(); wisOpslag(); }
  // tijdelijke fout (netwerk weg, time-out, sessie even ongeldig, server druk of stuk)? Dan nooit uitloggen.
  const tijdelijk = (e) => !e || !e.status || [401, 408, 429].includes(e.status) || e.status >= 500;
  const NIET_BEREIKBAAR = "Server niet bereikbaar, probeer opnieuw.";
  // Gedeeld toestel: servergegevens van de vorige gebruiker weg vóórdat een ander iets te zien krijgt.
  // (Wat nog in de wachtrij staat blijft bewaard, onzichtbaar voor anderen; zie js/sync.js.)
  const laatsteUid = () => { try { return localStorage.getItem(K_LAATSTE) || null; } catch (e) { return null; } };
  // Volgorde: eerst iedereen laten weten wie er nu is (localStorage → "storage"-event in andere tabbladen,
  // die dan meteen uitloggen; en de eigenaar in IndexedDB, zodat een tabblad van de vorige gebruiker niets
  // meer kán wegschrijven), dán pas wissen. Zo komt er na het wissen niets van de vorige gebruiker terug.
  async function wisAlsAnder(uid) {
    const vorige = laatsteUid();
    try { localStorage.setItem(K_LAATSTE, uid); } catch (e) {}
    if (App.syncEigenaar) await App.syncEigenaar(uid);
    if (App.syncWisAnderen) await App.syncWisAnderen(uid);   // werk van andere gebruikers (bevestigd in rondAf)
    if (vorige !== uid && App.syncWisLokaal) await App.syncWisLokaal(vorige);
  }
  // alleen de bewaarde sessie van déze gebruiker wissen (in localStorage kan al die van een ander staan)
  function wisEigenOpslag(uid) {
    [K_RT, K_PROF, K_PROFS].forEach((k) => { try { sessionStorage.removeItem(k); } catch (e) {} });
    for (const k of [K_RT, K_PROF]) {
      try { const v = JSON.parse(localStorage.getItem(k) || "null"); if (v && (v.uid === uid || v.id === uid)) localStorage.removeItem(k); } catch (e) {}
    }
  }
  // In een ander tabblad (zelfde toestel) is uitgelogd of logde iemand anders in: hier meteen uitloggen,
  // zonder de gegevens in IndexedDB te wissen (dat deed dat andere tabblad al; wat er nu staat kan van de
  // nieuwe gebruiker zijn) en zonder een bewaarde sessie van een ander aan te raken.
  function uitElders(melding) {
    if (!App.user || S.elders) return;
    S.elders = true;
    if (App.syncStop) App.syncStop();   // synchroon: lopende rondes schrijven vanaf nu niets meer
    S.melding = melding;
    if (App.closeModal) App.closeModal();
    App.logout();
  }
  const anderIngelogd = () => uitElders("Er is in een ander venster op dit toestel iemand anders ingelogd. Je bent hier uitgelogd.");
  const keuzeOnthoud = () => { try { return localStorage.getItem(K_KEUZE) === "1"; } catch (e) { return false; } };

  // ---------------- welke tabbladen zijn nu ingelogd? (een nieuw tabblad of een link wist dan niets) ----------------
  // Elk ingelogd tabblad houdt een GEDEELD slot "wpi-actief:<uid>" vast zolang het ingelogd is; de browser laat het
  // vanzelf los als het tabblad sluit of vastloopt. Een tabblad zonder eigen sessie vraagt eerst welke sloten er zijn.
  // Terugval zonder Web Locks: een vraag via BroadcastChannel ("wie is er?"), waarop ingelogde tabbladen antwoorden.
  const SLOT = "wpi-actief:";
  let slotLos = null, slotUid = null, authKanaal = null;
  try { authKanaal = window.BroadcastChannel ? new BroadcastChannel("wpi-auth") : null; } catch (e) {}
  if (authKanaal) authKanaal.onmessage = (e) => { if (e.data && e.data.t === "wie" && App.user && slotUid === App.user.id) authKanaal.postMessage({ t: "hier", uid: App.user.id }); };
  function houdSlot(uid) {
    if (!uid || slotUid === uid) return;
    laatSlot(); slotUid = uid;
    const ik = uid;   // het slot kan pas na laatSlot() worden toegekend: dan meteen weer loslaten
    try { if (navigator.locks && navigator.locks.request) navigator.locks.request(SLOT + uid, { mode: "shared" }, () => new Promise((res) => { if (slotUid !== ik) res(); else slotLos = res; })).catch(() => {}); } catch (e) {}
  }
  function laatSlot() { const l = slotLos; slotLos = null; slotUid = null; if (l) try { l(); } catch (e) {} }
  // uid's die in een ANDER tabblad van deze app ingelogd zijn (alleen zinvol als dit tabblad zelf niemand heeft)
  async function actiefElders() {
    if (slotUid) return [];
    try {
      if (navigator.locks && navigator.locks.query) {
        const q = await navigator.locks.query();
        return [...new Set((q.held || []).map((l) => String(l.name || "")).filter((n) => n.startsWith(SLOT)).map((n) => n.slice(SLOT.length)).filter(Boolean))];
      }
    } catch (e) {}
    if (!window.BroadcastChannel) return [];
    return new Promise((res) => {
      let c = null; const uit = new Set();
      try { c = new BroadcastChannel("wpi-auth"); } catch (e) { return res([]); }
      c.onmessage = (e) => { if (e.data && e.data.t === "hier" && typeof e.data.uid === "string") uit.add(e.data.uid); };
      c.postMessage({ t: "wie" });
      setTimeout(() => { try { c.close(); } catch (e) {} res([...uit]); }, 300);
    });
  }

  let vBezig = null;
  // true = nieuwe tokens; false = (nog) niet (geen netwerk, of sessie ongeldig → S.rt leeg)
  function vernieuw() {
    if (vBezig) return vBezig;
    const doe = async () => {
      const o = lees(K_RT);
      if (o && o.v.rt && o.v.uid === S.uid && o.v.rt !== S.rt) S.rt = o.v.rt;   // een ander tabblad was eerder
      if (!S.rt) return false;
      try { zetSessie(await sb("/auth/v1/token?grant_type=refresh_token", { method: "POST", auth: false, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: S.rt }) })); return true; }
      catch (e) {
        if (!e.status || e.status === 429 || e.status >= 500) return false;   // later opnieuw
        const hadGebruiker = !!App.user;
        wisSessie();
        if (hadGebruiker) { S.melding = "Je sessie is verlopen. Log opnieuw in."; App.logout(); }
        return false;
      }
    };
    vBezig = (navigator.locks ? navigator.locks.request("wpi-auth-vernieuw", doe) : doe()).finally(() => { vBezig = null; });
    return vBezig;
  }
  const metTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(false), ms))]);
  const metToken = (extra) => Object.assign({ Authorization: "Bearer " + S.at }, extra || {});

  // ---------------- profielen ----------------
  async function haalProfiel(uid) {
    const r = await sb("/rest/v1/profiles?select=id,full_name,functie,role,actief&id=eq." + encodeURIComponent(uid));
    return r && r[0];
  }
  async function laadProfielen() {
    try {
      const r = await sb("/rest/v1/profiles?select=id,full_name,functie,role,actief&actief=is.true&order=full_name.asc");
      if (Array.isArray(r) && r.length) { zetUsers(r); schrijf(K_PROFS, r); }
    } catch (e) {}
  }
  function zetUsers(lijst) { USERS.splice(0, USERS.length, ...lijst.map((p) => ({ id: p.id, full_name: p.full_name, role: p.role, functie: p.functie || "" }))); }
  const profielVoorApp = (p) => ({ id: p.id, full_name: p.full_name, role: p.role, functie: p.functie || ROL[p.role] || "" });

  // ---------------- beveiligingsmeldingen ----------------
  function bewaarMelding(soort, details) {
    try { const l = JSON.parse(localStorage.getItem(K_SEC) || "[]"); l.push({ soort, details: Object.assign({ t: new Date().toISOString() }, details) }); localStorage.setItem(K_SEC, JSON.stringify(l.slice(-20))); } catch (e) {}
  }
  async function meld(soort, details) {
    try { await sb("/rest/v1/rpc/report_security_event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ p_soort: soort, p_details: Object.assign({ t: new Date().toISOString(), ua: navigator.userAgent.slice(0, 120) }, details || {}) }) }); return true; }
    catch (e) { return false; }
  }
  async function verstuurBewaardeMeldingen() {
    let l = []; try { l = JSON.parse(localStorage.getItem(K_SEC) || "[]"); } catch (e) {}
    const rest = [];
    for (const m of l) if (!(await meld(m.soort, m.details))) rest.push(m);
    try { rest.length ? localStorage.setItem(K_SEC, JSON.stringify(rest)) : localStorage.removeItem(K_SEC); } catch (e) {}
  }

  // ---------------- mislukte pogingen (dit toestel) ----------------
  function pog() { try { return JSON.parse(localStorage.getItem(K_POG) || "null") || { n: 0 }; } catch (e) { return { n: 0 }; } }
  function zetPog(p) { try { p ? localStorage.setItem(K_POG, JSON.stringify(p)) : localStorage.removeItem(K_POG); } catch (e) {} }
  const wachtTot = (p) => (p.n >= 3 ? p.laatst + Math.min(900, 30 * 2 ** (p.n - 3)) * 1000 : 0);
  const mmss = (ms) => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  let slotTimer = null;
  function toonSlot() {
    clearInterval(slotTimer);
    const tick = () => {
      const f = $("l-fout"), k = $("l-knop"); if (!f || !k) { clearInterval(slotTimer); return; }
      const rest = wachtTot(pog()) - Date.now();
      if (rest > 0) { k.disabled = true; f.textContent = `Te veel mislukte pogingen. Probeer het over ${mmss(rest)} opnieuw.`; }
      else { k.disabled = false; clearInterval(slotTimer); if (f.dataset.slot) f.textContent = "Je kunt het opnieuw proberen."; }
      f.dataset.slot = rest > 0 ? "1" : "";
    };
    tick(); slotTimer = setInterval(tick, 1000);
  }
  function mislukt(mail) {
    const p = pog(); p.n = (p.n || 0) + 1; p.laatst = Date.now(); if (!p.sinds) p.sinds = p.laatst; zetPog(p);
    if (p.n >= 5 && p.n % 5 === 0) bewaarMelding("login_herhaald_mislukt", { pogingen: p.n, sinds: new Date(p.sinds).toISOString(), domein: String(mail).split("@")[1] || "" });
    return p;
  }

  // ---------------- schermen ----------------
  const kop = (titel, sub) => `<div style="padding:30px 0 10px"><div class="kicker">Werkplekinspectie · Noardling</div><h1>${titel}</h1>${sub ? `<div class="muted" style="margin-top:-8px;margin-bottom:8px">${sub}</div>` : ""}</div>`;
  const melding = () => (S.melding ? `<div class="hint" role="status" style="margin-bottom:12px">${esc(S.melding)}</div>` : "");
  function scherm_login(v) {
    const vorige = (lees(K_PROF) || {}).v;
    v.appendChild(el(`<div>${kop("Inloggen", "Log in met je werk-e-mailadres.")}${melding()}
      <form class="card" id="l-form" autocomplete="on" novalidate${op("submit", "authInloggen")}>
        <label class="flab" for="l-mail">E-mailadres</label>
        <input id="l-mail" class="fin" type="email" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false" required maxlength="200" value="${esc(vorige && vorige.email || "")}">
        <label class="flab" for="l-ww">Wachtwoord</label>
        <input id="l-ww" class="fin" type="password" autocomplete="current-password" required maxlength="200">
        <label style="display:flex;gap:10px;align-items:center;margin:14px 0 4px;font-size:14px"><input type="checkbox" id="l-onthoud"${keuzeOnthoud() ? " checked" : ""} style="width:20px;height:20px;accent-color:var(--accent)"> Ingelogd blijven op dit toestel</label>
        <div class="muted" style="margin:0 0 10px 30px;font-size:13px;line-height:1.4">Nodig om de app zonder bereik opnieuw te openen. Alleen aanzetten op je eigen ${WPI.isWeb() ? "computer" : "telefoon"}, nooit op een gedeeld toestel. Voor de hoofden, de QHSE-manager en de beheerder geldt de login altijd alleen zolang de app open is.</div>
        <div id="l-fout" class="fout" role="alert"></div>
        <button class="btn primary" id="l-knop" type="submit" style="margin-top:8px">Inloggen</button>
      </form>
      <button class="linkknop" type="button"${act("authScherm", "vergeten")}>Wachtwoord vergeten?</button>
      <div class="muted" style="font-size:12px;margin-top:6px">Geen account? Een hoofd, de QHSE-manager of de beheerder nodigt je uit.</div></div>`));
    toonSlot();
  }
  function scherm_vergeten(v) {
    v.appendChild(el(`<div>${kop("Wachtwoord vergeten", "We sturen je een e-mail met een link om een nieuw wachtwoord in te stellen.")}${melding()}
      <form class="card" novalidate${op("submit", "authVergeten")}>
        <label class="flab" for="v-mail">E-mailadres</label>
        <input id="v-mail" class="fin" type="email" autocomplete="username" inputmode="email" autocapitalize="off" required maxlength="200" value="${esc(($("l-mail") || {}).value || "")}">
        <div id="l-fout" class="fout" role="alert"></div>
        <button class="btn primary" id="v-knop" type="submit" style="margin-top:8px">Herstelmail versturen</button>
      </form>
      <button class="linkknop" type="button"${act("authScherm", "login")}>Terug naar inloggen</button></div>`));
  }
  function scherm_nieuwww(v) {
    const l = S.link, wie = l && l.email ? `<div class="s" style="margin-bottom:12px;line-height:1.45">Voor het account <b>${esc(l.email)}</b>. Is dit niet jouw e-mailadres, of heb je niets aangevraagd? Kies dan Annuleren.</div>` : "";
    v.appendChild(el(`<div>${kop(l && l.soort === "invite" ? "Kies je wachtwoord" : "Nieuw wachtwoord", "Kies een nieuw wachtwoord van minstens 12 tekens. Een zin van een paar woorden werkt goed.")}${melding()}${wie}
      <form class="card" novalidate${op("submit", "authNieuwWachtwoord")}>
        <label class="flab" for="n-ww">Nieuw wachtwoord</label>
        <input id="n-ww" class="fin" type="password" autocomplete="new-password" required minlength="12" maxlength="200">
        <label class="flab" for="n-ww2">Herhaal</label>
        <input id="n-ww2" class="fin" type="password" autocomplete="new-password" required minlength="12" maxlength="200">
        <div id="l-fout" class="fout" role="alert"></div>
        <button class="btn primary" type="submit" style="margin-top:8px">Wachtwoord opslaan</button>
      </form>
      <button class="linkknop" type="button"${act("authAnnuleer")}>Annuleren, terug naar inloggen</button></div>`));
  }
  // QR-code van GoTrue (een SVG, rauw of als data-URL) → veilige data-URL. Rauwe SVG-tekst moet
  // procent-gecodeerd worden: een "#" (bijv. fill="#fff") breekt anders de data-URL af.
  function qrSrc(q) {
    q = String(q || "");
    const m = /^data:image\/svg\+xml(;[^,]*)?,([\s\S]*)$/i.exec(q);
    let svgTekst;
    if (m) {
      if (/;base64/i.test(m[1] || "")) { const b = m[2].replace(/\s+/g, ""); return /^[A-Za-z0-9+/=]+$/.test(b) ? "data:image/svg+xml;base64," + b : ""; }
      svgTekst = m[2];
      if (!/^\s*</.test(svgTekst)) { try { svgTekst = decodeURIComponent(svgTekst); } catch (e) { return ""; } }
    } else if (/^\s*<svg[\s>]/i.test(q)) svgTekst = q;
    else return "";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgTekst);
  }
  function scherm_mfa(v) {
    const m = S.mfa || {};
    const qr = qrSrc(m.qr);
    v.appendChild(el(`<div>${kop("Tweestapsverificatie", m.enrol ? "Voor jouw rol is een tweede stap verplicht. Koppel eenmalig een authenticator-app (bijv. Microsoft of Google Authenticator)." : "Voer de 6-cijferige code uit je authenticator-app in.")}${melding()}
      <form class="card" novalidate${op("submit", "authMfa")}>
        ${m.enrol ? `<div style="text-align:center"><img src="${esc(qr)}" alt="QR-code voor de authenticator-app" style="width:200px;height:200px;background:#fff;border-radius:12px"></div>
          <div class="s" style="margin:8px 0 12px;word-break:break-all">Of voer deze sleutel handmatig in: <b>${esc(m.secret || "")}</b></div>` : ""}
        <label class="flab" for="m-code">Code</label>
        <input id="m-code" class="fin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required style="font-size:22px;letter-spacing:.3em;text-align:center">
        <div id="l-fout" class="fout" role="alert"></div>
        <button class="btn primary" id="m-knop" type="submit" style="margin-top:8px">Bevestigen</button>
      </form>
      <button class="linkknop" type="button"${act("authAnnuleer")}>Annuleren</button></div>`));
    const i = $("m-code"); if (i) i.focus();
  }
  function scherm_anderwerk(v) {
    const n = S.anderN || 0;
    v.appendChild(el(`<div>${kop("Werk van een vorige gebruiker", "")}
      <div class="card">
        <div class="s" style="line-height:1.5;margin-bottom:12px">Op dit toestel staat nog werk van iemand anders dat niet op de server staat (${n} ${n === 1 ? "onderdeel" : "onderdelen"}, bijvoorbeeld een lopende inspectie). Als je doorgaat, wordt dat gewist; het is dan weg.</div>
        <div class="s" style="line-height:1.5;margin-bottom:14px">Is het van een collega? Laat die dan eerst hier inloggen en synchroniseren.</div>
        <button class="btn primary"${act("authAnderDoorgaan")}>Doorgaan en wissen</button>
        <button class="btn ghost" style="margin-top:10px;width:100%"${act("authAnnuleer")}>Annuleren</button>
      </div></div>`));
  }
  function fout(t) { const f = $("l-fout"); if (f) { f.dataset.slot = ""; f.textContent = t; } }
  function bezigKnop(id, aan, tekst) { const k = $(id); if (k) { k.disabled = aan; if (tekst) k.textContent = tekst; } }

  // ---------------- na het wachtwoord: profiel, rol, MFA ----------------
  async function naInloggen(herstel) {
    let p, fout = null;
    try { p = await haalProfiel(S.uid); } catch (e) { fout = e; }
    if (fout && tijdelijk(fout)) {
      // Profiel tijdelijk niet op te halen (503, time-out, lie-fi): NIET uitloggen en niet "niet actief" zeggen.
      const bewaard = (lees(K_PROF) || {}).v;
      if (herstel && bewaard && bewaard.id === S.uid && ROLLEN.includes(bewaard.role)) {
        p = Object.assign({}, bewaard, { actief: true });   // verder met het bewaarde profiel, net als zonder bereik
      } else {
        vergeetGeheugen(); S.scherm = "login"; S.melding = NIET_BEREIKBAAR; return false;   // sessie op de server blijft geldig
      }
    } else if (fout) {   // echte weigering (bijv. 403): geen toegang tot het eigen profiel
      await uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = "Je profiel kon niet worden geladen. Neem contact op met een hoofd of de beheerder."; return false;
    }
    // definitief antwoord van de server: geen profiel (RLS toont een inactief profiel niet) of actief = false
    if (!p || p.actief === false) { await uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = "Je account is (nog) niet actief. Neem contact op met een hoofd of de beheerder."; return false; }
    if (!ROLLEN.includes(p.role)) {
      // nieuw uitgenodigd (nog geen rol) of de oude rol "inspecteur": eerst een rol laten kiezen in Beheer
      await uitloggenServer("local"); wisSessie(); S.scherm = "login";
      S.melding = p.role == null ? "Je account heeft nog geen rol. Vraag een hoofd, de QHSE-manager of de beheerder om je in Beheer een rol te geven."
        : "Je rol bestaat niet meer in deze app. Vraag een hoofd, de QHSE-manager of de beheerder om je in Beheer een nieuwe rol te geven.";
      return false;
    }
    if (MFA_ROLLEN.includes(p.role) && S.aal !== "aal2") { await startMfa(p); return false; }
    await rondAf(p, herstel);
    return true;
  }
  async function startMfa(p) {
    S.mfa = { profiel: p, fout: 0 }; S.scherm = "mfa"; S.melding = "";
    try {
      const u = await sb("/auth/v1/user", { auth: false, headers: metToken() });
      S.factors = (u && u.factors) || [];
      const totp = S.factors.filter((f) => f.factor_type === "totp");
      const ok = totp.find((f) => f.status === "verified");
      if (ok) { S.mfa.fid = ok.id; }
      else {
        for (const f of totp) await sb("/auth/v1/factors/" + encodeURIComponent(f.id), { method: "DELETE", auth: false, headers: metToken() }).catch(() => {});
        const r = await sb("/auth/v1/factors", { method: "POST", auth: false, headers: metToken({ "Content-Type": "application/json" }), body: JSON.stringify({ factor_type: "totp", friendly_name: "Werkplekinspectie " + new Date().toISOString().slice(0, 10) }) });
        Object.assign(S.mfa, { fid: r.id, enrol: true, qr: r.totp && r.totp.qr_code, secret: r.totp && r.totp.secret });
      }
    } catch (e) { S.melding = "Tweestapsverificatie kon niet starten. Controleer je verbinding en probeer het opnieuw."; }
  }
  async function rondAf(p, herstel) {
    // Staat er op dit toestel nog onverstuurd werk van een ANDERE gebruiker? Dan eerst bevestigen dat het wordt
    // gewist (wisAlsAnder → syncWisAnderen), vóórdat deze gebruiker iets te zien krijgt. Bij herstel van een eigen
    // sessie wordt het zonder vraag gewist (dat werk kan er alleen staan als de ander koos het te bewaren).
    if (!herstel && !S.anderOk && App.syncAnderWerk) {
      const n = await App.syncAnderWerk(p.id);
      if (n) { S.wacht = p; S.anderN = n; S.scherm = "anderwerk"; S.melding = ""; App.route(); return; }
    }
    S.anderOk = false; S.wacht = null;
    if (!herstel) nuActief();   // nieuwe login: de klok voor uitloggen na inactiviteit begint opnieuw
    const prof = profielVoorApp(p);
    // pas nu (profiel, rol en zo nodig MFA in orde) het refresh-token bewaren; de beheerrollen nooit blijvend
    if (MFA_ROLLEN.includes(p.role)) S.onthoud = false;
    S.klaar = true; schrijf(K_RT, { rt: S.rt, uid: S.uid });
    const mail = ((lees(K_PROF) || {}).v || {}).email;
    schrijf(K_PROF, Object.assign({}, prof, { email: S.email || mail || "" }));
    await laadProfielen();
    if (!USERS.some((u) => u.id === prof.id)) USERS.push(prof);
    const p0 = pog(); zetPog(null);
    S.scherm = null; S.melding = ""; S.mfa = null;
    if (p0.n >= 3) bewaarMelding("login_na_mislukte_pogingen", { pogingen: p0.n });
    verstuurBewaardeMeldingen();
    if (App.syncWisVoorbeeld) await App.syncWisVoorbeeld();
    await wisAlsAnder(prof.id);   // andere gebruiker dan de vorige op dit toestel: eerst diens servergegevens weg
    if (herstel) App.user = prof;
    else await loginKern.call(App, prof.id, prof);   // de echte login; App.login zelf is in productie dicht (zie onderaan)
    houdSlot(prof.id);   // dit tabblad is ingelogd: andere tabbladen en links wissen nu niets (actiefElders)
    if (App.syncStart) setTimeout(() => App.syncStart(), 0);
    // alleen wie in het veld inspecteert en geen beheerrol heeft (die bewaart nooit een refresh-token): de coördinatoren
    if (!herstel && S.vraagToestel && window.WPI.mag("inspecteert", prof) && !MFA_ROLLEN.includes(prof.role)) setTimeout(() => App.authToestelVraag(), 600);
    S.vraagToestel = false;
  }
  async function uitloggenServer(scope) {
    if (!S.at) return;
    try { await metTimeout(sb("/auth/v1/logout?scope=" + scope, { method: "POST", auth: false, headers: metToken() }), 5000); } catch (e) {}
  }
  // ---------------- link uit een e-mail (wachtwoord herstellen, uitnodiging) ----------------
  // Twee vormen:
  //  - PKCE (de herstelmail die deze app aanvraagt): ?code=… — alleen in te wisselen met de code_verifier die DEZE
  //    browser bij het aanvragen bewaarde (K_PKCE). Een link van iemand anders werkt hier dus nooit.
  //  - impliciet: #access_token=…&type=recovery|invite (uitnodiging door een beheerder, of herstel via het dashboard).
  //    Alleen type recovery of invite, en het token wordt EERST bij de server gecontroleerd (GET /auth/v1/user).
  // Een link verandert nooit iets aan wat er al is: geen wisSessie/wisOpslag, geen syncWisLokaal. Bij een ongeldige
  // link, of een link van een ander account dan wie hier bewaard ingelogd is, gaat de app gewoon verder met de
  // bewaarde sessie (met een melding). Pas na het opslaan van een nieuw wachtwoord (overal uitgelogd) gaat die weg.
  const LINK_VERLOPEN = "De link is verlopen, al gebruikt of ongeldig. Was het een uitnodiging? Vraag degene die je uitnodigde om een nieuwe link (Beheer › Gebruikers). Wachtwoord vergeten? Vraag hieronder een herstelmail aan.";
  async function verwerkLink() {
    const h = new URLSearchParams(location.hash.replace(/^#\/?/, ""));
    const q = new URLSearchParams(location.search);
    const code = q.get("code");
    if (!code && !h.get("access_token") && !h.get("error") && !h.get("error_code")) return false;
    // token/code meteen uit het adres (niet in de geschiedenis, niet in een gedeelde schermafbeelding)
    q.delete("code");
    try { history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "")); } catch (e) { location.hash = ""; }
    const bw = lees(K_RT), bewaardUid = bw && bw.v && bw.v.rt ? bw.v.uid : null;
    // in een ANDER tabblad ingelogd (sessie alleen in dat tabblad: "Ingelogd blijven" uit)? Dan geldt die gebruiker
    // net zo als een bewaarde sessie hier: een link van een ander account wordt geweigerd en er wordt niets gewist
    const elders = bewaardUid ? [] : await actiefElders(), actiefUid = bewaardUid || elders[0] || null;
    const weiger = (m) => { vergeetGeheugen(); S.link = null; if (bewaardUid) S.linkMelding = m; else { S.scherm = "vergeten"; S.melding = m; } return false; };
    if (h.get("error") || h.get("error_code")) return weiger(LINK_VERLOPEN);
    if (!navigator.onLine) return weiger("Geen verbinding. Open de link opnieuw zodra je bereik hebt.");
    let d, soort;
    if (code) {
      let pk = null; try { pk = JSON.parse(localStorage.getItem(K_PKCE) || "null"); } catch (e) {}
      if (!pk || !pk.v || Date.now() - (pk.t || 0) > 24 * 3600e3) return weiger("Deze link hoort bij een aanvraag uit een andere browser. Open hem in de browser waarin je de herstelmail aanvroeg, of vraag hieronder een nieuwe aan.");
      try { d = await sb("/auth/v1/token?grant_type=pkce", { method: "POST", auth: false, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auth_code: code, code_verifier: pk.v }) }); }
      catch (e) { return weiger(!e.status || e.status >= 500 ? "De server is niet bereikbaar. Open de link straks opnieuw." : LINK_VERLOPEN); }
      try { localStorage.removeItem(K_PKCE); } catch (e) {}
      soort = "recovery";
    } else {
      soort = h.get("type");
      if (soort !== "recovery" && soort !== "invite") return weiger("Deze link wordt hier niet gebruikt. Vraag zo nodig hieronder een herstelmail aan.");
      const at = h.get("access_token");
      let u = null;
      try { u = await sb("/auth/v1/user", { auth: false, headers: { Authorization: "Bearer " + at } }); }
      catch (e) { return weiger(!e.status || e.status >= 500 ? "De server is niet bereikbaar. Open de link straks opnieuw." : LINK_VERLOPEN); }
      if (!u || !u.id || (jwt(at).sub && jwt(at).sub !== u.id)) return weiger(LINK_VERLOPEN);
      d = { access_token: at, refresh_token: h.get("refresh_token"), expires_in: +h.get("expires_in") || 3600, user: u };
    }
    const uid = (d.user && d.user.id) || jwt(d.access_token).sub;
    if (actiefUid && !(bewaardUid ? uid === bewaardUid : elders.includes(uid))) {
      // niet als een ander inloggen; de sessie uit de link meteen intrekken (alleen die)
      try { await metTimeout(sb("/auth/v1/logout?scope=local", { method: "POST", auth: false, headers: { Authorization: "Bearer " + d.access_token } }), 5000); } catch (e) {}
      return weiger("Deze link hoort bij een ander account dan waarmee je hier bent ingelogd en is niet gebruikt. Log eerst uit als het jouw link is.");
    }
    zetSessie(d, false);   // alleen in het geheugen (S.klaar blijft false: er wordt niets bewaard)
    S.link = { uid, email: (d.user && d.user.email) || jwt(d.access_token).email || "", soort, bewaard: !!actiefUid };
    S.scherm = "nieuwww"; S.melding = "";
    return true;
  }
  // Annuleren of mislukken op het scherm "Nieuw wachtwoord" na een link: alleen de sessie uit de link vergeten
  // (en op de server intrekken) en verder met wat er bewaard was. Niets wissen.
  async function linkAfbreken(scherm, m) {
    await uitloggenServer("local");   // S.at is hier het token uit de link: dit trekt alleen die sessie in
    vergeetGeheugen(); S.link = null; S.scherm = null; S.melding = "";
    await App.authHerstel();
    if (!App.user) { S.scherm = scherm; S.melding = m || ""; }
    else { if (m) S.linkMelding = m; if (App.herstelConcept) await App.herstelConcept(); }
    App.route();
    toonLinkMelding();
  }
  function toonLinkMelding() {
    const m = S.linkMelding; if (!m || !App.user) return;
    S.linkMelding = null;
    setTimeout(() => App.openModal("Link niet gebruikt", m, `<button class="btn primary"${act("closeModal")}>Begrepen</button>`), 300);
  }

  // sessie van een vorige keer herstellen (refresh-token uit sessionStorage of, met "Ingelogd blijven", localStorage)
  async function herstel() {
    if (await verwerkLink()) return;
    const o = lees(K_RT); if (!o || !o.v.rt) return;
    S.rt = o.v.rt; S.uid = o.v.uid; S.onthoud = o.onthoud; S.klaar = true;
    const prof = (lees(K_PROF) || {}).v, profs = (lees(K_PROFS) || {}).v;
    if (Array.isArray(profs) && profs.length) zetUsers(profs);
    if (navigator.onLine) {
      const ok = await metTimeout(vernieuw(), 8000);
      if (ok) { await naInloggen(true); return; }
      if (!S.rt) { S.melding = "Je sessie is verlopen. Log opnieuw in."; return; }
    }
    // geen verbinding: verder met de bewaarde gegevens; vernieuwen zodra er weer bereik is
    if (prof && prof.id === S.uid && ROLLEN.includes(prof.role)) { App.user = profielVoorApp(prof); if (!USERS.some((u) => u.id === prof.id)) USERS.push(App.user); houdSlot(prof.id); }
  }

  // ---------------- koppelingen met kern.js ----------------
  const login0 = App.view_login, acct0 = App.openAccount, loginKern = App.login, renderAcct0 = App.renderAcct;
  Object.assign(App, {
    authActief: actief,
    async authHerstel() {
      zonderVoorbeelddata();   // vóór er iets op het scherm komt (boot() heeft de data net geladen)
      await herstel();
      // Geen sessie te herstellen (tabblad/app gesloten zonder uitloggen, sessie verlopen): de servergegevens van de
      // vorige gebruiker horen niet op het inlogscherm van een gedeeld toestel. NIET bij een link uit een e-mail terwijl
      // er een bewaarde sessie (van hetzelfde account) is: een link mag nooit iets wissen (zie verwerkLink).
      // Ook niet als er in een ANDER tabblad iemand ingelogd is (tweede tabblad op "/", of een link uit een e-mail,
      // met "Ingelogd blijven" uit): dan zijn de gegevens op het toestel van die ingelogde gebruiker.
      if (!App.user) { if (App.syncWisLokaal && !(S.link && S.link.bewaard) && !(await actiefElders()).length) await App.syncWisLokaal(laatsteUid()); }
      else { await wisAlsAnder(App.user.id); toonLinkMelding(); }   // (zonder bereik hersteld: zelfde controle als bij inloggen)
    },
    // eenmalig na de eerste login van een coördinator (inspecteert, geen beheerrol) op dit toestel met het vinkje uit
    authToestelVraag() {
      if (!App.user || App._page === "inspectie" || ($("ov") && $("ov").classList.contains("on"))) return;
      App.openModal("Is dit je eigen " + (WPI.isWeb() ? "toestel" : "telefoon") + "?", "Dan kun je ingelogd blijven, zodat je de app ook zonder bereik opnieuw kunt openen (bijv. op een locatie zonder signaal).",
        `<div class="s" style="margin-bottom:12px;line-height:1.45">Doe dit alleen op een toestel dat alleen jij gebruikt. Op een gedeeld toestel ben je uitgelogd zodra de app of het tabblad sluit. Wat dan nog niet verstuurd is, blijft op het toestel tot de volgende gebruiker inlogt; die kan het wissen. Synchroniseer op een gedeeld toestel dus altijd vóór je stopt.</div>
         <button class="btn primary"${act("authOnthoud", true)}>Ja, ingelogd blijven</button>
         <button class="btn ghost" style="margin-top:10px;width:100%"${act("authOnthoud", false)}>Nee, gedeeld toestel</button>`);
    },
    authOnthoud(aan) {
      try { localStorage.setItem(K_KEUZE, aan ? "1" : "0"); } catch (e) {}
      if (aan && App.user && !MFA_ROLLEN.includes(App.user.role) && S.klaar && S.rt) {
        // alles wat herstel() zonder bereik nodig heeft mee naar localStorage: sessie, eigen profiel en collega's
        const prof = (lees(K_PROF) || {}).v, profs = (lees(K_PROFS) || {}).v;
        S.onthoud = true;
        schrijf(K_RT, { rt: S.rt, uid: S.uid });
        schrijf(K_PROF, prof && prof.id === App.user.id ? prof : Object.assign({}, App.user, { email: S.email || "" }));
        schrijf(K_PROFS, Array.isArray(profs) && profs.length ? profs : USERS.map((u) => ({ id: u.id, full_name: u.full_name, role: u.role, functie: u.functie || "" })));
      }
      App.closeModal();
    },
    async authToken() {
      if (!S.rt && !S.at) return null;
      if (!S.at || Date.now() > S.exp - 60000) await vernieuw();
      return S.at;
    },
    authVernieuw: () => vernieuw(),
    authLogout() {
      if (!actief()) return;
      laatSlot();   // dit tabblad is niet meer ingelogd
      const scope = S.scope || "local", uid = S.uid || (App.user && App.user.id);
      uitloggenServer(scope);   // niet wachten
      if (S.elders) { vergeetGeheugen(); wisEigenOpslag(uid); S.elders = false; }   // zie uitElders()
      else {
        wisSessie();
        if (App.syncWisLokaal) App.syncWisLokaal(App.user && App.user.id);
      }
      S.scherm = "login"; S.scope = null;
      if (!S.melding) S.melding = scope === "global" ? "Je bent op al je toestellen uitgelogd." : "Je bent uitgelogd.";
    },
    authLogoutOveral() { S.scope = "global"; App.closeModal(); App.logout(); },
    // Uitloggen via het menu. Staat er nog werk dat niet op de server staat (wachtrij of een lopende inspectie),
    // dan eerst kiezen. Eerlijk over wat er gebeurt: dat werk staat onversleuteld op dit toestel; wie het toestel
    // daarna gebruikt kan het met technische hulpmiddelen inzien, en logt er een ander in, dan wordt het gewist.
    async authUitloggenVraag(overal) {
      const uid = App.user && App.user.id;
      const w = App.syncEigenWerk ? await App.syncEigenWerk(uid) : { wachtrij: 0, concept: false };
      const n = w.wachtrij, lopend = w.concept || !!App.state.inspectie;
      const doe = overal ? act("authLogoutOveral") : actSluit("logout");
      if (!n && !lopend) return overal ? App.authLogoutOveral() : (App.closeModal(), App.logout());
      const wat = [n ? n + (n === 1 ? " wijziging staat" : " wijzigingen staan") + " nog in de wachtrij" : "", lopend ? "er loopt nog een inspectie (niet vastgelegd)" : ""].filter(Boolean).join(" en ");
      App.openModal("Nog niet alles op de server", wat.charAt(0).toUpperCase() + wat.slice(1) + ".",
        `<div class="s" style="margin-bottom:12px;line-height:1.45">Dit staat alleen op dit toestel en is niet versleuteld: wie dit toestel na jou gebruikt, kan het met technische hulpmiddelen inzien. Logt er hier iemand anders in, dan wordt het gewist.</div>
         ${n ? `<button class="btn primary"${actSluit("syncOpnieuw")}>Eerst synchroniseren</button>` : ""}
         <button class="btn ${n ? "ghost" : "primary"}" style="margin-top:10px;width:100%"${doe}>Bewaren en uitloggen (alleen eigen ${WPI.isWeb() ? "toestel" : "telefoon"})</button>
         <button class="btn ghost" style="margin-top:10px;width:100%"${act("authWisVraag", !!overal)}>Wissen en uitloggen (gedeeld toestel)</button>`);
    },
    authWisVraag(overal) {
      App.openModal("Wissen en uitloggen?", "Wat nog niet op de server staat, ben je dan kwijt.",
        `<div class="s" style="margin-bottom:12px;line-height:1.45">De wachtrij en de lopende inspectie worden van dit toestel gewist. Dit kan niet ongedaan worden gemaakt.</div>
         <button class="btn primary"${act("authWisEnUitloggen", !!overal)}>Ja, wissen en uitloggen</button>
         <button class="btn ghost" style="margin-top:10px;width:100%"${act("authUitloggenVraag", !!overal)}>Terug</button>`);
    },
    async authWisEnUitloggen(overal) {
      const uid = App.user && App.user.id; if (!uid) return;
      clearTimeout(App._cTimer); App.state.inspectie = null;   // logout() bewaart anders het concept opnieuw
      if (App.syncWisWerk) await App.syncWisWerk(uid, false);
      App.closeModal();
      return overal ? App.authLogoutOveral() : App.logout();
    },
    async authAnderDoorgaan() {
      const p = S.wacht; if (!p || !S.at) { S.scherm = "login"; return App.route(); }
      S.anderOk = true; S.scherm = null;
      await rondAf(p, false);
    },
    authScherm(s) { S.scherm = s; S.melding = ""; App.route(); },
    authAnnuleer() {
      if (S.link) return linkAfbreken("login", "");
      uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = ""; S.wacht = null; S.anderOk = false; App.route();
    },

    async authInloggen() {
      const mail = ($("l-mail").value || "").trim().toLowerCase(), ww = $("l-ww").value || "";
      if (wachtTot(pog()) > Date.now()) return toonSlot();
      if (!mail || !ww) return fout("Vul je e-mailadres en wachtwoord in.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return fout("Vul een geldig e-mailadres in.");
      if (!navigator.onLine) return fout("Geen verbinding. Inloggen kan alleen met internet; daarna werkt de app ook zonder bereik.");
      S.onthoud = !!($("l-onthoud") || {}).checked; S.email = mail; S.melding = ""; S.klaar = false;
      // nog nooit een keuze gemaakt op dit toestel en het vinkje uit: na de login één keer vragen (alleen wie inspecteert, zonder beheerrol)
      let eerder = true; try { eerder = localStorage.getItem(K_KEUZE) !== null; } catch (e) {}
      S.vraagToestel = !eerder && !S.onthoud;
      try { if (eerder || S.onthoud) localStorage.setItem(K_KEUZE, S.onthoud ? "1" : "0"); } catch (e) {}
      bezigKnop("l-knop", true, "Bezig…");
      let d;
      try { d = await sb("/auth/v1/token?grant_type=password", { method: "POST", auth: false, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: mail, password: ww }) }); }
      catch (e) {
        bezigKnop("l-knop", false, "Inloggen"); $("l-ww").value = "";
        if (!e.status) return fout("Geen verbinding met de server. Probeer het zo opnieuw.");
        if (e.status === 429) { mislukt(mail); return fout("De server blokkeert tijdelijk nieuwe pogingen. Probeer het over een paar minuten opnieuw."); }
        if (e.status >= 500) return fout("De server is even niet bereikbaar. Probeer het zo opnieuw.");
        const p = mislukt(mail);
        if (wachtTot(p) > Date.now()) return toonSlot();
        return fout("E-mailadres of wachtwoord klopt niet." + (p.n === 2 ? " Nog één poging, daarna even wachten." : ""));
      }
      zetSessie(d);
      await naInloggen(false);
      if (!App.user) App.route();
    },
    async authVergeten() {
      const mail = ($("v-mail").value || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return fout("Vul een geldig e-mailadres in.");
      const laatst = +(sessionStorage.getItem("wpi_herstel_t") || 0);
      if (Date.now() - laatst < 60000) return fout("Je hebt net een herstelmail aangevraagd. Wacht een minuut voor een nieuwe.");
      bezigKnop("v-knop", true, "Bezig…");
      // PKCE: de link uit de mail werkt alleen samen met deze geheime code_verifier, die in DEZE browser blijft
      const body = { email: mail };
      try {
        const v = b64u(crypto.getRandomValues(new Uint8Array(32)));
        body.code_challenge = b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))));
        body.code_challenge_method = "s256";
        localStorage.setItem(K_PKCE, JSON.stringify({ v, t: Date.now() }));
      } catch (e) { delete body.code_challenge; delete body.code_challenge_method; }   // geen crypto.subtle (geen https): gewone link
      try { await sb("/auth/v1/recover?redirect_to=" + encodeURIComponent(location.origin + location.pathname), { method: "POST", auth: false, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
      catch (e) { if (!e.status || e.status >= 500) { bezigKnop("v-knop", false, "Herstelmail versturen"); return fout("Versturen lukte niet. Controleer je verbinding en probeer het opnieuw."); } }
      try { sessionStorage.setItem("wpi_herstel_t", String(Date.now())); } catch (e) {}
      S.scherm = "login"; S.melding = "Als dit adres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met een link om een nieuw wachtwoord in te stellen.";
      App.route();
    },
    async authNieuwWachtwoord() {
      const a = $("n-ww").value, b = $("n-ww2").value;
      if (a.length < 12) return fout("Gebruik minstens 12 tekens.");
      if (a !== b) return fout("De twee wachtwoorden zijn niet gelijk.");
      try { await sb("/auth/v1/user", { method: "PUT", auth: false, headers: metToken({ "Content-Type": "application/json" }), body: JSON.stringify({ password: a }) }); }
      catch (e) {
        if (e.status === 401 || e.status === 403) {
          if (S.link) return linkAfbreken("vergeten", "De link is verlopen. Vraag een nieuwe herstelmail aan.");
          wisSessie(); S.scherm = "vergeten"; S.melding = "De link is verlopen. Vraag een nieuwe herstelmail aan."; return App.route();
        }
        return fout(e.status === 422 ? "Dit wachtwoord wordt niet geaccepteerd (te zwak of eerder gelekt). Kies een ander." : "Opslaan lukte niet. Probeer het opnieuw.");
      }
      // overal uitgelogd (ook een bewaarde sessie van dit account is daarmee ongeldig: die kan dus weg)
      await uitloggenServer("global"); wisSessie(); S.link = null;
      S.scherm = "login"; S.melding = "Je wachtwoord is gewijzigd en je bent overal uitgelogd. Log in met je nieuwe wachtwoord.";
      App.route();
    },
    async authMfa() {
      const m = S.mfa, code = ($("m-code").value || "").replace(/\D/g, "");
      if (!m || !m.fid) return fout("Tweestapsverificatie is niet gestart. Annuleer en log opnieuw in.");
      if (code.length !== 6) return fout("De code bestaat uit 6 cijfers.");
      bezigKnop("m-knop", true, "Bezig…");
      try {
        const c = await sb("/auth/v1/factors/" + encodeURIComponent(m.fid) + "/challenge", { method: "POST", auth: false, headers: metToken({ "Content-Type": "application/json" }), body: "{}" });
        const d = await sb("/auth/v1/factors/" + encodeURIComponent(m.fid) + "/verify", { method: "POST", auth: false, headers: metToken({ "Content-Type": "application/json" }), body: JSON.stringify({ challenge_id: c.id, code }) });
        zetSessie(d);
      } catch (e) {
        bezigKnop("m-knop", false, "Bevestigen"); $("m-code").value = "";
        if (!e.status) return fout("Geen verbinding. Probeer het opnieuw.");
        m.fout++;
        if (m.fout === 3) meld("mfa_mislukt", { pogingen: m.fout });
        if (m.fout >= 5) { meld("mfa_mislukt", { pogingen: m.fout, afgebroken: true }); await uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = "Te veel onjuiste codes. Log opnieuw in."; return App.route(); }
        return fout("Deze code klopt niet of is verlopen. Gebruik de nieuwste code uit de app.");
      }
      await rondAf(m.profiel, false);
    },

    // inlogscherm: echt (met backend) of de voorbeeld-accountkiezer
    view_login() {
      if (!actief()) {
        login0.call(this);
        const v = $("view"), h = v && v.firstElementChild;
        if (h) h.insertAdjacentHTML("afterend", `<div class="hint" style="margin-bottom:12px"><b>Voorbeeld</b> · fictieve accounts en voorbeelddata. Er is geen server gekoppeld; alles blijft op dit toestel.</div>`
          + (inactiefMelding ? `<div class="hint" role="status" style="margin-bottom:12px">${esc(inactiefTekst())}</div>` : ""));
        return;
      }
      const v = $("view"), s = S.scherm || "login";
      ({ login: scherm_login, vergeten: scherm_vergeten, nieuwww: scherm_nieuwww, mfa: scherm_mfa, anderwerk: scherm_anderwerk }[s] || scherm_login)(v);
    },
    openAccount() {
      acct0.apply(this, arguments);
      if (!actief()) return;
      const lc = document.querySelector("#mod .listcard"); if (!lc) return;
      // "Uitloggen" (sluit + logout) wordt "eerst vragen" (zonder sluiten: authUitloggenVraag doet dat zelf)
      lc.querySelectorAll('button[data-action="logout"][data-sluit]').forEach((b) => { b.removeAttribute("data-sluit"); b.removeAttribute("data-args"); b.setAttribute("data-action", "authUitloggenVraag"); });
      const r = (ic, t, s, on) => `<button class="row prefrow"${on}><span class="cirkel">${svg(ic, 18)}</span><span class="grow"><span class="t">${t}</span>${s ? `<div class="s">${s}</div>` : ""}</span><span class="s">${svg("chev", 16)}</span></button>`;
      const n = App.syncWachtrij ? App.syncWachtrij() : 0;
      lc.insertAdjacentHTML("beforeend",
        r("check", "Synchronisatie", n ? n + " wijziging" + (n === 1 ? "" : "en") + " in de wachtrij" : "Alles is verstuurd", act("syncDetails")) +
        r("back", "Overal uitloggen", "Ook op je andere toestellen (bijv. bij een verloren telefoon)", act("authUitloggenVraag", true)) +
        (MFA_ROLLEN.includes(this.user.role) ? `<div class="row"><span class="cirkel">${svg("check", 18)}</span><span class="grow"><span class="t">Tweestapsverificatie</span><div class="s">${S.aal === "aal2" ? "Actief" : "Wordt gevraagd bij de volgende login"}</div></span></div>` : ""));
    },
  });

  // ---------------- productie (backend ingevuld) tegenover voorbeeldmodus ----------------
  // PRODUCTIE: geen enkele voorbeeld-omweg. De echte bescherming is RLS op de server (zonder geldige JWT
  // geeft PostgREST niets), maar de app biedt ook zelf niets fictiefs of omzeilbaars aan:
  //   - App.login is dicht: alleen rondAf() (na wachtwoord, profiel/rol uit de server en zo nodig MFA) logt in,
  //     via de kern-functie in een closure. App.login("u-hoofd") of App.login(id, {role:"hoofd"}) vanuit de
  //     console of een geïnjecteerde data-action="login" doet niets.
  //   - geen fictieve accounts (WPI.USERS leeg tot de profielen van de server er zijn), geen "wpi_user";
  //   - geen voorbeeldacties of -planning in IndexedDB (demoActies/demoPlanning leveren niets);
  //   - geen fictieve inspecties, projecten of cijfers uit data/voorbeelddata.json en data/cijfers.json: alleen de
  //     catalogus met de algemene onderwerpen (A–I) blijft. Dashboard en kwartaalrapportage rekenen in deze versie
  //     nog met die voorbeelddata; in productie tonen ze daarom een rustige melding in plaats van verzonnen cijfers.
  //   - geen "Voorbeeld"-chip bovenin.
  // VOORBEELDMODUS (config leeg): alles zoals het prototype, met een rustig "Demo"-label bovenin.
  function zonderVoorbeelddata() {
    if (!actief()) return;
    const vd = App.data.voorbeelddata || {}, cat = {};
    (Array.isArray(vd.regels) ? vd.regels : []).forEach((x) => {
      if (x && x.soort === "Algemeen" && x.ref && !cat[x.ref]) cat[x.ref] = { ref: x.ref, soort: "Algemeen", omschrijving: x.omschrijving, classificatie: x.classificatie };
    });
    const d = new Date(), vandaag = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    App.data.voorbeelddata = Object.freeze({ productie: true, peildatum: vandaag, regels: Object.freeze(Object.values(cat)),
      wpis: Object.freeze([]), acties: Object.freeze([]), programma: Object.freeze([]), projecten: Object.freeze([]), toelichting: Object.freeze({}) });
    App.data.cijfers = null;
  }
  const nogNiet = (titel, ic, tekst) => function () {
    $("view").appendChild(el(`<div class="leeg" style="margin-top:40px"><span class="bol">${ic}</span><h1 style="margin:14px 0 6px">${titel}</h1>
      <div class="s" style="max-width:420px;margin:0 auto">${tekst}</div>
      <button class="btn primary" style="margin-top:20px;max-width:260px"${act("go", "vandaag")}>Naar Vandaag</button></div>`));
  };
  if (actief()) {
    USERS.splice(0, USERS.length);
    try { localStorage.removeItem("wpi_user"); } catch (e) {}
    // geen fictieve monteursnamen (Henk Voorbeeld …) als terugval: zolang de lijst van de server er niet is, is hij leeg
    App.MONTEURS_DEMO = Object.freeze([]);
    const insMonteurs0 = App.ins_monteurs;
    if (insMonteurs0) App.ins_monteurs = function (ins, v) {
      const r = insMonteurs0.apply(this, arguments);
      const c = v && v.querySelector(".q .chips");
      if (c && !this.monteursLijst().length) c.insertAdjacentHTML("beforebegin", `<div class="hint" role="status" style="margin:8px 0">De monteurslijst is nog niet geladen (nog geen verbinding gehad, of er staan nog geen monteurs in Beheer). Voeg de namen hieronder zelf toe.</div>`);
      return r;
    };
    Object.assign(App, {
      login() { return Promise.resolve(); },   // dicht; zie hierboven
      demoActies: () => [],
      demoPlanning: () => [],
      view_dashboard: nogNiet("Dashboard", "📊", "Het dashboard rekent in deze versie nog met voorbeelddata. Op de echte omgeving tonen we geen verzonnen cijfers; dit scherm komt terug zodra het met de gegevens van de server werkt."),
      view_kwartaal: nogNiet("Rapportage", "📄", "De kwartaalrapportage rekent in deze versie nog met voorbeelddata. Op de echte omgeving maken we geen rapport met verzonnen cijfers; dit scherm komt terug zodra het met de gegevens van de server werkt."),
      renderAcct() { if (!this.user) { $("acct").innerHTML = ""; return; } return renderAcct0.apply(this, arguments); },
    });
  } else {
    App.renderAcct = function () {
      renderAcct0.apply(this, arguments);
      const a = $("acct"), box = this.user && a && a.firstElementChild;
      // een knop (geen losse tekst): tikken geeft uitleg; ook voor een schermlezer duidelijk wat "Demo" betekent
      // in een eigen (benoemd) landmark: de topbar zelf is geen landmark en axe ("region") wil alle inhoud in een landmark
      if (box) box.insertAdjacentHTML("afterbegin", `<aside aria-label="Modus" style="display:flex"><button type="button" class="chip demolabel"${act("demoUitleg")} aria-label="Demo: voorbeeldmodus, uitleg" style="color:var(--accent);background:var(--accent-bg);box-shadow:none">Demo</button></aside>`);
    };
    App.demoUitleg = function () {
      App.openModal("Voorbeeldmodus", "Er is geen server gekoppeld.",
        `<div class="s" style="margin-bottom:12px;line-height:1.45">Je werkt met fictieve accounts en voorbeelddata. Wat je vastlegt blijft alleen op dit toestel en gaat nergens heen. In de echte omgeving log je in met je eigen e-mailadres en wachtwoord en is deze voorbeeldmodus er niet.</div>
         <button class="btn primary"${act("closeModal")}>Begrepen</button>`);
    };
  }

  if (actief()) {
    // een ander tabblad logt uit → hier ook
    window.addEventListener("storage", (e) => {
      if (e.key === K_RT && !e.newValue && App.user && !lees(K_RT)) { const l = laatsteUid(); return l && l !== App.user.id ? anderIngelogd() : uitElders("Je bent in een ander venster uitgelogd."); }
      // een ander logde in een ander tabblad in (gedeeld toestel): hier meteen uitloggen
      if (e.key === K_LAATSTE && e.newValue && App.user && e.newValue !== App.user.id) anderIngelogd();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      // tabblad stond stil (bevroren) terwijl een ander inlogde: het storage-event kan dan gemist zijn
      const l = laatsteUid(); if (App.user && l && l !== App.user.id) return anderIngelogd();
      if (S.rt && Date.now() > S.exp - 120000 && navigator.onLine) vernieuw();
    });
    window.addEventListener("online", () => { if (S.rt && Date.now() > S.exp - 60000) vernieuw(); });
    // een link uit een e-mail in een tabblad waar de app al open is (alleen het #-deel verandert): opnieuw laden,
    // zodat verwerkLink() hem net zo behandelt als bij openen (controleren, niets wissen, token uit het adres)
    window.addEventListener("hashchange", () => { if (/(^|[#&/])(access_token|error_code|error)=/.test(location.hash)) location.reload(); });
  }

  // ---------------- uitloggen na inactiviteit (vervangt de "time-box" van het Pro-plan) ----------------
  // Na INACTIEF_MS zonder interactie (aanwijzen/tikken, toetsen, zichtbaar scrollen) logt de app uit, op de telefoon én
  // op de computer, in beide modi. Het laatste moment staat in localStorage (gedeeld door alle tabbladen: werk je in het
  // ene tabblad, dan blijft het andere ook ingelogd). Controle elke minuut en direct bij terugkomen (zichtbaar worden,
  // focus, pageshow) en bij elk scherm (App.route): wie na meer dan 2 uur terugkomt, is meteen uitgelogd.
  // Vóór het uitloggen wordt een lopende inspectie als concept bewaard (App.logout → concept "lopend-<uid>"); de
  // wachtrij (outbox) blijft staan en gaat mee bij de volgende login. Daarna het inlogscherm met een rustige melding
  // (met "je inspectie is bewaard" als er een open stond, en zonder bereik: pas weer inloggen met verbinding).
  // Klok: een laatste activiteit die meer dan KLOK_MARGE_MS in de TOEKOMST ligt (de klok liep vóór en is teruggezet:
  // NTP of handmatig), wordt bij de eerstvolgende controle (elke minuut, en bij elk scherm, zichtbaar worden, focus en
  // interactie) teruggezet op NU. Zo blijft de sessie na een klokcorrectie hooguit 2 uur open (niet "voorsprong + 2 uur"),
  // en wordt wie gewoon doorwerkt met een klok die 10 minuten voorliep, niet midden in het werk uitgelogd.
  // Restrisico (veld): wie zonder bereik wordt uitgelogd (telefoon op slot in de pauze op een afgelegen locatie), kan
  // pas weer inloggen met verbinding (wachtwoord, en voor de beheerrollen MFA). Het werk blijft op het toestel; zie
  // docs/beveiligingsrapport.md (bewust zo: een onbeheerd toestel moet na 2 uur dicht, ook zonder bereik).
  const INACTIEF_MS = 2 * 60 * 60 * 1000;   // de enige plek voor deze duur
  const KLOK_MARGE_MS = 5 * 60 * 1000;
  const INACTIEF_TEKST = "Je bent na 2 uur zonder activiteit uitgelogd.";
  const K_ACTIEF = "wpi_laatste_activiteit";
  // Het moment staat OOK in het geheugen van dit tabblad (geheugen): lukt lezen of schrijven van localStorage niet
  // (privévenster, opslag vol of geblokkeerd), dan telt de klok gewoon door (nooit "nooit uitloggen", en nooit
  // uitloggen midden in het werk omdat een oude waarde niet overschreven kon worden). Geldt: de LAATSTE van beide.
  let inactiefMelding = false, inactiefConcept = false, laatstGeschreven = 0, geheugen = 0, vastInOpslag = 0;
  function inactiefTekst() {
    return INACTIEF_TEKST + (inactiefConcept ? " Je lopende inspectie is bewaard; log opnieuw in om verder te gaan." : "")
      + (actief() && navigator.onLine === false ? " Zonder internet kun je pas weer inloggen als je bereik hebt; je werk blijft op dit toestel." : "");
  }
  function leesOpslag() { try { const v = +localStorage.getItem(K_ACTIEF); return v > 0 ? v : 0; } catch (e) { return 0; } }
  // vastInOpslag: een waarde in de TOEKOMST die niet te overschrijven bleek (klok teruggezet en opslag vol): negeren
  function leesActief() { const v = leesOpslag(); return Math.max(v === vastInOpslag ? 0 : v, geheugen); }
  function nuActief() {
    geheugen = laatstGeschreven = Date.now(); inactiefMelding = false; inactiefConcept = false;
    try { localStorage.setItem(K_ACTIEF, String(laatstGeschreven)); } catch (e) {}
    const v = leesOpslag(); vastInOpslag = v > geheugen + KLOK_MARGE_MS ? v : 0;
  }
  function klokTerug() { if (leesActief() > Date.now() + KLOK_MARGE_MS) nuActief(); }
  const verlopen = () => { const t = leesActief(); return !!t && Date.now() - t > INACTIEF_MS; };
  function activiteit(e) {
    if (!App.user || document.visibilityState !== "visible") return;
    if (e && e.type === "scroll" && e.isTrusted === false) return;
    klokTerug();
    if (verlopen()) return controleerActief();   // te laat: niet stilletjes verlengen
    if (Date.now() - laatstGeschreven > 15000) nuActief();   // hooguit elke 15 s schrijven
  }
  function controleerActief() {
    if (!App.user) return false;
    if (!leesActief()) { nuActief(); return false; }   // nog nooit gezet (eerste keer met deze versie)
    klokTerug();
    if (!verlopen()) return false;
    inactiefMelding = true;
    inactiefConcept = !!(App.state && App.state.inspectie);   // App.logout bewaart die als concept
    if (actief()) S.melding = inactiefTekst();
    try { App.closeModal(); } catch (e) {}
    App.logout();   // bewaart een lopende inspectie als concept; wachtrij blijft (zie kern.js logout, authLogout)
    return true;
  }
  ["pointerdown", "keydown", "touchstart", "wheel"].forEach((t) => document.addEventListener(t, activiteit, { capture: true, passive: true }));
  window.addEventListener("scroll", activiteit, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") controleerActief(); });
  window.addEventListener("focus", () => controleerActief());
  window.addEventListener("pageshow", () => controleerActief());
  setInterval(() => controleerActief(), 60000);
  {
    // bij elk scherm (ook het eerste na het opstarten met een bewaarde sessie of voorbeeld-login)
    const route0 = App.route;
    App.route = function () { if (App.user && controleerActief()) return; return route0.apply(this, arguments); };
    if (!actief()) {
      const login1 = App.login;   // voorbeeld-login: de klok begint opnieuw
      App.login = function () { nuActief(); return login1.apply(this, arguments); };
    }
  }
  App.INACTIEF_MS = INACTIEF_MS;   // voor tests en uitleg (alleen lezen)
})();
