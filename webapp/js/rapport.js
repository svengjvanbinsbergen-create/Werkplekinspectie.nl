/* Werkplekinspectie — js/rapport.js
   Het inspectierapport als echt PDF-bestand (geen window.print). Eigen, kleine PDF-schrijver: geen bibliotheek,
   geen eval/new Function en geen verzoeken naar buiten (werkt onder de strikte CSP en offline: de lettertypen staan
   in de cache van de service worker). Wordt pas geladen als er een rapport nodig is (App.laadRapportModule in
   js/inspecties.js) en zet alleen WPI.rapportPdf.

   WPI.rapportPdf.maak(model, { stap(tekst, pct) }) → Promise<Blob application/pdf>
     model = App.rapportModel(record) (js/inspecties.js): dezelfde inhoud als het rapport in de app.

   Huisstijl B op witte pagina's (printvriendelijk): afgeronde kaarten met een lichte rand, crème/groene accentvlakken,
   donkergroen accent (#2F5D50), Nunito
   (fonts/nunito-pdf-400.ttf en -800.ttf: @fontsource/nunito 5.3.0, Latijnse subset, ongewijzigd van WOFF naar TrueType
   omgezet; SIL Open Font License, zie fonts/OFL.txt). Ingebed als TrueType (Identity-H) met ToUnicode, zodat de tekst
   te zoeken en te kopiëren is. Lukt het laden van het lettertype niet, dan Helvetica (standaardlettertype van elke PDF-lezer).
   Tekens die niet in het lettertype staan (≥, →, emoji …) worden nooit vervangen: ze komen als klein beeld in de PDF,
   met de echte tekens onzichtbaar erachter (zoeken en kopiëren geven precies wat de inspecteur schreef).
   Twee standen (model.stand): "afronden" (de momentopname met de acties zoals bij afronden; zo gaat hij naar de
   mailbox en het archief) en "actueel" (Deel als PDF: precies dezelfde ondertekende momentopname, plus de bijlage
   met de acties van nu — actiehouder, toetser, plandatum, status, wie toetste en wanneer, laatste stap — en de
   aanvullingen na afronden).
   Foto's worden verkleind (max. 900 px, JPEG) en als JPEG (DCTDecode) ingevoegd; de handtekening op wit.
   Is het rapport zonder handtekening afgerond, dan zegt ook de standtekst en de bijlage dat (geen "ondertekend").
   De ondertekende momentopname eindigt met de handtekening (en de voetnoot op dezelfde pagina). Bij "actueel" volgt
   daarna, op een nieuwe pagina, een BIJLAGE die uitdrukkelijk niet ondertekend is: de actuele stand van de acties en
   de aanvullingen (met nagekomen foto's). Zo dekt de handtekening nooit tekst die later is toegevoegd.
   Getagd (tagged PDF, /MarkInfo /Marked true): koppen, alinea's, bijschriften en foto's (met beschrijving) in
   leesvolgorde; vlakken, lijnen en de paginavoet zijn Artifact. Taal nl-NL. */
(function () {
  "use strict";
  const WPI = window.WPI = window.WPI || {};
  const PW = 595.28, PH = 841.89, M = 40, KOP = 40, VOET = 46, BREED = PW - 2 * M;
  const K = { bg: "#FAF6EF", ink: "#2A2622", soft: "#72665A", line: "#E4D9C9", accent: "#2F5D50", accentBg: "#DCEBE3",
    green: "#1E7A4C", greenBg: "#E6F4EC", red: "#B42318", redBg: "#FDECEA", amber: "#6B5300", amberBg: "#FFF3BF",
    butter: "#F4EFE7", mist: "#F3F4F6", wit: "#FFFFFF", sage: "#EDF5E4" };
  const OORDEEL = { C: ["Conform", K.green, K.greenBg], A: ["Afwijking", K.red, K.redBg], V: ["Verbeterpunt", K.amber, K.amberBg], NVT: ["Niet van toepassing", K.soft, K.mist] };
  const getal = (n) => (Math.round(n * 100) / 100).toString();
  const rgb = (hex) => { const h = hex.replace("#", ""); return [0, 2, 4].map((i) => getal(parseInt(h.slice(i, i + 2), 16) / 255)).join(" "); };
  const enc = new TextEncoder();

  // ---------------- TrueType lezen (alleen wat de PDF nodig heeft) ----------------
  function leesTTF(buf, psNaam) {
    const v = new DataView(buf), n = v.getUint16(4), t = {};
    for (let i = 0; i < n; i++) {
      const o = 12 + i * 16, tag = String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
      t[tag] = { off: v.getUint32(o + 8), len: v.getUint32(o + 12) };
    }
    for (const x of ["head", "hhea", "hmtx", "maxp", "cmap"]) if (!t[x]) throw new Error("Lettertype onvolledig (" + x + ")");
    const hd = t.head.off, upm = v.getUint16(hd + 18), sc = 1000 / upm;
    const bbox = [v.getInt16(hd + 36), v.getInt16(hd + 38), v.getInt16(hd + 40), v.getInt16(hd + 42)].map((x) => Math.round(x * sc));
    const hh = t.hhea.off, asc = v.getInt16(hh + 4), desc = v.getInt16(hh + 6), nHM = v.getUint16(hh + 34);
    const nG = v.getUint16(t.maxp.off + 4), adv = new Uint16Array(nG);
    for (let g = 0; g < nG; g++) adv[g] = v.getUint16(t.hmtx.off + 4 * Math.min(g, nHM - 1));
    let cap = Math.round(asc * 0.7);
    if (t["OS/2"] && v.getUint16(t["OS/2"].off) >= 2) cap = v.getInt16(t["OS/2"].off + 88);
    // cmap: Windows Unicode (3,1) formaat 4, of (3,10) formaat 12
    const cm = t.cmap.off, nSub = v.getUint16(cm + 2), map = new Map();
    let f4 = -1, f12 = -1;
    for (let i = 0; i < nSub; i++) {
      const pl = v.getUint16(cm + 4 + i * 8), en = v.getUint16(cm + 6 + i * 8), so = cm + v.getUint32(cm + 8 + i * 8), fm = v.getUint16(so);
      if (fm === 4 && (pl === 3 || pl === 0) && f4 < 0) f4 = so;
      if (fm === 12 && (pl === 3 || pl === 0) && f12 < 0) f12 = so;
    }
    if (f12 >= 0) {
      const ng = v.getUint32(f12 + 12);
      for (let i = 0; i < ng; i++) { const o = f12 + 16 + i * 12, s = v.getUint32(o), e = v.getUint32(o + 4), g0 = v.getUint32(o + 8); for (let c = s; c <= e && c - s < 65536; c++) map.set(c, g0 + c - s); }
    } else if (f4 >= 0) {
      const seg = v.getUint16(f4 + 6) / 2, ends = f4 + 14, starts = ends + 2 * seg + 2, deltas = starts + 2 * seg, ros = deltas + 2 * seg;
      for (let i = 0; i < seg; i++) {
        const e = v.getUint16(ends + 2 * i), s = v.getUint16(starts + 2 * i), d = v.getInt16(deltas + 2 * i), ro = v.getUint16(ros + 2 * i);
        for (let c = s; c <= e && c !== 0xFFFF; c++) {
          let g;
          if (!ro) g = (c + d) & 0xFFFF;
          else { g = v.getUint16(ros + 2 * i + ro + 2 * (c - s)); if (g) g = (g + d) & 0xFFFF; }
          if (g) map.set(c, g);
        }
      }
    } else throw new Error("Lettertype zonder Unicode-tabel");
    return { soort: "ttf", naam: psNaam, buf, sc, bbox, asc: Math.round(asc * sc), desc: Math.round(desc * sc), cap: Math.round(cap * sc), adv, map, gebruikt: new Map() };
  }
  // Tekens die het lettertype niet heeft (≥, →, ✓, emoji …) worden NIET vervangen of weggelaten: de woorden van de
  // inspecteur blijven precies zoals ze zijn. Zo'n teken wordt als klein beeld getekend (lettertypen van het toestel,
  // ook emoji) met daaronder dezelfde tekst onzichtbaar, zodat zoeken en kopiëren het echte teken geven (ToUnicode).
  // Alleen witruimte-varianten (vaste spatie, smalle spatie) worden een gewone spatie.
  const SPATIE = /[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g;
  // Helvetica (terugval): breedtes gemeten met een canvas (Arial heeft dezelfde maten), WinAnsi-codering
  const WINANSI = { 0x20AC: 0x80, 0x201A: 0x82, 0x201E: 0x84, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2122: 0x99 };
  function helvetica(vet) {
    const c = document.createElement("canvas").getContext("2d"); c.font = (vet ? "bold " : "") + "100px Helvetica, Arial, 'Liberation Sans', sans-serif";
    const cache = new Map();
    return { soort: "std", naam: vet ? "Helvetica-Bold" : "Helvetica", asc: 718, desc: -207, cap: 718,
      w(ch) { let x = cache.get(ch); if (x == null) { x = c.measureText(ch).width * 10; cache.set(ch, x); } return x; } };
  }
  // ---------------- tekst: tekenclusters, breedte, codering, afbreken ----------------
  const SEG = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("nl", { granularity: "grapheme" }) : null;
  const clusters = (s) => { s = String(s == null ? "" : s).replace(/[\r\t]/g, " ").replace(SPATIE, " ").replace(/\n/g, ""); return SEG ? Array.from(SEG.segment(s), (x) => x.segment) : Array.from(s); };
  const stdKan = (c) => (c >= 0x20 && c <= 0x7E) || (c >= 0xA0 && c <= 0xFF) || !!WINANSI[c];
  // heeft het lettertype elk teken van dit cluster?
  function kan(f, cl) { for (const ch of cl) { const c = ch.codePointAt(0); if (f.soort === "ttf" ? !f.map.has(c) : !stdKan(c)) return false; } return true; }
  // terugval-tekens: breedte (per 1000) en beeld via een canvas met de lettertypen van het toestel
  const FB_FONT = (vet) => (vet ? "800 " : "400 ") + "100px Nunito, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'DejaVu Sans', sans-serif";
  let fbCtx = null; const fbCache = new Map();
  function fbBreedte(cl, vet) {
    const k = (vet ? "b" : "r") + cl; let w = fbCache.get(k);
    if (w == null) { try { fbCtx = fbCtx || document.createElement("canvas").getContext("2d"); fbCtx.font = FB_FONT(vet); w = fbCtx.measureText(cl).width * 10; } catch (e) { w = 600; } if (!(w > 0)) w = 600; fbCache.set(k, w); }
    return w;
  }
  function clBreedte(f, cl, vet) {
    if (!kan(f, cl)) return fbBreedte(cl, vet);
    let w = 0; for (const ch of cl) w += f.soort === "ttf" ? f.adv[f.map.get(ch.codePointAt(0)) || 0] * f.sc : f.w(ch);
    return w;
  }
  function breedte(f, s, pt, vet) { let w = 0; for (const cl of clusters(s)) w += clBreedte(f, cl, vet); return w * pt / 1000; }
  function codeer(f, lijst) {
    if (f.soort === "ttf") {
      let h = "";
      for (const cl of lijst) for (const ch of cl) { const u = ch.codePointAt(0), g = f.map.get(u) || 0; if (!f.gebruikt.has(g)) f.gebruikt.set(g, u); h += g.toString(16).padStart(4, "0"); }
      return "<" + h + ">";
    }
    let o = "(";
    for (const cl of lijst) for (const ch of cl) {
      let b = ch.codePointAt(0); b = WINANSI[b] || b;
      if (b === 0x28 || b === 0x29 || b === 0x5C) o += "\\" + ch; else if (b < 32 || b > 126) o += "\\" + b.toString(8).padStart(3, "0"); else o += ch;
    }
    return o + ")";
  }
  // afbreken op spaties; een te lang woord wordt op tekens gebroken
  function regels(f, s, pt, max, vet) {
    const uit = [];
    String(s == null ? "" : s).split(/\n/).forEach((alinea) => {
      let r = "";
      for (const w of alinea.split(/ +/)) {
        if (!w) continue;
        const prob = r ? r + " " + w : w;
        if (breedte(f, prob, pt, vet) <= max) { r = prob; continue; }
        if (r) uit.push(r);
        r = "";
        if (breedte(f, w, pt, vet) <= max) { r = w; continue; }
        let deel = "";
        for (const ch of clusters(w)) { if (breedte(f, deel + ch, pt, vet) > max && deel) { uit.push(deel); deel = ""; } deel += ch; }
        r = deel;
      }
      uit.push(r);
    });
    return uit.length ? uit : [""];
  }

  // ---------------- beelden ----------------
  // dataURL → JPEG (max px, op wit), {bytes, w, h}; null als het geen bruikbaar beeld is
  function verklein(src, max, kw) {
    return new Promise((res) => {
      if (typeof src !== "string" || !/^data:image\/(jpeg|png|webp);base64,/i.test(src)) return res(null);
      const im = new Image();
      im.onload = () => {
        try {
          const sc = Math.min(1, max / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
          const w = Math.max(1, Math.round(im.naturalWidth * sc)), h = Math.max(1, Math.round(im.naturalHeight * sc));
          const c = document.createElement("canvas"); c.width = w; c.height = h;
          const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
          c.toBlob((b) => { if (!b) return res(null); b.arrayBuffer().then((ab) => res({ bytes: new Uint8Array(ab), w, h }), () => res(null)); }, "image/jpeg", kw || 0.72);
        } catch (e) { res(null); }
      };
      im.onerror = () => res(null);
      im.src = src;
    });
  }
  async function deflate(u8) {
    if (typeof CompressionStream === "undefined") return null;
    try { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer()); } catch (e) { return null; }
  }

  // ---------------- lettertypen laden (één keer per sessie) ----------------
  let FONTS = null;
  async function laadFonts() {
    if (FONTS) return FONTS;
    try {
      const haal = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error("lettertype " + r.status); return r.arrayBuffer(); };
      const [r, b] = await Promise.all([haal("fonts/nunito-pdf-400.ttf"), haal("fonts/nunito-pdf-800.ttf")]);
      FONTS = { basis: [leesTTF(r, "Nunito-Regular"), leesTTF(b, "Nunito-ExtraBold")] };
    } catch (e) { return { basis: [helvetica(false), helvetica(true)], terugval: true }; }
    return FONTS;
  }

  // ---------------- het document: pagina's met tekenopdrachten (oorsprong linksboven, in pt) ----------------
  class Doc {
    constructor(fonts) {
      // per document een eigen kopie van de gebruikte-tekenlijst (een lettertype wordt hergebruikt)
      // extra: terugval-tekens (cluster → eigen CID boven de glyphs van het lettertype, alleen voor zoeken/kopiëren)
      this.f = fonts.map((f) => (f.soort === "ttf" ? Object.assign({}, f, { gebruikt: new Map(), extra: new Map() }) : f));
      this.pages = []; this.beelden = []; this.glyfen = new Map(); this.se = []; this.nieuw();
    }
    // ---- toegankelijkheid (tagged PDF): elk stuk tekst of beeld hoort bij een structuurelement (H1, H2, P, Figure),
    // in leesvolgorde; vlakken, lijnen en de paginavoet zijn "Artifact" (versiering, niet voorgelezen) ----
    // blok(S): een element dat pas ontstaat bij het eerste stuk inhoud (zo is de volgorde die van het tekenen)
    blok(S, alt) { return { S, alt, el: null }; }
    elVan(h) { if (!h.el) { h.el = { S: h.S, alt: h.alt || null, kids: [] }; this.se.push(h.el); } return h.el; }
    open(h) { const e = this.elVan(h), n = this.p.mcid++; this.p.ouders.push(e); e.kids.push({ p: this.p, mcid: n }); this.p.ops.push(`/${e.S} <</MCID ${n}>> BDC`); }
    dicht() { this.p.ops.push("EMC"); }
    // witte pagina's (printvriendelijk, geen toner op een gekleurde achtergrond); de huisstijl zit in kaarten en accenten
    nieuw() { this.p = { ops: [], mcid: 0, ouders: [] }; this.pages.push(this.p); this.y = KOP; }
    past(h) { return this.y + h <= PH - VOET; }
    ruimte(h) { if (!this.past(h) && this.y > KOP + 1) this.nieuw(); }
    pad(x, y, w, h, r) {
      const Y = (v) => getal(PH - v); r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
      if (!r) return `${getal(x)} ${Y(y + h)} ${getal(w)} ${getal(h)} re`;
      const k = r * 0.5523;
      return [`${getal(x + r)} ${Y(y)} m`, `${getal(x + w - r)} ${Y(y)} l`, `${getal(x + w - r + k)} ${Y(y)} ${getal(x + w)} ${Y(y + r - k)} ${getal(x + w)} ${Y(y + r)} c`,
        `${getal(x + w)} ${Y(y + h - r)} l`, `${getal(x + w)} ${Y(y + h - r + k)} ${getal(x + w - r + k)} ${Y(y + h)} ${getal(x + w - r)} ${Y(y + h)} c`,
        `${getal(x + r)} ${Y(y + h)} l`, `${getal(x + r - k)} ${Y(y + h)} ${getal(x)} ${Y(y + h - r + k)} ${getal(x)} ${Y(y + h - r)} c`,
        `${getal(x)} ${Y(y + r)} l`, `${getal(x)} ${Y(y + r - k)} ${getal(x + r - k)} ${Y(y)} ${getal(x + r)} ${Y(y)} c`, "h"].join(" ");
    }
    rectOps(x, y, w, h, o = {}) {
      const op = [];
      if (o.vul) op.push(rgb(o.vul) + " rg");
      if (o.lijn) op.push(rgb(o.lijn) + " RG " + getal(o.dikte || 0.75) + " w");
      op.push(this.pad(x, y, w, h, o.r), o.vul && o.lijn ? "B" : o.vul ? "f" : "S");
      return "/Artifact BMC q " + op.join(" ") + " Q EMC";
    }
    rect(x, y, w, h, o) { this.p.ops.push(this.rectOps(x, y, w, h, o)); }
    font(vet) { return this.f[vet ? 1 : 0]; }
    // tekst met de basislijn op y (van boven gemeten)
    tekst(x, y, s, o = {}) {
      if (o.artefact) this.p.ops.push(o.artefact === "voet" ? "/Artifact <</Type /Pagination>> BDC" : "/Artifact BMC");
      else this.open(o.se || this.blok(o.rol || "P"));
      this.tekstKaal(x, y, s, o);
      this.dicht();
    }
    tekstKaal(x, y, s, o) {
      const f = this.font(o.vet), pt = o.pt || 10, nr = o.vet ? 2 : 1, kl = o.kleur || K.ink;
      if (o.rechts) x -= breedte(f, s, pt, o.vet);
      let run = [], rx = x, cx = x;
      const spoel = () => { if (run.length) this.p.ops.push(`BT ${rgb(kl)} rg /F${nr} ${getal(pt)} Tf 1 0 0 1 ${getal(rx)} ${getal(PH - y)} Tm ${codeer(f, run)} Tj ET`); run = []; };
      for (const cl of clusters(s)) {
        const w = clBreedte(f, cl, o.vet) * pt / 1000;
        if (kan(f, cl)) { if (!run.length) rx = cx; run.push(cl); cx += w; continue; }
        spoel();
        // het teken als beeld (precies zoals ingevoerd), en dezelfde tekst onzichtbaar erachter (zoeken/kopiëren)
        const b = this.glyf(cl, pt, kl, o.vet, w);
        if (b) this.beeld(b, cx, y - pt * 1.0, w, pt * 1.32);
        if (f.soort === "ttf") {
          let e = f.extra.get(cl);
          if (!e) { e = { cid: Math.min(0xFFFE, f.adv.length + f.extra.size), w: Math.round(w * 1000 / pt) }; f.extra.set(cl, e); }
          this.p.ops.push(`q BT 3 Tr /F${nr} ${getal(pt)} Tf 1 0 0 1 ${getal(cx)} ${getal(PH - y)} Tm <${e.cid.toString(16).padStart(4, "0")}> Tj ET Q`);
        }
        cx += w;
      }
      spoel();
    }
    // terugval-teken als beeld met alfakanaal (RGB + zachte masker), 4 px per pt; per cluster/maat/kleur één keer
    glyf(cl, pt, kl, vet, w) {
      const sleutel = cl + "|" + pt + "|" + kl + "|" + (vet ? 1 : 0);
      if (this.glyfen.has(sleutel)) return this.glyfen.get(sleutel);
      let b = null;
      try {
        const sc = 4, W = Math.max(1, Math.ceil(w * sc)), H = Math.max(1, Math.ceil(pt * 1.32 * sc));
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        const g = c.getContext("2d"); g.font = FB_FONT(vet).replace("100px", (pt * sc) + "px"); g.fillStyle = kl; g.textBaseline = "alphabetic";
        g.fillText(cl, 0, pt * sc);
        const d = g.getImageData(0, 0, W, H).data, rgbB = new Uint8Array(W * H * 3), a = new Uint8Array(W * H);
        let iets = false;
        for (let i = 0, j = 0, k = 0; i < d.length; i += 4, j += 3, k++) { rgbB[j] = d[i]; rgbB[j + 1] = d[i + 1]; rgbB[j + 2] = d[i + 2]; a[k] = d[i + 3]; if (d[i + 3]) iets = true; }
        b = iets ? { soort: "rgba", rgb: rgbB, a, w: W, h: H } : null;
      } catch (e) { b = null; }
      this.glyfen.set(sleutel, b);
      return b;
    }
    breedte(s, pt, vet) { return breedte(this.font(vet), s, pt, vet); }
    regels(s, pt, max, vet) { return regels(this.font(vet), s, pt, max, vet); }
    // alt: een foto of de handtekening (Figure met beschrijving); zonder alt: deel van de lopende tekst (terugval-teken)
    beeld(b, x, y, w, h, r, alt) {
      let i = this.beelden.indexOf(b); if (i < 0) { this.beelden.push(b); i = this.beelden.length - 1; }
      if (alt) this.open(this.blok("Figure", alt));
      this.p.ops.push(`q ${r ? this.pad(x, y, w, h, r) + " W n " : ""}${getal(w)} 0 0 ${getal(h)} ${getal(x)} ${getal(PH - y - h)} cm /Im${i + 1} Do Q`);
      if (alt) this.dicht();
    }
    // ---- stroom-opmaak: een kaart is een rij regels; past de rest niet, dan loopt de kaart door op de volgende pagina ----
    // rijen: [{h, teken(x, y, w)}]; o: {vul, lijn, pad, r, na}
    kaart(rijen, o = {}) {
      const pad = o.pad == null ? 14 : o.pad, x = M, w = BREED, r = o.r == null ? 14 : o.r;
      // past de hele kaart op een lege pagina maar niet meer op deze: dan de hele kaart naar de volgende (niet splitsen)
      const totaal = rijen.reduce((n, x) => n + x.h, pad * 2), eerste = rijen.length ? rijen[0].h : 0;
      if (!this.past(totaal) && totaal <= PH - VOET - KOP - 40 && this.y > KOP + 1) this.nieuwMetKop();
      else this.ruimte(Math.min(pad * 2 + eerste, PH - VOET - KOP));
      let i = 0;
      while (i < rijen.length || !rijen.length) {
        const slot = this.p.ops.push("") - 1, y0 = this.y;
        let y = y0 + pad, n = 0;
        while (i < rijen.length && (y + rijen[i].h + pad <= PH - VOET || n === 0)) { rijen[i].teken(x + pad, y, w - 2 * pad); y += rijen[i].h; i++; n++; }
        const h = y + pad - y0;
        this.p.ops[slot] = this.rectOps(x, y0, w, h, { vul: o.vul || K.wit, lijn: o.lijn === undefined ? K.line : o.lijn, r });
        if (o.balk) this.p.ops[slot] += " " + this.rectOps(x, y0, 5, h, { vul: o.balk, r: 2 });
        this.y = y + pad + (o.na == null ? 10 : o.na);
        if (i < rijen.length) this.nieuw(); else break;
      }
    }
    // sectiekop blijft bij zijn inhoud: past er onder de kop geen begin van een kaart meer (±150 pt), dan naar de volgende pagina
    // (en verhuist mee als de eerste kaart eronder in zijn geheel naar de volgende pagina gaat: zie kaart())
    kop(t, houd) {
      this.ruimte(30 + (houd || 150)); this.y += 8;
      const i = this.p.ops.length, h = this.blok("H2"), m0 = this.p.mcid;
      this.tekst(M + 2, this.y + 12, t, { pt: 13.5, vet: true, se: h }); this.y += 22;
      this.lk = { p: this.p, i, n: this.p.ops.length - i, y: this.y, t, h, m0 };
    }
    // staat er direct boven de huidige plek nog een losse sectiekop? Dan die mee naar de nieuwe pagina
    nieuwMetKop() {
      const k = this.lk;
      if (k && k.p === this.p && k.y === this.y) {
        // de kop (het laatste op deze pagina) weg, ook uit de structuur, en bovenaan de nieuwe pagina opnieuw
        this.p.ops.splice(k.i, k.n); this.p.mcid = k.m0; this.p.ouders.length = k.m0;
        if (k.h.el) k.h.el.kids = k.h.el.kids.filter((x) => !(x.p === k.p && x.mcid >= k.m0));
        this.nieuw(); this.y += 8; this.tekst(M + 2, this.y + 12, k.t, { pt: 13.5, vet: true, se: k.h }); this.y += 22;
      }
      else this.nieuw();
      this.lk = null;
    }
  }
  // rij-bouwers
  const rij = (h, teken) => ({ h, teken });
  function tekstRijen(d, s, o = {}) {
    const pt = o.pt || 10, lh = o.lh || pt * 1.42, max = (o.max || BREED - 28) - (o.inspring || 0), se = d.blok(o.rol || "P");   // één alinea = één element
    return d.regels(s, pt, max, o.vet).map((r, i, a) => rij(lh + (i === a.length - 1 ? o.na || 0 : 0), (x, y) => d.tekst(x + (o.inspring || 0), y + pt * 1.02, r, { pt, vet: o.vet, kleur: o.kleur, se })));
  }
  function pil(d, x, y, t, kleur, vul, pt) {
    pt = pt || 8.5; const w = d.breedte(t, pt, true) + 14, h = pt + 9;
    d.rect(x, y, w, h, { vul, r: h / 2 }); d.tekst(x + 7, y + h / 2 + pt * 0.36, t, { pt, vet: true, kleur });
    return w;
  }
  const pilB = (d, t, pt) => d.breedte(t, pt || 8.5, true) + 14;

  // ---------------- het rapport opbouwen ----------------
  async function maak(m, o = {}) {
    const stap = typeof o.stap === "function" ? o.stap : () => {};
    // 1. foto's verkleinen (en de handtekening op wit); ook de nagekomen foto's van de aanvullingen
    stap("Foto's verkleinen…", 8);
    const alle = []; (m.waarnemingen || []).forEach((w) => (w.fotos || []).forEach((f) => alle.push(f)));
    (m.aanvullingen || []).forEach((x) => { if (x.foto) alle.push(x.foto); });
    const klein = new Map(); let k = 0;
    for (const f of alle) { if (!klein.has(f)) klein.set(f, await verklein(f, 900, 0.72)); k++; stap("Foto's verkleinen…", 8 + Math.round(42 * k / Math.max(1, alle.length))); }
    const sig = m.handtekening ? await verklein(m.handtekening, 700, 0.85) : null;
    // 2. opmaken
    stap("Rapport opmaken…", 55);
    const fonts = await laadFonts(), d = new Doc(fonts.basis);
    const ondertekend = !!sig, open = (m.openPunten || []).filter(Boolean);
    const insp = m.inspecteur + (m.inspecteurFunctie ? " · " + m.inspecteurFunctie : "");

    // -- kop: beeldmerk, naam, rapportnummer en datum --
    d.rect(M, d.y, 30, 30, { vul: K.accent, r: 9 }); d.tekst(M + 15 - d.breedte("N", 15, true) / 2, d.y + 20.5, "N", { pt: 15, vet: true, kleur: K.wit, artefact: true });
    d.tekst(M + 40, d.y + 13, "Werkplekinspectie", { pt: 11.5, vet: true }); d.tekst(M + 40, d.y + 26, "Noardling · rapport momentopname", { pt: 8.5, kleur: K.soft });
    d.tekst(PW - M, d.y + 13, m.nummer || m.id || "", { pt: 9.5, vet: true, rechts: true }); d.tekst(PW - M, d.y + 26, m.datumTekst || "", { pt: 8.5, kleur: K.soft, rechts: true });
    d.y += 52;
    d.tekst(M, d.y, "WPI-RAPPORT · MOMENTOPNAME", { pt: 8.5, vet: true, kleur: K.accent }); d.y += 8;
    { const h1 = d.blok("H1"); for (const r of d.regels(m.object || m.titel || "Inspectie", 24, BREED, true)) { d.y += 27; d.tekst(M, d.y, r, { pt: 24, vet: true, se: h1 }); } }
    const sub = [m.locatie, m.projectTekst].filter(Boolean).join(" · ");
    if (sub) { const p = d.blok("P"); for (const r of d.regels(sub, 11.5, BREED)) { d.y += 17; d.tekst(M, d.y, r, { pt: 11.5, kleur: K.soft, se: p }); } }
    d.y += 10;
    {
      let x = M;
      // zonder handtekening nooit de groene "definitief"-uitstraling: rood en met zoveel woorden
      if (ondertekend) x += pil(d, x, d.y, "Definitief afgerond · ondertekend · ligt vast", K.accent, K.accentBg, 8.5) + 6;
      else x += pil(d, x, d.y, "NIET ONDERTEKEND · afgerond zonder handtekening", K.red, K.redBg, 8.5) + 6;
      if (m.nGevaar) pil(d, x, d.y, "Direct gevaar bij " + m.nGevaar, K.red, K.redBg, 8.5);
    }
    d.y += 30;
    if (!ondertekend) d.kaart([].concat(
      tekstRijen(d, "Dit rapport is niet ondertekend door de inspecteur.", { pt: 11.5, vet: true, kleur: K.red, lh: 16 }),
      tekstRijen(d, "De inspectie is wel vastgelegd en ligt vast, maar is afgerond zonder handtekening. Behandel het niet als een ondertekend rapport.", { pt: 9.5, kleur: K.ink })),
      { vul: K.redBg, lijn: null, balk: K.red });
    if (open.length) d.kaart([].concat(
      tekstRijen(d, "Afgerond met " + open.length + (open.length === 1 ? " open herinnering" : " open herinneringen"), { pt: 10.5, vet: true, kleur: K.ink, lh: 15 }),
      ...open.map((t) => tekstRijen(d, "• " + t, { pt: 9.5, kleur: K.ink }))),
      { vul: K.butter, lijn: null, balk: K.soft });   // neutraal: geel betekent V, oranje "niet gedaan"
    // welke stand dit is: de ondertekende momentopname; bij "Deel als PDF" ook de bijlage erna
    d.kaart(tekstRijen(d, m.standTekst || "", { pt: 9, kleur: K.accent }), { vul: K.accentBg, lijn: null, pad: 10 });

    // -- gegevens --
    const feiten = [["Rapportnummer", m.nummer || m.id], ["Datum", m.dagTekst || m.datumTekst], ["Tijd", m.tijdTekst], ["Inspecteur", insp], ["Locatie", m.locatie || "–"], ["Project", m.project || m.projectTekst],
      ["Monteurs", (m.monteurs || []).length ? m.monteurs.join(", ") : "niet vastgelegd"], ["Getoetst tijdens bezoek", (m.taken || []).filter(Boolean).join(" · ") || "–"]].filter(([, v]) => v);
    const LAB = 128, rijenF = [];
    feiten.forEach(([l, v], i) => {
      const rs = d.regels(v || "–", 10, BREED - 28 - LAB), se = d.blok("P");
      rs.forEach((r, j) => rijenF.push(rij(14.5 + (j === rs.length - 1 && i < feiten.length - 1 ? 5 : 0), (x, y) => { if (!j) d.tekst(x, y + 10.5, l, { pt: 9, vet: true, kleur: K.soft, se }); d.tekst(x + LAB, y + 10.5, r, { pt: 10, vet: l === "Rapportnummer", se }); })));
    });
    d.kaart(rijenF);

    // -- score: % conform (van de beoordeelde punten C/A/V; NVT telt niet mee) + telling --
    const T = m.telling || { C: 0, A: 0, V: 0, NVT: 0 }, sc = m.score || { pct: null, conform: T.C, beoordeeld: T.C + T.A + T.V };
    d.kaart([rij(74, (x, y, w) => {
      const se = d.blok("P");
      d.tekst(x, y + 12, "Score (% conform)", { pt: 9, vet: true, kleur: K.soft, se });
      d.tekst(x, y + 46, sc.pct == null ? "–" : sc.pct + "%", { pt: 30, vet: true, kleur: K.ink, se });
      d.tekst(x, y + 64, sc.beoordeeld ? sc.conform + " van " + sc.beoordeeld + " conform" + (T.NVT ? " · NVT telt niet mee" : "") : "nog niets beoordeeld", { pt: 8.5, kleur: K.soft, se });
      const tw = 66, gap = 8, x0 = x + w - 4 * tw - 3 * gap;
      [["C", "Conform"], ["A", "Afwijking"], ["V", "Verbeterpunt"], ["NVT", "N.v.t."]].forEach(([c, lab], i) => {
        const tx = x0 + i * (tw + gap), [, kl, vul] = OORDEEL[c], te = d.blok("P");
        d.rect(tx, y + 2, tw, 66, { vul, r: 10 });
        d.tekst(tx + 9, y + 18, lab, { pt: 7.8, vet: true, kleur: kl, se: te });
        d.tekst(tx + 9, y + 46, String(T[c] || 0), { pt: 20, vet: true, kleur: kl, se: te });
        d.tekst(tx + 9, y + 60, "[" + c + "]", { pt: 7.5, kleur: kl, se: te });
      });
    })]);
    if (m.nGevaar) d.kaart(tekstRijen(d, "Direct gevaar bij " + m.nGevaar + (m.nGevaar === 1 ? " waarneming" : " waarnemingen") + (m.nStil ? " · werk ter plaatse stilgelegd bij " + m.nStil : "") + ". Wat de inspecteur ter plaatse deed staat bij de actie.", { pt: 10, vet: true, kleur: K.red }), { vul: K.redBg, lijn: null, balk: K.red });

    // -- waarnemingen (met genummerde foto's) --
    let sec = 0, voor = ""; const sectie = (t, houd) => d.kop(voor + ++sec + ". " + t, houd);
    sectie("Waarnemingen");
    if (!(m.waarnemingen || []).length) d.kaart(tekstRijen(d, "Geen waarnemingen vastgelegd.", { kleur: K.soft }));
    let fotoNr = 0;
    const fotoRijen = (lijst, ref, R) => {   // foto's in rijen van drie, met bijschrift (doorlopend nummer)
      const nPer = 3, gap = 8, fw = (BREED - 28 - gap * (nPer - 1)) / nPer, CAP = 13;
      for (let i = 0; i < lijst.length; i += nPer) {
        const reeks = lijst.slice(i, i + nPer).map((x) => Object.assign(x, { nr: ++fotoNr })), fh = Math.min(150, Math.max(...reeks.map((x) => fw * x.b.h / x.b.w)));
        R.push(rij(fh + CAP + gap + (i === 0 ? 4 : 0), (x, y) => reeks.forEach((f, j) => {
          const b = f.b, sc2 = Math.min(fw / b.w, fh / b.h), bw2 = b.w * sc2, bh = b.h * sc2, y1 = y + (i === 0 ? 6 : 2), fx = x + j * (fw + gap);
          const bij = "Foto " + f.nr + " · " + ref + (f.n > 1 ? " · " + (f.i + 1) + "/" + f.n : "");
          d.rect(fx, y1, fw, fh, { vul: K.mist, r: 8 });
          d.beeld(b, fx + (fw - bw2) / 2, y1 + (fh - bh) / 2, bw2, bh, 8, bij + (f.alt ? " · " + f.alt : ""));
          // bijschrift: doorlopend fotonummer, de TRA-regel en de hoeveelste foto van deze waarneming
          d.tekst(fx + 2, y1 + fh + 10, bij, { pt: 7.8, vet: true, kleur: K.soft, rol: "Caption" });
        })));
      }
    };
    (m.waarnemingen || []).forEach((w, wi) => {
      const [olab, okl, ovul] = OORDEEL[w.oordeel] || ["–", K.soft, K.mist], badge = "[" + (w.oordeel || "–") + "] " + olab, bw = pilB(d, badge, 8.5);
      const R = [], kopSe = d.blok("H3");
      const kopRegels = d.regels((wi + 1) + ". " + w.ref + " · " + w.titel, 10.5, BREED - 28 - bw - 12, true);
      kopRegels.forEach((r, j) => R.push(rij(15, (x, y, wd) => { d.tekst(x, y + 11, r, { pt: 10.5, vet: true, se: kopSe }); if (!j) pil(d, x + wd - bw, y - 1, badge, okl, ovul, 8.5); })));
      R[R.length - 1].h += 4;
      if (w.gevaar) R.push(...tekstRijen(d, "Direct gevaar" + (w.stil ? " · werk ter plaatse stilgelegd" : ""), { pt: 9.5, vet: true, kleur: K.red }));
      if (w.tekst) R.push(...tekstRijen(d, "Waarneming: “" + w.tekst + "”", { pt: 9.5 }));
      if ((w.maatregelen || []).length) R.push(...tekstRijen(d, "Maatregel gezien: " + w.maatregelen.join("; "), { pt: 9.5, kleur: K.soft }));
      if (w.actieNr) R.push(...tekstRijen(d, "Actievoorstel: zie actie " + w.actieNr + (w.actieTekst ? " · " + w.actieTekst : ""), { pt: 9.5, kleur: K.soft }));
      const lijst = (w.fotos || []).map((f, i) => ({ b: klein.get(f), i, n: (w.fotos || []).length, alt: "waarneming " + (wi + 1) + ", " + olab.toLowerCase() })).filter((x) => x.b);
      fotoRijen(lijst, w.ref, R);
      const zonder = (w.fotos || []).length - lijst.length;
      if (zonder > 0) R.push(...tekstRijen(d, zonder === 1 ? "1 foto staat nog niet op dit toestel." : zonder + " foto's staan nog niet op dit toestel.", { pt: 8.5, kleur: K.soft }));
      d.kaart(R, { balk: okl });
    });

    // -- acties: per actie wie, wanneer en de status; bij een afgeronde actie altijd wie toetste en wanneer --
    const actieKaart = (a) => {
      const st = a.status || "Voorstel", klaar = st === "Afgerond", sw = pilB(d, st, 8.5), R = [], kopSe = d.blok("H3");
      d.regels(a.nr + ". " + (a.tekst || "(geen actietekst)"), 10.5, BREED - 28 - sw - 12, true).forEach((r, j) => R.push(rij(15, (x, y, wd) => { d.tekst(x, y + 11, r, { pt: 10.5, vet: true, se: kopSe }); if (!j) pil(d, x + wd - sw, y - 1, st, klaar ? K.green : st === "Vervallen" ? K.soft : K.accent, klaar ? K.greenBg : st === "Vervallen" ? K.mist : K.accentBg, 8.5); })));
      R[R.length - 1].h += 3;
      if (a.voorstel) R.push(...tekstRijen(d, "Voorstel van de inspecteur bij afronden: " + a.voorstel, { pt: 9, kleur: K.soft }));
      R.push(...tekstRijen(d, a.gecorr ? a.ref : [a.ref, "prioriteit: " + (a.prio || "–")].filter(Boolean).join(" · "), { pt: 9.5, kleur: K.soft }));
      if (a.gevaar) R.push(...tekstRijen(d, a.gecorr ? "Direct gevaar" : a.terPlaatse || "Direct gevaar", { pt: 9.5, vet: true, kleur: K.red }));
      if (a.afgerond) R.push(...tekstRijen(d, a.afgerond, { pt: 9.5, vet: true, kleur: K.green }));
      if (a.gecorr) R.push(...tekstRijen(d, a.uitvoering, { pt: 9.5 }));
      else if (a.ingesteld) {
        const FT = [["Actiehouder", a.houder], ["Toetser", a.toetser], ["Plandatum", a.plandatum]];
        FT.forEach(([l, v]) => { const se = d.blok("P"); R.push(rij(14, (x, y) => { d.tekst(x, y + 10, l, { pt: 9, vet: true, kleur: K.soft, se }); d.tekst(x + 86, y + 10, v || "–", { pt: 9.5, se }); })); });
      } else R.push(...tekstRijen(d, a.nogNietTekst || "Actiehouder, toetser en plandatum: nog niet ingesteld.", { pt: 9.5 }));
      if (!a.gevaar && !a.gecorr && a.terPlaatse) R.push(...tekstRijen(d, a.terPlaatse, { pt: 9.5, kleur: K.soft }));
      if (a.verloop) R.push(...tekstRijen(d, a.verloop, { pt: 9, kleur: K.soft }));
      d.kaart(R, a.gevaar ? { balk: K.red } : klaar ? { balk: K.green } : {});
    };
    const regelKaart = () => d.kaart(tekstRijen(d, "Afgerond pas na toetsing; de toetser is een ander dan de actiehouder. Bij direct herstel ter plaatse zag de inspecteur het herstel: die is dan de toetser en er is geen aparte actiehouder. De QHSE-manager is nooit actiehouder.", { pt: 8.5, kleur: K.soft }), { vul: K.butter, lijn: null, pad: 10 });
    if ((m.acties || []).length) {
      sectie("Acties · stand bij afronden");
      m.acties.forEach(actieKaart);
      regelKaart();
    }
    if (m.gesprek) { sectie("Gesprek met de monteurs"); d.kaart(tekstRijen(d, m.gesprek)); }
    if (m.positief) { sectie("Wat ging opvallend goed"); d.kaart(tekstRijen(d, m.positief), { vul: K.sage, lijn: null }); }

    // -- ondertekening: sluit de momentopname af; de voetnoot blijft op dezelfde pagina (geen bijna lege pagina) --
    const R = [rij(16, (x, y) => d.tekst(x, y + 11, "Inspecteur: " + insp, { pt: 10, vet: true })),
      rij(16, (x, y) => d.tekst(x, y + 11, "Definitief afgerond: " + (m.afgerondTekst || m.datumTekst || ""), { pt: 10 }))];
    if (sig) { const h = 64, w = Math.min(BREED - 28, h * sig.w / sig.h); R.push(rij(h + 8, (x, y) => d.beeld(sig, x, y + 6, w, h, 0, "Handtekening van " + m.inspecteur))); }
    else R.push(...tekstRijen(d, "NIET ONDERTEKEND: de inspecteur heeft dit rapport afgerond zonder handtekening.", { pt: 10.5, vet: true, kleur: K.red }));
    const voet = [m.hulpTekst, "Momentopname: alleen wat de inspecteur zag telt. Elk oordeel (C/A/V/NVT) is door de inspecteur zelf gekozen; de app deed alleen voorstellen."].filter(Boolean)
      .map((t) => d.regels(t, 8.5, BREED));
    const hKaart = R.reduce((n, x) => n + x.h, 28), hVoet = voet.reduce((n, l) => n + l.length * 12, 4);
    sectie("Ondertekening", hKaart + 10 + hVoet);
    d.kaart(R, sig ? {} : { vul: K.redBg, lijn: null, balk: K.red });
    voet.forEach((rs) => { const se = d.blok("P"); rs.forEach((r) => { d.ruimte(13); d.y += 12; d.tekst(M, d.y, r, { pt: 8.5, kleur: K.soft, se }); }); });

    // -- bijlage (alleen "Deel als PDF"): wat NA de ondertekening is bijgehouden; valt niet onder de handtekening --
    let bijlage = -1;
    const actueel = (m.actiesActueel || []).length, aanv = (m.aanvullingen || []).length;
    if (m.stand === "actueel" && (actueel || aanv)) {
      d.nieuw(); bijlage = d.pages.length - 1; d.lk = null;
      d.tekst(M, d.y + 8, sig ? "BIJLAGE · NA DE ONDERTEKENING · NIET ONDERTEKEND" : "BIJLAGE · NA HET AFRONDEN · NIET ONDERTEKEND", { pt: 8.5, vet: true, kleur: K.accent }); d.y += 16;
      d.kaart([].concat(tekstRijen(d, "Bijlage bij " + (m.nummer || m.id || "het rapport") + ": niet ondertekend", { pt: 12, vet: true, rol: "H2", lh: 17 }),
        tekstRijen(d, "Wat hieronder staat is na het definitief afronden in de app bijgehouden (de acties) of toegevoegd (aanvullingen, met naam en tijd). "
          + (sig ? "Het valt niet onder de handtekening van de inspecteur hierboven. De ondertekende momentopname zelf is niet veranderd."
            : "Ook dit deel is niet ondertekend. De momentopname hierboven zelf is niet veranderd."), { pt: 9.5 })),
        { vul: K.accentBg, lijn: null, balk: K.accent });
      voor = "B"; sec = 0;
      if (actueel) { sectie("Acties · actuele stand"); m.actiesActueel.forEach(actieKaart); regelKaart(); }
      if (aanv) {
        sectie("Aanvullingen na afronden");
        m.aanvullingen.forEach((x) => {
          const R2 = [].concat(tekstRijen(d, x.kop, { pt: 9, vet: true, kleur: K.soft }), tekstRijen(d, x.tekst, { pt: 10 }));
          const b = x.foto ? klein.get(x.foto) : null;
          if (b) fotoRijen([{ b, i: 0, n: 1, alt: "nagekomen foto bij de aanvulling (" + x.kop + ")" }], "aanvulling", R2);
          else if (x.foto === "") R2.push(...tekstRijen(d, "De foto bij deze aanvulling staat nog niet op dit toestel.", { pt: 8.5, kleur: K.soft }));
          d.kaart(R2, { balk: K.accent });
        });
      }
    }

    // -- paginavoet (versiering voor schermlezers: Artifact) --
    const n = d.pages.length;
    d.pages.forEach((p, i) => {
      d.p = p;
      const bij = bijlage >= 0 && i >= bijlage;
      d.rect(M, PH - VOET + 14, BREED, 0.6, { vul: K.line });
      d.tekst(M, PH - VOET + 28, "Werkplekinspectie · " + (m.nummer || m.id || "") + " · " + (m.object || "") + (bij ? " · bijlage, niet ondertekend · acties per " + (m.standMoment || "") : ""), { pt: 7.5, kleur: K.soft, artefact: "voet" });
      d.tekst(PW - M, PH - VOET + 28, "Pagina " + (i + 1) + " van " + n, { pt: 7.5, kleur: K.soft, rechts: true, artefact: "voet" });
    });
    stap("Rapport opmaken…", 80);
    return schrijf(d, m, fonts);
  }

  // ---------------- naar bytes: objecten, xref, trailer ----------------
  const pdfTekst = (s) => {   // documentinformatie: Latijn-1 letterlijk, anders UTF-16BE
    s = String(s || "");
    if (/^[\x20-\x7E\u00A0-\u00FF]*$/.test(s)) return "(" + s.replace(/[()\\]/g, "\\$&").replace(/[\u00A0-\u00FF]/g, (c) => "\\" + c.charCodeAt(0).toString(8).padStart(3, "0")) + ")";
    let h = "FEFF"; for (const ch of s) { const c = ch.codePointAt(0); if (c > 0xFFFF) { const v = c - 0x10000; h += (0xD800 + (v >> 10)).toString(16).padStart(4, "0") + (0xDC00 + (v & 0x3FF)).toString(16).padStart(4, "0"); } else h += c.toString(16).padStart(4, "0"); }
    return "<" + h.toUpperCase() + ">";
  };
  const pdfDatum = (d) => { const p = (x) => String(x).padStart(2, "0"); return "(D:" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + ")"; };
  async function schrijf(d, m, fonts) {
    const obj = [];   // obj[i] = [delen…] voor object i+1
    const nieuw = () => obj.push(null);
    const zet = (nr, ...delen) => { obj[nr - 1] = delen; };
    const stroom = async (nr, dict, data, comp) => {
      const raw = typeof data === "string" ? enc.encode(data) : data;
      const z = comp === false ? null : await deflate(raw);
      const b = z && z.length < raw.length ? z : raw;
      zet(nr, `${nr} 0 obj\n<< ${dict}${b === z ? " /Filter /FlateDecode" : ""} /Length ${b.length} >>\nstream\n`, b, "\nendstream\nendobj\n");
    };
    const cat = nieuw(), pages = nieuw(), info = nieuw();
    // lettertypen
    const fontNr = [];
    for (let i = 0; i < 2; i++) {
      const f = d.f[i];
      if (f.soort === "std") { const n = nieuw(); zet(n, `${n} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${f.naam} /Encoding /WinAnsiEncoding >>\nendobj\n`); fontNr.push(n); continue; }
      const t0 = nieuw(), cid = nieuw(), fd = nieuw(), ff = nieuw(), tu = nieuw();
      const gids = [...f.gebruikt.keys()].sort((a, b) => a - b), extra = [...f.extra.entries()];
      const W = gids.map((g) => `${g} [${Math.round(f.adv[g] * f.sc)}]`).concat(extra.map(([, e]) => `${e.cid} [${e.w}]`)).join(" ");
      zet(t0, `${t0} 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /${f.naam} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${tu} 0 R >>\nendobj\n`);
      zet(cid, `${cid} 0 obj\n<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${f.naam} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fd} 0 R /DW 500 /W [${W}] /CIDToGIDMap /Identity >>\nendobj\n`);
      zet(fd, `${fd} 0 obj\n<< /Type /FontDescriptor /FontName /${f.naam} /Flags 32 /FontBBox [${f.bbox.join(" ")}] /ItalicAngle 0 /Ascent ${f.asc} /Descent ${f.desc} /CapHeight ${f.cap} /StemV ${i ? 140 : 80} /FontFile2 ${ff} 0 R >>\nendobj\n`);
      const ttfBytes = new Uint8Array(f.buf);
      await stroom(ff, `/Length1 ${ttfBytes.length}`, ttfBytes);
      const hx = (n) => n.toString(16).toUpperCase().padStart(4, "0");
      let cm = "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n";
      const u16 = (str) => { let h = ""; for (let i = 0; i < str.length; i++) h += hx(str.charCodeAt(i)); return h; };   // UTF-16BE (ook surrogaatparen)
      const paren = gids.map((g) => [g, String.fromCodePoint(f.gebruikt.get(g))]).concat(extra.map(([cl, e]) => [e.cid, cl]));
      for (let k = 0; k < paren.length; k += 100) {
        const blok = paren.slice(k, k + 100);
        cm += blok.length + " beginbfchar\n" + blok.map(([g, str]) => `<${hx(g)}> <${u16(str)}>`).join("\n") + "\nendbfchar\n";
      }
      cm += "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n";
      await stroom(tu, "", cm);
      fontNr.push(t0);
    }
    // beelden (JPEG)
    const beeldNr = [];
    for (const b of d.beelden) {
      const n = nieuw(); beeldNr.push(n);
      if (b.soort === "rgba") {   // terugval-teken: RGB met een zacht masker (alfa)
        const m = nieuw();
        await stroom(m, `/Type /XObject /Subtype /Image /Width ${b.w} /Height ${b.h} /ColorSpace /DeviceGray /BitsPerComponent 8`, b.a);
        await stroom(n, `/Type /XObject /Subtype /Image /Width ${b.w} /Height ${b.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${m} 0 R`, b.rgb);
        continue;
      }
      zet(n, `${n} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${b.w} /Height ${b.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${b.bytes.length} >>\nstream\n`, b.bytes, "\nendstream\nendobj\n");
    }
    const res = `/Resources << /Font << /F1 ${fontNr[0]} 0 R /F2 ${fontNr[1]} 0 R >>${beeldNr.length ? " /XObject << " + beeldNr.map((n, i) => `/Im${i + 1} ${n} 0 R`).join(" ") + " >>" : ""} /ProcSet [/PDF /Text /ImageC] >>`;
    const kids = d.pages.map(() => nieuw()), inhoud = d.pages.map(() => nieuw());
    // structuur (tagged PDF): StructTreeRoot → Document → H1/H2/H3/P/Caption/Figure, elk met zijn stukken inhoud (MCR)
    const wortel = nieuw(), docEl = nieuw(), ouderBoom = nieuw(), elNr = new Map();
    const els = d.se.filter((e) => e.kids.length);
    els.forEach((e) => elNr.set(e, nieuw()));
    for (const e of els) {
      const k = e.kids.map((x) => `<< /Type /MCR /Pg ${kids[d.pages.indexOf(x.p)]} 0 R /MCID ${x.mcid} >>`).join(" ");
      zet(elNr.get(e), `${elNr.get(e)} 0 obj\n<< /Type /StructElem /S /${e.S} /P ${docEl} 0 R /Pg ${kids[d.pages.indexOf(e.kids[0].p)]} 0 R /K [${k}]${e.alt ? " /Alt " + pdfTekst(e.alt) : ""} >>\nendobj\n`);
    }
    zet(docEl, `${docEl} 0 obj\n<< /Type /StructElem /S /Document /P ${wortel} 0 R /Lang (nl-NL) /K [${els.map((e) => elNr.get(e) + " 0 R").join(" ")}] >>\nendobj\n`);
    const nums = d.pages.map((p, i) => `${i} [${p.ouders.map((e) => (elNr.has(e) ? elNr.get(e) + " 0 R" : "null")).join(" ")}]`).join(" ");
    zet(ouderBoom, `${ouderBoom} 0 obj\n<< /Nums [${nums}] >>\nendobj\n`);
    zet(wortel, `${wortel} 0 obj\n<< /Type /StructTreeRoot /K ${docEl} 0 R /ParentTree ${ouderBoom} 0 R /ParentTreeNextKey ${d.pages.length} >>\nendobj\n`);
    for (let i = 0; i < d.pages.length; i++) {
      const pg = kids[i], inh = inhoud[i];
      zet(pg, `${pg} 0 obj\n<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${PW} ${PH}] ${res} /Contents ${inh} 0 R /StructParents ${i} /Tabs /S >>\nendobj\n`);
      await stroom(inh, "", d.pages[i].ops.filter(Boolean).join("\n"));
    }
    zet(pages, `${pages} 0 obj\n<< /Type /Pages /Kids [${kids.map((k) => k + " 0 R").join(" ")}] /Count ${kids.length} >>\nendobj\n`);
    zet(cat, `${cat} 0 obj\n<< /Type /Catalog /Pages ${pages} 0 R /Lang (nl-NL) /MarkInfo << /Marked true >> /StructTreeRoot ${wortel} 0 R /ViewerPreferences << /DisplayDocTitle true >> >>\nendobj\n`);
    zet(info, `${info} 0 obj\n<< /Title ${pdfTekst("Werkplekinspectie · " + (m.object || m.titel || "rapport") + (m.locatie ? " · " + m.locatie : ""))} /Subject ${pdfTekst("WPI-rapport momentopname " + (m.nummer || m.id || "") + (m.nummer && m.id ? " (" + m.id + ")" : ""))} /Author ${pdfTekst(m.inspecteur || "")} /Creator (Werkplekinspectie) /Producer (Werkplekinspectie rapport.js) /CreationDate ${pdfDatum(new Date())} >>\nendobj\n`);
    // samenvoegen met byte-offsets
    const delen = [enc.encode("%PDF-1.7\n"), new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])];
    let pos = delen[0].length + delen[1].length; const offs = [];
    obj.forEach((o) => { offs.push(pos); for (const x of o) { const b = typeof x === "string" ? enc.encode(x) : x; delen.push(b); pos += b.length; } });
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    let xref = `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
    xref += `trailer\n<< /Size ${obj.length + 1} /Root ${cat} 0 R /Info ${info} 0 R /ID [<${id}> <${id}>] >>\nstartxref\n${pos}\n%%EOF\n`;
    delen.push(enc.encode(xref));
    return new Blob(delen, { type: "application/pdf" });
  }

  WPI.rapportPdf = Object.freeze({ maak, _leesTTF: leesTTF });
})();
