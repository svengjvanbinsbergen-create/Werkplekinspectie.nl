/* Werkplekinspectie — js/laden-start.js (in <head>, na de stylesheets; klein en zonder afhankelijkheden)
   Zorgt dat de ALLEREERSTE schermopbouw al de goede vorm heeft, nog vóór js/kern.js en de rest binnen zijn
   (op een traag netwerk duurt dat seconden):
   - <html data-ld-start="sessie|gast">: is er een bewaarde sessie (alleen de NAAM van de sleutel: demo "wpi_user",
     met backend "wpi_sessie" uit js/auth.js)? Dan tekent css/laden.css meteen de app-schil met het zijmenu
     (logo, naam, menuskelet) en daarna het skelet van het startscherm; zonder sessie de schil van het inlogscherm
     (geen zijmenu, gecentreerd) met het opstartscherm. Zo verschuift er niets als het echte scherm komt.
   - --zoom op <html>: dezelfde berekening als schaal() in js/kern.js (die het daarna bijhoudt), zodat de
     eerste opbouw op een groot scherm niet eerst op 100% staat en dan verspringt.
   - body.veld / body.zon uit de bewaarde weergave (js/kern.js laadPref doet dat pas na het laden van de gegevens).
   De lader zelf staat als gewone HTML in index.html (#ld-opstart) en verschijnt via CSS pas na ±300 ms;
   js/laden.js neemt het daarna over. */
(function () {
  "use strict";
  var d = document.documentElement, sessie = false, pref = {};
  try { sessie = !!(localStorage.getItem("wpi_user") || localStorage.getItem("wpi_sessie") || sessionStorage.getItem("wpi_sessie")); } catch (e) {}
  try { pref = JSON.parse(localStorage.getItem("wpi_pref") || "{}") || {}; } catch (e) {}
  d.setAttribute("data-ld-start", sessie ? "sessie" : "gast");
  // zelfde formule als schaal() in js/kern.js
  var w = window.innerWidth || 0, h = window.innerHeight || 0;
  var z = w >= 1280 ? Math.min(1 + 0.7 * (w - 1280) / 1280, 2, Math.max(1, h / 760)) : 1;
  z = Math.max(1, Math.round(z * 100) / 100);
  d.style.setProperty("--zoom", String(z));
  // weergave (veld/zon) op <body> zodra die er is: MutationObserver-callbacks lopen vóór de eerste schermopbouw
  var body = function () {
    if (!document.body) return false;
    if (pref.veld) document.body.classList.add("veld");
    if (pref.zon) document.body.classList.add("zon");
    return true;
  };
  if (!body() && window.MutationObserver) {
    var m = new MutationObserver(function () { if (body()) m.disconnect(); });
    m.observe(d, { childList: true });
  }
})();
