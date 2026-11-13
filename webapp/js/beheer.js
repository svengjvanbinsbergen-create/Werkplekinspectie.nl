/* Werkplekinspectie — js/beheer.js
   Beheer (telefoon en web), per recht (js/kern.js, RECHTEN):
   - monteurslijst: iedereen in het team (hoofden, coördinatoren, QHSE-manager, beheerder);
   - team en rollen en het doel % conform: de beheerrollen (hoofden, QHSE-manager, beheerder);
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
      if (!W().sbActief || !W().sbActief()) return "Voorbeeldmodus: deze lijst en het doel staan alleen op dit toestel.";
      if (this._bhWachtEigen().length) return "Nog niet gedeeld: wordt verstuurd zodra er verbinding is.";
      return "Gedeeld met het team: elke inspecteur ziet deze lijst, het dashboard en de rapportage tonen dit doel.";
    },
    // ---------------- team en rollen (alleen de beheerrollen) ----------------
    // Met backend: public.profiles (RLS: de beheerrollen zien ook nieuw uitgenodigde profielen zonder rol). Een rol of
    // activering wijzigen = PATCH; de server bewaakt alles (0008: geen rol "inspecteur", niemand wijzigt zijn eigen rol,
    // minstens één actief hoofd, QHSE-manager/beheerder nooit actiehouder, MFA). Voorbeeldmodus: alleen bekijken.
    TEAM_ROLLEN: ["hoofd", "coordinator", "qhse", "beheerder"],   // nooit "inspecteur" (bestaat alleen nog in de database)
    async teamLaad() {
      if (!sbAan() || !magBeheer()) return;
      try {
        const r = await W().sb("/rest/v1/profiles?select=id,full_name,functie,role,actief&order=full_name.asc");
        this._team = (Array.isArray(r) ? r : []).filter((p) => p && typeof p.id === "string" && typeof p.full_name === "string")
          .map((p) => ({ id: p.id, full_name: p.full_name.slice(0, 120), functie: typeof p.functie === "string" ? p.functie.slice(0, 120) : "", role: typeof p.role === "string" ? p.role : null, actief: p.actief !== false }));
        this._teamFout = "";
      } catch (e) { this._teamFout = e && e.status === 403 ? "De server gaf de teamlijst niet (tweestapsverificatie nodig?)." : "De teamlijst kon niet worden geladen. Probeer het zo opnieuw."; }
      const box = $("bh-teamlijst"); if (box && this._page === "beheer") { box.innerHTML = this._teamHtml(); const f = $("bh-team-fout"); if (f) f.textContent = this._teamFout || ""; }
    },
    _teamHtml() {
      const { ROL } = window.WPI, me = this.user && this.user.id, echt = sbAan();
      const lijst = echt ? (this._team || []) : window.WPI.USERS.map((u) => Object.assign({ actief: true }, u));
      if (echt && !this._team) return `<div class="s" style="padding:12px 0">Teamlijst laden…</div>`;
      if (!lijst.length) return `<div class="s" style="padding:12px 0">Nog niemand in het team.</div>`;
      const rij = (p) => {
        const zelf = p.id === me, rolTekst = p.role && ROL[p.role] ? ROL[p.role] : "Nog geen rol";
        const keuze = echt && !zelf
          ? `<select class="fin bhrol" aria-label="Rol van ${esc(p.full_name)}"${op("change", "teamRol", p.id, WAARDE)}>
              ${p.role && ROL[p.role] ? "" : `<option value="" selected disabled>Nog geen rol</option>`}
              ${this.TEAM_ROLLEN.map((r) => `<option value="${r}"${p.role === r ? " selected" : ""}>${esc(ROL[r])}</option>`).join("")}</select>`
          : `<span class="bhroltekst">${esc(rolTekst)}${zelf ? " · jij" : ""}</span>`;
        return `<div class="row bhrij bhteamrij${p.actief ? "" : " uit"}"><span class="mini-av">${esc(p.full_name[0] || "?")}</span>
          <span class="grow"><span class="t">${esc(p.full_name)}</span><span class="s bhfunctie">${esc(p.functie || "")}${p.actief ? "" : (p.functie ? " · " : "") + "non-actief"}</span></span>
          <span class="bhrolvak">${keuze}${echt && !zelf ? `<button class="bhknop"${act("teamActief", p.id, !p.actief)}>${p.actief ? "Op non-actief" : "Weer actief"}<span class="bhvh"> ${esc(p.full_name)}</span></button>` : ""}</span></div>`;
      };
      return lijst.map(rij).join("");
    },
    async _teamPatch(id, body, klaar) {
      const p = (this._team || []).find((x) => x.id === id); if (!p || !sbAan() || !magBeheer() || id === (this.user && this.user.id)) return;
      const f = $("bh-team-fout");
      try {
        await W().sb("/rest/v1/profiles?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: Object.assign({ Prefer: "return=minimal" }, JS), body: JSON.stringify(body) });
        Object.assign(p, body);
        // keuzelijsten (actiehouder, toetser, inspecteur) direct bijwerken
        const u = window.WPI.USERS.find((x) => x.id === id);
        if (u && body.role) u.role = body.role;
        if (u && body.actief === false) window.WPI.USERS.splice(window.WPI.USERS.indexOf(u), 1);
        this.toast = klaar(p); this._team = null; this.route();
      } catch (e) {
        // de server legt in het Nederlands uit waarom niet (laatste hoofd, lopende acties, eigen rol, MFA …)
        const t = e && e.message && !/row-level|permission|HTTP \d+/i.test(e.message) ? e.message : e && e.status === 403 ? "Geen rechten voor deze wijziging (tweestapsverificatie nodig?)." : "Opslaan lukte niet. Probeer het zo opnieuw.";
        if (f) f.textContent = "Niet gewijzigd: " + String(t).slice(0, 240);
        window.WPI.zeg("Niet gewijzigd: " + String(t).slice(0, 240));
        const box = $("bh-teamlijst"); if (box) box.innerHTML = this._teamHtml();   // de keuzelijst terug op de oude rol
      }
    },
    teamRol(id, rol) {
      if (!this.TEAM_ROLLEN.includes(rol)) return;
      this._teamPatch(id, { role: rol }, (p) => p.full_name + " is nu " + window.WPI.ROL[rol]);
    },
    teamActief(id, aan) { this._teamPatch(id, { actief: !!aan }, (p) => p.full_name + (aan ? " is weer actief" : " staat op non-actief")); },

    // ---------------- Vandaag voor wie niet inspecteert (QHSE-manager, beheerder) ----------------
    view_overzicht() {
      const { isoDag, dagLabel, kort } = window.WPI;
      const v = $("view"), vn = this.user.full_name.split(" ")[0], u = new Date().getHours();
      const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
      const datum = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
      v.appendChild(el(`<div class="vkop"><div class="hi">${groet} ${esc(vn)} · ${esc(datum)}</div><h1 class="groot">Overzicht van het team</h1></div>`));
      v.appendChild(el(`<p class="s bhoverzicht">Je kijkt mee met alle inspecties, acties en de planning${magBeheer() ? " en beheert het team" : ""}. Inspecteren doen de hoofden en de coördinatoren.</p>`));
      const plan = el(`<div class="vplan"></div>`), acties = el(`<div class="bhteamacties"></div>`), meer = el(`<div class="vmeer"></div>`);
      v.appendChild(plan); v.appendChild(acties); v.appendChild(meer);
      this.laadPlanning().then(() => {
        if (!document.body.contains(plan)) return;
        const vandaag = isoDag(new Date()), P = (this.planning || []).filter((p) => p.status === "gepland" && p.datum);
        const nu = P.filter((p) => p.datum === vandaag), gemist = P.filter((p) => p.datum < vandaag);
        const r = (p) => `<div class="vrij"><span class="grow"><span class="k">${p.datum < vandaag ? `<span class="nogte">Nog niet gedaan · ${esc(dagLabel(p.datum))}</span>` : "Vandaag"}${p.project ? " · " + esc(p.project) : ""}</span>
          <span class="t">${esc(this.productNaam(p.code))}</span><span class="meta"><span>${esc(window.WPI.naam(p.inspecteur))}</span>${p.locatie ? `<span>${esc(p.locatie)}</span>` : ""}</span></span></div>`;
        plan.innerHTML = `<h2 class="vsectie">Inspecties vandaag</h2>` + (nu.length || gemist.length
          ? `<div class="listcard vlijst">${gemist.concat(nu).slice(0, 8).map(r).join("")}</div>`
          : `<div class="listcard vlijst"><div class="vrij"><span class="grow"><span class="t">Niets gepland vandaag</span></span></div></div>`);
      });
      this.laadActies().then(() => {
        if (!document.body.contains(acties)) return;
        const B = this.bakjes(), nToets = B.toetsen.length;
        const knop = (f, n, t, s, warm) => `<button class="vknop${warm && n ? " warm" : ""}"${act("naarActies", f)}><span class="nr${n ? "" : " nul"}">${n || svg("check", 18, 2.6)}</span><span class="grow"><span class="t">${esc(t)}</span><span class="s">${esc(s)}</span></span>${svg("chev", 18)}</button>`;
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
        <button class="vknop"${act("go", "beheer")}><span class="cirkel">${svg("tand", 20)}</span><span class="grow"><span class="t">Beheer</span><span class="s">${magBeheer() ? "Team en rollen, monteurs, doel % conform" : "Monteurs"}</span></span>${svg("chev", 18)}</button></div>`;
    },

    view_beheer() {
      if (!magMonteurs()) return this.go("vandaag");   // rechten: js/kern.js (de server dwingt hetzelfde af)
      const beheer = magBeheer();
      // de hele pagina in één benoemd gebied (landmark), zodat een schermlezer er direct naartoe kan
      const v = el(`<section class="bhpagina" aria-labelledby="bh-titel"></section>`); $("view").appendChild(v);
      const actieven = this.monteursLijst(), ina = this.monteursInactief(), doel = this.doelConform ? this.doelConform() : null, b = this._beheer || {};
      v.appendChild(el(`<div><div class="hi">${beheer ? "Team, monteurs en doelen" : "Monteurs"}</div><h1 class="groot" id="bh-titel">Beheer</h1></div>`));
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
      v.appendChild(el(`<div class="bhgrid">
        <section class="card bhkaart" id="bh-monteurs">
          <h2 class="bhkop">Monteurs <span class="sub">${actieven.length} actief</span></h2>
          <p class="s bhuitleg">Uit deze lijst kiest de inspecteur wie er aan het werk was.</p>
          <div class="bhtoevoeg"><input id="bh-nieuw" class="fin" aria-label="Naam van de monteur" placeholder="Naam van de monteur" autocomplete="off" maxlength="80" value="${esc(b.nieuw || "")}"${op("enter", "beheerToevoegen")}>
            <button class="btn primary sm"${act("beheerToevoegen")}>${svg("plus", 16)} Toevoegen</button></div>
          <div id="bh-fout" class="fout">${esc(b.fout || "")}</div>
          <div class="bhlijst">${actieven.length ? actieven.map((n, i) => rij(n, i, true)).join("") : `<div class="s" style="padding:12px 0">Nog geen actieve monteurs.</div>`}</div>
          ${ina.length ? `<div class="bhsub">Non-actief</div><div class="bhlijst">${ina.map((n, i) => rij(n, i, false)).join("")}</div>` : ""}
        </section>
        ${beheer ? `<section class="card bhkaart" id="bh-doel">
          <h2 class="bhkop">Doel % conform</h2>
          <p class="s bhuitleg">Zie je terug in de trendgrafieken. Standaard 85%. Leeg laten is geen doel.</p>
          <div class="bhdoel"><input id="bh-doel-in" class="fin" type="text" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="bijv. 85" value="${esc(b.doelWaarde != null ? b.doelWaarde : doel != null ? doel : "")}" aria-label="Doel procent conform"${op("enter", "beheerDoel")}><span class="bhpct">%</span>
            <button class="btn primary sm"${act("beheerDoel")}>Opslaan</button></div>
          <div id="bh-doel-fout" class="fout">${esc(b.doelFout || "")}</div>
          <div class="s bhstand">${doel != null ? `Huidig doel: <b>${doel}% conform</b>` : "Er is nu geen doel ingesteld."}</div>
        </section>` : ""}</div>`));
      if (beheer) {
        const n = sbAan() ? (this._team || []).length : window.WPI.USERS.length;
        v.appendChild(el(`<section class="card bhkaart bhteam" id="bh-team">
          <h2 class="bhkop">Team en rollen <span class="sub">${n ? n + (n === 1 ? " persoon" : " personen") : ""}</span></h2>
          <p class="s bhuitleg">Kies per collega de rol. Je eigen rol wijzigt een ander.</p>
          <div id="bh-team-fout" class="fout" role="alert">${esc(this._teamFout || "")}</div>
          <div class="bhlijst" id="bh-teamlijst">${this._teamHtml()}</div>
          <p class="s bhregels">Inspecteren en plannen: de hoofden en de coördinatoren. Actiehouder: een hoofd of coördinator. Toetser: een hoofd, coördinator of de QHSE-manager, nooit de actiehouder. De QHSE-manager en de beheerder kijken overal mee en beheren, maar inspecteren niet.</p>
          <details class="bhuitnodig"><summary>Nieuwe collega uitnodigen</summary>
            <p class="s">${sbAan() ? "Uitnodigen gaat via Supabase: <b>Authentication › Users › Invite user</b> (alleen het e-mailadres). Na het accepteren staat de collega hier met <b>Nog geen rol</b> en heeft nog nergens toegang; kies dan de rol. De rol inspecteur bestaat niet meer: kies hoofd, coördinator, QHSE-manager of beheerder."
              : "In de voorbeeldmodus is er geen server: rollen bekijken kan, uitnodigen en wijzigen kan in de echte omgeving (via Supabase › Authentication › Invite user, daarna de rol kiezen in deze lijst)."}</p></details>
        </section>`));
        if (sbAan() && !this._team) this.teamLaad();
      }
      v.appendChild(el(`<p class="s bhdeel">${esc(this._bhStand())}</p>`));
      this._beheer = { hernoem: b.hernoem };
      if (b.hernoem) { const i = $("bh-hernoem"); if (i) { i.focus(); i.select(); } }
      this.beheerSync();                                                // nieuwste stand van de server (max. elke 5 min)
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
