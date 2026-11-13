/* Werkplekinspectie — js/vandaag.js
   Vandaag-scherm: één blik = wat moet ik vandaag doen. De eerstvolgende inspectie start met één tik
   via de startbalk onderin (duimzone, ook met handschoenen). Productkeuze voor een spontane inspectie.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, kort, isoDag, dagLabel, isWeb, tril, IC } = window.WPI;
  // eigen pictogrammen voor dit scherm (zelfde stijl als kern.js)
  IC.play = IC.play || '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>';
  IC.klok = IC.klok || '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>';
  IC.pin = IC.pin || '<path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>';
  IC.mens = IC.mens || '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.6-5 5.5-5s5.5 2 5.5 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.6.7 2.6 2.2 2.6 4.6"/>';
  const meer = (n, een, veel) => n + " " + (n === 1 ? een : veel);

  Object.assign(window.App, {
    // ---------------- VANDAAG ----------------

    view_vandaag() {
      const v = $("view"), vn = this.user.full_name.split(" ")[0], u = new Date().getHours(), web = isWeb();
      const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
      const datum = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
      const lo = this.state.inspectie;
      const kop = el(`<div class="vkop"><div class="hi">${groet} ${esc(vn)} · ${esc(datum)}</div><h1 class="groot">${lo ? "Je inspectie loopt nog" : "&nbsp;"}</h1></div>`); v.appendChild(kop);
      if (this._spontaan) { this._spontaan = false; setTimeout(() => this.kiesProduct(), 0); }   // oude link-route blijft werken

      // ---- lopende inspectie: altijd bovenaan ----
      if (lo) {
        const n = lo.waarnemingen.length, delen = lo.titel.split(" · ");
        v.appendChild(el(`<div class="hero nu"><div class="k">Bezig · ${meer(n, "waarneming", "waarnemingen")}</div><div class="t">${esc(delen[0])}</div>
          <div class="s">${esc(delen.slice(1).join(" · "))}${lo.taak ? (delen.length > 1 ? " · " : "") + esc(lo.taak) : ""}</div></div>`));
        this.vDock(v, "App.goIns()", "Verder met de inspectie", delen[0] + " · " + meer(n, "waarneming", "waarnemingen"), "play");
      }

      // ---- planning: eerstvolgende groot, de rest als rustige rijen ----
      const plan = el(`<div class="vplan"></div>`); v.appendChild(plan);
      const act = el(`<div id="mijnact"></div>`); v.appendChild(act);
      const ander = el(`<div class="vmeer"></div>`); v.appendChild(ander);
      this.laadPlanning().then(() => {
        if (!document.body.contains(plan)) return;
        const vandaag = isoDag(new Date()), mijn = this.planning.filter((p) => p.inspecteur === this.user.id && p.status === "gepland" && p.datum <= vandaag).sort((a, b) => a.datum.localeCompare(b.datum));
        if (!lo) kop.querySelector("h1").innerHTML = mijn.length === 1 ? "Eén inspectie te doen" : mijn.length ? mijn.length + " inspecties te doen" : "Niets gepland vandaag";
        const wanneer = (p) => p.datum < vandaag ? `<span class="nogte">Nog te doen · gepland ${esc(dagLabel(p.datum))}</span>` : "Vandaag";
        const waar = (p) => [p.locatie ? `<span>${svg("pin", 15)}${esc(p.locatie)}</span>` : "", p.monteurs ? `<span>${svg("mens", 15)}${meer(p.monteurs, "monteur", "monteurs")}</span>` : ""].join("");
        const rij = (p) => `<div class="vrij"><span class="grow"><span class="k">${wanneer(p)}${p.project ? " · " + esc(p.project) : ""}</span>
            <span class="t">${esc(this.productNaam(p.code))}</span><span class="meta">${waar(p)}</span></span>
            <button class="startpil" onclick="App.startVandaag('${p.id}')" aria-label="Start inspectie ${esc(this.productNaam(p.code))}">${svg("play", 18)}Start</button></div>`;
        let html = "";
        const rest = lo ? mijn : mijn.slice(1);
        if (!lo && mijn.length) {
          const p = mijn[0];
          html += `<div class="hero"><div class="k">${wanneer(p)}${p.project ? " · " + esc(p.project) : ""}</div>
            <div class="t">${esc(this.productNaam(p.code))}</div><div class="meta">${waar(p)}</div></div>`;
        }
        if (!lo && !mijn.length) html += `<div class="hero rustig"><div class="k">Vandaag</div><div class="t">Geen inspectie gepland</div><div class="s">Start er spontaan een, of plan er een in.</div></div>`;
        if (rest.length) html += `<div class="vsectie">${lo ? "Daarna" : "Ook te doen"}</div><div class="listcard vlijst">${rest.map(rij).join("")}</div>`;
        plan.innerHTML = html;
        if (!lo) {
          if (mijn.length) this.vDock(plan, `App.startVandaag('${mijn[0].id}')`, "Start inspectie", this.productNaam(mijn[0].code) + (mijn[0].locatie ? " · " + mijn[0].locatie : ""), "play", web ? plan.firstElementChild : null);
          else this.vDock(plan, "App.kiesProduct()", "Inspectie starten", "Kies wat je gaat bekijken", "plus", web ? plan.firstElementChild : null);
        }
        // overige keuzes: rustig onderaan
        const spontaan = lo || mijn.length;
        ander.innerHTML = `<div class="vsectie">Meer</div><div class="listcard vlijst">
            <button class="vknop" onclick="App.planForm()"><span class="cirkel">${svg("cal", 20)}</span><span class="grow"><span class="t">Inspectie inplannen</span></span>${svg("chev", 18)}</button>
            ${spontaan ? `<button class="vknop" onclick="App.kiesProduct()"><span class="cirkel">${svg("plus", 20)}</span><span class="grow"><span class="t">Andere inspectie starten</span></span>${svg("chev", 18)}</button>` : ""}</div>`;
      });

      // ---- acties: één rustige kaart, getal vooraan ----
      this.laadActies().then(() => {
        if (!document.body.contains(act)) return;
        const B = this.bakjes(), voorJou = B.instellen.length + B.toetsen.length + B.gepland.length;
        const laat = this.meldingen().filter((m) => m.soort === "laat");
        const nLaat = B.telaat.length;
        const uitleg = [B.instellen.length ? B.instellen.length + " in te stellen" : "", B.toetsen.length ? B.toetsen.length + " te toetsen" : "", B.gepland.length ? B.gepland.length + " lopend" : ""].filter(Boolean).join(" · ");
        const laatTekst = laat.length === 1 ? meer(-laat[0].d, "dag", "dagen") + " over de plandatum · " + esc(kort(laat[0].titel.replace(/^Te laat: /, ""), 40)) : "Over de plandatum · hele team";
        act.innerHTML = `<div class="vsectie">Acties</div><div class="listcard vlijst">
            ${nLaat ? `<button class="vknop warm" onclick="App.actFilter='telaat';App.go('acties')"><span class="nr">${nLaat}</span><span class="grow"><span class="t">${nLaat === 1 ? "Actie" : "Acties"} te laat</span><span class="s">${laatTekst}</span></span>${svg("chev", 18)}</button>` : ""}
            <button class="vknop" onclick="App.actFilter=null;App.go('acties')"><span class="nr${voorJou ? "" : " nul"}">${voorJou ? voorJou : svg("check", 18, 2.6)}</span><span class="grow"><span class="t">${voorJou ? (voorJou === 1 ? "Actie" : "Acties") + " voor jou" : "Geen acties voor jou"}</span><span class="s">${voorJou ? uitleg : "Alles ligt op schema"}</span></span>${svg("chev", 18)}</button></div>`;
      });
    },
    // startbalk: telefoon = vast onderin boven de tabbalk (duimzone); computer = direct onder de kaart
    vDock(ouder, onclick, label, sub, ic, naHero) {
      const d = el(`<div class="vdock"><button class="btn primary groot" onclick="${onclick}"><span class="ic">${svg(ic, 22)}</span><span class="tekst"><b>${esc(label)}</b><small>${esc(sub || "")}</small></span></button></div>`);
      if (naHero && naHero.parentNode === ouder) ouder.insertBefore(d, naHero.nextSibling); else ouder.appendChild(d);
      const plaats = () => { const tb = $("tabbar"); d.style.bottom = (tb && !tb.classList.contains("hidden") && !isWeb() ? tb.offsetHeight : 0) + "px"; };
      plaats(); requestAnimationFrame(plaats);
    },
    startVandaag(id) { tril(20); this.startGepland(id); },
    kiesProduct() {
      tril(12);
      this.openModal("Andere inspectie starten", "Kies wat je gaat bekijken. Je start meteen.",
        `<input id="zoek" class="fin" placeholder="Zoek product…" oninput="App.filterProd(this.value)" autocomplete="off" style="margin-bottom:10px">
         <div class="listcard" id="prodlist">${this.productKeuzeRows()}</div>`);
      if (isWeb()) { const z = $("zoek"); if (z) z.focus(); }
    },
    productKeuzeRows() {
      const kb = this.data.kennisbank;
      return Object.keys(kb).sort((a, b) => kb[a].naam.localeCompare(kb[b].naam, "nl")).map((code) =>
        `<div class="row prodrij" data-naam="${esc(kb[code].naam.toLowerCase())}" style="cursor:pointer" onclick="App.closeModal();App.startInspectie('${code}','spontaan','${esc(kb[code].naam)}')">
          <span class="grow"><span class="t">${esc(kb[code].naam)}</span> <span class="s">· ${kb[code].regels.length} regels</span></span>
          <span class="s">${svg("chev", 18)}</span></div>`).join("");
    },
    filterProd(q) {
      q = (q || "").toLowerCase().trim();
      document.querySelectorAll("#prodlist .row").forEach((r) => {
        r.style.display = (!q || r.getAttribute("data-naam").includes(q)) ? "" : "none";
      });
    },
  });
})();
