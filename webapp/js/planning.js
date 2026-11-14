/* Werkplekinspectie — js/planning.js
   Planning: ingeplande inspecties (model, demo-data, formulier, overzicht).
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, USERS, mag, personenOpties, nietKiesbaar, naam, dag0, isoDag, plusDagen, dagLabel, dagenTot, stBadge, tril, act, op, WAARDE } = window.WPI;
  Object.assign(window.App, {
    // ---------------- PLANNING ----------------
    planning: null,
    productNaam(code) { return ((this.data.kennisbank || {})[code] || {}).naam || code || "–"; },
    async laadPlanning() {
      if (this.planning) return this.planning;
      let p = []; try { p = await DB.getAll("planning"); } catch (e) {}
      if (!p.length && !localStorage.getItem("wpi_demo_plan")) {
        const d = this.demoPlanning(); try { for (const x of d) await DB.put("planning", x); localStorage.setItem("wpi_demo_plan", "1"); } catch (e) {}
        p = d;
      }
      this.planning = p; return p;
    },
    demoPlanning() {
      const b = (o) => Object.assign({ demo: true, status: "gepland", toelichting: "" }, o);
      return [
        b({ id: "PL-demo1", datum: plusDagen(0), code: "DAM", project: "P26-168", locatie: "RWZI Voorbeeldstad", inspecteur: "u-hoofd2", monteurs: 2 }),
        b({ id: "PL-demo2", datum: plusDagen(0), code: "POM", project: "P26-171", locatie: "Gemaal De Hoek", inspecteur: "u-coord1", monteurs: 3 }),
        b({ id: "PL-demo3", datum: plusDagen(1), code: "ROO", project: "P26-175", locatie: "RWZI Oostdijk", inspecteur: "u-coord2", monteurs: 2 }),
        b({ id: "PL-demo4", datum: plusDagen(5), code: "IDV", project: "P26-180", locatie: "Gemaal Noordpolder", inspecteur: "u-coord1", monteurs: 4 }),
        b({ id: "PL-demo5", datum: plusDagen(8), code: "BAN", project: "P26-182", locatie: "RWZI Voorbeeldstad", inspecteur: "u-hoofd", monteurs: 2 }),
        b({ id: "PL-demo6", datum: plusDagen(-3), code: "ROO", project: "P26-166", locatie: "RWZI Westerkwartier", inspecteur: "u-coord2", monteurs: 2 }),
      ];
    },
    startGepland(id) {
      const p = (this.planning || []).find((x) => x.id === id); if (!p) return;
      this.startInspectie(p.code, p.project || "", this.productNaam(p.code) + (p.locatie ? " · " + p.locatie : ""), false, p.id);
    },
    planForm(id) {
      if (!mag("plant")) return;
      const p = id ? (this.planning || []).find((x) => x.id === id) : null, kb = this.data.kennisbank;
      const prod = Object.keys(kb).sort((a, b) => kb[a].naam.localeCompare(kb[b].naam)).map((c) => `<option value="${c}"${p && p.code === c ? " selected" : ""}>${esc(kb[c].naam)}</option>`).join("");
      // alleen wie inspecteert (hoofden, coördinatoren); stond er iemand anders ingepland, dan eerst opnieuw kiezen
      const mens = (p && p.inspecteur && nietKiesbaar("inspecteert", p.inspecteur) ? `<option value="" selected disabled>${esc(naam(p.inspecteur))} · kies opnieuw</option>` : "")
        + personenOpties("inspecteert", p ? p.inspecteur : this.user.id, { leeg: null });
      const veld = (lab, inner) => { const m = inner.match(/\bid="([^"]+)"/); return `<label class="flab"${m ? ` for="${m[1]}"` : ""}>${lab}</label>${inner}`; };   // label gekoppeld aan het veld (for=id)
      const snel = [[0, "Vandaag"], [1, "Morgen"], [7, "Over een week"]].map(([n, l]) => `<button class="chipb"${act("zetPlanDatum", plusDagen(n))}>${l}</button>`).join("");
      this.openModal(p ? "Inspectie wijzigen" : "Inspectie inplannen", "Wie inspecteert wat, waar en wanneer.",
        `${veld("Product", `<select id="pl-code" class="fin"><option value="">Kies…</option>${prod}</select>`)}
         <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div>${veld("Project", `<input id="pl-project" class="fin" placeholder="P26-…" value="${esc(p ? p.project : "")}">`)}</div>
           <div>${veld("Aantal monteurs", `<input id="pl-mont" class="fin" type="number" min="0" inputmode="numeric" placeholder="aantal" value="${esc(p && p.monteurs ? p.monteurs : "")}">`)}</div></div>
         ${veld("Locatie", `<input id="pl-loc" class="fin" placeholder="Bijv. RWZI Voorbeeldstad" value="${esc(p ? p.locatie : "")}">`)}
         ${veld("Datum", `<input id="pl-datum" type="date" class="fin" value="${esc(p ? p.datum : plusDagen(1))}"><div class="chips" style="margin-top:8px">${snel}</div>`)}
         ${veld("Inspecteur", `<select id="pl-insp" class="fin">${mens}</select>`)}
         ${veld("Toelichting (optioneel)", `<textarea id="pl-toel" class="fin" rows="2" placeholder="Bijv. let op hijswerk met mobiele kraan">${esc(p ? p.toelichting : "")}</textarea>`)}
         <div id="ai-fout" class="fout" role="alert"></div>
         <button class="btn primary" style="margin-top:8px"${act("bewaarPlan", p ? p.id : null)}>${p ? "Opslaan" : "Inplannen"}</button>
         ${p ? `<button class="btn ghost" style="margin-top:10px;width:100%"${act("verwijderPlan", p.id)}>Uit de planning halen</button>` : ""}`);
    },
    zetPlanDatum(d) { document.getElementById("pl-datum").value = d; },   // snelkeuze Vandaag/Morgen/Over een week
    async bewaarPlan(id) {
      if (!mag("plant")) return;
      const code = $("pl-code").value, datum = $("pl-datum").value, insp = $("pl-insp").value;
      if (!code) return this.fout("Kies een product.", "pl-code");
      if (!insp || nietKiesbaar("inspecteert", insp)) return this.fout(nietKiesbaar("inspecteert", insp) || "Kies wie inspecteert.", "pl-insp");
      if (!datum) return this.fout("Kies een datum.", "pl-datum");
      await this.laadPlanning();
      let p = id ? this.planning.find((x) => x.id === id) : null;
      if (!p) { p = { id: this.nieuwPlanId(), status: "gepland", gemaakt_door: this.user.id }; this.planning.push(p); }
      // projectnummer vooraan zoals in de projectplanning (" p26-436  (fictief) " → "P26-436 (fictief)"); de rest blijft zoals getypt
      const projNr = $("pl-project").value.trim().replace(/\s+/g, " ").replace(/^[a-z]\d{2}-\d+(?![\w-])/i, (x) => x.toUpperCase());
      Object.assign(p, { code, datum, inspecteur: insp, project: projNr, locatie: $("pl-loc").value.trim(), monteurs: +$("pl-mont").value || null, toelichting: $("pl-toel").value.trim() });
      try { await DB.put("planning", p); } catch (e) { return this.fout("Opslaan op dit toestel mislukt."); }
      tril(30); this.closeModal();
      this.toast = `Ingepland: ${this.productNaam(code)} · ${dagLabel(datum)} · ${naam(insp)}`; this.route();
    },
    // uniek, ook bij twee keer opslaan in dezelfde milliseconde (anders overschrijft de tweede de eerste op het toestel)
    nieuwPlanId() { const b = "PL-" + Date.now(); let id = b, n = 1; while ((this.planning || []).some((x) => x.id === id)) id = b + "-" + n++; return id; },
    async verwijderPlan(id) { if (!mag("plant")) return; this.planning = this.planning.filter((x) => x.id !== id); try { await DB.del("planning", id); } catch (e) {} this.closeModal(); this.route(); },
    async view_planning() {
      const nr = this._routeNr;
      await this.laadPlanning();
      if (nr !== this._routeNr) return;   // intussen opnieuw gerouteerd: niet dubbel tekenen
      const v = $("view"), vandaag = isoDag(new Date()), me = this.user.id, P = this.planning;
      const zicht = mag("zietAlles") ? P : P.filter((p) => p.inspecteur === me);
      v.appendChild(el(`<div><div class="hi">${mag("zietAlles") ? "Inspectieprogramma van het team" : "Jouw inspecties"}</div><h1 class="groot">Planning</h1></div>`));
      if (this.toast) { v.appendChild(el(`<div class="toast" style="margin:-6px 0 12px">✓ ${esc(this.toast)}</div>`)); window.WPI.zeg(this.toast); this.toast = null; }
      // inplannen en het programma-voorstel: alleen wie plant (hoofden, coördinatoren); QHSE-manager en beheerder kijken mee
      if (mag("plant")) v.appendChild(el(`<button id="pl-nieuwknop" class="btn primary" style="margin-bottom:16px"${act("planForm")}>${svg("plus", 18)} Inspectie inplannen</button>`));
      if (mag("plant")) this.progBlok(v);
      const g = (l, lijst, warm) => lijst.length ? `<h2 class="${warm ? "warmkop" : ""}">${l} <span class="s">${lijst.length}</span></h2><div class="pkaarten plijst">${lijst.map((p) => this.planKaart(p, vandaag)).join("")}</div>` : "";
      const gp = zicht.filter((p) => p.status === "gepland").sort((a, b) => a.datum.localeCompare(b.datum));
      const html = g("Nog niet gedaan", gp.filter((p) => p.datum < vandaag), true) + g("Vandaag", gp.filter((p) => p.datum === vandaag))
        + g("Komende 7 dagen", gp.filter((p) => p.datum > vandaag && dagenTot(p.datum) <= 7)) + g("Later", gp.filter((p) => dagenTot(p.datum) > 7))
        + (zicht.some((p) => p.status === "uitgevoerd") ? g("Uitgevoerd", zicht.filter((p) => p.status === "uitgevoerd").sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 6)) : "");
      v.appendChild(el(`<div>${html || `<div class="leeg"><span class="bol">📅</span><div class="t">Nog niets ingepland</div><div class="s">${mag("plant") ? "Tik op “Inspectie inplannen”." : "De hoofden en coördinatoren plannen de inspecties."}</div></div>`}</div>`));
      // vanuit een melding "Inspectie nog niet gedaan": die ingeplande inspectie uitgelicht, in beeld en met de focus
      const fp = this._focusPlan; this._focusPlan = null;
      const kaart = fp ? [...v.querySelectorAll(".pkaart[data-plan]")].find((k) => k.getAttribute("data-plan") === fp) : null;
      if (kaart) {
        kaart.setAttribute("tabindex", "-1");
        const t = kaart.querySelector(".titel"); if (t) kaart.setAttribute("aria-label", "Uit de melding: " + t.textContent + ", nog niet gedaan");
        try { kaart.focus({ preventScroll: true }); kaart.scrollIntoView({ block: "center" }); } catch (e) {}
      }
    },
    // ---------------- PROGRAMMA-VOORSTEL (VCA 7.1, trendactie TREND-2026-1) ----------------
    // Uit de projectplanning (voorbeelddata.projecten) een voorstel voor volgende maand. Niets wordt
    // ingepland zonder bevestiging: de gebruiker past aan, haalt weg en bevestigt in één keer.
    progVoorstel: null,
    PROG_GROEP: { lang: "Lopen langer dan een maand · elke maand één inspectie", risico: "Korte projecten met extra risico · ten minste één inspectie", overig: "Overige korte projecten · één op de vier per kwartaal" },
    progMaand() { const d = dag0(); d.setDate(1); d.setMonth(d.getMonth() + 1); return isoDag(d).slice(0, 7); },
    progMaandNaam(m) { return new Date(m + "-01T00:00").toLocaleDateString("nl-NL", { month: "long" }); },
    // projectnummer om te vergelijken: zonder "(fictief)", spaties en verschil in hoofdletters ("p26-436 " = "P26-436")
    progProjNr(s) { return String(s || "").replace(/\s*\(fictief\)\s*/i, "").replace(/\s+/g, " ").trim().toUpperCase(); },
    progCode(product) {
      const kb = this.data.kennisbank || {}, n = String(product || "").toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").trim();
      const codes = Object.keys(kb), naam = (c) => kb[c].naam.toLowerCase();
      return codes.find((c) => naam(c) === n) || codes.find((c) => n.startsWith(naam(c))) || codes.find((c) => n.endsWith(naam(c)))
        || codes.find((c) => n.includes(naam(c))) || codes.find((c) => naam(c).includes(n)) || null;
    },
    // vaste feestdagen; 5 mei alleen in lustrumjaren. Tweede paasdag, Hemelvaartsdag en tweede pinksterdag rekenen we uit.
    PROG_VRIJ: ["01-01", "04-27", "12-25", "12-26"],
    progFeestdagen(jaar) {
      const c = this._progFeest || (this._progFeest = {}); if (c[jaar]) return c[jaar];
      const a = jaar % 19, b = Math.floor(jaar / 100), cc = jaar % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(cc / 4), k = cc % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
      const pasen = new Date(jaar, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
      const na = (n) => { const x = new Date(pasen); x.setDate(x.getDate() + n); return isoDag(x).slice(5); };
      return (c[jaar] = this.PROG_VRIJ.concat([na(1), na(39), na(50)], jaar % 5 === 0 ? ["05-05"] : []));
    },
    progVrij(iso) { const wd = new Date(iso + "T00:00").getDay(); return wd === 0 || wd === 6 ? "weekend" : this.progFeestdagen(+iso.slice(0, 4)).includes(iso.slice(5)) ? "feestdag" : ""; },
    // dagen van een maand binnen [van, tot]; alleen werkdagen (ma–vr, zonder vaste feestdagen) tenzij alles = true
    progWerkdagen(m, van, tot, alles) {
      const uit = [], d = new Date(m + "-01T00:00");
      while (isoDag(d).slice(0, 7) === m) {
        const iso = isoDag(d);
        if ((alles || !this.progVrij(iso)) && (!van || iso >= van) && (!tot || iso <= tot)) uit.push(iso);
        d.setDate(d.getDate() + 1);
      }
      return uit;
    },
    progKortDatum(iso, m) { const d = new Date(iso + "T00:00"); return d.toLocaleDateString("nl-NL", Object.assign({ day: "numeric", month: "short" }, iso.slice(0, 4) !== m.slice(0, 4) ? { year: "numeric" } : {})); },
    // staat dit project al in de planning (of had het al een inspectie)? in maand mnd, of ooit (mnd leeg)
    progGepland(nr, mnd, extra) {
      const wpis = (this.data.voorbeelddata || {}).wpis || [], n = this.progProjNr(nr);
      const zelfde = (x) => !!n && this.progProjNr(x.project) === n && (!mnd || String(x.datum).slice(0, 7) === mnd);
      return (this.planning || []).some(zelfde) || (extra || []).some(zelfde) || wpis.some(zelfde);
    },
    // geldt een voorstel nog? (intussen via een andere weg ingepland → niet nog eens)
    progAlGepland(x, m, extra) { return this.progGepland(x.project, x.soort === "lang" ? m : "", extra); },
    // ookWeg: ook de voorstellen die de gebruiker deze maand met × heeft weggehaald
    maakProgVoorstel(m, ookWeg) {
      const P = (this.data.voorbeelddata || {}).projecten || [], begin = m + "-01", eind = isoDag(new Date(+m.slice(0, 4), +m.slice(5, 7), 0));
      const qStart = ((+m.slice(5, 7) - 1) / 3 | 0) * 3 + 1, qMnd = [0, 1, 2].map((k) => m.slice(0, 5) + String(qStart + k).padStart(2, "0"));
      const langerDanMaand = (p) => { const d = new Date(p.start + "T00:00"); d.setMonth(d.getMonth() + 1); return p.eind > isoDag(d); };
      const actief = (p) => p.start <= eind && p.eind >= begin;
      const risico = (p) => [p.hijsen_mobiele_kraan && "hijsen", p.besloten_ruimte_vergunning && "besloten ruimte", p.open_water && "open water"].filter(Boolean);
      const geplandIn = (nr, mnd) => this.progGepland(nr, mnd);
      // overige korte projecten van dit kwartaal: één op de vier (1e, 5e, 9e … op startdatum)
      // (één keer per projectnummer: twee regels voor hetzelfde project tellen als één project)
      const overig = P.filter((p) => !langerDanMaand(p) && !risico(p).length && qMnd.some((q) => p.start.slice(0, 7) === q)).sort((a, b) => a.start.localeCompare(b.start))
        .filter((p, i, A) => A.findIndex((q) => this.progProjNr(q.project) === this.progProjNr(p.project)) === i);
      const morgen = plusDagen(1) <= eind ? plusDagen(1) : begin, kand = [], weg = ookWeg ? [] : this.progWegLijst(m);   // niet in het verleden (een voorbije maand: hele maand, alleen voor overzicht)
      P.filter(actief).sort((a, b) => a.start.localeCompare(b.start)).forEach((p) => {
        const nr = this.progProjNr(p.project); let soort = "", reden = "";
        if (langerDanMaand(p)) { if (!geplandIn(nr, m)) { soort = "lang"; reden = "Loopt langer dan een maand: elke maand één inspectie"; } }
        else if (risico(p).length) { if (!geplandIn(nr)) { soort = "risico"; reden = "Kort project met " + risico(p).join(", ") + ": ten minste één inspectie"; } }
        else if (overig.indexOf(p) >= 0 && overig.indexOf(p) % 4 === 0 && !geplandIn(nr)) { soort = "overig"; reden = "Kort project: één op de vier per kwartaal"; }
        if (!soort || weg.includes(nr)) return;
        const van = [p.start, begin, morgen].sort().pop(), tot = p.eind < eind ? p.eind : eind;
        let opties = this.progWerkdagen(m, van, tot), alleenVrij = false;
        if (!opties.length) { opties = this.progWerkdagen(m, van, tot, true); alleenVrij = true; }   // project loopt deze maand alleen op vrije dagen
        if (!opties.length) return;                                                                // niets meer te plannen in deze maand
        kand.push({ p, nr, soort, reden, risico: risico(p), opties, alleenVrij });
      });
      // één voorstel per project (per maand): staat hetzelfde projectnummer er twee keer in (twee producten, of
      // "P26-436 (fictief)" en "p26-436"), dan houden we het zwaarste (lang > risico > overig), bij gelijk het eerste
      const rang = { lang: 0, risico: 1, overig: 2 }, best = new Map();
      kand.forEach((x) => { const o = best.get(x.nr); if (!o || rang[x.soort] < rang[o.soort]) best.set(x.nr, x); });
      const lijst = kand.filter((x) => best.get(x.nr) === x);
      // datum: verdeeld over de werkdagen van de maand, binnen de looptijd van het project, niet in het verleden
      const alle = this.progWerkdagen(m, morgen > begin ? morgen : begin, eind);
      const coords = USERS.filter((u) => u.role === "coordinator");
      return lijst.map((x, i) => {
        const doel = alle[Math.min(alle.length - 1, Math.floor((i + 0.5) * alle.length / lijst.length))] || begin;
        // alleen vrije dagen (weekend/feestdag): geen datum voorstellen, de gebruiker kiest zelf
        const datum = x.alleenVrij ? "" : x.opties.reduce((b, d) => Math.abs(dagenTot(d) - dagenTot(doel)) < Math.abs(dagenTot(b) - dagenTot(doel)) ? d : b);
        return { vid: "VS-" + i, code: this.progCode(x.p.product), product: x.p.product, project: x.nr, locatie: x.p.locatie, soort: x.soort, reden: x.reden, risico: x.risico,
          datum, opties: x.opties, alleenVrij: x.alleenVrij, min: x.opties[0], max: x.opties[x.opties.length - 1], start: x.p.start, eind: x.p.eind,
          inspecteur: coords.length ? coords[i % coords.length].id : this.user.id };
      });
    },
    async startProgVoorstel() {
      await this.laadPlanning();
      const m = this.progMaand();
      this.progVoorstel = { maand: m, items: this.maakProgVoorstel(m) };
      tril(15); this.route();
      // naar het voorstel. Past de kop met de eerste kaart al vanaf de bovenkant in beeld, dan blijft de pagina
      // bovenaan staan (niets half onder de zwevende alertbalk). Anders komt de knop "Inspectie inplannen" helemaal
      // zichtbaar net onder de alertbalk, met het voorstel direct eronder.
      setTimeout(() => {
        const s = $("progvs"), k = $("pl-nieuwknop"), al = $("alert"); if (!s || !k) return;
        const se = document.scrollingElement || document.documentElement, eerste = s.querySelector(".vskaart") || s;
        if (eerste.getBoundingClientRect().top + se.scrollTop + 140 <= window.innerHeight) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
        const balk = al && !al.classList.contains("hidden") && al.offsetHeight ? al.offsetHeight + 4 : 0;
        k.style.scrollMarginTop = (balk + 12) + "px";
        if (k.scrollIntoView) k.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },
    progZet(vid, k, val) {
      const x = this.progVoorstel && this.progVoorstel.items.find((y) => y.vid === vid); if (!x) return; x[k] = val;
      const kaart = document.querySelector(`.vskaart[data-vid="${vid}"]`); if (kaart) kaart.classList.remove("vsfout");
    },
    // met × weggehaald = "deze maand niet": onthouden per maand (op dit toestel), zodat het voorstel niet meteen terugkomt;
    // terugzetten kan altijd
    progWegLijst(m) { try { const o = JSON.parse(localStorage.getItem("wpi_prog_weg") || "{}"); return Array.isArray(o[m]) ? o[m] : []; } catch (e) { return []; } },
    progWegBewaar(m, lijst) { try { const o = {}; if (lijst.length) o[m] = lijst; localStorage.setItem("wpi_prog_weg", JSON.stringify(o)); } catch (e) {} },
    // weggehaalde voorstellen die anders nog zouden gelden (al ingepland telt niet mee)
    progWegOpen(m) { const w = this.progWegLijst(m); return w.length ? this.maakProgVoorstel(m, true).filter((x) => w.includes(x.project)) : []; },
    progWeg(vid) {
      const V = this.progVoorstel; if (!V) return; const x = V.items.find((y) => y.vid === vid); if (!x) return;
      V.items = V.items.filter((y) => y !== x); V.weg = (V.weg || 0) + 1;
      const w = this.progWegLijst(V.maand); if (!w.includes(x.project)) this.progWegBewaar(V.maand, w.concat(x.project));
      tril(10); this.route();
    },
    async progTerug() {
      await this.laadPlanning();
      const m = this.progMaand(), terug = this.progWegOpen(m), V = this.progVoorstel && this.progVoorstel.maand === m ? this.progVoorstel : null;
      this.progWegBewaar(m, []);
      if (!V) return this.startProgVoorstel();
      let i = V.items.length + (V.weg || 0) + 100;
      terug.forEach((x) => { if (!V.items.some((y) => y.project === x.project)) V.items.push(Object.assign(x, { vid: "VS-" + i++ })); });
      V.weg = 0; tril(10); this.route();
    },
    progAnnuleer() { this.progVoorstel = null; this.route(); },
    async progAllesInplannen() {
      const V = this.progVoorstel; if (!V || !V.items.length || this._progBezig) return;
      const fout = $("prog-fout"), mn = this.progMaandNaam(V.maand);
      // wat ontbreekt er precies? ("Kies nog een dag bij Pompen · W-9.")
      const wat = (x) => !x.code && !x.datum ? "een product en een dag" : !x.code ? "een product"
        : !x.datum ? "een dag" : x.opties.includes(x.datum) ? "" : this.progVrij(x.datum) ? "een werkdag" : "een dag binnen de looptijd van het project";
      const mis = V.items.filter((x) => wat(x));
      document.querySelectorAll(".vskaart").forEach((k) => k.classList.toggle("vsfout", mis.some((x) => x.vid === k.dataset.vid)));
      if (mis.length) {
        const d = mis.map((x) => wat(x) + " bij " + (x.code ? this.productNaam(x.code) : x.product) + " · " + x.project);
        if (fout) fout.textContent = "Kies nog " + (d.length <= 2 ? d.join(" en ") : d.slice(0, 2).join(", ") + " en bij nog " + (d.length - 2) + " andere voorstellen") + ".";
        return;
      }
      this._progBezig = true;                      // één keer inplannen, ook bij een dubbele tik
      const knop = $("prog-alles"); if (knop) knop.disabled = true;
      try {
        await this.laadPlanning();
        // intussen via een andere weg ingepland (formulier, ander tabblad)? dan niet nog eens
        let opToestel = []; try { opToestel = await DB.getAll("planning"); } catch (e) {}
        // en niet twee keer hetzelfde project uit dit voorstel (ook bij een oud voorstel of een andere schrijfwijze)
        const al = [], doen = [];
        V.items.forEach((x) => { if (this.progAlGepland(x, V.maand, opToestel)) al.push(x); else if (!this.progAlGepland(x, V.maand, doen)) doen.push(x); });
        for (const x of doen) {
          const p = { id: this.nieuwPlanId(), status: "gepland", gemaakt_door: this.user.id, bron: "programma", code: x.code, datum: x.datum, inspecteur: x.inspecteur,
            project: x.project, locatie: x.locatie || "", monteurs: null, toelichting: "" };
          this.planning.push(p);
          try { await DB.put("planning", p); } catch (e) { if (fout) fout.textContent = "Opslaan op dit toestel mislukt."; return; }
        }
        const n = doen.length, nWeg = this.progWegOpen(V.maand).length; this.progVoorstel = null; tril(30);
        const alNr = al.map((x) => x.project).filter((x, i, A) => A.indexOf(x) === i);
        this.toast = (n ? `${n} inspectie${n === 1 ? "" : "s"} ingepland voor ${mn}` : "Niets ingepland")
          + (alNr.length ? ` · ${alNr.join(", ")} stond${alNr.length === 1 ? "" : "en"} al in de planning` : "")
          + (nWeg ? ` · ${nWeg === 1 ? "het weggehaalde voorstel komt" : "de " + nWeg + " weggehaalde voorstellen komen"} deze maand niet terug` : "");
        this.route();
      } finally { this._progBezig = false; if (knop) knop.disabled = false; }
    },
    progBlok(v) {
      const m = this.progMaand(), mn = this.progMaandNaam(m), V = this.progVoorstel && this.progVoorstel.maand === m ? this.progVoorstel : null;
      if (!V) {
        // rustige rij, alleen als er iets voor te stellen is
        const n = this.maakProgVoorstel(m).length, nWeg = this.progWegOpen(m).length, wegT = nWeg + " weggehaald";
        if (n) v.appendChild(el(`<div class="listcard progrij"><button class="vknop progknop"${act("startProgVoorstel")}><span class="cirkel">${svg("cal", 20)}</span>
          <span class="grow"><span class="t">Voorstel programma ${esc(mn)}</span><span class="s">${n} inspectie${n === 1 ? "" : "s"} uit de projectplanning${nWeg ? " · " + wegT : ""}</span></span>${svg("chev", 18)}</button></div>`));
        // alles wat over was, is weggehaald: één rustige regel, zodat de keuze zichtbaar blijft en terug te draaien is
        else if (nWeg) v.appendChild(el(`<p class="s progweg">Voorstel programma ${esc(mn)}: ${nWeg === 1 ? "1 voorstel" : nWeg + " voorstellen"} weggehaald. <button class="bhlinkk"${act("progTerug")}>Terugzetten</button></p>`));
        return;
      }
      // intussen via een andere weg ingepland: uit het voorstel halen en dat rustig melden
      const nuAl = V.items.filter((x) => this.progAlGepland(x, m));
      if (nuAl.length) { V.items = V.items.filter((x) => !nuAl.includes(x)); V.al = (V.al || []).concat(nuAl.map((x) => x.project)); }
      const kb = this.data.kennisbank, opts = (sel) => Object.keys(kb).sort((a, b) => kb[a].naam.localeCompare(kb[b].naam)).map((c) => `<option value="${c}"${sel === c ? " selected" : ""}>${esc(kb[c].naam)}</option>`).join("");
      const kd = (iso) => this.progKortDatum(iso, m);
      const looptijd = (x) => "Project loopt " + (x.start < m + "-01" ? "t/m " + kd(x.eind) : kd(x.start) + " – " + kd(x.eind));
      const dagOpt = (x) => (x.datum ? "" : `<option value="" selected>Kies een dag…</option>`) + x.opties.map((d) => { const vrij = this.progVrij(d);
        return `<option value="${d}"${d === x.datum ? " selected" : ""}>${esc(dagLabel(d))}${vrij ? " (" + vrij + ")" : ""}</option>`; }).join("");
      const kaart = (x) => `<div class="pkaart vskaart" data-vid="${esc(x.vid)}">
          <button class="vsweg"${act("progWeg", x.vid)} aria-label="Voorstel weghalen" title="Weghalen">×</button>
          ${x.soort === "risico" && x.risico.length ? `<div class="s vsreden">${esc(x.risico.join(", "))}</div>` : ""}
          <div class="titel">${esc(x.code ? this.productNaam(x.code) : x.product)}</div>
          <div class="s">${esc([x.project, x.locatie].filter(Boolean).join(" · "))}</div>
          <div class="s vslooptijd">${esc(looptijd(x))}</div>
          ${x.alleenVrij ? `<div class="s vslet">Dit project loopt in ${esc(mn)} alleen op ${esc(x.opties.map((d) => dagLabel(d)).join(", "))}. Kies zelf een dag.</div>` : ""}
          ${x.code ? "" : `<label class="flab">Product (“${esc(x.product)}” niet gevonden)</label><select class="fin" aria-label="Product"${op("change", "progZet", x.vid, "code", WAARDE)}><option value="">Kies…</option>${opts(x.code)}</select>`}
          <div class="vsvelden"><div><label class="flab">Dag</label><select class="fin vsdatum" aria-label="Dag"${op("change", "progZet", x.vid, "datum", WAARDE)}>${dagOpt(x)}</select></div>
            <div><label class="flab">Inspecteur</label><select class="fin vsinsp" aria-label="Inspecteur"${op("change", "progZet", x.vid, "inspecteur", WAARDE)}>${personenOpties("inspecteert", x.inspecteur, { leeg: null, zonderFunctie: true })}</select></div></div></div>`;
      // per reden gegroepeerd: de reden staat één keer boven de groep, niet op elke kaart
      const groepen = ["lang", "risico", "overig"].map((s) => [s, V.items.filter((x) => x.soort === s)]).filter(([, l]) => l.length);
      const n = V.items.length, nWeg = this.progWegOpen(m).filter((x) => !V.items.some((y) => y.project === x.project)).length;
      v.appendChild(el(`<section id="progvs" class="progvs">
          <div class="hi vskicker">Uit de projectplanning · nog niet ingepland</div>
          <h2>Voorstel programma ${esc(mn)}</h2>
          ${V.al && V.al.length ? `<p class="s vsal">${esc(V.al.join(", "))} ${V.al.length === 1 ? "is" : "zijn"} intussen ingepland en ${V.al.length === 1 ? "staat" : "staan"} niet meer in dit voorstel.</p>` : ""}
          ${n ? `<p class="s vsuitleg">We stellen ${n === 1 ? "één inspectie" : n + " inspecties"} voor ${esc(mn)} voor. Pas aan of haal weg; er wordt pas iets ingepland als je op <b>Alles inplannen</b> drukt.</p>
          <details class="vswaarom"><summary>Waarom deze inspecties?</summary><p class="s">Zo houden we het inspectieprogramma op orde. Projecten die langer dan een maand lopen krijgen elke maand een inspectie. Korte projecten met hijsen met een mobiele kraan, een besloten ruimte of werk bij open water krijgen er ten minste één. Van de overige korte projecten inspecteren we er één op de vier per kwartaal. Projecten die deze maand al zijn ingepland, slaan we over.</p></details>
          ${groepen.map(([s, l]) => `<div class="vsgroep">${esc(this.PROG_GROEP[s])}</div><div class="pkaarten">${l.map(kaart).join("")}</div>`).join("")}`
          : V.weg || nWeg ? `<div class="leeg"><span class="bol">🌿</span><div class="t">Alle voorstellen weggehaald</div><div class="s">Er is niets ingepland voor ${esc(mn)}.</div></div>`
          : `<div class="leeg"><span class="bol">🌿</span><div class="t">Geen voorstellen</div><div class="s">Alle verplichte inspecties voor ${esc(mn)} staan al in de planning.</div></div>`}
          ${nWeg ? `<p class="s progweg">${nWeg === 1 ? "1 voorstel" : nWeg + " voorstellen"} weggehaald; ${nWeg === 1 ? "komt" : "komen"} deze maand niet terug. <button class="bhlinkk"${act("progTerug")}>Terugzetten</button></p>` : ""}
          <div id="prog-fout" class="fout" role="alert"></div>
          <div class="vsacties">${n ? `<button id="prog-alles" class="btn primary"${act("progAllesInplannen")}>${svg("check", 18)} Alles inplannen (${n})</button>` : ""}
            <button class="btn ghost"${act("progAnnuleer")}>${n ? "Annuleren" : "Sluiten"}</button></div></section>`));
    },
    planKaart(p, vandaag) {
      const d = dagenTot(p.datum), dl = d === 0 ? "Vandaag" : d === 1 ? "Morgen" : dagLabel(p.datum);
      const magStarten = p.status === "gepland" && p.datum <= vandaag && p.inspecteur === this.user.id;
      return `<div class="pkaart${this._focusPlan === p.id ? " uitgelicht" : ""}" data-plan="${esc(p.id)}"><div class="boven"><span class="dchip${p.status === "gepland" && d < 0 ? " warm" : ""}">📅 ${dl}</span>${p.status === "uitgevoerd" ? stBadge("Afgerond").replace("Afgerond", "Uitgevoerd") : ""}${p.demo ? `<span class="s">voorbeeld</span>` : ""}${p.bron === "programma" ? `<span class="s">programma</span>` : ""}
          ${p.status === "gepland" && mag("plant") ? `<button class="wijzig"${act("planForm", p.id)} aria-label="Wijzig planning: ${esc(this.productNaam(p.code))} · ${esc(dl)}">Wijzig</button>` : ""}</div>
        <div class="titel">${esc(this.productNaam(p.code))}</div>
        <div class="s">${esc([p.project, p.locatie].filter(Boolean).join(" · "))}${p.monteurs ? " · " + esc(p.monteurs) + " monteurs" : ""}</div>
        ${p.toelichting && !(p.bron === "programma" && /^Inspectieprogramma /.test(p.toelichting)) ? `<div class="s" style="margin-top:4px">“${esc(p.toelichting)}”</div>` : ""}
        <div class="onder"><span class="sr-only">Inspecteur:</span>${WPI.inspLabel(p.inspecteur)}
          ${magStarten ? `<button class="btn primary sm" style="margin-left:auto"${act("startGepland", p.id)}>Start</button>` : ""}
          ${p.status === "uitgevoerd" && p.inspectie_id ? `<a class="s" style="margin-left:auto;color:var(--accent);font-weight:800" href="#/rapport/${esc(p.inspectie_id)}">Rapport ›</a>` : ""}</div></div>`;
    },
  });
})();
