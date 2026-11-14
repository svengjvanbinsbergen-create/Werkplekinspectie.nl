/* Werkplekinspectie — js/vandaag.js
   Vandaag-scherm: één blik = wat moet ik vandaag doen. De grote kaart bovenaan ÍS de startknop:
   één tik (de hele kaart, ook met handschoenen) start of hervat de inspectie; geen tweede startbalk
   met dezelfde tekst. Productkeuze voor een spontane inspectie.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, kort, isoDag, dagLabel, dagenTot, isWeb, mag, DB, tril, IC, act, actSluit, op, WAARDE } = window.WPI;
  // eigen pictogrammen voor dit scherm (zelfde stijl als kern.js)
  IC.play = IC.play || '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>';
  IC.klok = IC.klok || '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>';
  IC.pin = IC.pin || '<path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>';
  IC.mens = IC.mens || '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.6-5 5.5-5s5.5 2 5.5 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.6.7 2.6 2.2 2.6 4.6"/>';
  const meer = (n, een, veel) => n + " " + (n === 1 ? een : veel);

  Object.assign(window.App, {
    // ---------------- VANDAAG ----------------

    view_vandaag() {
      const v = $("view"), vn = this.user.full_name.split(" ")[0], u = new Date().getHours();
      const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
      const datum = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
      const lo = this.state.inspectie;
      // intussen definitief afgerond (bijv. in een ander tabblad)? Dan is hij geen lopend werk meer: opruimen en opnieuw tekenen
      if (lo && this.controleerAfgerond) this.controleerAfgerond().catch(() => {});   // tekent zelf opnieuw (alAfgerond, stil)
      const kop = el(`<div class="vkop"><div class="hi">${groet} ${esc(vn)} · ${esc(datum)}</div><h1 class="groot">${lo ? "Je inspectie loopt nog" : "&nbsp;"}</h1></div>`); v.appendChild(kop);
      if (this._spontaan) { this._spontaan = false; setTimeout(() => this.kiesProduct(), 0); }   // oude link-route blijft werken

      // telefoon: alles onder elkaar (zelfde volgorde als altijd). Groot scherm (css .vgrid.vandaaggrid): een raster
      // met rijen die even hoog zijn, zodat beide kolommen even ver doorlopen: [inspectie | acties],
      // [binnenkort gepland | laatste inspecties], daaronder "Meer" over de volle breedte.
      const grid = el(`<div class="vgrid vandaaggrid"><div class="vlinks"><div class="vtop"></div></div><div class="vrechts"><div class="vact"></div></div></div>`); v.appendChild(grid);
      const links = grid.firstElementChild, rechts = grid.lastElementChild, top = links.firstElementChild, vact = rechts.firstElementChild;
      // ---- lopende inspectie: altijd bovenaan ----
      if (lo) {
        const n = lo.waarnemingen.length, delen = lo.titel.split(" · ");
        top.appendChild(el(this.heroKnop("hero nu", act("goIns"), `Bezig · ${meer(n, "waarneming", "waarnemingen")}`, esc(delen[0]),
          `<span class="s">${esc(delen.slice(1).join(" · "))}${lo.taak ? (delen.length > 1 ? " · " : "") + esc(lo.taak) : ""}</span>`, "Verder met de inspectie", "play")));
      }

      // ---- gepauzeerde inspecties (alleen de eigen, op dit toestel): bovenaan, één tik = hervatten ----
      const pauzeDoos = el(`<div class="vpauze"></div>`);
      if (lo) top.appendChild(pauzeDoos); else top.insertBefore(pauzeDoos, top.firstChild);
      const melding = this._pauzeMelding; this._pauzeMelding = null;
      // net gepauzeerd: de kaart bovenaan zegt het al (geen tweede melding in beeld); wel voorlezen
      if (melding) WPI.zeg("Gepauzeerd: " + kort(melding.titel, 60) + ". Hervat met één tik op de kaart bovenaan.");
      const pauzes = mag("inspecteert") ? this.gepauzeerdeInspecties() : Promise.resolve([]);

      // ---- planning: eerstvolgende groot, de rest als rustige rijen ----
      const plan = el(`<div class="vplan"></div>`); top.appendChild(plan);
      const actKaart = el(`<div id="mijnact"></div>`); vact.appendChild(actKaart);
      const ander = el(`<div class="vmeer"></div>`); rechts.appendChild(ander);
      // groot scherm (≥ 1100px): de linkerkolom niet leeg laten onder één kaart. Wat er binnenkort gepland staat en
      // de laatste inspecties, rustig als rijen. Telefoon: niet getekend (zelfde scherm als altijd).
      const breed = window.matchMedia("(min-width: 1100px)").matches;
      const binnen = breed ? el(`<div class="vbinnen alleenbreed"></div>`) : null, laatst = breed ? el(`<div class="vlaatst alleenbreed"></div>`) : null;
      const pLaatst = breed ? (links.appendChild(binnen), rechts.insertBefore(laatst, ander), this.vandaagLaatste(laatst)) : null;   // rechts tussen Acties en Meer: kolommen even lang
      const pPlan = Promise.all([this.laadPlanning(), pauzes.catch(() => [])]).then(([, pz]) => {
        if (!document.body.contains(plan)) return;
        if (pz.length) pauzeDoos.innerHTML = this.pauzeKaarten(pz, !!lo);
        const vandaag = isoDag(new Date()), mijn = this.planning.filter((p) => p.inspecteur === this.user.id && p.status === "gepland" && p.datum <= vandaag).sort((a, b) => a.datum.localeCompare(b.datum));
        if (!lo && pz.length) kop.querySelector("h1").innerHTML = pz.length === 1 ? "Je inspectie staat op pauze" : pz.length + " inspecties op pauze";
        else if (!lo) kop.querySelector("h1").innerHTML = mijn.length === 1 ? "Eén inspectie te doen" : mijn.length ? mijn.length + " inspecties te doen" : "Niets gepland vandaag";
        const wanneer = (p) => p.datum < vandaag ? `<span class="nogte">Nog te doen · gepland ${esc(dagLabel(p.datum))}</span>` : "Vandaag";
        const waar = (p) => [p.locatie ? `<span>${svg("pin", 15)}${esc(p.locatie)}</span>` : "", p.monteurs ? `<span>${svg("mens", 15)}${meer(p.monteurs, "monteur", "monteurs")}</span>` : ""].join("");
        const rij = (p) => `<div class="vrij"><span class="grow"><span class="k">${wanneer(p)}${p.project ? " · " + esc(p.project) : ""}</span>
            <span class="t">${esc(this.productNaam(p.code))}</span><span class="meta">${waar(p)}</span></span>
            <button class="startpil"${act("startVandaag", p.id)} aria-label="Start inspectie ${esc(this.productNaam(p.code))}">${svg("play", 18)}Start</button></div>`;
        let html = "";
        // de lopende en de gepauzeerde inspecties staan al bovenaan (niet nog eens als gepland)
        const bezig = new Set([lo && lo.plan_id].concat(pz.map((c) => c.ins.plan_id)).filter(Boolean));
        const druk = !!(lo || pz.length), rest = druk ? mijn.filter((p) => !bezig.has(p.id)) : mijn.slice(1);
        // de kaart zelf is de knop: één doel, één tik
        if (!druk && mijn.length) {
          const p = mijn[0];
          html += this.heroKnop("hero", act("startVandaag", p.id), `${wanneer(p)}${p.project ? " · " + esc(p.project) : ""}`, esc(this.productNaam(p.code)),
            `<span class="meta">${waar(p)}</span>`, "Start inspectie", "play");
        }
        // groot scherm: onderin de kaart jouw eerstvolgende geplande inspectie (geen lege vlakte tussen tekst en knop)
        const volgend = this.planning.filter((p) => p.inspecteur === this.user.id && p.status === "gepland" && p.datum > vandaag).sort((a, b) => a.datum.localeCompare(b.datum))[0];
        const volgHtml = binnen ? `<span class="hk-volgend">${volgend
          ? `<span class="hv-dat" aria-hidden="true"><span class="w">${esc(new Date(volgend.datum + "T00:00").toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", ""))}</span><span class="d">${new Date(volgend.datum + "T00:00").getDate()}</span></span><span class="hv-t"><span class="hv-k">Jouw eerstvolgende inspectie</span><span class="hv-n">${esc(this.productNaam(volgend.code))} · ${esc(dagenTot(volgend.datum) === 1 ? "morgen" : dagLabel(volgend.datum))}${volgend.locatie ? " · " + esc(volgend.locatie) : ""}</span></span>`
          : `<span class="hv-t"><span class="hv-k">Jouw eerstvolgende inspectie</span><span class="hv-n">Nog niets op jouw naam ingepland</span></span>`}</span>` : "";
        if (!druk && !mijn.length) html += this.heroKnop("hero rustig", act("kiesProduct"), "Vandaag", "Geen inspectie gepland",
          `<span class="s">Start er spontaan een, of plan er een in.</span>${volgHtml}`, "Inspectie starten", "plus");
        if (rest.length) html += `<h2 class="vsectie">${druk ? "Daarna" : "Ook te doen"}</h2><div class="listcard vlijst">${rest.map(rij).join("")}</div>`;
        plan.innerHTML = html;
        if (binnen) this.vandaagBinnenkort(binnen, vandaag);
        // overige keuzes: rustig onderaan
        const spontaan = druk || mijn.length;
        ander.innerHTML = `<h2 class="vsectie">Meer</h2><div class="listcard vlijst">
            <button class="vknop"${act("planForm")}><span class="cirkel">${svg("cal", 20)}</span><span class="grow"><span class="t">Inspectie inplannen</span></span>${svg("chev", 18)}</button>
            ${spontaan ? `<button class="vknop"${act("kiesProduct")}><span class="cirkel">${svg("plus", 20)}</span><span class="grow"><span class="t">Andere inspectie starten</span></span>${svg("chev", 18)}</button>` : ""}</div>`;
      });

      // ---- acties: één rustige kaart, getal vooraan ----
      const pAct = this.laadActies().then(() => {
        if (!document.body.contains(actKaart)) return;
        const B = this.bakjes(), voorJou = B.instellen.length + B.toetsen.length + B.gepland.length;
        const laat = this.meldingen().filter((m) => m.soort === "laat");
        const nLaat = B.telaat.length;
        const uitleg = [B.instellen.length ? B.instellen.length + " in te stellen" : "", B.toetsen.length ? B.toetsen.length + " te toetsen" : "", B.gepland.length ? B.gepland.length + " lopend" : ""].filter(Boolean).join(" · ");
        const laatTekst = laat.length === 1 ? meer(-laat[0].d, "dag", "dagen") + " over de plandatum · " + esc(kort(laat[0].titel.replace(/^Te laat: /, ""), 40)) : "Over de plandatum · hele team";
        actKaart.innerHTML = `<h2 class="vsectie">Acties</h2><div class="listcard vlijst">
            ${nLaat ? `<button class="vknop laat"${act("naarActies", "telaat")}><span class="nr">${nLaat}</span><span class="grow"><span class="t">${nLaat === 1 ? "Actie" : "Acties"} te laat</span><span class="s">${laatTekst}</span></span>${svg("chev", 18)}</button>` : ""}
            <button class="vknop"${act("naarActies", null)}><span class="nr${voorJou ? "" : " nul"}">${voorJou ? voorJou : svg("check", 18, 2.6)}</span><span class="grow"><span class="t">${voorJou ? (voorJou === 1 ? "Actie" : "Acties") + " voor jou" : "Geen acties voor jou"}</span><span class="s">${voorJou ? uitleg : "Alles ligt op schema"}</span></span>${svg("chev", 18)}</button></div>`;
      });
      // bij het openen van de app: de lader (js/laden.js) blijft staan tot planning, acties en (groot scherm) de
      // laatste inspecties getekend zijn; dan staat het scherm er in één keer (geen verspringende kaarten op een traag toestel)
      if (window.WPI.laad && window.WPI.laad.opstartHoud) window.WPI.laad.opstartHoud([pPlan, pAct, pLaatst]);
    },
    // groot scherm: binnenkort gepland (team voor wie alles ziet, anders alleen de eigen inspecties), komende 14 dagen
    vandaagBinnenkort(doos, vandaag) {
      const team = mag("zietAlles"), me = this.user.id;
      // de komende 14 dagen; staan daar minder dan vier, dan ook de eerstvolgende daarna (tot vier), zodat de kaart
      // even veel rijen heeft als "Laatste inspecties" ernaast en niet met een lege strook boven de voetregel staat
      const alle = (this.planning || []).filter((p) => p.status === "gepland" && p.datum > vandaag && (team || p.inspecteur === me))
        .sort((a, b) => a.datum.localeCompare(b.datum));
      const binnen14 = alle.filter((p) => dagenTot(p.datum) <= 14), lijst = binnen14.length >= 4 ? binnen14 : alle.slice(0, Math.max(4, binnen14.length));
      const dag = (iso) => { const d = new Date(iso + "T00:00"); return `<span class="vdat" aria-hidden="true"><span class="w">${esc(d.toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", ""))}</span><span class="d">${d.getDate()}</span></span>`; };
      const rij = (p) => `<button class="vknop vkbreed"${act("go", "planning")}>${dag(p.datum)}<span class="grow"><span class="t">${esc(this.productNaam(p.code))}</span>
          <span class="s">${esc(dagenTot(p.datum) === 1 ? "Morgen" : dagLabel(p.datum))}${p.project ? " · " + esc(p.project) : ""}${p.locatie ? " · " + esc(p.locatie) : ""}</span></span>
          ${team ? `<span class="vkwie"><span class="sr-only">Inspecteur:</span>${WPI.inspLabel(p.inspecteur)}</span>` : ""}${svg("chev", 18)}</button>`;
      doos.innerHTML = `<h2 class="vsectie">Binnenkort gepland${lijst.length ? ` <span class="vtel">${lijst.length}</span>` : ""}</h2><div class="listcard vlijst">${lijst.length
        ? lijst.slice(0, 4).map(rij).join("")
        : `<div class="vrij"><span class="grow"><span class="t">Niets gepland de komende twee weken</span><span class="meta">${mag("plant") ? "Plan een inspectie in via “Inspectie inplannen”." : "De hoofden en coördinatoren plannen de inspecties."}</span></span></div>`}
        <button class="vknop vkvoet"${act("go", "planning")}><span class="grow"><span class="t">${lijst.length > 4 ? `Nog ${lijst.length - 4} in de planning` : "Hele planning bekijken"}</span></span>${svg("chev", 18)}</button></div>`;
      this._vGelijk();
    },
    // groot scherm: "Binnenkort gepland" en "Laatste inspecties" staan naast elkaar in een rij van gelijke hoogte.
    // Laatste inspecties toont niet meer rijen dan Binnenkort (minimaal drie), zodat er geen lege strook in de
    // kortste kaart valt. Beide laden los van elkaar: wie het laatst klaar is, gelijkt ze.
    _vGelijk() {
      const b = document.querySelector("#view .vbinnen .listcard"), l = document.querySelector("#view .vlaatst .listcard"); if (!b || !l) return;
      const nb = b.querySelectorAll(".vknop.vkbreed").length;
      [...l.querySelectorAll(".vknop.vkbreed")].slice(Math.max(nb, 3)).forEach((r) => r.remove());
    },
    // groot scherm: de laatste inspecties (eigen op dit toestel + voorbeelden, zoals op Inspecties)
    async vandaagLaatste(doos) {
      const team = mag("zietAlles"), me = this.user.id;
      let saved = []; try { saved = await DB.all(); } catch (e) {}
      if (!document.body.contains(doos)) return;
      const rijen = saved.filter((r) => team || r.inspecteur_id === me).map((r) => ({ eigen: true, id: r.id, titel: r.titel, datum: (r.opgeslagen || "").slice(0, 10), inspecteur: r.inspecteur, inspecteur_id: r.inspecteur_id || null }))
        .concat(team ? ((this.data.voorbeelddata || {}).wpis || []).map((w) => ({ eigen: false, id: w.nr, titel: w.product + (w.locatie ? " · " + w.locatie : ""), datum: w.datum, inspecteur: w.inspecteur })) : [])
        .filter((r) => r.datum).sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 4);
      if (!rijen.length) { const g = doos.closest(".vgrid"); if (g) g.classList.add("zonderlaatst"); doos.remove(); return; }
      doos.innerHTML = `<h2 class="vsectie">Laatste inspecties</h2><div class="listcard vlijst">${rijen.map((r) => `<button class="vknop vkbreed"${act("go", r.eigen ? "rapport/" + r.id : "inspecties")}>
          <span class="cirkel">${svg("list", 20)}</span><span class="grow"><span class="t">${esc(kort(String(r.titel || "").split(" · ")[0], 40))}</span><span class="s">${esc([dagLabel(r.datum)].concat(String(r.titel || "").split(" · ").slice(1)).join(" · "))}${r.eigen ? " · op dit toestel" : " · voorbeeld"}</span></span>
          <span class="vkwie"><span class="sr-only">Inspecteur:</span>${WPI.inspLabel(r.inspecteur_id, r.inspecteur)}</span>${svg("chev", 18)}</button>`).join("")}
          <button class="vknop vkvoet"${act("go", "inspecties")}><span class="grow"><span class="t">Alle inspecties bekijken</span></span>${svg("chev", 18)}</button></div>`;
      this._vGelijk();
    },
    // grote kaart = startknop. Alleen <span>'s (geldige inhoud van een <button>); de groene balk onderin
    // maakt duidelijk dat de hele kaart tikbaar is. kop/titel/inhoud zijn al ge-escapete HTML.
    heroKnop(cls, actie, kop, titel, inhoud, knop, ic) {   // actie = attributen van act(…)
      return `<button class="${cls} heroknop"${actie}><span class="k">${kop}</span><span class="t">${titel}</span>${inhoud || ""}
        <span class="hk-balk"><span class="ic">${svg(ic, 22)}</span><span class="hk-t">${esc(knop)}</span>${svg("chev", 22, 2.6)}</span></button>`;
    },
    startVandaag(id) { tril(20); this.startGepland(id); },
    // "Gepauzeerd · Hervatten": de eerste als grote kaart (de kaart is de knop), de overige als rijen met een Hervatten-pil.
    // Met een lopende inspectie erboven: alle als rijen (die lopende gaat voor). Tijd = wanneer gepauzeerd.
    pauzeKaarten(pz, lopend) {
      const wanneer = (t) => { const d = new Date(t); if (isNaN(d)) return ""; const dag = isoDag(d) === isoDag(new Date()) ? "vandaag" : dagLabel(isoDag(d)); return dag + " " + d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }); };
      const info = (c) => {
        const i = c.ins, delen = String(i.titel || "Inspectie").split(" · "), n = (i.waarnemingen || []).length;
        return { id: String(i.id || ""), obj: delen[0], waar: delen.slice(1).join(" · "), n, tijd: wanneer(c.t), stap: ({ taak: "bij de taakkeuze", zie: "bij een waarneming", koppel: "bij de TRA-koppeling", oordeel: "bij het oordeel", actie: "bij het actievoorstel", meer: "na een waarneming", algemeen: "bij de algemene onderwerpen", monteurs: "bij het gesprek", klaar: "bij afronden" })[i.stap] || "" };
      };
      const meta = (x) => [x.waar ? `<span>${svg("pin", 15)}${esc(x.waar)}</span>` : "", `<span>${svg("klok", 15)}Gepauzeerd ${esc(x.tijd)}</span>`].join("");
      const sub = (x) => esc(meer(x.n, "waarneming", "waarnemingen") + (x.stap ? " · " + x.stap : ""));
      const lijst = pz.map(info).filter((x) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(x.id));
      if (!lijst.length) return "";
      const rij = (x) => `<div class="vrij pauzerij"><span class="grow"><span class="k">Gepauzeerd · ${esc(meer(x.n, "waarneming", "waarnemingen"))}</span>
          <span class="t">${esc(x.obj)}</span><span class="meta">${meta(x)}</span></span>
          <button class="startpil"${act("hervatInspectie", x.id)} data-laad aria-label="Hervatten: ${esc(x.obj)}">${svg("play", 18)}Hervatten</button></div>`;
      if (lopend) return `<h2 class="vsectie">Gepauzeerd</h2><div class="listcard vlijst">${lijst.map(rij).join("")}</div>`;
      const [eerste, ...rest] = lijst;
      return this.heroKnop("hero pauze", act("hervatInspectie", eerste.id) + " data-laad", `Gepauzeerd · ${sub(eerste)}`, esc(eerste.obj), `<span class="meta">${meta(eerste)}</span>`, "Hervatten", "play")
        + (rest.length ? `<h2 class="vsectie">Ook gepauzeerd</h2><div class="listcard vlijst">${rest.map(rij).join("")}</div>` : "");
    },
    kiesProduct() {
      tril(12);
      this.openModal("Andere inspectie starten", "Kies wat je gaat bekijken. Je start meteen.",
        `<input id="zoek" class="fin" aria-label="Zoek product" placeholder="Zoek product…"${op("input", "filterProd", WAARDE)} autocomplete="off" style="margin-bottom:10px">
         <div class="listcard" id="prodlist">${this.productKeuzeRows()}</div>`);
      if (isWeb()) { const z = $("zoek"); if (z) z.focus(); }
    },
    productKeuzeRows() {
      const kb = this.data.kennisbank;
      return Object.keys(kb).sort((a, b) => kb[a].naam.localeCompare(kb[b].naam, "nl")).map((code) =>
        `<div class="row prodrij" data-naam="${esc(kb[code].naam.toLowerCase())}" style="cursor:pointer"${actSluit("startInspectie", code, "", kb[code].naam)}>
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
