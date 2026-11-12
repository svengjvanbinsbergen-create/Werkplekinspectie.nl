/* Werkplekinspectie — js/meldingen.js
   Meldingen: plandatum-meldingen, bel, alertbalk en systeemmeldingen.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, esc, svg, naam, kort, dagLabel, dagenTot } = window.WPI;
  Object.assign(window.App, {
    // ---- meldingen over plandata: 1× een week vooraf, daarna na verstrijken elke 2 dagen; voor iedereen ----
    meldingen() {
      const uit = [];
      (this.acties || []).filter((a) => (a.status === "Open" || a.status === "In uitvoering") && a.plandatum).forEach((a) => {
        const d = dagenTot(a.plandatum);
        if (d < 0) {
          const k = Math.floor((-d - 1) / 2);   // dag 1, 3, 5 … na de plandatum telt als nieuwe melding
          uit.push({ id: a.id + ":laat:" + k, actie: a.id, soort: "laat", d, titel: "Te laat: " + kort(a.tekst, 70),
            tekst: `Plandatum ${dagLabel(a.plandatum)} is ${-d} dag${-d === 1 ? "" : "en"} verstreken · actiehouder ${naam(a.houder)}` });
        } else if (d <= 7) {
          uit.push({ id: a.id + ":week", actie: a.id, soort: "week", d, titel: (d === 0 ? "Vandaag" : "Over " + d + " dag" + (d === 1 ? "" : "en")) + ": " + kort(a.tekst, 70),
            tekst: `Plandatum ${dagLabel(a.plandatum)} · actiehouder ${naam(a.houder)}` });
        }
      });
      return uit.sort((x, y) => x.d - y.d);
    },
    _set(k) { try { return new Set(JSON.parse(localStorage.getItem(k + "_" + this.user.id) || "[]")); } catch (e) { return new Set(); } },
    _bewaarSet(k, set) { try { localStorage.setItem(k + "_" + this.user.id, JSON.stringify([...set].slice(-400))); } catch (e) {} },
    async checkMeldingen() {
      if (!this.user) return;
      await this.laadActies(); if (!this.user) return;
      const M = this.meldingen(), gelezen = this._set("wpi_gelezen"), getoond = this._set("wpi_getoond");
      const ongelezen = M.filter((m) => !gelezen.has(m.id));
      const nr = $("belnr"); if (nr) { nr.textContent = ongelezen.length; nr.classList.toggle("hidden", !ongelezen.length); }
      // vaste alert in beeld zolang er acties over de plandatum zijn (niet tijdens het inspecteren)
      const laat = M.filter((m) => m.soort === "laat"), al = $("alert");
      if (al) {
        al.classList.toggle("hidden", !laat.length || this._page === "inspectie" || this._page === "vandaag" || !location.hash || location.hash === "#/");
        al.innerHTML = laat.length ? `${svg("warn", 16)}<span class="al-t">${laat.length} actie${laat.length === 1 ? "" : "s"} over de plandatum</span><b>Bekijk ›</b>` : "";
      }
      // meldingen van het toestel (als toegestaan) voor alles wat nog niet getoond is
      let nieuw = false;
      for (const m of ongelezen) { if (getoond.has(m.id)) continue; if (await this.systeemMelding(m)) { getoond.add(m.id); nieuw = true; } }
      if (nieuw) this._bewaarSet("wpi_getoond", getoond);
    },
    async systeemMelding(m) {
      try {
        if (!("Notification" in window) || Notification.permission !== "granted") return false;
        const opt = { body: m.tekst, icon: "icon-192.png", badge: "icon-192.png", tag: m.id, data: { hash: "#/acties" } };
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg) await reg.showNotification(m.titel, opt); else new Notification(m.titel, opt);
        return true;
      } catch (e) { return false; }
    },
    async meldingenAan() {
      try { const r = await Notification.requestPermission(); if (r === "granted") { this._bewaarSet("wpi_getoond", new Set()); await this.checkMeldingen(); } } catch (e) {}
      this.openMeldingen();
    },
    async openMeldingen() {
      await this.laadActies();
      const M = this.meldingen(), gelezen = this._set("wpi_gelezen");
      const perm = !("Notification" in window) ? "nee" : Notification.permission;
      const permHtml = perm === "granted" ? `<div class="s" style="margin-top:12px">✓ Meldingen op dit toestel staan aan.</div>`
        : perm === "denied" ? `<div class="hint" style="margin-top:12px">Meldingen zijn op dit toestel geblokkeerd. Zet ze aan in de instellingen van je browser. In de app zie je ze altijd hier.</div>`
        : perm === "nee" ? `<div class="s" style="margin-top:12px">Dit toestel ondersteunt geen meldingen in deze weergave; je ziet ze altijd hier en in de rode balk.</div>`
        : `<button class="btn primary" style="margin-top:14px" onclick="App.meldingenAan()">${svg("bell", 18)} Meldingen op dit toestel aanzetten</button>`;
      this.openModal("Meldingen", "Een week vóór de plandatum één keer; daarna elke 2 dagen zolang de actie te laat is. Iedereen krijgt ze.",
        (M.length ? `<div class="listcard">${M.map((m) => `<div class="row" style="cursor:pointer" onclick="App.leesMelding('${m.id}','${m.actie}')">
            <span style="width:10px;height:10px;border-radius:50%;flex:none;background:${gelezen.has(m.id) ? "transparent" : m.soort === "laat" ? "var(--red)" : "var(--amber)"}"></span>
            <span class="grow"><span class="t" style="${gelezen.has(m.id) ? "font-weight:500" : ""}">${esc(m.titel)}</span><div class="s">${esc(m.tekst)}</div></span>
            <span class="badge ${m.soort === "laat" ? "b-A" : "b-V"}">${m.soort === "laat" ? "te laat" : "binnen 7 d"}</span></div>`).join("")}</div>
            <button class="btn ghost sm" style="margin-top:10px" onclick="App.allesGelezen()">Alles gelezen</button>`
          : `<div class="s">Geen meldingen. Alle acties liggen op schema.</div>`) + permHtml);
    },
    leesMelding(mid, aid) { const g = this._set("wpi_gelezen"); g.add(mid); this._bewaarSet("wpi_gelezen", g); this.checkMeldingen(); this.openActie(aid); },
    allesGelezen() { const g = this._set("wpi_gelezen"); this.meldingen().forEach((m) => g.add(m.id)); this._bewaarSet("wpi_gelezen", g); this.checkMeldingen(); this.openMeldingen(); },
  });
})();
