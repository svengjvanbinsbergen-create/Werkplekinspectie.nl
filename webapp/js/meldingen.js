/* Werkplekinspectie — js/meldingen.js
   Meldingen: plandatum-meldingen, bel, alertbalk en systeemmeldingen.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, esc, svg, naam, kort, dagLabel, dagenTot, staf, act } = window.WPI;
  Object.assign(window.App, {
    // ---- meldingen over plandata: 1× een week vooraf, daarna na verstrijken elke 2 dagen; voor iedereen ----
    meldingen() {
      const uit = [];
      (this.acties || []).filter((a) => (a.status === "Open" || a.status === "In uitvoering") && a.plandatum).forEach((a) => {
        const d = dagenTot(a.plandatum);
        if (d < 0) {
          const k = Math.floor((-d - 1) / 2);   // dag 1, 3, 5 … na de plandatum telt als nieuwe melding
          // de status staat in de pil ("te laat"), niet ook nog voor de titel; de toestelmelding (zonder pil) krijgt hem wel
          uit.push({ id: a.id + ":laat:" + k, actie: a.id, soort: "laat", d, pil: "te laat", titel: kort(a.tekst, 70), sysTitel: "Te laat: " + kort(a.tekst, 70),
            tekst: `Plandatum ${dagLabel(a.plandatum)} is ${-d} dag${-d === 1 ? "" : "en"} verstreken · actiehouder ${naam(a.houder)}` });
        } else if (d <= 7) {
          const wanneer = d === 0 ? "vandaag" : d === 1 ? "morgen" : "over " + d + " dagen";
          uit.push({ id: a.id + ":week", actie: a.id, soort: "week", d, pil: wanneer, titel: kort(a.tekst, 70), sysTitel: wanneer[0].toUpperCase() + wanneer.slice(1) + ": " + kort(a.tekst, 70),
            tekst: `Plandatum ${dagLabel(a.plandatum)} · actiehouder ${naam(a.houder)}` });
        }
      });
      // gemiste inspecties: gepland, datum verstreken, nog niet uitgevoerd → de dag erna, daarna elke 2 dagen;
      // voor de toegewezen inspecteur en voor het Hoofd S&M en de coördinatoren
      (this.planning || []).filter((p) => p.status === "gepland" && p.datum && (staf() || p.inspecteur === this.user.id)).forEach((p) => {
        const d = dagenTot(p.datum); if (d >= 0) return;
        const k = Math.floor((-d - 1) / 2), wie = p.inspecteur === this.user.id ? "jouw inspectie" : "ingepland voor " + naam(p.inspecteur);
        uit.push({ id: p.id + ":gemist:" + k, plan: p.id, soort: "gemist", d, hash: "#/planning", pil: "te laat",
          titel: "Inspectie nog niet gedaan: " + this.productNaam(p.code) + (p.locatie ? " · " + p.locatie : ""),
          tekst: `Gepland op ${dagLabel(p.datum)}, ${-d} dag${-d === 1 ? "" : "en"} geleden · ${wie}` });
      });
      return uit.sort((x, y) => x.d - y.d);
    },
    _set(k) { try { return new Set(JSON.parse(localStorage.getItem(k + "_" + this.user.id) || "[]")); } catch (e) { return new Set(); } },
    _bewaarSet(k, set) { try { localStorage.setItem(k + "_" + this.user.id, JSON.stringify([...set].slice(-400))); } catch (e) {} },
    async checkMeldingen() {
      if (!this.user) return;
      await this.laadActies(); if (this.laadPlanning) await this.laadPlanning(); if (!this.user) return;
      const M = this.meldingen(), gelezen = this._set("wpi_gelezen"), getoond = this._set("wpi_getoond");
      const ongelezen = M.filter((m) => !gelezen.has(m.id));
      const nr = $("belnr"); if (nr) { nr.textContent = ongelezen.length; nr.classList.toggle("hidden", !ongelezen.length); }
      // vaste alert in beeld zolang er acties of inspecties over datum zijn (niet tijdens het inspecteren)
      const laat = M.filter((m) => m.soort === "laat"), gemist = M.filter((m) => m.soort === "gemist"), al = $("alert");
      if (al) {
        al.classList.toggle("hidden", !(laat.length || gemist.length) || this._page === "inspectie" || this._page === "vandaag" || !location.hash || location.hash === "#/");
        const nA = laat.length + " actie" + (laat.length === 1 ? "" : "s"), nI = gemist.length + " inspectie" + (gemist.length === 1 ? "" : "s");
        // elk deel in zijn eigen kleur (zoals in Meldingen, Vandaag en Acties): acties te laat rood, inspecties niet
        // gedaan oranje; de rest van de zin rustig. Eén zin, nooit één kleur voor twee betekenissen.
        const dA = `<span class="al-laat">${nA}</span>`, dI = `<span class="al-gemist">${nI}</span>`;
        const tekst = (laat.length && gemist.length ? dA + " en " + dI : laat.length ? dA : dI) + " over datum";
        al.classList.toggle("rood", !!laat.length); al.classList.toggle("warm", !laat.length && !!gemist.length);
        al.innerHTML = laat.length || gemist.length ? `${svg("warn", 16)}<span class="al-t">${tekst}</span><b>Bekijk ›</b>` : "";
        // de balk opent wat hij noemt: alleen acties → de acties die te laat zijn (zoals altijd); alleen inspecties → de
        // Planning; allebei → de meldingenlijst, waar beide staan en elke regel naar de juiste plek leidt
        this._alertDoel = laat.length && gemist.length ? "meldingen" : gemist.length ? "planning" : "acties";   // zie alertKlik
      }
      // meldingen van het toestel (als toegestaan) voor alles wat nog niet getoond is
      let nieuw = false;
      for (const m of ongelezen) { if (getoond.has(m.id)) continue; if (await this.systeemMelding(m)) { getoond.add(m.id); nieuw = true; } }
      if (nieuw) this._bewaarSet("wpi_getoond", getoond);
    },
    async systeemMelding(m) {
      try {
        if (!("Notification" in window) || Notification.permission !== "granted") return false;
        const opt = { body: m.tekst, icon: "icon-192.png", badge: "icon-192.png", tag: m.id, data: { hash: m.hash || "#/acties" } };
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        const t = m.sysTitel || m.titel;
        if (reg) await reg.showNotification(t, opt); else new Notification(t, opt);
        return true;
      } catch (e) { return false; }
    },
    // klik op de alertbalk (#alert, data-action="alertKlik" in index.html)
    alertKlik() {
      if (this._alertDoel === "meldingen") return this.openMeldingen();
      if (this._alertDoel === "planning") return this.go("planning");
      this.naarActies("telaat");   // alleen acties: de acties die te laat zijn (zoals altijd)
    },
    async meldingenAan() {
      try { const r = await Notification.requestPermission(); if (r === "granted") { this._bewaarSet("wpi_getoond", new Set()); await this.checkMeldingen(); } } catch (e) {}
      this.openMeldingen();
    },
    async openMeldingen() {
      await this.laadActies(); if (this.laadPlanning) await this.laadPlanning();
      const M = this.meldingen(), gelezen = this._set("wpi_gelezen");
      const perm = !("Notification" in window) ? "nee" : Notification.permission;
      const permHtml = perm === "granted" ? `<div class="s" style="margin-top:12px">✓ Meldingen op dit toestel staan aan.</div>`
        : perm === "denied" ? `<div class="msys" role="note"><span class="msys-ic" aria-hidden="true">i</span><span>Meldingen zijn op dit toestel geblokkeerd. Zet ze aan in de instellingen van je browser. In de app zie je ze altijd hier.</span></div>`
        : perm === "nee" ? `<div class="s" style="margin-top:12px">Dit toestel ondersteunt geen meldingen in deze weergave; je ziet ze altijd hier en in de balk bovenin het scherm.</div>`
        : `<button class="btn primary" style="margin-top:14px"${act("meldingenAan")}>${svg("bell", 18)} Meldingen op dit toestel aanzetten</button>`;
      // drie blokken onder elkaar, elk met een gekleurde kop en het aantal: te laat (rood), niet gedaan (oranje),
      // binnenkort (blauw). Elke melding is een eigen tegel in de kleur van zijn blok; lege blokken vallen weg.
      // Nieuw/gelezen: stip + vette titel (nieuw) of rustige titel (gelezen). Tik = openen + gelezen.
      const BLOK = [["laat", "Acties te laat"], ["gemist", "Inspecties niet gedaan"], ["week", "Acties binnenkort"]];
      const tegel = (m) => { const nieuw = !gelezen.has(m.id), laat = m.soort !== "week";
        return `<div class="row mrij ${m.soort} ${nieuw ? "nieuw" : "gelezen"}"${act("leesMelding", m.id, m.actie || "")}>
            <span class="mstip" ${nieuw ? 'role="img" aria-label="Nieuw"' : 'aria-hidden="true"'}></span>
            <span class="grow"><span class="t">${esc(m.titel)}</span><span class="mmeta"><span class="mpil${laat ? " laat" : ""}">${esc(m.pil || (laat ? "te laat" : "binnenkort"))}</span><span class="s">${esc(m.tekst)}</span></span></span></div>`; };
      const blokken = BLOK.map(([soort, kop]) => { const L = M.filter((m) => m.soort === soort); if (!L.length) return "";
        const nNieuw = L.filter((m) => !gelezen.has(m.id)).length;
        return `<section class="mblok ${soort}" aria-labelledby="mkop-${soort}"><h3 class="mkop" id="mkop-${soort}"><span class="mkt">${kop}</span><span class="mnr">${L.length}<span class="sr-only"> ${L.length === 1 ? "melding" : "meldingen"}${nNieuw ? ", " + nNieuw + " nieuw" : ""}</span></span></h3>
          <div class="mtegels">${L.map(tegel).join("")}</div></section>`; }).join("");
      this.openModal("Meldingen", "Acties en inspecties die aandacht vragen.",
        (M.length ? `<div class="mblokken">${blokken}</div>
            <button class="btn ghost sm" style="margin-top:12px"${act("allesGelezen")}>Alles gelezen</button>`
          : `<div class="s">Geen meldingen. Alle acties en inspecties liggen op schema.</div>`) + permHtml
        + `<p class="s mritme">Acties: een week vóór de plandatum, daarna elke 2 dagen zolang ze te laat zijn. Inspecties die nog niet gedaan zijn: de dag erna, daarna elke 2 dagen.</p>`);
    },
    leesMelding(mid, aid) {
      const g = this._set("wpi_gelezen"); g.add(mid); this._bewaarSet("wpi_gelezen", g);
      // gemiste inspectie → Planning, met die ingeplande inspectie uitgelicht en met de focus (zie view_planning)
      if (/:gemist:/.test(mid)) { this._focusPlan = mid.split(":gemist:")[0]; this._modTerug = null; this.closeModal(); if (location.hash === "#/planning") this.route(); else this.go("planning"); return; }
      this.checkMeldingen(); this.openActie(aid);
    },
    // Vandaag: tegel "Inspectie nog niet gedaan" naast "Actie te laat"; opent de Planning. Alleen voor inspecties van
    // anderen (Hoofd S&M, coördinatoren): je eigen gemiste inspectie staat op Vandaag al bovenaan ("Nog te doen").
    _gemistTegel(act) {
      const lc = act && act.querySelector(".listcard"); if (!lc || lc.querySelector(".vgemist")) return;
      const P = this.planning || [], G = this.meldingen().filter((m) => m.soort === "gemist")
        .map((m) => P.find((x) => x.id === m.plan)).filter((p) => p && p.inspecteur !== this.user.id);
      if (!G.length) return;
      const n = G.length, p = G[0];
      const sub = n === 1 ? "Gepland " + dagLabel(p.datum) + " · " + this.productNaam(p.code) + " · " + naam(p.inspecteur) : kort(G.map((x) => this.productNaam(x.code)).join(" · "), 60);
      const b = document.createElement("div");
      b.innerHTML = `<button class="vknop warm vgemist"${WPI.act("go", "planning")}><span class="nr">${n}</span><span class="grow"><span class="t">${n === 1 ? "Inspectie" : "Inspecties"} nog niet gedaan</span><span class="s">${esc(sub)}</span></span>${svg("chev", 18)}</button>`;
      const laat = lc.querySelector(".vknop.laat");
      lc.insertBefore(b.firstElementChild, laat ? laat.nextSibling : lc.firstChild);
      const kop = act.querySelector(".vsectie"); if (kop && kop.textContent === "Acties") kop.textContent = "Acties en inspecties";
    },
    allesGelezen() { const g = this._set("wpi_gelezen"); this.meldingen().forEach((m) => g.add(m.id)); this._bewaarSet("wpi_gelezen", g); this.checkMeldingen(); this.openMeldingen(); },
  });
  // view_vandaag (js/vandaag.js) aanvullen: de tegel komt erbij zodra de actiekaart er staat
  const vandaagOrig = window.App.view_vandaag;
  if (vandaagOrig) window.App.view_vandaag = function () {
    const r = vandaagOrig.apply(this, arguments), act = $("mijnact");
    if (act) {
      const zet = () => { if (document.body.contains(act)) this._gemistTegel(act); };
      new MutationObserver(zet).observe(act, { childList: true });
      if (this.laadPlanning) this.laadPlanning().then(zet);
    }
    return r;
  };
})();
