/* Werkplekinspectie — js/beheer.js
   Beheer (telefoon en web), per recht (js/kern.js, RECHTEN):
   - monteurslijst: iedereen in het team (hoofden, coördinatoren, QHSE-manager, beheerder);
   - Gebruikers (uitnodigen, rol en functie, non-actief/actief), het doel % conform en "Rapporten mailen naar": de
     beheerrollen (hoofden, QHSE-manager, beheerder);
   - "Vandaag" voor wie niet inspecteert (QHSE-manager, beheerder): een overzicht van het team in plaats van
     "inspectie starten" (view_vandaag omwikkeld).
   Doel % conform: standaard 85 (nooit ingesteld = 85, zoals instellingen.doel_conform op de server); bewust
   "geen doel" = lege waarde (server: JSON null).
   Opslag op dit toestel (localStorage), zoals de app het nu bewaart:
   - "wpi_monteurs"           actieve monteurs (lijst namen; dit leest de inspectie)
   - "wpi_monteurs_inactief"  op non-actief gezet (blijft bewaard voor oude inspecties en filters)
   - "wpi_doel_conform"       doel in procenten ("" = bewust geen doel; ontbreekt = standaard 85)
   Met een backend (js/config.js ingevuld) is de server de bron: public.monteurs en public.instellingen
   (sleutel doel_conform). Bij inloggen, bij terugkomen in de app en bij het openen van Beheer halen we beide op en
   zetten we ze in de sleutels hierboven, zodat de inspectie, het dashboard en de rapportage op elk toestel
   hetzelfde lezen. Wijzigingen in Beheer gaan via een kleine wachtrij ("wpi_beheer_wachtrij") naar de server,
   ook als er even geen verbinding is. Een naam die een inspecteur tijdens de inspectie toevoegt, gaat via
   rpc/monteur_aanmelden (de server koppelt hem aan de bestaande schrijfwijze).
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, tril, isWeb, IC, act, op, WAARDE } = window.WPI;
  IC.tand = IC.tand || '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>';
  const K_ACTIEF = "wpi_monteurs", K_INACTIEF = "wpi_monteurs_inactief", K_DOEL = "wpi_doel_conform";
  const K_WACHT = "wpi_beheer_wachtrij", K_SYNCFOUT = "wpi_beheer_syncfout";
  // één naam voor dit scherm (ook in het accountmenu, js/kern.js, en op het Overzicht)
  const BEHEER_SUB = "Gebruikers, monteurs, doel en rapporten";
  // naam opschonen: onzichtbare tekens (zero-width, zachte afbreking, stuurtekens uit Teams/Outlook) weg,
  // spaties samen en aan de randen weg, losse leestekens aan het eind weg ("Henk Voorbeeld." → "Henk Voorbeeld")
  const ONZ = /[\u0000-\u001F\u007F-\u009F\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;
  const schoon = (n) => String(n == null ? "" : n).normalize("NFC").replace(ONZ, "").replace(/\s+/g, " ").trim().replace(/[\s.,;:·]+$/, "").trim();
  // vergelijken zonder hoofdletters, accenten, spaties en leestekens; ook letters die NFD niet splitst (ø, æ, ß …)
  // ("Henk Voorbeeld", "henk voorbeeld.", "Henk\u200BVoorbeeld", "Hénk-Voorbeeld" zijn dezelfde monteur)
  const LOS = { "ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "đ": "d", "ð": "d", "ł": "l", "ı": "i", "þ": "th", "ħ": "h" };
  const sleutel = (n) => String(n == null ? "" : n).replace(ONZ, "").toLocaleLowerCase("nl").replace(/[øæœßđðłıþħ]/g, (c) => LOS[c])
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
  const lees = (k) => { try { const l = JSON.parse(localStorage.getItem(k) || "null"); return Array.isArray(l) ? l : null; } catch (e) { return null; } };
  const schrijf = (k, l) => { try { localStorage.setItem(k, JSON.stringify(l)); return true; } catch (e) { return false; } };
  // ontdubbelen: de eerste schrijfwijze wint, lege namen vallen weg
  const uniek = (l) => { const s = new Set(), uit = []; (l || []).forEach((n) => { const c = schoon(n), k = sleutel(c); if (c && !s.has(k)) { s.add(k); uit.push(c); } }); return uit; };
  // rechten (js/kern.js): monteurslijst voor het hele team, team/rollen en doel alleen voor de beheerrollen
  const magMonteurs = () => !!(window.App.user && window.WPI.mag("monteurs"));
  const magBeheer = () => !!(window.App.user && window.WPI.mag("beheer"));

  // Beheer in de zijbalk op de computer; op de telefoon via het accountmenu
  const tabsOrig = window.App.renderTabs;
  window.App.renderTabs = function (active) {
    tabsOrig.call(this, active);
    const tb = $("tabbar");
    if (tb && magMonteurs() && isWeb()) tb.insertAdjacentHTML("beforeend", `<a href="#/beheer" class="bhtab${active === "beheer" ? " on" : ""}"${active === "beheer" ? ' aria-current="page"' : ""}><span class="ic">${svg("tand", 24)}</span>Beheer</a>`);
  };

  // Inspectie, stap "Gesprek met de monteurs": de chips opnieuw opbouwen met de DOM in plaats van een naam in een
  // attribuut (data-args). Namen uit Beheer mogen alles bevatten (Jan d'Hondt, aanhalingstekens …); zo breekt er niets
  // en kan een naam nooit code worden.
  const insMonteursOrig = window.App.ins_monteurs;
  if (insMonteursOrig) window.App.ins_monteurs = function (ins, v) {
    const r = insMonteursOrig.apply(this, arguments);
    const box = v && [...v.querySelectorAll(".chips")].find((c) => c.querySelector('[data-action="togMonteur"]'));
    if (box) {
      // vergelijken met sleutel(): "henk voorbeeld" (oud concept) is de chip "Henk Voorbeeld". Gekozen namen die niet
      // (meer) in de lijst staan (intussen op non-actief of hernoemd in Beheer) blijven als gekozen chip zichtbaar,
      // zodat je ze kunt zien en weer uit kunt tikken.
      const gekozen = (ins && ins.monteurs) || [], ks = new Set(gekozen.map(sleutel)), lijst = this.monteursLijst(), inLijst = new Set(lijst.map(sleutel));
      const los = uniek(gekozen).filter((n) => !inLijst.has(sleutel(n)));
      box.textContent = "";
      lijst.concat(los).forEach((n) => {
        const aan = ks.has(sleutel(n)), b = document.createElement("button");
        b.type = "button"; b.className = "chipb" + (aan ? " on" : ""); b.setAttribute("aria-pressed", aan ? "true" : "false");
        b.textContent = (aan ? "✓ " : "") + n;
        b.addEventListener("click", () => this.togMonteur(n));
        box.appendChild(b);
      });
    }
    return r;
  };
  // wijzigen in Beheer niet laten hangen: wie het scherm verlaat, komt terug op een rustige lijst
  window.addEventListener("hashchange", () => { if (!/^#\/beheer\b/.test(location.hash)) { window.App._beheer = null; window.App._team = null; } });

  // Vandaag: wie niet inspecteert (QHSE-manager, beheerder) krijgt geen "inspectie starten" maar een overzicht van het team
  const vandaagOrig = window.App.view_vandaag;
  if (vandaagOrig) window.App.view_vandaag = function () {
    if (this.user && !window.WPI.mag("inspecteert")) return this.view_overzicht();
    return vandaagOrig.apply(this, arguments);
  };

  // ---------------- delen via de server (alleen met een backend; anders blijft alles op dit toestel) ----------------
  const W = () => window.WPI;
  const sbAan = () => !!(W().sbActief && W().sbActief() && W().sb && window.App.user);
  const JS = { "Content-Type": "application/json" };
  const SYNC_PAUZE = 5 * 60 * 1000;
  // binnenkomende waarden zijn onbetrouwbaar: alleen nette namen en een geheel doel 1..100
  const vNaam = (n) => { const c = schoon(typeof n === "string" ? n : ""); return c && c.length <= 120 && sleutel(c) ? c : null; };
  const vDoel = (w) => (typeof w === "number" && Number.isInteger(w) && w >= 1 && w <= 100 ? w : null);
  const tijdelijkeFout = (e) => !e || !e.status || e.status === 401 || e.status === 408 || e.status === 429 || e.status >= 500;
  const foutTekst = (e) => (e && e.status === 403 ? "de server weigerde de wijziging (geen rechten of tweestapsverificatie nodig)"
    : "de server weigerde de wijziging" + (e && e.status ? " (code " + e.status + ")" : ""));
  // de syncknop van de app (js/sync.js) haalt ook de monteurs en het doel op
  const syncStartOrig = window.App.syncStart;
  if (syncStartOrig) window.App.syncStart = async function () {
    const r = await syncStartOrig.apply(this, arguments);
    try { await this.beheerSync(true); } catch (e) {}
    return r;
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") window.App.beheerSync(); });
  window.addEventListener("online", () => window.App.beheerSync(true));

  Object.assign(window.App, {
    // ---- monteurslijst (vervangt de eenvoudige versie uit inspectie.js; zelfde gebruik) ----
    monteursLijst() {
      const l = lees(K_ACTIEF), beheerd = lees(K_INACTIEF);
      if (l && (l.length || beheerd)) return uniek(l);          // ook leeg als alles bewust op non-actief staat
      return this.MONTEURS_DEMO.slice();
    },
    monteursInactief() { return uniek(lees(K_INACTIEF) || []); },
    // bewaren vanuit de inspectie (nieuwe naam toegevoegd): ontdubbelen en een eerder non-actieve naam weer actief maken
    bewaarMonteursLijst(l) {
      const act = uniek(l), ks = new Set(act.map(sleutel));
      schrijf(K_ACTIEF, act);
      const ina = this.monteursInactief(), rest = ina.filter((n) => !ks.has(sleutel(n)));
      if (rest.length !== ina.length || lees(K_INACTIEF)) schrijf(K_INACTIEF, rest);
    },
    // inspectie: getypte naam koppelen aan de bestaande schrijfwijze ("  henk   voorbeeld " → "Henk Voorbeeld")
    voegMonteurToe() {
      const i = $("nieuwe-monteur"), n = schoon(i && i.value).slice(0, 60).trim(), ins = this.state && this.state.inspectie;
      if (!sleutel(n) || !ins) return;
      const goed = this._bestaat(n) || n;
      if (!this.monteursLijst().includes(goed)) {
        this.bewaarMonteursLijst(this.monteursLijst().concat([goed]));   // non-actief → weer actief, met de naam zoals in Beheer
        this._bhWacht({ op: "aanmelden", naam: goed });                  // ook op de server (en dus op andere toestellen)
      }
      ins.monteurs = (ins.monteurs || []).filter((x) => sleutel(x) !== sleutel(goed)).concat([goed]);
      tril(15); this.route();
    },
    // chip aan/uit: dezelfde monteur in een andere schrijfwijze telt als dezelfde (nooit twee keer gekoppeld)
    togMonteur(n) {
      const ins = this.state && this.state.inspectie; if (!ins) return;
      const k = sleutel(n), l = ins.monteurs || [], is = (x) => (k ? sleutel(x) === k : x === n);
      ins.monteurs = l.some(is) ? l.filter((x) => !is(x)) : l.concat([schoon(n) || n]);
      tril(15); this.route();
    },
    _beheerBewaar(act, ina) { schrijf(K_ACTIEF, uniek(act)); schrijf(K_INACTIEF, uniek(ina)); },
    _bestaat(n, behalve) {
      const k = sleutel(n);
      return this.monteursLijst().concat(this.monteursInactief()).find((x) => sleutel(x) === k && x !== behalve) || null;
    },
    _monteurSleutel: sleutel,

    // ---- wachtrij en ophalen ----
    _bhWacht(o) {
      if (!W().sbActief || !W().sbActief() || !this.user) return;      // voorbeeldmodus: alleen dit toestel
      const q = lees(K_WACHT) || [], id = Date.now().toString(36) + "-" + (this._bhN = (this._bhN || 0) + 1) + Math.random().toString(36).slice(2, 6);
      q.push(Object.assign({ id, uid: this.user.id, t: Date.now() }, o)); schrijf(K_WACHT, q.slice(-200));
      this.beheerSync(true);
    },
    _bhWachtEigen() { const u = this.user && this.user.id; return (lees(K_WACHT) || []).filter((o) => o && o.uid === u); },
    // eerst eigen wijzigingen versturen, dan de stand van de server overnemen. forceer = niet wachten op de pauze
    async beheerSync(forceer) {
      if (!sbAan()) return false;
      if (this._bhSync) return this._bhSync;
      if (!forceer && Date.now() - (this._bhSyncT || 0) < SYNC_PAUZE) return false;
      this._bhSync = (async () => {
        try { await this._bhVerstuur(); await this._bhHaal(); this._bhSyncT = Date.now(); return true; }
        catch (e) { return false; }
      })();
      const r = await this._bhSync; this._bhSync = null;
      // intussen nieuwe wijzigingen in de wachtrij (of de eerste stand voor de server): meteen nog een ronde
      if (r && this._bhWachtEigen().length) setTimeout(() => this.beheerSync(true), 0);
      if (r && this._page === "beheer" && !(this._beheer && this._beheer.hernoem)) { const d = document.querySelector(".bhdeel"); if (d) d.textContent = this._bhStand(); }
      return r;
    },
    async _bhVerstuur() {
      const sb = W().sb, u = this.user && this.user.id;
      let q = lees(K_WACHT) || [];
      if (!q.some((o) => o && o.uid === u)) return;
      let rijen = null;
      const laadRijen = async () => (rijen = (await sb("/rest/v1/monteurs?select=id,naam,actief")) || []);
      const zoek = (n) => (rijen || []).find((r) => sleutel(r.naam) === sleutel(n));
      const patch = (id, body) => sb("/rest/v1/monteurs?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: Object.assign({ Prefer: "return=minimal" }, JS), body: JSON.stringify(body) });
      const nieuw = async (naam, actief) => { const r = await sb("/rest/v1/monteurs", { method: "POST", headers: Object.assign({ Prefer: "return=representation" }, JS), body: JSON.stringify({ naam, actief }) }); if (Array.isArray(r) && r[0]) rijen.push(r[0]); };
      for (const o of q.filter((x) => x && x.uid === u)) {
        try {
          if (o.op === "aanmelden") {
            await sb("/rest/v1/rpc/monteur_aanmelden", { method: "POST", headers: JS, body: JSON.stringify({ p_naam: o.naam }) });
          } else if (o.op === "doel" ? magBeheer() : magMonteurs()) {
            if (o.op === "doel") {                                         // geen doel = JSON null (geen rij = standaard 85)
              await sb("/rest/v1/instellingen?on_conflict=sleutel", { method: "POST", headers: Object.assign({ Prefer: "resolution=merge-duplicates,return=minimal" }, JS), body: JSON.stringify({ sleutel: "doel_conform", waarde: o.waarde == null ? null : o.waarde }) });
            } else {
              if (!rijen) await laadRijen();
              if (o.op === "nieuw") { const r = zoek(o.naam); if (!r) await nieuw(o.naam, true); else if (!r.actief) { await patch(r.id, { actief: true }); r.actief = true; } }
              else if (o.op === "hernoem") { const r = zoek(o.van); if (r) { await patch(r.id, { naam: o.naar }); r.naam = o.naar; } else if (!zoek(o.naar)) await nieuw(o.naar, true); }
              else if (o.op === "actief") { const r = zoek(o.naam); if (r) { if (r.actief !== o.aan) { await patch(r.id, { actief: o.aan }); r.actief = o.aan; } } else await nieuw(o.naam, o.aan); }
            }
          } else throw { status: 403 };                                   // geen recht (meer) voor deze wijziging
        } catch (e) {
          if (tijdelijkeFout(e)) throw e;                                 // later opnieuw (blijft in de wachtrij)
          // echte weigering: niet blijven proberen; melden in Beheer. De stand van de server komt hierna terug.
          try { localStorage.setItem(K_SYNCFOUT, JSON.stringify({ t: Date.now(), tekst: foutTekst(e) })); } catch (x) {}
        }
        q = (lees(K_WACHT) || []).filter((x) => !(x && x.id === o.id)); schrijf(K_WACHT, q);
      }
    },
    async _bhHaal() {
      const sb = W().sb;
      if (this._bhWachtEigen().length) return;                          // eerst versturen; anders zou de oude stand winnen
      const [rijen, inst] = await Promise.all([
        sb("/rest/v1/monteurs?select=id,naam,actief&order=naam.asc"),
        sb("/rest/v1/instellingen?select=sleutel,waarde&sleutel=eq.doel_conform"),
      ]);
      if (this._bhWachtEigen().length) return;                          // intussen iets gewijzigd: eerst dat versturen
      const voor = JSON.stringify([lees(K_ACTIEF), lees(K_INACTIEF), localStorage.getItem(K_DOEL)]);
      const R = (Array.isArray(rijen) ? rijen : []).map((r) => r && { naam: vNaam(r.naam), actief: r.actief !== false }).filter((r) => r && r.naam);
      if (R.length) {
        this._beheerBewaar(R.filter((r) => r.actief).map((r) => r.naam), R.filter((r) => !r.actief).map((r) => r.naam));
      } else if (magMonteurs() && lees(K_ACTIEF)) {
        // nog niets op de server: de lijst die op dit toestel werd beheerd wordt de eerste stand
        this.monteursLijst().forEach((n) => this._bhWacht({ op: "nieuw", naam: n }));
        this.monteursInactief().forEach((n) => this._bhWacht({ op: "actief", naam: n, aan: false }));
      }
      // doel: de server bepaalt (geen regel = standaard 85; JSON null = bewust geen doel; iets ongeldigs = geen doel)
      const rij = Array.isArray(inst) ? inst.find((x) => x && x.sleutel === "doel_conform") : null, d = rij ? vDoel(rij.waarde) : null;
      try { if (!rij) localStorage.removeItem(K_DOEL); else localStorage.setItem(K_DOEL, d == null ? "" : String(d)); } catch (e) {}
      // iets veranderd: schermen die het tonen opnieuw opbouwen (niet terwijl iemand in Beheer aan het typen is)
      if (JSON.stringify([lees(K_ACTIEF), lees(K_INACTIEF), localStorage.getItem(K_DOEL)]) !== voor) {
        const typt = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (["dashboard", "kwartaal"].includes(this._page) || (this._page === "beheer" && !typt && !(this._beheer && this._beheer.hernoem))) this.route();
      }
    },
    // regel onder de kaarten: wordt dit gedeeld met het team, of staat het alleen hier?
    _bhStand() {
      // alleen noemen wat deze rol ook ziet: een coördinator beheert alleen de monteurslijst (geen doel)
      const doel = magBeheer();
      if (!W().sbActief || !W().sbActief()) return doel ? "Voorbeeldmodus: deze lijst en het doel staan alleen op dit toestel." : "Voorbeeldmodus: deze lijst staat alleen op dit toestel.";
      if (this._bhWachtEigen().length) return "Nog niet gedeeld: wordt verstuurd zodra er verbinding is.";
      return doel ? "Gedeeld met het team: elke inspecteur ziet deze lijst, het dashboard en de rapportage tonen dit doel." : "Gedeeld met het team: elke inspecteur kiest uit deze lijst.";
    },
    // ---------------- Gebruikers (alleen de beheerrollen: hoofd, QHSE-manager, beheerder) ----------------
    // Lijst van iedereen (naam, functie, rol, actief/non-actief, laatst ingelogd), uitnodigen, rol en functie wijzigen,
    // op non-actief zetten en weer actief maken.
    // Met backend: de lijst uit rpc/gebruikers_overzicht (alleen met tweestapsverificatie, aal2) en elke wijziging via
    // de Edge Functions "uitnodigen" en "gebruikers" (supabase/functions): die controleren de aanroeper opnieuw, maken
    // met de Auth-admin-API de uitnodigingslink of blokkeren het account, en wijzigen het profiel met JOUW sessie, zodat
    // de database alles bewaakt (minstens één actief hoofd, niemand wijzigt zijn eigen rol of toegang, nooit de rol
    // "inspecteur") en de auditlog jou als "wie" noteert. Er wordt niets gemaild: je deelt de link zelf.
    // Voorbeeldmodus: dezelfde schermen tegen de fictieve accounts in het geheugen, met een duidelijk nep-link
    // ("demo — er wordt niets verstuurd"); dezelfde regels worden hier in de app nagebootst.
    TEAM_ROLLEN: ["hoofd", "coordinator", "qhse", "beheerder"],   // nooit "inspecteur" (bestaat alleen nog in de database)
    ZELF_TEKST: "Je eigen rol of toegang kun je niet zelf wijzigen; vraag een andere beheerder (hoofd, QHSE-manager of beheerder).",
    // voorbeeldmodus: de fictieve accounts, met een fictief "laatst ingelogd" (jij: nu; de anderen: de afgelopen dagen),
    // zodat ook hier te zien is wie al eens inlogde en wie nog niet (nieuw uitgenodigd)
    _gebrDemo() {
      if (!this._demoGebr) {
        const nu = Date.now(), me = this.user && this.user.id;
        this._demoGebr = window.WPI.USERS.map((u, i) => ({ id: u.id, full_name: u.full_name, functie: u.functie || "", role: u.role, actief: true, uitgenodigd: true,
          laatst: new Date(u.id === me ? nu : nu - (i * 29 + 5) * 3600 * 1000).toISOString(), sinds: String(1000 + i) }));
      }
      return this._demoGebr;
    },
    async teamLaad() {
      if (!magBeheer()) return;
      if (!sbAan()) { this._team = this._gebrDemo().map((p) => Object.assign({}, p)); this._teamFout = ""; }
      else {
        try {
          const r = await W().sb("/rest/v1/rpc/gebruikers_overzicht", { method: "POST", headers: JS, body: "{}" });
          this._team = (Array.isArray(r) ? r : []).filter((p) => p && typeof p.id === "string" && typeof p.full_name === "string")
            .map((p) => ({ id: p.id, full_name: p.full_name.slice(0, 120), functie: typeof p.functie === "string" ? p.functie.slice(0, 120) : "",
              role: typeof p.role === "string" && this.TEAM_ROLLEN.includes(p.role) ? p.role : null, actief: p.actief !== false,
              laatst: typeof p.laatst_ingelogd === "string" && !isNaN(Date.parse(p.laatst_ingelogd)) ? p.laatst_ingelogd : null, geblokkeerd: p.geblokkeerd === true,
              uitgenodigd: p.uitgenodigd !== false, sinds: typeof p.aangemaakt === "string" ? p.aangemaakt : "" }));
          this._teamFout = "";
        } catch (e) {
          this._team = this._team || [];
          this._teamFout = e && e.status === 403 ? "Log opnieuw in met tweestapsverificatie om gebruikers te beheren." : "De lijst kon niet worden geladen. Probeer het zo opnieuw.";
        }
      }
      const box = $("bh-gebrlijst"); if (box && this._page === "beheer") { box.innerHTML = this._gebrHtml(); const f = $("bh-gebr-fout"); if (f) f.textContent = this._teamFout || ""; const n = $("bh-gebr-n"); if (n) n.textContent = this._gebrAantal(); }
      // de kaart "Rapporten mailen naar" kent nu de volgorde van het team (wie is de eerste QHSE-manager); niet terwijl
      // iemand daar een keuze maakt
      const kaart = $("bh-rapport");
      if (kaart && this._page === "beheer" && !(document.activeElement && kaart.contains(document.activeElement))) kaart.outerHTML = this._bhOntvangerKaart();
    },
    _gebrAantal() { const n = (this._team || []).length; return n ? n + (n === 1 ? " persoon" : " personen") : ""; },
    _gebrHtml() {
      const { ROL, persIni } = window.WPI, me = this.user && this.user.id;
      if (!this._team) return `<div class="s" style="padding:12px 0">Lijst laden…</div>`;
      if (!this._team.length) return `<div class="s" style="padding:12px 0">${this._teamFout ? "" : "Nog niemand in de lijst."}</div>`;
      const datum = (t) => new Date(t).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
      return this._team.map((p) => {
        const zelf = p.id === me, rol = p.role && ROL[p.role] ? ROL[p.role] : "Nog geen rol";
        return `<div class="row bhrij bhgebr${p.actief ? "" : " uit"}">${persIni(p.id, p.full_name)}
          <span class="grow"><span class="t">${esc(p.full_name)}${zelf ? " · jij" : ""}</span>
            <span class="s bhfunctie">${esc(p.functie || "Geen functie ingevuld")}</span>
            <span class="bhmeta"><span class="bhroltekst">${esc(rol)}</span><span class="bhstatus${p.actief ? "" : " uit"}">${p.actief ? "Actief" : "Non-actief"}</span>${p.laatst ? `<span class="bhlaatst">Laatst ingelogd ${esc(datum(p.laatst))}</span>`
              : p.actief ? `<span class="bhopen">Nog niet ingelogd · uitnodiging open</span>` : `<span class="bhlaatst">Nooit ingelogd</span>`}</span></span>
          <button class="bhknop"${act("gebrWijzig", p.id)}>Wijzig<span class="bhvh"> ${esc(p.full_name)}</span></button></div>`;
      }).join("");
    },
    // controles die de database ook doet (hier alleen voor een duidelijke melding, en in de voorbeeldmodus)
    _gebrMagNiet(p, nieuw) {
      if (!magBeheer()) return "Alleen een hoofd, de QHSE-manager of de beheerder beheert gebruikers.";
      const me = this.user && this.user.id;
      if (p.id === me && ((nieuw.role !== undefined && nieuw.role !== p.role) || (nieuw.actief !== undefined && nieuw.actief !== p.actief)))
        return this.ZELF_TEKST;
      const wordtGeenHoofd = p.role === "hoofd" && p.actief && ((nieuw.role !== undefined && nieuw.role !== "hoofd") || nieuw.actief === false);
      if (wordtGeenHoofd && !(this._team || []).some((x) => x.id !== p.id && x.role === "hoofd" && x.actief)) return "Er moet altijd minstens één actief hoofd zijn.";
      return "";
    },
    // ---- wie krijgt de rapporten na een wijziging? (zelfde regel als public.rapport_ontvanger_id, migratie 0009) ----
    // het team in de volgorde waarin ze erbij kwamen (voorbeeldmodus: volgorde van de voorbeeldaccounts)
    _teamOrde() { return (this._team || []).slice().sort((a, b) => (a.sinds < b.sinds ? -1 : a.sinds > b.sinds ? 1 : a.id < b.id ? -1 : 1)); },
    // ontvanger met deze (voorgenomen) wijziging: {id, role?, actief?} of niets = zoals het nu is.
    // Wordt iemand (weer) QHSE-manager terwijl er al een is en niets is gekozen, dan legt de server de huidige ontvanger
    // vast (rapport_ontvanger_vastleggen, migratie 0009 §10c): een collega erbij verandert niet wie de rapporten krijgt.
    _ontvangerVastTe(wijz) {
      const k = this.rapportOntvangerKeuze ? this.rapportOntvangerKeuze() : null, p0 = wijz && (this._team || []).find((p) => p.id === wijz.id);
      if (k || !p0) return null;
      const n = Object.assign({}, p0, wijz), wasQ = p0.role === "qhse" && p0.actief, wordtQ = n.role === "qhse" && n.actief;
      const huidig = this._teamOrde().find((p) => p.id !== p0.id && p.role === "qhse" && p.actief);
      return wordtQ && !wasQ && huidig ? huidig.id : null;
    },
    _ontvangerNa(wijz) {
      const team = this._teamOrde().map((p) => (wijz && p.id === wijz.id ? Object.assign({}, p, wijz) : p)), act = team.filter((p) => p.actief && this.TEAM_ROLLEN.includes(p.role));
      const k = this._ontvangerVastTe(wijz) || (this.rapportOntvangerKeuze ? this.rapportOntvangerKeuze() : null);
      return act.find((p) => p.id === k) || act.find((p) => p.role === "qhse") || null;
    },
    // waarschuwing vóór het opslaan: verandert hierdoor wie de rapporten krijgt? ("" = niets te melden)
    _gebrOntvangerLet(p, nieuw) {
      if (!this._team || !this._team.length) return "";
      const voor = this._ontvangerNa(null), na = this._ontvangerNa(Object.assign({ id: p.id }, nieuw)), R = "de rapporten (PDF) van afgeronde inspecties";
      if ((voor && voor.id) !== (na && na.id)) {
        if (!na) return `Let op: daarna krijgt niemand meer ${R}${voor ? " (nu " + voor.full_name + ")" : ""}; er is dan geen QHSE-manager. Kies daarna bij “Rapporten mailen naar” een collega.`;
        return voor ? `Let op: ${voor.id === p.id ? p.full_name + " krijgt nu " + R : R + " gaan nu naar " + voor.full_name}. Daarna gaan ze naar ${na.full_name}.`
          : `Daarna gaan ${R} naar ${na.full_name}.`;
      }
      const nQ = this._teamOrde().map((x) => (x.id === p.id ? Object.assign({}, x, nieuw) : x)).filter((x) => x.actief && x.role === "qhse").length;
      if (nieuw.role === "qhse" && p.role !== "qhse" && nQ > 1 && voor) return `Er zijn dan ${nQ} QHSE-managers. ${R[0].toUpperCase() + R.slice(1)} blijven naar ${voor.full_name} gaan; dat wijzig je bij “Rapporten mailen naar”.`;
      // de gekozen ontvanger is geen QHSE-manager meer, maar blijft ze krijgen (een keuze geldt voor de persoon)
      if (na && na.id === p.id && p.role === "qhse" && nieuw.role && nieuw.role !== "qhse")
        return `${p.full_name} blijft ${R} krijgen (zo gekozen bij “Rapporten mailen naar”). Moet dat iemand anders worden, kies dat daar.`;
      return "";
    },
    gebrWijzig(id) {
      const p = (this._team || []).find((x) => x.id === id); if (!p || !magBeheer()) return;
      const { ROL } = window.WPI, zelf = p.id === (this.user && this.user.id);
      this._gebrBevestig = null;
      const opties = (p.role ? "" : `<option value="" selected disabled>Nog geen rol</option>`) + this.TEAM_ROLLEN.map((r) => `<option value="${r}"${p.role === r ? " selected" : ""}>${esc(ROL[r])}</option>`).join("");
      const nieuweLink = !zelf && p.actief && p.role && !p.laatst && p.uitgenodigd !== false;
      this.openModal(p.full_name, (p.functie ? p.functie + " · " : "") + (p.role ? ROL[p.role] : "Nog geen rol") + (p.actief ? "" : " · non-actief"),
        `<form class="bhgebrform" novalidate${op("submit", "gebrOpslaan", p.id)}>
           <label class="flab" for="gw-rol">Rol</label>
           <select id="gw-rol" class="fin"${zelf ? " disabled aria-describedby=\"gw-zelf\"" : ""}>${opties}</select>
           <label class="flab" for="gw-functie">Functie</label>
           <input id="gw-functie" class="fin" maxlength="120" autocomplete="off" value="${esc(p.functie || "")}" placeholder="bijv. Montage Coördinator">
           <div id="gw-let" class="hint bhlet" role="alert" hidden></div>
           <div id="gw-fout" class="fout" role="alert"></div>
           <button class="btn primary" id="gw-knop" type="submit" style="margin-top:8px">Opslaan</button>
         </form>
         ${nieuweLink ? `<div class="bhscheid"></div>
           <button class="btn ghost"${act("gebrNieuweLink", p.id)}>Nieuwe link maken</button>
           <p class="s bhgebruitleg">${esc(p.full_name)} heeft nog niet ingelogd. Werkte de uitnodigingslink niet meer (verlopen)? Maak een nieuwe en deel die opnieuw.</p>` : ""}
         <div class="bhscheid"></div>
         ${zelf ? `<p class="s" id="gw-zelf">${esc(this.ZELF_TEKST)}</p>`
           : p.actief ? `<button class="btn ghost"${act("gebrActiefVraag", p.id, false)}>Op non-actief zetten</button>
             <p class="s bhgebruitleg">Geen toegang meer tot de app${sbAan() ? " (ook het account wordt geblokkeerd)" : ""}. Inspecties, acties en verloop blijven bewaard.</p>`
           : `<button class="btn ghost"${act("gebrActief", p.id, true)}>Weer actief maken</button>`}`);
    },
    async gebrOpslaan(id) {
      const p = (this._team || []).find((x) => x.id === id); if (!p) return;
      const rolIn = $("gw-rol"), fIn = $("gw-functie"), f = $("gw-fout"), fout = (t) => { if (f) f.textContent = t; window.WPI.zeg(t); };
      const nieuw = {}, functie = String(fIn ? fIn.value : "").replace(/\s+/g, " ").trim();
      if (rolIn && !rolIn.disabled && rolIn.value && rolIn.value !== p.role) { if (!this.TEAM_ROLLEN.includes(rolIn.value)) return fout("Kies een rol."); nieuw.role = rolIn.value; }
      if (functie !== (p.functie || "")) { if (functie.length > 120) return fout("De functie is hooguit 120 tekens."); nieuw.functie = functie; }
      if (!Object.keys(nieuw).length) return this.closeModal();
      const nee = this._gebrMagNiet(p, nieuw); if (nee) return fout(nee);
      // verandert hierdoor wie de rapporten krijgt? Eerst melden; nog een keer op "Ja, opslaan" = doorgaan
      const let_ = nieuw.role ? this._gebrOntvangerLet(p, { role: nieuw.role }) : "", sleutelW = JSON.stringify([id, nieuw]);
      if (let_ && this._gebrBevestig !== sleutelW) {
        this._gebrBevestig = sleutelW;
        const l = $("gw-let"), k = $("gw-knop"); if (l) { l.textContent = let_; l.hidden = false; } if (k) k.textContent = "Ja, opslaan";
        if (f) f.textContent = ""; window.WPI.zeg(let_); return;
      }
      const klaar = p.full_name + (nieuw.role ? " is nu " + window.WPI.ROL[nieuw.role] : " heeft een nieuwe functie");
      await this._gebrDoe(p, nieuw, { actie: "wijzig", id, rol: nieuw.role, functie: nieuw.functie }, klaar, fout);
    },
    gebrActiefVraag(id, aan) {
      const p = (this._team || []).find((x) => x.id === id); if (!p) return;
      const nee = this._gebrMagNiet(p, { actief: !!aan }), let_ = nee ? "" : this._gebrOntvangerLet(p, { actief: !!aan });
      this.openModal("Op non-actief zetten?", p.full_name,
        `${nee ? `<div class="hint" role="alert" style="margin-bottom:12px">${esc(nee)}</div>` : `${let_ ? `<div class="hint bhlet" role="alert">${esc(let_)}</div>` : ""}<p class="s" style="line-height:1.45;margin:0 0 12px">${esc(p.full_name)} kan daarna niet meer inloggen${sbAan() ? " (ook het account wordt geblokkeerd)" : ""}. Inspecties, acties en verloop blijven bewaard. Weer actief maken kan altijd.</p>
           <div id="gw-fout" class="fout" role="alert"></div>
           <button class="btn primary"${act("gebrActief", p.id, false)}>Ja, op non-actief</button>`}
         <button class="btn ghost" style="margin-top:10px;width:100%"${act("gebrWijzig", p.id)}>Terug</button>`);
    },
    async gebrActief(id, aan) {
      const p = (this._team || []).find((x) => x.id === id); if (!p) return;
      const f = $("gw-fout"), fout = (t) => { if (f) f.textContent = t; window.WPI.zeg(t); };
      const nee = this._gebrMagNiet(p, { actief: !!aan }); if (nee) return fout(nee);
      await this._gebrDoe(p, { actief: !!aan }, { actie: aan ? "activeer" : "deactiveer", id }, p.full_name + (aan ? " is weer actief" : " staat op non-actief"), fout);
    },
    // één wijziging uitvoeren (server of voorbeeldmodus) en de keuzelijsten van de app (WPI.USERS) bijwerken
    async _gebrDoe(p, nieuw, verzoek, klaar, fout) {
      if (this._gebrBezig) return; this._gebrBezig = true;
      let waarschuwing = "";
      const voor = this.rapportOntvanger ? this.rapportOntvanger() : null;
      try {
        if (sbAan()) {
          const r = await W().sb("/functions/v1/gebruikers", { method: "POST", headers: JS, body: JSON.stringify(verzoek) });
          waarschuwing = r && typeof r.waarschuwing === "string" ? r.waarschuwing.slice(0, 300) : "";
        } else {
          // voorbeeldmodus: dezelfde regel als de server (een tweede QHSE-manager legt de huidige ontvanger vast)
          const vast = this._ontvangerVastTe(Object.assign({ id: p.id }, nieuw));
          const d = this._gebrDemo().find((x) => x.id === p.id); if (d) Object.assign(d, nieuw);
          if (vast && this.rapportOntvangerZet) await this.rapportOntvangerZet(vast);
        }
      } catch (e) {
        this._gebrBezig = false;
        return fout("Niet gewijzigd: " + this._gebrMelding(e));
      }
      this._gebrBezig = false;
      Object.assign(p, nieuw);
      const U = window.WPI.USERS, u = U.find((x) => x.id === p.id);
      if (nieuw.actief === false && u) U.splice(U.indexOf(u), 1);
      else if (u) { if (nieuw.role) u.role = nieuw.role; if (nieuw.functie !== undefined) u.functie = nieuw.functie; }
      else if (p.actief && p.role) U.push({ id: p.id, full_name: p.full_name, role: p.role, functie: p.functie || "" });
      if (!sbAan()) {   // voorbeeldmodus: zelfde volgorde als de accounts (wie het eerst in het team kwam), ook na weer actief maken
        const D = this._gebrDemo(), pos = (x) => { const i = D.findIndex((d) => d.id === x.id); return i < 0 ? 1e6 : i; };
        U.sort((a, b) => pos(a) - pos(b));
      }
      // wie krijgt de rapporten nu? Veranderd = in de melding (nooit stilletjes)
      let na = voor;
      if (this.rapportOntvangerLaad) { try { na = sbAan() ? await this.rapportOntvangerLaad() : this.rapportOntvanger(); } catch (e) {} }
      const ontv = (voor && voor.id) === (na && na.id) ? "" : na ? ". Rapporten gaan nu naar " + na.naam : ". Niemand krijgt nu de rapporten: kies bij “Rapporten mailen naar” een collega";
      this.closeModal(); this.toast = klaar + ontv + (waarschuwing ? ". " + waarschuwing : "");
      this._team = null; this.route();
    },
    _gebrMelding(e) {
      const m = e && typeof e.message === "string" ? e.message : "";
      if (e && !e.status) return "geen verbinding met de server. Probeer het zo opnieuw.";
      if (m && !/^HTTP \d+$/.test(m) && !/row-level|permission|violates|JWT/i.test(m)) return m.slice(0, 240);
      return e && e.status === 403 ? "geen rechten (tweestapsverificatie nodig?)." : "de server weigerde het (code " + (e && e.status) + ").";
    },
    // alleen een https-link (of http naar deze computer, voor de lokale test-backend)
    _gebrGeldigeLink(l) { return typeof l === "string" && (/^https:\/\//.test(l) || /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(l)) ? l : ""; },
    _gebrGeldigTot(t) { const d = Date.parse(t); return Number.isFinite(d) && d > Date.now() - 60000 && d < Date.now() + 2 * 86400000 ? new Date(d).toISOString() : null; },
    // ---- uitnodigen ----
    gebrUitnodigen() {
      if (!magBeheer()) return;
      const { ROL } = window.WPI;
      this.openModal("Gebruiker uitnodigen", "Je krijgt een persoonlijke link om zelf te delen; er wordt geen e-mail verstuurd.",
        `<form class="bhgebrform" novalidate${op("submit", "gebrUitnodigingMaak")}>
           <label class="flab" for="gu-mail">E-mailadres</label>
           <input id="gu-mail" class="fin" type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" required>
           <label class="flab" for="gu-naam">Volledige naam</label>
           <input id="gu-naam" class="fin" autocomplete="off" maxlength="120" required>
           <label class="flab" for="gu-rol">Rol</label>
           <select id="gu-rol" class="fin" required><option value="">Kies…</option>${this.TEAM_ROLLEN.map((r) => `<option value="${r}">${esc(ROL[r])}</option>`).join("")}</select>
           <label class="flab" for="gu-functie">Functie</label>
           <input id="gu-functie" class="fin" autocomplete="off" maxlength="120" placeholder="bijv. Montage Coördinator">
           <div id="gu-fout" class="fout" role="alert"></div>
           <button class="btn primary" id="gu-knop" type="submit" style="margin-top:8px">Uitnodiging maken</button>
         </form>
         <p class="s bhregels">Inspecteren doen de hoofden en de coördinatoren. De QHSE-manager en de beheerder kijken overal mee en beheren, maar inspecteren niet.</p>`);
      const i = $("gu-mail"); if (i) i.focus();
    },
    async gebrUitnodigingMaak() {
      if (!magBeheer() || this._gebrBezig) return;
      const v = (id) => String(($(id) || {}).value || "").replace(/\s+/g, " ").trim();
      const email = v("gu-mail").toLowerCase(), naam = v("gu-naam"), rol = v("gu-rol"), functie = v("gu-functie");
      const f = $("gu-fout"), fout = (t, veld) => { if (f) f.textContent = t; window.WPI.zeg(t); const x = veld && $(veld); if (x) { x.setAttribute("aria-invalid", "true"); x.setAttribute("aria-describedby", "gu-fout"); x.focus(); } };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return fout("Vul een geldig e-mailadres in.", "gu-mail");
      if (!sleutel(naam) || naam.length > 120) return fout("Vul de volledige naam in (hooguit 120 tekens).", "gu-naam");
      if (!this.TEAM_ROLLEN.includes(rol)) return fout("Kies een rol: hoofd, coördinator, QHSE-manager of beheerder.", "gu-rol");
      if (functie.length > 120) return fout("De functie is hooguit 120 tekens.", "gu-functie");
      if (!this._team) await this.teamLaad();
      if ((this._team || []).some((p) => sleutel(p.full_name) === sleutel(naam))) return fout("Er staat al een collega met (bijna) dezelfde naam in de lijst.", "gu-naam");
      let link = "", tot = null, demo = !sbAan();
      this._gebrBezig = true; const k = $("gu-knop"); if (k) { k.disabled = true; k.textContent = "Bezig…"; }
      try {
        if (demo) {
          // voorbeeldmodus: alleen in het geheugen (na herladen weg), met een duidelijk nep-link
          const id = "u-nieuw-" + Date.now().toString(36), D = this._gebrDemo();
          if (D.some((p) => p.email === email)) throw { status: 409, message: "Er bestaat al een account met dit e-mailadres. Staat er “Nog niet ingelogd”? Kies dan Wijzig › Nieuwe link maken." };
          D.push({ id, email, full_name: naam, functie, role: rol, actief: true, uitgenodigd: true, laatst: null, sinds: String(1000 + D.length) });
          window.WPI.USERS.push({ id, full_name: naam, role: rol, functie });
          link = this._gebrDemoLink(); tot = new Date(Date.now() + 3600 * 1000).toISOString();
        } else {
          const r = await W().sb("/functions/v1/uitnodigen", { method: "POST", headers: JS, body: JSON.stringify({ email, naam, rol, functie }) });
          link = this._gebrGeldigeLink(r && r.link); tot = this._gebrGeldigTot(r && r.geldig_tot);
          if (!link) throw { status: 502, message: "De server gaf geen geldige link terug." };
        }
      } catch (e) {
        this._gebrBezig = false; if (k) { k.disabled = false; k.textContent = "Uitnodiging maken"; }
        return fout("Niet uitgenodigd: " + this._gebrMelding(e));
      }
      this._gebrBezig = false; this._team = null;
      this._uitnodiging = { email, naam, link, demo, geldigTot: tot };
      this.gebrLinkToon();
      if (this._page === "beheer") this.teamLaad();
    },
    _gebrDemoLink() { return "https://werkplekinspectie.voorbeeld/#demo-uitnodiging-" + Math.random().toString(36).slice(2, 10); },
    // een verlopen uitnodiging: nieuwe link (alleen voor wie nog nooit inlogde; de functie "gebruikers" controleert dat)
    async gebrNieuweLink(id) {
      const p = (this._team || []).find((x) => x.id === id); if (!p || !magBeheer() || this._gebrBezig) return;
      const demo = !sbAan();
      let link = "", tot = null, email = p.email || "";
      this._gebrBezig = true;
      try {
        if (demo) { link = this._gebrDemoLink(); tot = new Date(Date.now() + 3600 * 1000).toISOString(); }
        else {
          const r = await W().sb("/functions/v1/gebruikers", { method: "POST", headers: JS, body: JSON.stringify({ actie: "nieuwe_link", id }) });
          link = this._gebrGeldigeLink(r && r.link); tot = this._gebrGeldigTot(r && r.geldig_tot);
          email = r && typeof r.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email) ? r.email.slice(0, 200) : "";
          if (!link) throw { status: 502, message: "De server gaf geen geldige link terug." };
        }
      } catch (e) {
        this._gebrBezig = false;
        const t = "Geen nieuwe link: " + this._gebrMelding(e), f = $("gw-fout"); if (f) f.textContent = t; window.WPI.zeg(t); return;
      }
      this._gebrBezig = false;
      this._uitnodiging = { email, naam: p.full_name, link, demo, geldigTot: tot, nieuw: true };
      this.gebrLinkToon();
    },
    gebrLinkToon() {
      const u = this._uitnodiging; if (!u) return;
      const d = u.geldigTot ? new Date(u.geldigTot) : null, ok = d && !isNaN(d.getTime());
      const vandaag = ok && d.toDateString() === new Date().toDateString();
      const tot = ok ? d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) + (vandaag ? "" : " op " + d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })) : "";
      const onderwerp = "Uitnodiging Werkplekinspectie";
      const tekst = "Hallo,\n\nJe bent uitgenodigd voor de app Werkplekinspectie. Open deze persoonlijke link en kies daarna je wachtwoord:\n\n" + u.link
        + "\n\nDe link is alleen voor jou en werkt " + (tot ? "tot " + tot : "maar korte tijd") + ". Werkt hij niet meer, vraag dan om een nieuwe link.\n\nGroet";
      const mailto = "mailto:" + encodeURIComponent(u.email || "") + "?subject=" + encodeURIComponent(onderwerp) + "&body=" + encodeURIComponent(tekst);
      this.openModal(u.nieuw ? "Nieuwe link klaar" : "Uitnodiging klaar", u.naam + (u.email ? " · " + u.email : ""),
        `${u.demo ? `<div class="hint bhdemolink" role="note"><b>Demo — er wordt niets verstuurd.</b> Deze link is nep en werkt niet; in de echte app staat hier een persoonlijke link.</div>` : ""}
         <p class="s bhgebruitleg">Persoonlijke link${tot ? `, geldig tot <b>${esc(tot)}</b>` : ""}: deel hem alleen met deze collega. Verlopen? Kies bij deze collega Wijzig › Nieuwe link maken.</p>
         <label class="flab" for="gu-link">${u.nieuw ? "Nieuwe link" : "Uitnodigingslink"}</label>
         <input id="gu-link" class="fin bhlinkveld" readonly value="${esc(u.link)}">
         <div class="bhlinkknoppen">
           <button class="btn primary" id="gu-kopieer"${act("gebrKopieer")}>Kopieer link</button>
           <a class="btn ghost" href="${esc(mailto)}">Mail de link</a>
         </div>
         <div id="gu-gekopieerd" class="s" role="status"></div>`);
    },
    async gebrKopieer() {
      const u = this._uitnodiging, i = $("gu-link"), s = $("gu-gekopieerd"); if (!u) return;
      let gelukt = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(u.link); gelukt = true; } } catch (e) {}
      if (!gelukt && i) { try { i.select(); gelukt = document.execCommand("copy"); } catch (e) {} }
      const t = gelukt ? "✓ Link gekopieerd" : "Kopiëren lukte niet: selecteer de link en kopieer hem zelf.";
      if (s) s.textContent = t; window.WPI.zeg(t);
      if (!gelukt && i) { i.focus(); i.select(); }
    },

    // ---------------- Vandaag voor wie niet inspecteert (QHSE-manager, beheerder) ----------------
    view_overzicht() {
      const { isoDag, dagLabel, kort } = window.WPI;
      const v = $("view"), vn = this.user.full_name.split(" ")[0], u = new Date().getHours();
      const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
      const datum = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
      v.appendChild(el(`<div class="vkop"><div class="hi">${groet} ${esc(vn)} · ${esc(datum)}</div><h1 class="groot">Overzicht van het team</h1></div>`));
      v.appendChild(el(`<p class="s bhoverzicht">Je kijkt mee met alle inspecties, acties en de planning${magBeheer() ? " en beheert het team" : ""}. Inspecteren doen de hoofden en de coördinatoren.</p>`));
      const plan = el(`<div class="vplan"></div>`), acties = el(`<div class="bhteamacties"></div>`), meer = el(`<div class="vmeer"></div>`);
      const grid = el(`<div class="vgrid"><div class="vlinks"></div><div class="vrechts"></div></div>`); v.appendChild(grid);   // groot scherm: twee kolommen (styles.css)
      grid.firstElementChild.appendChild(plan); grid.lastElementChild.appendChild(acties); grid.lastElementChild.appendChild(meer);
      this.laadPlanning().then(() => {
        if (!document.body.contains(plan)) return;
        const vandaag = isoDag(new Date()), P = (this.planning || []).filter((p) => p.status === "gepland" && p.datum);
        const nu = P.filter((p) => p.datum === vandaag), gemist = P.filter((p) => p.datum < vandaag);
        const r = (p) => `<div class="vrij"><span class="grow"><span class="k">${p.datum < vandaag ? `<span class="nogte">Nog niet gedaan · ${esc(dagLabel(p.datum))}</span>` : "Vandaag"}${p.project ? " · " + esc(p.project) : ""}</span>
          <span class="t">${esc(this.productNaam(p.code))}</span><span class="meta"><span>${window.WPI.inspLabel(p.inspecteur)}</span>${p.locatie ? `<span>${esc(p.locatie)}</span>` : ""}</span></span></div>`;
        plan.innerHTML = `<h2 class="vsectie">Inspecties vandaag</h2>` + (nu.length || gemist.length
          ? `<div class="listcard vlijst">${gemist.concat(nu).slice(0, 8).map(r).join("")}</div>`
          : `<div class="listcard vlijst"><div class="vrij"><span class="grow"><span class="t">Niets gepland vandaag</span></span></div></div>`);
        // groot scherm: ook wat er binnenkort gepland staat (zelfde blok als op Vandaag), zodat de linkerkolom niet leeg blijft
        if (window.matchMedia("(min-width: 1100px)").matches) { const bk = el(`<div class="vbinnen alleenbreed"></div>`); plan.appendChild(bk); this.vandaagBinnenkort(bk, vandaag); }
      });
      this.laadActies().then(() => {
        if (!document.body.contains(acties)) return;
        const B = this.bakjes(), nToets = B.toetsen.length;
        const knop = (f, n, t, s, warm) => `<button class="vknop${warm && n ? " laat" : ""}"${act("naarActies", f)}><span class="nr${n ? "" : " nul"}">${n || svg("check", 18, 2.6)}</span><span class="grow"><span class="t">${esc(t)}</span><span class="s">${esc(s)}</span></span>${svg("chev", 18)}</button>`;
        acties.innerHTML = `<h2 class="vsectie">Acties van het team</h2><div class="listcard vlijst">
          ${knop("telaat", B.telaat.length, B.telaat.length === 1 ? "Actie te laat" : "Acties te laat", B.telaat.length ? kort(B.telaat.map((a) => a.tekst || "").join(" · "), 60) : "Alles ligt op schema", true)}
          ${nToets || window.WPI.mag("toetser") ? knop("toetsen", nToets, "Te toetsen door jou", nToets ? "Klaar gemeld; jij bent de toetser" : "Er wacht niets op jouw toetsing") : ""}
          ${knop("instellen", B.instellen.length, "In te stellen", B.instellen.length ? "Voorstellen uit inspecties" : "Alles is ingesteld")}
          ${knop("gepland", B.gepland.length, "Lopend", "Open en in uitvoering, hele team")}</div>`;
      });
      const web = isWeb();
      meer.innerHTML = `<h2 class="vsectie">Meer</h2><div class="listcard vlijst">
        ${web ? `<button class="vknop"${act("go", "dashboard")}><span class="cirkel">${svg("chart", 20)}</span><span class="grow"><span class="t">Dashboard</span></span>${svg("chev", 18)}</button>
        <button class="vknop"${act("go", "kwartaal")}><span class="cirkel">${svg("doc", 20)}</span><span class="grow"><span class="t">Rapportage</span></span>${svg("chev", 18)}</button>` : ""}
        <button class="vknop"${act("go", "inspecties")}><span class="cirkel">${svg("list", 20)}</span><span class="grow"><span class="t">Alle inspecties</span></span>${svg("chev", 18)}</button>
        <button class="vknop"${act("go", "beheer")}><span class="cirkel">${svg("tand", 20)}</span><span class="grow"><span class="t">Beheer</span><span class="s">${magBeheer() ? BEHEER_SUB : "Monteurs"}</span></span>${svg("chev", 18)}</button></div>`;
    },

    view_beheer() {
      if (!magMonteurs()) return this.go("vandaag");   // rechten: js/kern.js (de server dwingt hetzelfde af)
      const beheer = magBeheer();
      // de hele pagina in één benoemd gebied (landmark), zodat een schermlezer er direct naartoe kan
      const v = el(`<section class="bhpagina" aria-labelledby="bh-titel"></section>`); $("view").appendChild(v);
      const actieven = this.monteursLijst(), ina = this.monteursInactief(), doel = this.doelConform ? this.doelConform() : null, b = this._beheer || {};
      v.appendChild(el(`<div><div class="hi">${beheer ? esc(BEHEER_SUB) : "Monteurs"}</div><h1 class="groot" id="bh-titel">Beheer</h1></div>`));
      if (this.toast) { v.appendChild(el(`<div class="toast" style="margin:-6px 0 12px">✓ ${esc(this.toast)}</div>`)); window.WPI.zeg(this.toast); this.toast = null; }
      let sf = null; try { sf = JSON.parse(localStorage.getItem(K_SYNCFOUT) || "null"); } catch (e) {}
      if (sf && sf.tekst) v.appendChild(el(`<div class="hint bhsyncfout" role="status">Een wijziging is niet op de server bewaard: ${esc(sf.tekst)}. Hier zie je weer wat er op de server staat. <button class="bhlink"${act("beheerFoutWeg")}>Begrepen</button></div>`));
      const rij = (n, i, actief) => actief && b.hernoem === n
        ? `<div class="row bhrij bewerk"><input id="bh-hernoem" class="fin" value="${esc(b.hernoemWaarde != null ? b.hernoemWaarde : n)}" aria-label="Naam van ${esc(n)}"${op("enter", "beheerHernoem", i)}${op("escape", "beheerAnnuleer")}>
            <div class="bhbew"><button class="btn primary sm"${act("beheerHernoem", i)}>Opslaan</button><button class="btn ghost sm"${act("beheerAnnuleer")}>Annuleren</button></div>
            <button class="bhlink"${act("beheerActief", i, false)}>Op non-actief zetten <span>· niet meer te kiezen, oude inspecties houden de naam</span></button></div>`
        : `<div class="row bhrij${actief ? "" : " uit"}"><span class="mini-av">${esc(n[0] || "?")}</span><span class="grow"><span class="t">${esc(n)}</span></span>
            ${actief ? `<button class="bhknop"${act("beheerBewerk", i)}>Wijzig<span class="bhvh"> ${esc(n)}: hernoemen of op non-actief zetten</span></button>`
              : `<button class="bhknop"${act("beheerActief", i, true)}>Weer actief</button>`}</div>`;
      const teamHtml = beheer ? this._bhGebrKaart() : "";
      // Gebruikers eerst (de hoofdtaak; op de telefoon bovenaan, op een groot scherm de linkerkolom), daarna monteurs,
      // doel en rapporten onder elkaar (rechterkolom). Volgorde in de DOM = volgorde op het scherm.
      v.appendChild(el(`<div class="bhgrid${beheer ? "" : " enkel"}">${teamHtml}<div class="bhkol">
        <section class="card bhkaart" id="bh-monteurs">
          <h2 class="bhkop">Monteurs <span class="sub">${actieven.length} actief</span></h2>
          <p class="s bhuitleg">Uit deze lijst kiest de inspecteur wie er aan het werk was.</p>
          <div class="bhtoevoeg"><input id="bh-nieuw" class="fin" aria-label="Naam van de monteur" placeholder="Naam van de monteur" autocomplete="off" maxlength="80" value="${esc(b.nieuw || "")}"${op("enter", "beheerToevoegen")}>
            <button class="btn primary sm"${act("beheerToevoegen")}>${svg("plus", 16)} Toevoegen</button></div>
          <div id="bh-fout" class="fout">${esc(b.fout || "")}</div>
          <div class="bhlijst">${actieven.length ? actieven.map((n, i) => rij(n, i, true)).join("") : `<div class="s" style="padding:12px 0">Nog geen actieve monteurs.</div>`}</div>
          ${ina.length ? `<div class="bhsub">Non-actief</div><div class="bhlijst">${ina.map((n, i) => rij(n, i, false)).join("")}</div>` : ""}
        </section>
        ${beheer ? "" : `<section class="card bhkaart bhrecent" id="bh-recent" aria-labelledby="bh-recent-t">
          <div class="bhkopregel"><h2 class="bhkop" id="bh-recent-t">Laatst bij inspecties</h2><button class="bhlink bhalle"${act("go", "inspecties")}>Alle inspecties ›</button></div>
          <p class="s bhuitleg">Wie er bij de laatste inspecties aan het werk was. Zo zie je of de namen in de lijst kloppen.</p>
          <ul class="bhrecentlijst" id="bh-recentlijst"><li class="s">Laden…</li></ul>
        </section>`}
        ${beheer ? "" : `<section class="card bhkaart bhinfo" aria-labelledby="bh-info-t">
          <h2 class="bhkop" id="bh-info-t">Zo werkt de lijst</h2>
          <ol class="bhstappen">
            <li><b>Bij de inspectie</b><span>Bij het gesprek met de monteurs tik je aan wie er aan het werk was.</span></li>
            <li><b>Alleen de naam</b><span>Om inspecties terug te vinden (filter op Inspecties). Nooit een score of beoordeling per persoon.</span></li>
            <li><b>Iemand weg?</b><span>Zet hem op non-actief: niet meer te kiezen, oude inspecties houden de naam.</span></li>
          </ol>
        </section>`}
        ${beheer ? `<section class="card bhkaart" id="bh-doel">
          <h2 class="bhkop">Doel % conform</h2>
          <p class="s bhuitleg">Zie je terug in de trendgrafieken. Standaard 85%. Leeg laten is geen doel.</p>
          <div class="bhdoel"><input id="bh-doel-in" class="fin" type="text" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="bijv. 85" value="${esc(b.doelWaarde != null ? b.doelWaarde : doel != null ? doel : "")}" aria-label="Doel procent conform"${op("enter", "beheerDoel")}><span class="bhpct">%</span>
            <button class="btn primary sm"${act("beheerDoel")}>Opslaan</button></div>
          <div id="bh-doel-fout" class="fout">${esc(b.doelFout || "")}</div>
          <div class="s bhstand">${doel != null ? `Huidig doel: <b>${doel}% conform</b>` : "Er is nu geen doel ingesteld."}</div>
        </section>${this._bhOntvangerKaart()}` : ""}</div></div>`));
      if (beheer && !this._team) this.teamLaad();
      if (!beheer) this._bhRecent();
      v.appendChild(el(`<p class="s bhdeel">${esc(this._bhStand())}</p>`));
      this._beheer = { hernoem: b.hernoem };
      if (b.hernoem) { const i = $("bh-hernoem"); if (i) { i.focus(); i.select(); } }
      this.beheerSync();                                                // nieuwste stand van de server (max. elke 5 min)
    },
    // coördinator: de laatste inspecties met hun monteurs (zelfde bron als Inspecties; alleen namen, nooit een score)
    async _bhRecent() {
      const nr = this._routeNr; let rijen = [];
      try { rijen = this.inspRijen ? await this.inspRijen(false) : []; } catch (e) {}
      const doos = $("bh-recentlijst"); if (!doos || nr !== this._routeNr) return;
      const lijst = rijen.filter((r) => (r.monteurs || []).length).slice(0, 6);
      doos.innerHTML = lijst.length ? lijst.map((r) => `<li class="bhrecentrij"><span class="dchip">${svg("cal", 14)}${esc(window.WPI.dagLabel(r.datum))}</span>
          <span class="grow"><span class="t">${esc(r.titel)}</span><span class="bhmonteurs">${r.monteurs.map((n) => `<span class="mchip">${esc(n)}</span>`).join("")}</span></span></li>`).join("")
        : `<li class="s">Nog geen inspecties met monteurs.</li>`;
    },
    // kaart "Gebruikers" (alleen met het recht beheer); rechterkolom van .bhgrid op een groot scherm
    _bhGebrKaart() {
      return `<section class="card bhkaart bhteam" id="bh-gebruikers" aria-labelledby="bh-gebr-kop">
        <div class="bhkopregel"><h2 class="bhkop" id="bh-gebr-kop">Gebruikers <span class="sub" id="bh-gebr-n">${esc(this._gebrAantal())}</span></h2>
          <button class="btn primary sm bhuitnodigknop"${act("gebrUitnodigen")}>${svg("plus", 16)} Gebruiker uitnodigen</button></div>
        <p class="s bhuitleg">Rol, functie en toegang per collega.</p>
        <div id="bh-gebr-fout" class="fout" role="alert">${esc(this._teamFout || "")}</div>
        <div class="bhlijst" id="bh-gebrlijst">${this._gebrHtml()}</div>
        <p class="s bhregels">Inspecteren en plannen: de hoofden en de coördinatoren. Actiehouder: een hoofd of coördinator. Toetser: een hoofd, coördinator of de QHSE-manager, nooit de actiehouder. De QHSE-manager en de beheerder kijken overal mee en beheren, maar inspecteren niet.</p>
        ${sbAan() ? "" : `<p class="s bhregels bhdemo">Voorbeeldmodus: wijzigingen en uitnodigingen gelden alleen in dit venster; er wordt niets verstuurd.</p>`}
      </section>`;
    },
    // kaart "Rapporten mailen naar" (alleen met het recht beheer). Eerste keuze = de standaard (de QHSE-manager; zijn er
    // meer, de eerste die in het team kwam), daarna de andere actieve collega's met hun rol (kort, past op de telefoon).
    _bhOntvangerKaart() {
      const { ROL, USERS } = window.WPI, nu = this.rapportOntvanger ? this.rapportOntvanger() : null, keuze = this.rapportOntvangerKeuze ? this.rapportOntvangerKeuze() : null;
      // alleen actieve collega's met een rol van nu (= public.mag_rapport_ontvangen; nooit de oude rol "inspecteur")
      const team = (this._team && this._team.length ? this._teamOrde() : USERS).filter((u) => u.actief !== false && this.TEAM_ROLLEN.includes(u.role));
      const qhse = team.filter((u) => u.role === "qhse"), standaard = qhse[0] || null;
      const gekozen = keuze && team.some((u) => u.id === keuze) && !(standaard && keuze === standaard.id) ? keuze : "";
      const opties = `<option value="">${esc(standaard ? standaard.full_name + " (standaard)" : "Niemand (geen QHSE-manager)")}</option>`
        + team.filter((u) => !standaard || u.id !== standaard.id).map((u) => `<option value="${esc(u.id)}"${u.id === gekozen ? " selected" : ""}>${esc(u.full_name)} · ${esc(ROL[u.role] || "")}</option>`).join("");
      const uitleg = !nu ? "Nu: <b>niemand</b>. Er is geen QHSE-manager in het team; kies hierboven een collega."
        : `Nu: <b>${esc(nu.naam)}</b>` + (gekozen && nu.id === gekozen ? "" : qhse.length > 1 && standaard && nu.id === standaard.id ? ` · standaard: de eerste van de ${qhse.length} QHSE-managers` : standaard && nu.id === standaard.id ? " · standaard: de QHSE-manager" : "");
      return `<section class="card bhkaart" id="bh-rapport">
        <h2 class="bhkop">Rapporten mailen naar</h2>
        <p class="s bhuitleg">Het rapport (PDF) van elke afgeronde inspectie gaat naar:</p>
        <div class="bhdoel bhontvanger"><select id="bh-ontvanger" class="fin" aria-label="Rapporten mailen naar" aria-describedby="bh-ontvnu">${opties}</select>
          <button class="btn primary sm"${act("beheerOntvanger")}>Opslaan</button></div>
        <div id="bh-ontvanger-fout" class="fout" role="alert"></div>
        <div class="s bhontvnu" id="bh-ontvnu">${uitleg}</div>
        <p class="s bhregels">${sbAan() ? "Versturen begint zodra de mailbox is ingericht; tot dan wachten de rapporten veilig op de server. Gaat de ontvanger op non-actief, dan gaan wachtende rapporten naar de nieuwe ontvanger." : "Voorbeeldmodus: er wordt niets gemaild."}</p>
      </section>`;
    },
    async beheerOntvanger() {
      if (!magBeheer() || !this.rapportOntvangerZet) return;
      const s = $("bh-ontvanger"), f = $("bh-ontvanger-fout"), id = s && s.value ? s.value : null;
      try { const r = await this.rapportOntvangerZet(id); this.toast = r ? "Rapporten gaan naar " + r.naam : "Niemand krijgt de rapporten: er is geen QHSE-manager. Kies een collega"; tril(20); this.route(); }
      catch (e) { const t = "Niet opgeslagen: " + String((e && e.message) || "onbekende fout").slice(0, 200); if (f) f.textContent = t; window.WPI.zeg(t); }
    },
    // fout tonen zonder wat er getypt is kwijt te raken
    _beheerFout(t, k) {
      const w = (id) => { const i = $(id); return i ? i.value : undefined; };
      const hernoem = !k && !!$("bh-hernoem");
      this._beheer = Object.assign({}, this._beheer, { [k || "fout"]: t, nieuw: w("bh-nieuw"), hernoemWaarde: w("bh-hernoem"), doelWaarde: w("bh-doel-in") });
      this.route();
      // het scherm is opnieuw getekend: melding voorlezen, veld als ongeldig markeren (gekoppeld aan de melding) en focussen
      const veld = $(k === "doelFout" ? "bh-doel-in" : hernoem ? "bh-hernoem" : "bh-nieuw");
      if (veld) { veld.setAttribute("aria-invalid", "true"); veld.setAttribute("aria-describedby", k === "doelFout" ? "bh-doel-fout" : "bh-fout"); try { veld.focus(); } catch (e) {} }
      window.WPI.zeg(t);
    },
    beheerToevoegen() {
      if (!magMonteurs()) return;
      const i = $("bh-nieuw"), n = schoon(i && i.value);
      if (!sleutel(n)) return this._beheerFout("Vul een naam in.");
      if (n.length > 60) return this._beheerFout("Een naam is hooguit 60 tekens.");
      const dubbel = this._bestaat(n);
      const act = this.monteursLijst(), ina = this.monteursInactief();
      if (dubbel) {
        if (ina.includes(dubbel)) { this._beheerBewaar(act.concat([dubbel]), ina.filter((x) => x !== dubbel)); this._bhWacht({ op: "actief", naam: dubbel, aan: true }); this._beheer = {}; this.toast = `${dubbel} staat weer op actief`; tril(20); return this.route(); }
        return this._beheerFout(`“${dubbel}” staat al in de lijst.`);
      }
      this._beheerBewaar(act.concat([n]), ina); this._bhWacht({ op: "nieuw", naam: n }); this._beheer = {}; this.toast = `${n} toegevoegd`; tril(20); this.route();
    },
    beheerBewerk(i) { if (!magMonteurs()) return; const n = this.monteursLijst()[i]; if (!n) return; this._beheer = { hernoem: n }; this.route(); },
    beheerAnnuleer() { this._beheer = {}; this.route(); },
    beheerFoutWeg() { try { localStorage.removeItem(K_SYNCFOUT); } catch (e) {} this.route(); },
    beheerHernoem(i) {
      if (!magMonteurs()) return;
      const act = this.monteursLijst(), oud = act[i], inp = $("bh-hernoem"), n = schoon(inp && inp.value);
      if (!oud) return this.beheerAnnuleer();
      if (!sleutel(n)) return this._beheerFout("Vul een naam in.");
      if (n.length > 60) return this._beheerFout("Een naam is hooguit 60 tekens.");
      const dubbel = this._bestaat(n, oud);
      if (dubbel) return this._beheerFout(this.monteursInactief().includes(dubbel)
        ? `“${dubbel}” staat bij Non-actief. Zet die naam daar weer op actief.` : `“${dubbel}” staat al in de lijst.`);
      act[i] = n; this._beheerBewaar(act, this.monteursInactief()); if (n !== oud) this._bhWacht({ op: "hernoem", van: oud, naar: n }); this._beheer = {};
      this.toast = n === oud ? "Niets gewijzigd" : `${oud} heet nu ${n}`; tril(20); this.route();
    },
    beheerActief(i, aan) {
      if (!magMonteurs()) return;
      const act = this.monteursLijst(), ina = this.monteursInactief();
      if (aan) { const n = ina[i]; if (!n) return; this._beheerBewaar(act.concat([n]), ina.filter((x) => x !== n)); this._bhWacht({ op: "actief", naam: n, aan: true }); this.toast = `${n} staat weer op actief`; }
      else { const n = act[i]; if (!n) return; this._beheerBewaar(act.filter((x) => x !== n), ina.concat([n])); this._bhWacht({ op: "actief", naam: n, aan: false }); this.toast = `${n} staat op non-actief`; }
      this._beheer = {}; tril(15); this.route();
    },
    beheerDoel() {
      if (!magBeheer()) return;
      const i = $("bh-doel-in"), fout = "Vul een getal tussen 1 en 100 in, of laat het leeg voor geen doel.";
      // iets getypt dat geen getal is (bijv. "8e", een los "%", "7 0"): nooit stilletjes het doel weghalen of raden
      if (!i || (i.validity && i.validity.badInput)) return this._beheerFout(fout, "doelFout");
      const getypt = String(i.value || "").trim();
      // leeg = bewust geen doel ("" bewaren: zonder waarde geldt de standaard van 85)
      if (!getypt) { try { localStorage.setItem(K_DOEL, ""); } catch (e) {} this._bhWacht({ op: "doel", waarde: null }); this._beheer = {}; this.toast = "Geen doel meer ingesteld"; return this.route(); }
      const raw = getypt.replace(/\s*%$/, "");   // "85 %" en "85%" mogen; spaties tússen cijfers niet
      // alleen hele getallen; "085", "0085", "85,0" en "70.00" zijn 85/70. "1.000" kan duizend betekenen: melding.
      // "85,5" of "0,6" geven een melding (nooit stilletjes afronden)
      const m = /^0*(\d{1,3})(?:[.,]0{1,2})?$/.exec(raw), n = m ? parseInt(m[1], 10) : NaN;
      if (!m && /^\d+[.,]\d{1,2}$/.test(raw)) return this._beheerFout("Vul een heel getal in, zonder komma (bijv. 85).", "doelFout");
      if (!(n >= 1 && n <= 100)) return this._beheerFout(fout, "doelFout");
      try { localStorage.setItem(K_DOEL, String(n)); } catch (e) {}
      this._bhWacht({ op: "doel", waarde: n });
      this._beheer = {}; this.toast = `Doel ingesteld: ${n}% conform`; tril(20); this.route();
    },
  });
})();
