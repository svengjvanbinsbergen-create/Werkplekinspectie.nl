/* Werkplekinspectie — js/vandaag.js
   Vandaag-scherm: start van de dag, productkeuze voor een nieuwe inspectie.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, kort, isoDag, dagLabel } = window.WPI;
  Object.assign(window.App, {
    // ---------------- VANDAAG ----------------

    view_vandaag() {
      const v = $("view"), vn = this.user.full_name.split(" ")[0], u = new Date().getHours();
      const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
      const lo = this.state.inspectie;
      const kop = el(`<div><div class="hi">${groet} ${esc(vn)} 👋</div><h1 class="groot">${lo ? "Je inspectie<br>loopt nog" : "&nbsp;"}</h1></div>`); v.appendChild(kop);
      if (lo) {
        const n = lo.waarnemingen.length;
        v.appendChild(el(`<div class="hero paars"><div class="k">Bezig · ${n} waarneming${n === 1 ? "" : "en"}</div><div class="t">${esc(lo.titel.split(" · ")[0])}</div>
          <div class="s">${esc(lo.titel.split(" · ").slice(1).join(" · ") || "")}${lo.taak ? " · " + esc(lo.taak) : ""}</div>
          <button class="btn primary" onclick="App.goIns()">Verder met de inspectie</button></div>`));
      }
      const plan = el(`<div></div>`); v.appendChild(plan);
      this.laadPlanning().then(() => {
        if (!document.body.contains(plan)) return;
        const vandaag = isoDag(new Date()), mijn = this.planning.filter((p) => p.inspecteur === this.user.id && p.status === "gepland" && p.datum <= vandaag).sort((a, b) => a.datum.localeCompare(b.datum));
        if (!lo) kop.querySelector("h1").innerHTML = mijn.length === 1 ? "Eén inspectie<br>op de planning" : mijn.length ? mijn.length + " inspecties<br>op de planning" : "Niets gepland<br>voor vandaag";
        plan.innerHTML = mijn.map((p) => `<div class="hero${lo ? " klein" : ""}"><div class="k">${p.datum < vandaag ? "Nog te doen · gepland " + dagLabel(p.datum) : "Vandaag"} · ${esc(p.project || "")}</div>
            <div class="t">${esc(this.productNaam(p.code))}</div><div class="s">${esc(p.locatie || "")}${p.monteurs ? " · " + p.monteurs + " monteurs" : ""}</div>
            <button class="btn primary" onclick="App.startGepland('${p.id}')">Start inspectie</button></div>`).join("")
          + (mijn.length ? "" : `<div class="hero rustig"><div class="k">Vandaag</div><div class="t">Geen inspectie gepland</div><div class="s">Plan er een in, of start er spontaan een.</div></div>`)
          + `<button class="btn ghost plannen" onclick="App.planForm()">${svg("cal", 20)} Inspectie inplannen</button>`;
      });
      const act = el(`<div id="mijnact"></div>`); v.appendChild(act);
      this.laadActies().then(() => {
        if (!document.body.contains(act)) return;
        const B = this.bakjes(), voorJou = B.instellen.length + B.toetsen.length + B.gepland.length;
        const laat = this.meldingen().filter((m) => m.soort === "laat");
        act.innerHTML = `<div class="duo">
            <button class="pil${B.telaat.length ? " warm" : ""}" onclick="App.actFilter='telaat';App.go('acties')"><span class="n">${B.telaat.length}</span><span class="l">te laat</span></button>
            <button class="pil" onclick="App.actFilter=null;App.go('acties')"><span class="n">${voorJou}</span><span class="l">${voorJou === 1 ? "actie" : "acties"} voor jou</span></button></div>
          ${laat.length ? `<button class="notitie" onclick="App.actFilter='telaat';App.go('acties')"><span class="em">⏰</span><span>${laat.length === 1 ? esc(kort(laat[0].titel.replace(/^Te laat: /, ""), 46)) + " is " + (-laat[0].d) + " dag" + (laat[0].d === -1 ? "" : "en") + " over de plandatum" : laat.length + " acties zijn over de plandatum"}</span></button>` : ""}`;
      });
      if (!this._spontaan) v.appendChild(el(`<button class="linkknop" onclick="App._spontaan=true;App.route()">Andere inspectie starten</button>`));
      else {
        v.appendChild(el(`<h2>Andere inspectie starten</h2>`));
        v.appendChild(el(`<input id="zoek" class="fin" placeholder="Zoek product…" oninput="App.filterProd(this.value)" autocomplete="off" style="margin-bottom:10px">`));
        v.appendChild(el(`<div class="listcard" id="prodlist">${this.productKeuzeRows()}</div>`));
        v.appendChild(el(`<button class="linkknop" onclick="App._spontaan=false;App.route()">Inklappen</button>`));
      }
    },
    productKeuzeRows() {
      const kb = this.data.kennisbank;
      return Object.keys(kb).map((code) =>
        `<div class="row" data-naam="${esc(kb[code].naam.toLowerCase())}" style="cursor:pointer" onclick="App.startInspectie('${code}','spontaan','${esc(kb[code].naam)}')">
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
