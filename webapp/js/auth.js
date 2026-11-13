/* Werkplekinspectie — js/auth.js
   Inloggen. Wordt na alle modules en vóór start.js geladen.

   ZONDER backend (js/config.js leeg): de voorbeeld-login van het prototype (accountkiezer met
   fictieve accounts), duidelijk gemarkeerd als "Voorbeeld". Verder verandert er niets.

   MET backend (Supabase Auth, direct via /auth/v1 — geen externe bibliotheek):
   - e-mail + wachtwoord; "Wachtwoord vergeten?" stuurt een herstelmail (altijd dezelfde melding,
     zodat niet te achterhalen is welke adressen bestaan); de link uit die mail opent hier het
     scherm "Nieuw wachtwoord" en logt daarna alle sessies uit.
   - rol uit public.profiles (nooit uit de client); inactieve profielen komen er niet in.
   - het hoofd moet tweestapsverificatie (TOTP, aal2) doorlopen; zonder gekoppelde app wordt die
     eerst ingesteld (QR-code). RLS dwingt aal2 af voor beheerroutes (public.mfa_ok()).
   - sessie: access-JWT alleen in het geheugen; refresh-token standaard in sessionStorage (weg zodra
     de app/het tabblad sluit). Alleen met "Ingelogd blijven" (standaard UIT; de keuze wordt per
     toestel onthouden) in localStorage. Afweging: een inspecteur in het veld moet de app zonder bereik
     opnieuw kunnen openen, en daarvoor moet het token de herstart overleven; maar XSS kan alles in
     localStorage/sessionStorage lezen (script-src is inmiddels strikt: 'self', geen inline handlers,
     zie _headers; XSS blijft toch de grootste dreiging) en een gestolen refresh-token is een langdurige overname. Daarom:
     - het Hoofd S&M (MFA, beheerrechten) krijgt NOOIT een bewaard refresh-token, ook niet met het vinkje;
     - het token wordt pas bewaard na een volledige login (profiel + rol + zo nodig MFA);
     - korte JWT (Supabase: 1 uur), refresh-token-rotatie met hergebruikdetectie, "Overal uitloggen";
     - VERPLICHT in Supabase (Auth → Sessions): "Time-box user sessions" (bijv. 7 dagen) en een
       inactiviteits-timeout, zodat ook een gestolen token vanzelf verloopt.
     Een HttpOnly-cookie vraagt een eigen server/Edge Function (volgende stap nu script-src strak is).
   - "Ingelogd blijven" staat standaard uit (gedeelde toestellen). Een inspecteur die voor het eerst op een
     toestel inlogt met het vinkje uit krijgt daarna één keer de vraag "Is dit je eigen telefoon?", zodat
     hij bewust kan kiezen om de app ook zonder bereik opnieuw te kunnen openen. "Ja" zet dan het
     refresh-token én het bewaarde profiel en de collega's in localStorage (alles wat herstel() zonder bereik nodig heeft).
   - twee tabbladen tegelijk op één toestel: logt in het ene tabblad iemand anders in (wpi_laatste_uid
     verandert), dan logt het andere meteen uit — zonder de gegevens in IndexedDB of de bewaarde sessie
     van die ander te wissen. Ook bij terugkomen in een tabblad dat het event miste (zie ook js/sync.js, punt 6).
   - gedeeld toestel: na het sluiten zonder uitloggen (geen sessie meer bij het openen) en bij een andere
     gebruiker dan de vorige (localStorage "wpi_laatste_uid") worden eerst de servergegevens op dit
     toestel gewist (App.syncWisLokaal; de eigen wachtrij blijft), pas daarna komt er iets op het scherm.
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
  const ROLLEN = ["hoofd", "coordinator", "inspecteur"];
  const MFA_ROLLEN = ["hoofd"];

  // ---------------- sessie ----------------
  // klaar = volledige login voltooid; pas dan mag het refresh-token worden bewaard
  const S = { at: null, exp: 0, rt: null, uid: null, aal: null, onthoud: false, klaar: false, factors: [], scherm: null, melding: "", mfa: null, scope: null };
  function jwt(t) {
    try { const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(escape(atob(p + "===".slice((p.length + 3) % 4))))); }
    catch (e) { return {}; }
  }
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
  const anderIngelogd = () => uitElders("Er is in een ander venster op dit toestel iemand anders ingelogd. Je bent hier uitgelogd; je vastgelegde gegevens zijn bewaard.");
  const keuzeOnthoud = () => { try { return localStorage.getItem(K_KEUZE) === "1"; } catch (e) { return false; } };

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
        <div class="muted" style="margin:0 0 10px 30px;font-size:13px;line-height:1.4">Nodig om de app zonder bereik opnieuw te openen. Alleen aanzetten op je eigen telefoon, nooit op een gedeeld toestel. Voor het Hoofd S&amp;M geldt de login altijd alleen zolang de app open is.</div>
        <div id="l-fout" class="fout" role="alert"></div>
        <button class="btn primary" id="l-knop" type="submit" style="margin-top:8px">Inloggen</button>
      </form>
      <button class="linkknop" type="button"${act("authScherm", "vergeten")}>Wachtwoord vergeten?</button>
      <div class="muted" style="font-size:12px;margin-top:6px">Geen account? Het Hoofd Service &amp; Montage nodigt je uit.</div></div>`));
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
    v.appendChild(el(`<div>${kop("Nieuw wachtwoord", "Kies een nieuw wachtwoord van minstens 12 tekens. Een zin van een paar woorden werkt goed.")}${melding()}
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
      await uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = "Je profiel kon niet worden geladen. Neem contact op met het Hoofd Service & Montage."; return false;
    }
    // definitief antwoord van de server: geen profiel (RLS toont een inactief profiel niet) of actief = false
    if (!p || p.actief === false) { await uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = "Je account is (nog) niet actief. Neem contact op met het Hoofd Service & Montage."; return false; }
    if (!ROLLEN.includes(p.role)) { await uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = "Voor jouw rol is nog geen scherm in deze app. Neem contact op met het Hoofd Service & Montage."; return false; }
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
    const prof = profielVoorApp(p);
    // pas nu (profiel, rol en zo nodig MFA in orde) het refresh-token bewaren; het hoofd nooit blijvend
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
    if (App.syncStart) setTimeout(() => App.syncStart(), 0);
    if (!herstel && S.vraagToestel && prof.role === "inspecteur") setTimeout(() => App.authToestelVraag(), 600);
    S.vraagToestel = false;
  }
  async function uitloggenServer(scope) {
    if (!S.at) return;
    try { await metTimeout(sb("/auth/v1/logout?scope=" + scope, { method: "POST", auth: false, headers: metToken() }), 5000); } catch (e) {}
  }
  // link uit de herstelmail: #access_token=…&type=recovery (of #error=…)
  function verwerkHash() {
    const h = new URLSearchParams(location.hash.replace(/^#\/?/, ""));
    if (!h.get("access_token") && !h.get("error") && !h.get("error_code")) return false;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; }
    if (h.get("error") || h.get("error_code")) { S.scherm = "vergeten"; S.melding = "De link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan."; return true; }
    zetSessie({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: +h.get("expires_in") || 3600 }, false);
    S.scherm = h.get("type") === "recovery" ? "nieuwww" : "login";
    if (S.scherm === "login") wisSessie();
    return true;
  }

  // sessie van een vorige keer herstellen (refresh-token uit sessionStorage of, met "Ingelogd blijven", localStorage)
  async function herstel() {
    if (verwerkHash()) return;
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
    if (prof && prof.id === S.uid && ROLLEN.includes(prof.role)) { App.user = profielVoorApp(prof); if (!USERS.some((u) => u.id === prof.id)) USERS.push(App.user); }
  }

  // ---------------- koppelingen met kern.js ----------------
  const login0 = App.view_login, acct0 = App.openAccount, loginKern = App.login, renderAcct0 = App.renderAcct;
  Object.assign(App, {
    authActief: actief,
    async authHerstel() {
      zonderVoorbeelddata();   // vóór er iets op het scherm komt (boot() heeft de data net geladen)
      await herstel();
      // Geen sessie te herstellen (tabblad/app gesloten zonder uitloggen, sessie verlopen, herstellink):
      // de servergegevens van de vorige gebruiker horen niet op het inlogscherm van een gedeeld toestel.
      if (!App.user) { if (App.syncWisLokaal) await App.syncWisLokaal(laatsteUid()); }
      else await wisAlsAnder(App.user.id);   // (zonder bereik hersteld: zelfde controle als bij inloggen)
    },
    // eenmalig na de eerste login van een inspecteur op dit toestel met het vinkje uit
    authToestelVraag() {
      if (!App.user || App._page === "inspectie" || ($("ov") && $("ov").classList.contains("on"))) return;
      App.openModal("Is dit je eigen telefoon?", "Dan kun je ingelogd blijven, zodat je de app ook zonder bereik opnieuw kunt openen (bijv. op een locatie zonder signaal).",
        `<div class="s" style="margin-bottom:12px;line-height:1.45">Doe dit alleen op een toestel dat alleen jij gebruikt. Op een gedeeld toestel ben je uitgelogd zodra de app of het tabblad sluit; je vastgelegde gegevens blijven dan wel veilig bewaard.</div>
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
    // uitloggen via het menu: eerst waarschuwen als er nog wijzigingen in de wachtrij staan (gedeeld toestel)
    authUitloggenVraag(overal) {
      const n = App.syncWachtrij ? App.syncWachtrij() : 0, doe = overal ? act("authLogoutOveral") : actSluit("logout");
      if (!n) return overal ? App.authLogoutOveral() : (App.closeModal(), App.logout());
      App.openModal("Nog niet alles verstuurd", n + (n === 1 ? " wijziging staat" : " wijzigingen staan") + " nog in de wachtrij.",
        `<div class="s" style="margin-bottom:12px;line-height:1.45">Ze blijven veilig op dit toestel en zijn onzichtbaar voor anderen die hier inloggen. Ze worden pas verstuurd als jíj hier weer inlogt. Synchroniseer liever eerst.</div>
         <button class="btn primary"${actSluit("syncOpnieuw")}>Eerst synchroniseren</button>
         <button class="btn ghost" style="margin-top:10px;width:100%"${doe}>Toch uitloggen</button>`);
    },
    authScherm(s) { S.scherm = s; S.melding = ""; App.route(); },
    authAnnuleer() { uitloggenServer("local"); wisSessie(); S.scherm = "login"; S.melding = ""; App.route(); },

    async authInloggen() {
      const mail = ($("l-mail").value || "").trim().toLowerCase(), ww = $("l-ww").value || "";
      if (wachtTot(pog()) > Date.now()) return toonSlot();
      if (!mail || !ww) return fout("Vul je e-mailadres en wachtwoord in.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return fout("Vul een geldig e-mailadres in.");
      if (!navigator.onLine) return fout("Geen verbinding. Inloggen kan alleen met internet; daarna werkt de app ook zonder bereik.");
      S.onthoud = !!($("l-onthoud") || {}).checked; S.email = mail; S.melding = ""; S.klaar = false;
      // nog nooit een keuze gemaakt op dit toestel en het vinkje uit: na de login één keer vragen (alleen inspecteur)
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
      try { await sb("/auth/v1/recover?redirect_to=" + encodeURIComponent(location.origin + location.pathname), { method: "POST", auth: false, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: mail }) }); }
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
        if (e.status === 401 || e.status === 403) { wisSessie(); S.scherm = "vergeten"; S.melding = "De link is verlopen. Vraag een nieuwe herstelmail aan."; return App.route(); }
        return fout(e.status === 422 ? "Dit wachtwoord wordt niet geaccepteerd (te zwak of eerder gelekt). Kies een ander." : "Opslaan lukte niet. Probeer het opnieuw.");
      }
      await uitloggenServer("global"); wisSessie();
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
        if (h) h.insertAdjacentHTML("afterend", `<div class="hint" style="margin-bottom:12px"><b>Voorbeeld</b> · fictieve accounts en voorbeelddata. Er is geen server gekoppeld; alles blijft op dit toestel.</div>`);
        return;
      }
      const v = $("view"), s = S.scherm || "login";
      ({ login: scherm_login, vergeten: scherm_vergeten, nieuwww: scherm_nieuwww, mfa: scherm_mfa }[s] || scherm_login)(v);
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
  //     via de kern-functie in een closure. App.login("u-bjorn") of App.login(id, {role:"hoofd"}) vanuit de
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
  }
})();
