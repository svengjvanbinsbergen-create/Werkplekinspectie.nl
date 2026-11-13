/* Werkplekinspectie — js/beheer.js
   Beheer (alleen Hoofd S&M, telefoon en web): monteurslijst en doel % conform.
   Opslag op dit toestel (localStorage), zoals de app het nu bewaart:
   - "wpi_monteurs"           actieve monteurs (lijst namen; dit leest de inspectie)
   - "wpi_monteurs_inactief"  op non-actief gezet (blijft bewaard voor oude inspecties en filters)
   - "wpi_doel_conform"       doel in procenten (leeg = geen doel)
   Met een backend (js/config.js ingevuld) is de server de bron: public.monteurs en public.instellingen
   (sleutel doel_conform). Bij inloggen, bij terugkomen in de app en bij het openen van Beheer halen we beide op en
   zetten we ze in de sleutels hierboven, zodat de inspectie, het dashboard en de rapportage op elk toestel
   hetzelfde lezen. Wijzigingen van het Hoofd S&M gaan via een kleine wachtrij ("wpi_beheer_wachtrij") naar de server,
   ook als er even geen verbinding is. Een naam die een inspecteur tijdens de inspectie toevoegt, gaat via
   rpc/monteur_aanmelden (de server koppelt hem aan de bestaande schrijfwijze).
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, tril, isWeb, IC, act, op } = window.WPI;
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
  const isHoofd = () => !!(window.App.user && window.App.user.role === "hoofd");

  // Beheer in de zijbalk op de computer (alleen Hoofd S&M); op de telefoon via het accountmenu
  const tabsOrig = window.App.renderTabs;
  window.App.renderTabs = function (active) {
    tabsOrig.call(this, active);
    const tb = $("tabbar");
    if (tb && isHoofd() && isWeb()) tb.insertAdjacentHTML("beforeend", `<a href="#/beheer" class="bhtab${active === "beheer" ? " on" : ""}"><span class="ic">${svg("tand", 24)}</span>Beheer</a>`);
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
  window.addEventListener("hashchange", () => { if (!/^#\/beheer\b/.test(location.hash)) window.App._beheer = null; });

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
          } else if (isHoofd()) {
            if (o.op === "doel" && o.waarde == null) {                    // geen doel: de regel weg (zoals dashboard_cijfers leest)
              await sb("/rest/v1/instellingen?sleutel=eq.doel_conform", { method: "DELETE", headers: { Prefer: "return=minimal" } });
            } else if (o.op === "doel") {
              await sb("/rest/v1/instellingen?on_conflict=sleutel", { method: "POST", headers: Object.assign({ Prefer: "resolution=merge-duplicates,return=minimal" }, JS), body: JSON.stringify({ sleutel: "doel_conform", waarde: o.waarde }) });
            } else {
              if (!rijen) await laadRijen();
              if (o.op === "nieuw") { const r = zoek(o.naam); if (!r) await nieuw(o.naam, true); else if (!r.actief) { await patch(r.id, { actief: true }); r.actief = true; } }
              else if (o.op === "hernoem") { const r = zoek(o.van); if (r) { await patch(r.id, { naam: o.naar }); r.naam = o.naar; } else if (!zoek(o.naar)) await nieuw(o.naar, true); }
              else if (o.op === "actief") { const r = zoek(o.naam); if (r) { if (r.actief !== o.aan) { await patch(r.id, { actief: o.aan }); r.actief = o.aan; } } else await nieuw(o.naam, o.aan); }
            }
          } else throw { status: 403 };                                   // alleen het Hoofd S&M beheert de lijst
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
      } else if (isHoofd() && lees(K_ACTIEF)) {
        // nog niets op de server: de lijst die het hoofd op dit toestel beheerde wordt de eerste stand
        this.monteursLijst().forEach((n) => this._bhWacht({ op: "nieuw", naam: n }));
        this.monteursInactief().forEach((n) => this._bhWacht({ op: "actief", naam: n, aan: false }));
      }
      // doel: de server bepaalt (geen regel of JSON null = geen doel)
      const rij = Array.isArray(inst) ? inst.find((x) => x && x.sleutel === "doel_conform") : null, d = rij ? vDoel(rij.waarde) : null;
      try { if (d == null) localStorage.removeItem(K_DOEL); else localStorage.setItem(K_DOEL, String(d)); } catch (e) {}
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

    view_beheer() {
      if (!isHoofd()) return this.go("vandaag");   // alleen Hoofd S&M
      // de hele pagina in één benoemd gebied (landmark), zodat een schermlezer er direct naartoe kan
      const v = el(`<section class="bhpagina" aria-labelledby="bh-titel"></section>`); $("view").appendChild(v);
      const actieven = this.monteursLijst(), ina = this.monteursInactief(), doel = this.doelConform ? this.doelConform() : null, b = this._beheer || {};
      v.appendChild(el(`<div><div class="hi">Monteurs en doelen</div><h1 class="groot" id="bh-titel">Beheer</h1></div>`));
      if (this.toast) { v.appendChild(el(`<div class="toast" style="margin:-6px 0 12px">✓ ${esc(this.toast)}</div>`)); this.toast = null; }
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
          <div class="bhtoevoeg"><input id="bh-nieuw" class="fin" placeholder="Naam van de monteur" autocomplete="off" maxlength="80" value="${esc(b.nieuw || "")}"${op("enter", "beheerToevoegen")}>
            <button class="btn primary sm"${act("beheerToevoegen")}>${svg("plus", 16)} Toevoegen</button></div>
          <div id="bh-fout" class="fout">${esc(b.fout || "")}</div>
          <div class="bhlijst">${actieven.length ? actieven.map((n, i) => rij(n, i, true)).join("") : `<div class="s" style="padding:12px 0">Nog geen actieve monteurs.</div>`}</div>
          ${ina.length ? `<div class="bhsub">Non-actief</div><div class="bhlijst">${ina.map((n, i) => rij(n, i, false)).join("")}</div>` : ""}
        </section>
        <section class="card bhkaart" id="bh-doel">
          <h2 class="bhkop">Doel % conform</h2>
          <p class="s bhuitleg">Zie je terug in de trendgrafieken. Leeg laten is geen doel.</p>
          <div class="bhdoel"><input id="bh-doel-in" class="fin" type="text" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="bijv. 85" value="${esc(b.doelWaarde != null ? b.doelWaarde : doel != null ? doel : "")}" aria-label="Doel procent conform"${op("enter", "beheerDoel")}><span class="bhpct">%</span>
            <button class="btn primary sm"${act("beheerDoel")}>Opslaan</button></div>
          <div id="bh-doel-fout" class="fout">${esc(b.doelFout || "")}</div>
          <div class="s bhstand">${doel != null ? `Huidig doel: <b>${doel}% conform</b>` : "Er is nu geen doel ingesteld."}</div>
        </section></div>`));
      v.appendChild(el(`<p class="s bhdeel">${esc(this._bhStand())}</p>`));
      this._beheer = { hernoem: b.hernoem };
      if (b.hernoem) { const i = $("bh-hernoem"); if (i) { i.focus(); i.select(); } }
      this.beheerSync();                                                // nieuwste stand van de server (max. elke 5 min)
    },
    // fout tonen zonder wat er getypt is kwijt te raken
    _beheerFout(t, k) {
      const w = (id) => { const i = $(id); return i ? i.value : undefined; };
      this._beheer = Object.assign({}, this._beheer, { [k || "fout"]: t, nieuw: w("bh-nieuw"), hernoemWaarde: w("bh-hernoem"), doelWaarde: w("bh-doel-in") });
      this.route();
    },
    beheerToevoegen() {
      if (!isHoofd()) return;
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
    beheerBewerk(i) { if (!isHoofd()) return; const n = this.monteursLijst()[i]; if (!n) return; this._beheer = { hernoem: n }; this.route(); },
    beheerAnnuleer() { this._beheer = {}; this.route(); },
    beheerFoutWeg() { try { localStorage.removeItem(K_SYNCFOUT); } catch (e) {} this.route(); },
    beheerHernoem(i) {
      if (!isHoofd()) return;
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
      if (!isHoofd()) return;
      const act = this.monteursLijst(), ina = this.monteursInactief();
      if (aan) { const n = ina[i]; if (!n) return; this._beheerBewaar(act.concat([n]), ina.filter((x) => x !== n)); this._bhWacht({ op: "actief", naam: n, aan: true }); this.toast = `${n} staat weer op actief`; }
      else { const n = act[i]; if (!n) return; this._beheerBewaar(act.filter((x) => x !== n), ina.concat([n])); this._bhWacht({ op: "actief", naam: n, aan: false }); this.toast = `${n} staat op non-actief`; }
      this._beheer = {}; tril(15); this.route();
    },
    beheerDoel() {
      if (!isHoofd()) return;
      const i = $("bh-doel-in"), fout = "Vul een getal tussen 1 en 100 in, of laat het leeg voor geen doel.";
      // iets getypt dat geen getal is (bijv. "8e", een los "%", "7 0"): nooit stilletjes het doel weghalen of raden
      if (!i || (i.validity && i.validity.badInput)) return this._beheerFout(fout, "doelFout");
      const getypt = String(i.value || "").trim();
      if (!getypt) { try { localStorage.removeItem(K_DOEL); } catch (e) {} this._bhWacht({ op: "doel", waarde: null }); this._beheer = {}; this.toast = "Geen doel meer ingesteld"; return this.route(); }
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
