/* Werkplekinspectie — js/koppel.js
   TRA-koppeling zonder AI (terugval en controle naast Claude): welke risicoregel past bij wat de inspecteur zag,
   welke taak bij wat de monteurs doen, en is dit een direct gevaar.
   Werkt met GEVAARZINNEN ("onder de hangende last", "hijsband rafelig", "geen valbeveiliging") die naar een
   gevarenbegrip wijzen; elk begrip herkent zijn eigen regels aan de risicozin uit de TRA. Losse algemene woorden
   ("onder", "monteur", "damwand", de productnaam) tellen niet mee: daardoor koppelde "onder de hangende
   damwandplank" eerder aan "damwand verschuift bij loskoppelen". Een losse woordovereenkomst geeft hooguit een
   ZWAKKE match: die bevestigt de inspecteur altijd met een tik op de regel zelf (zie js/inspectie.js).
   STERK alleen met een gevaarzin (≥ 2,5) bij de kern van de regel, geen algemeen onderwerp erboven en de tweede regel
   < 80% van de score; een voorwerp alleen ("strop", "elektricien") is geen gevaarzin. Het Voorstel is altijd een regel
   van de taak (een beter passend algemeen onderwerp komt apart terug als `alg`). Ook geen STERK als een ándere
   gevaarzin hard naar de tweede regel wijst (twee gevaren in één zin: de inspecteur kiest). Context telt: "de hijsband
   hangt over een scherpe rand" is een vallende last, geen persoon over de putrand (zie-patronen met een "niet"-context).
   Scheidbare werkwoorden ("ze zetten de compactvijzel aan", "ze draaien het microfilter proef") worden samengevoegd.
   Ronde 4: een zwaaiende/tollende last ("draait helemaal rond aan de haak", "tolt", "geen touw") is SLINGER, en "aan de
   haak" telt dan niet als vallende last; persoon onder de last ook met langere zinnen en bouwplaatstaal ("die vent staat
   met z'n kop onder de bandscreen terwijl die omhoog gaat", "duikt eronder"); besloten ruimte zonder meting of met een
   geur ("zonder meter", "ruikt raar", "niemand heeft gemeten"); achteruit richting een open gat ("dekplaat ligt eruit");
   een losse ladder is val van de ladder, geen verschuivende unit. Een gevaarzin (≥ 3) die alleen naar een andere regel
   wijst, blokkeert STERK ongeacht de verhouding. Een zwaaiende last aan de kraan is direct gevaar.
   Getest op 261 zinnen (tests/koppel.js); de meeste sets zijn na hun eerste meting gebruikt om bij te stellen.
   Eerste metingen op nieuwe zinnen staan eerlijk in de kop van die test (blind4-6: 89% in de top 3, 3 foute sterke
   matches op 48; blind7: 91% in de top 3, 79% eerst, 2 foute sterke matches op 23).
   Ronde 5: een draaiend deel dat niet geblokkeerd is ("trommel is niet geblokkeerd", "geen borgpen", "kan zo omdraaien"),
   een lichaamsdeel tussen spaken/tandwiel, een aandrijving die bijdraait; een rolsteiger die wiebelt of op losse platen
   staat; een rooster/plaat die ernaast of opzij ligt (open gat) en achteruit lopen; rare lucht of de meter in de bus;
   afschakelen zonder na te meten ("meet niks na, zegt dat ie dood is"); meer bouwplaatstaal voor iemand onder de last
   ("loopt er onderlangs", "die peer bukt eronder"). VANGNET: is de eerste regel geen direct gevaar, terwijl een regel mét
   direct gevaar ook een gevaarzin heeft of de zin zelf direct gevaar noemt ("zonder gasmeter"), dan nooit STERK (reden
   "controle"): liever één tik op de regel dan stil een verkeerde regel zonder rode balk en ter-plaatse-vraag.
   Eerste meting op 26 nieuwe eigen zinnen (blind9): 96% top 3, 81% eerst, 0 foute sterke matches op 17.
   Ronde 7 (afkeuring 6: twee FOUTE sterke matches bij direct gevaar): op een niet geblokkeerde vijzel staan en boren
   ("staat op de vijzelbladen te boren en de vijzel is niet geblokkeerd") is werken op de vijzel/ongewenst draaien, niet
   alleen stof: "vijzel" + "niet/niks geblokkeerd", "op de vijzelbladen staat", "kan zo wegdraaien"; bij gelijke score gaat
   direct gevaar voor. "Zonder bokken of stempels" onder een opgekrikte brug is terugzakken (onvoldoende fixatie), geen
   kraanstempel. Afscherming die op de grond ligt en een mouw vlak naast een draaiend deel; oog/vonken (spatbril) als
   eigen begrip; "half uit de trog", "niveausturing … slaat zo weer aan", "koppeling losmaakt" (ontkoppelen); een voorwerp
   op de rand ("meter ligt boven op de rand") is geen persoon aan de rand. Het vangnet kent ook "niet geblokkeerd",
   "op de vijzel staat" en "eronder zonder stempels". Taakchip: "in het bassin", "het water in" → Tewaterlating.
   Eerste meting op 24 nieuwe eigen zinnen (blind11, 21 producten, vóór het bijstellen daarop): 96% top 3, 75% eerst,
   2 foute sterke matches op 18 (beide tussen twee regels mét direct gevaar). Reken op nieuwe taal op ~75-85% eerst.
   Alles blijft een Voorstel: de inspecteur kiest de regel en het oordeel (C/A/V/NVT).
   Zuivere functies op window.WPI.koppel (geen DOM), getest in tests/koppel.js. */
(function () {
  "use strict";
  const WPI = window.WPI;
  // kleine letters, geen accenten, alleen letters/cijfers, met spaties eromheen (voor \b-patronen)
  // Spreektaal: "d'r uit" → "eruit", "er in" (zonder lidwoord erachter) → "erin".
  const norm = (s) => (" " + String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim() + " ").replace(/ d r /g, " er ").replace(/ er (uit|af|op) /g, " er$1 ")
    .replace(/ er in (?!(de|het|een|die|dat|deze)\b)/g, " erin ");
  // functies en personen ("de elektricien", "de monteur") zeggen niets over het gevaar: ze tellen niet als woord-
  // overeenkomst, en ELEKTRA herkent "elektr..." niet in een functienaam. Anders telde "elektricien" als elektrisch
  // gevaar (koppelde "geen hangslot op de hoofdschakelaar" aan "elektrisch gevaar" in plaats van het LOTOTO-slot).
  const PERSOON = /\b(elektricien\w*|elektromonteur\w*|elektrotechnic\w*|e monteur\w*|installateur\w*|monteur\w*|lasser\w*|uitvoerder\w*|voorman|ploegleider\w*|leerling\w*|stagiair\w*|gast|kerel|vent)\b/g;
  const ontPersoon = (s) => norm(s).replace(PERSOON, " ");
  // Scheidbare werkwoorden van de bouwplaats: "ze zetten de compactvijzel aan" → "aanzetten", "ze draaien het microfilter
  // proef" → "proefdraaien", "ze zetten de slibindikker veilig" → "veiligzetten", "ze hijsen het filter de put in" →
  // "inhijsen". Het partikel telt alleen aan het eind van het zinsdeel of vóór een voegwoord/voorzetsel ("uit de put" is
  // een voorzetsel, geen partikel). → { los: zin met het samengestelde werkwoord op de plek van het werkwoord (voor de
  // woordstammen), extra: " aanzetten …" (achter de genormaliseerde zin geplakt, voor de patronen) }.
  const WW = {}; ("zet:zetten zette:zetten zetten:zetten draai:draaien draait:draaien draaien:draaien schakel:schakelen schakelt:schakelen " +
    "schakelen:schakelen haal:halen haalt:halen halen:halen trek:trekken trekt:trekken trekken:trekken bouw:bouwen bouwt:bouwen bouwen:bouwen " +
    "sluit:sluiten sluiten:sluiten klem:klemmen klemt:klemmen klemmen:klemmen hang:hangen hangt:hangen hangen:hangen takel:takelen takelt:takelen " +
    "takelen:takelen hijs:hijsen hijst:hijsen hijsen:hijsen neem:nemen neemt:nemen nemen:nemen maak:maken maakt:maken maken:maken stel:stellen " +
    "stelt:stellen stellen:stellen til:tillen tilt:tillen tillen:tillen sla:slaan slaat:slaan slaan:slaan breek:breken breekt:breken breken:breken " +
    "laat:laten laten:laten start:starten starten:starten").split(" ").forEach((x) => { const [a, b] = x.split(":"); WW[a] = b; });
  const PARTIKEL = new Set("aan uit af in op bij proef test weg los vast veilig terug neer dicht open erin eruit eraf erop".split(" "));
  const NA = new Set("voor met bij om zodat en terwijl als want maar omdat toen nadat zonder tijdens door naar vanaf vandaag nu weer".split(" "));
  function scheid(tekst) {
    const extra = [], los = [];
    String(tekst || "").split(/[,.;:!?]+/).forEach((deel) => {
      const w = norm(deel).trim().split(" ").filter(Boolean);
      for (let i = 0; i < w.length; i++) {
        const inf = WW[w[i]]; if (!inf) continue;
        for (let j = i + 1; j < Math.min(w.length, i + 7); j++) {
          if (WW[w[j]]) break;
          if (PARTIKEL.has(w[j]) && (j === w.length - 1 || NA.has(w[j + 1]))) { const sam = w[j] + inf; extra.push(sam); w[i] = sam; w.splice(j, 1); break; }
        }
      }
      los.push(w.join(" "));
    });
    return { los: los.join(" , "), extra: extra.length ? " " + extra.join(" ") + " " : "" };
  }
  // tekst voor de patronen: genormaliseerd, plus de samengestelde werkwoorden
  const patroonTekst = (tekst) => norm(tekst) + scheid(tekst).extra.trimStart();

  // ---- gevarenbegrippen ----
  // regel: herkent het begrip in de risicozin van een TRA-regel (kop vóór de dubbele punt telt vol, de rest 0,7,
  //        de maatregelen 0,4). zie: [patroon, gewicht] op de waarneming; ≥ 2,5 = gevaarzin, lager = zwakke aanwijzing.
  // "de ketting staat nog op spanning": mechanische spanning (veer, spanner), geen elektriciteit
  const VEERSPANNING = /(ketting|veer|veren|spanner|spanmechanisme|band|kabel|staaldraad)\w* (\w+ ){0,4}(op|onder) (de )?spanning|(op|onder) spanning (\w+ ){0,3}(ketting|veer|spanner)/;
  // een hijsmiddel (geen persoon) ligt over/langs een rand: "de band hangt over de rand van de put" is geen valgevaar
  const HIJSMIDDEL_OVER = /(hijsband|band|strop|stroppen|ketting|kabel|sling|slang|touw)\w* ((?!(hij|zij|ze|iemand|collega|monteur|man|jongen|gast|gozer)\b)\w+ ){0,5}(hangt|hangen|hing|ligt|liggen|zit|loopt|schuurt) (\w+ )?(over|langs|buiten|om|tegen)\b/;
  // ronde 7: een voorwerp (geen persoon) op de rand: "z'n meter ligt boven op de rand", "stempel staat op de rand van de sloot"
  const VOORWERP_RAND = new RegExp(HIJSMIDDEL_OVER.source + "|\\b(meter|gasmeter|tas|gereedschap\\w*|sleutel\\w*|kist|emmer|stempel\\w*|rijplaat\\w*|kraan|tandwielkast|onderdeel|onderdelen)\\b (\\w+ ){0,4}(ligt|lag|staat|stond|liggen|staan) (\\w+ ){0,2}op de rand\\b");
  // de last zwaait of tolt (geen vallende last): "dat ding draait helemaal rond aan de haak", "tolt rond", "zwaait alle kanten op"
  const ZWAAI = /\b(tolt|tollen|tolde|zwaai\w*|zwiep\w*|slinger(t|en|de)?|pendel\w*)\b|\bdraai\w* (\w+ ){0,2}rond\b|\brond ?(draai|tol)\w*|heen en weer|alle kanten op/;
  // "aan de haak" zegt dan alleen dát hij hangt; telt pas als vallende last met iemand eronder
  const ZWAAI_ZONDER_ONDER = new RegExp("^(?!.*\\b(onder|eronder|onderdoor)\\b).*(" + ZWAAI.source + ")");
  // een ladder/trap die los staat is een val van de ladder, geen verschuivende unit
  const LADDER_LOS = /\b(ladder|trap)\w* (\w+ ){0,5}(niet (vastgezet|vastgebonden|geborgd|gezekerd|vast)|staat los|los\b|schuift|verschuift|glijdt|wiebelt|geleund|leunt (\w+ ){0,2}tegen|zakt weg)|(niet vastgezet|niet vastgebonden|losse|gammele?|wankele?|wiebelende?) (\w+ ){0,2}(ladder|trap)\w*|(ladder|trap)\w* (\w+ ){0,6}(niks|niets) vastgezet/;
  // lichaamsdelen die bekneld raken (geen persoon onder een hangende last)
  const KNELDEEL = "(?!(hand|handen|voet|voeten|vinger|vingers|been|benen|arm|armen|poot|poten|teen|tenen)\\b)";
  // ronde 5: een draaiend deel dat niet geblokkeerd is ("trommel is niet geblokkeerd", "geen blokkering op de trommel")
  // kan onverwacht draaien; dát is het gevaar, ook als er een arm of hand bij zit (anders won "arm tussen" → beknelling)
  const ONGEBORGD_DRAAI = /\bvijzel\w* (\w+ ){0,3}(niet|nog niet|nergens|niks|niets) (geblokkeerd|geblokt|geblokkeerd tegen draaien)\b|\b(trommel|trommelzeef|zeef|rotor|borstel|waaier|schoepenwiel|schroef)\w* (\w+ ){0,3}(niet|nog niet|nergens|niks|niets) (geblokkeerd|geblokt|vast|vastgezet|geborgd|vergrendeld|gezekerd|geklemd)\b|(geen|zonder) (\w+ )?(blokkering|blokkeer\w*|borgpen|borging|rotatieborging|vergrendeling|klem) (\w+ ){0,2}(op|aan|in|voor) (de |het )?(trommel|zeef|rotor|as|borstel|vijzel|schroef)\w*|\b(trommel|trommelzeef|zeef|rotor|borstel|waaier|schroef|vijzel)\w* (\w+ ){0,2}(heeft|zit|staat|draait) (\w+ )?(geen|zonder) (\w+ )?(blokkering|blokkeer\w*|borgpen|borging|rotatieborging|vergrendeling)\b/;
  // ronde 7: "niks geblokkeerd", "niet geblokkeerd", "niemand heeft hem geblokkeerd" (zonder het onderdeel ervoor)
  const NIET_GEBLOKT = /\b(niet|niks|niets|nergens|nog niet) (\w+ )?(geblokkeerd|geblokt|vastgezet tegen draaien)\b|niemand (heeft|had) (\w+ ){0,2}(geblokkeerd|geblokt)|(geen|zonder) (blokkering|blokkeerpen|borgpen|rotatieborging)\b/;
  // ronde 7: een afscherming/kap van een draaiend deel die eraf, ernaast of op de grond ligt ("afscherming van de koppeling
  // ligt nog op de grond") = draaiende delen zonder bescherming
  const AFSCHERM_WEG = /\b(afscherming\w*|beschermkap\w*|kap|afdekkap\w*|afdekking\w*|beschermrooster\w*|hekje)\b (van (de |het )?\w+ )?(\w+ ){0,2}(ligt|lag|staat|stond|hangt|zit|zat|is) (\w+ ){0,2}(op de grond|ernaast|naast|opzij|aan de kant|in de bus|los|eraf|weg|niet (op|terug|gemonteerd))\b/;
  // losse kleding of een lichaamsdeel vlak naast iets wat gaat draaien ("staat er met z'n mouw vlak naast")
  const KLEDING_BIJ = /\b(mouw\w*|jas|jasje|capuchon|sjaal|haren|losse kleding|veter\w*|trekkoord\w*|stropdas)\b (\w+ ){0,3}(vlak |pal |net |heel dicht |te dicht )?(naast|bij|tegen|langs|boven|in de buurt)\b/;
  // een lichaamsdeel tussen/in/bij een draaiend of aangedreven deel ("arm tussen de spaken", "handschoen bijna tussen het tandwiel")
  const LIJFDEEL = "\\b(hand|handen|arm|armen|vinger\\w*|handschoen\\w*|mouw\\w*|been|voet|hoofd|kop)\\b (\\w+ ){0,4}";
  const DRAAIDEEL = " (de |het |een )?(spaken|spaak|schoep\\w*|tandwiel\\w*|kettingwiel\\w*|tandkrans|rotor\\w*|trommel\\w*|schroefblad\\w*|waaier\\w*|borstel\\w*|draaiende \\w+|lopende \\w+|koppeling|aandrijfas|v ?snaar|poelie|riem)\\b";
  const IN_DRAAIDEEL = new RegExp(LIJFDEEL + "(tussen|in|door)" + DRAAIDEEL), BIJ_DRAAIDEEL = new RegExp(LIJFDEEL + "(bij|aan|tegen)" + DRAAIDEEL);
  const AAN_KRAAN = /aan de (kraan|haak|takel)|\bhijs\w*|\bbungel\w*/;
  // een plaat, luik of rooster dat uit het dek is: een open gat ("rooster van het dek ligt ernaast", "dekplaat ligt eruit")
  const OPENING = "(luik|dekluik|mangat|putdeksel|deksel|dekplaat|vloerplaat\\w*|roostervloer\\w*|rooster(tje|s|en)?|plaat|platen|loopbrugdeel)";
  const OPEN_GAT = new RegExp("\\b" + OPENING + "\\b (\\w+ ){0,5}(staat|stond|ligt|lag|is|zijn|liggen|lagen|werd|wordt) (\\w+ ){0,2}(open|eruit|eraf|weg|los|ernaast|opzij|aan de kant|weggehaald|eruit gehaald|weggelegd|uitgenomen)\\b|\\b" + OPENING + "\\b (\\w+ ){0,4}(ontbreekt|ontbreken|weggehaald|eruit gehaald|niet teruggelegd|niet terug)\\b|(rooster|dekplaat|plaat|luik|deksel) (ligt |is )?(eruit|eraf|weg|los)");
  // ronde 7: iets opgetild/opgekrikt zonder ondersteuning eronder ("de brug is met de vijzels opgekrikt en hij kruipt eronder
  // zonder bokken of stempels"): terugzakken/onvoldoende fixatie, geen kantelende kraan
  const OPGETILD = "(opgekrikt|opgevijzeld|opgetild|omhoog ?gekrikt|omhoog ?gevijzeld|op(ge)?krik\\w*|krik\\w*|vijzels? (eronder|onder)|hangt (\\w+ ){0,2}op de (vijzels|krikken|kraan))";
  const ZONDER_STEUN = "(zonder|geen|niet op) (\\w+ ){0,3}(bok|bokken|stempels?|stut\\w*|onderstop\\w*|ondersteuning|blokken|stapelblokken|houten balken|balken|steun\\w*)";
  const ONDERSTEUN_NIET = new RegExp("^(?!.*\\b(kraan|kranen|hijskraan|telekraan|autokraan)\\b)(?=.*\\b" + ZONDER_STEUN + "\\b).*\\b(" + OPGETILD + "|eronder|onder de (brug|unit|vijzel|trog|ruimerbrug|loopwagen))\\b");
  const TERUGZAK = new RegExp("\\b" + OPGETILD + "\\b.*\\b(eronder|onder (de |het )?\\w+|" + ZONDER_STEUN + ")|\\b(eronder|onder (de |het )?(brug|unit|vijzel|trog|ruimerbrug|loopwagen))\\b.*\\b" + ZONDER_STEUN + "\\b|\\b" + ZONDER_STEUN + "\\b.*\\b(eronder|" + OPGETILD + ")\\b");
  const B = {
    LAST: { regel: /vallen van (de |het )?(last|reductor|indraaireductor)|vallen van last|ongecontroleerd vallen|onder (de |een )?hangende last|werken onder hangende|onjuist aanslaan|bezwijken hijsmiddel|vallen van schraper/,
      zie: [[/onder (de |een |die |het )?(hangende |zwevende )?last/, 3], [/\bhangende?\b|\bzwevende?\b/, 3], [/onder (de |een )?(kraan|haak|giek|plank|damwand\w*|vijzel)\b/, 2],
        // het hijsmiddel als voorwerp telt 2 (geen gevaarzin op zich); de toestand (rafelig, geen keuring) maakt het hard
        [/hijsband\w*|hijsstrop\w*|\bstrop(pen)?\b|hijsketting\w*|hijsmiddel\w*|hijsgereedschap|\bsjorband\w*|\bbanden\b/, 2],
        [/\brafel\w*|gerafeld|ingescheurd|gescheurd\w*|kapotte? (band|strop|ketting)|beschadigde? (band|strop|ketting|sluiting|haak)|afgekeurd\w*/, 3],
        [/aangeslagen|\baanslaan\b|aanslagpunt\w*|hijsoog\w*|hijspunt\w*|harpsluiting|\bharp\b|borglip|veiligheidsklep|haak zonder|zonder (borg|klep)/, 3, /(kan|kunnen|zou|gaat) (\w+ ){0,3}aanslaan|vlotter|automa\w*|niveau\w*|elk moment|ieder moment|\bslaat (\w+ ){0,3}aan\b|schakelaar|pomp (\w+ ){0,3}aan/],
        [/last (valt|viel|zakt|glijdt|schiet)|(kan|kon|gaat) (\w+ ){0,2}(naar beneden|omlaag) (donderen|pleuren|flikkeren|kletteren|vallen|storten)|\bzwaartepunt|scheef (aan de kraan|gehangen|aangeslagen|aan de haak)|hangt scheef/, 3],
        // spreektaal: "hangen die pomp aan een verroeste ketting", "loopt pal onder dat ding door", "aan de haak"
        [/\bhang(t|en|end)\b.*\baan (een |de |die |dat |het |z n |zijn )?(\w+ )?(\w+ )?(ketting\w*|band\w*|strop\w*|haak|kraan\w*|hijs\w*|touw\w*|sling\w*)|aan de (kraan)?haak|aan de kraan (hangt|hangen|hing)/, 3, ZWAAI_ZONDER_ONDER],
        [/(verroest\w*|roestig\w*|kapotte?|oude?|gebroken|vervormde?) (hijs)?(ketting\w*|haak|harp|sluiting|schakel)|ketting\w* .*\b(verroest|roestig|roest|kapot|gebroken|uitgerekt)|(zonder|geen) (keur\w*|label|sticker|wll|swl)\b.*\b(ketting|band|strop|haak|hijs\w*)|(ketting\w*|band\w*|strop\w*|haak|hijs\w*) .*\b(zonder|geen) (keur\w*|label|sticker|wll|swl)|niet gekeurde? (ketting|band|strop|hijs\w*)/, 3],
        [/onderdoor|onderlangs|\bonder (dat|die|het|de|een) (\w+ )?(\w+ )?(door|langs)\b|(pal|recht|vlak|net|precies) onder\b/, 2.5],
        // persoon ONDER iets dat hangt of gehesen wordt (ook spreektaal): "gozer staat onder de trommel die aan de kraan
        // bungelt", "hij staat onder de vijzel terwijl die omhoog gaat". Lichaamsdeel onder de last = beknelling (niet hier).
        // Ook langere zinnen ("die vent staat met z'n kop onder de bandscreen terwijl die omhoog gaat"): tot 5 woorden
        // tussen het werkwoord en "onder", zolang dat geen hand/voet is.
        [new RegExp("^(?=.*\\b(bungel\\w*|hang(t|en|end|ende)|zweef\\w*|zwevend\\w*|aan de (kraan|haak|takel|ketting|strop|band)|omhoog|naar (boven|beneden)|komt (\\w+ )?(op|om)hoog|zakt|zakken|gehesen|hijs\\w*|takel\\w*|getakeld)\\b).*?\\b(?<w>(staat|staan|stond|stonden|zit|zitten|zat|loopt|lopen|liep|ligt|liggen|lag|werkt|werken|kruipt|kruipen|duikt|duiken|dook|stapt|stappen|kijkt|kijken|keek|steekt|steken|gaat|gaan|gozer|kerel|vent|knakker|knul|jochie|peer|figuur|gast|maat|iemand|man|collega|hij|ze|kop|hoofd|harses|lijf|neus|bukt|bukken|buigt) (" + KNELDEEL + "\\w+ ){0,5}(onder|eronder|eronderdoor|onderlangs|eronderlangs|onderdoor)( (de|het|die|dat|een|zijn|z n))?( \\w+)?)\\b"), 3],
        [/\bbungel\w*|\bzweeft\b/, 2.5, ZWAAI_ZONDER_ONDER],
        // last boven iemands hoofd: "onderdeel hangt boven zijn kop"
        [/(hang(t|en)|hing|bungel\w*|zweef\w*|gaat|komt|draait) (\w+ ){0,3}boven (zijn|z n|het|hun|d r|ieders|de) (kop|hoofd|hoofden|koppen|mensen|ploeg)|boven (zijn|z n|hun) (kop|hoofd) (\w+ ){0,3}(hang\w*|bungel\w*|zweef\w*)/, 3],
        // hijsmiddel versleten, kraakt of over een scherpe rand: de klassieke oorzaak van een vallende last
        [/(door|af|uit)gesleten|\bversleten|\bgesleten|half door\b|\bkraakt\b|\bkraken\b|\bknapt\b|\bslijtage|\bbeschadigd\w*/, 3, /\b(rooster|tand|harken|zeefpaneel|zeefpanelen|kabel)\w* (\w+ ){0,2}(versleten|gesleten|beschadigd)/],
        [/(hijsband|band|strop|stroppen|ketting|sling|hijsketting|hijsstrop)\w* (\w+ ){0,6}(over|om|langs|tegen) (een |de |het )?(scherpe|scherp)|(scherpe|scherp) (rand|hoek|kant) (\w+ ){0,4}(band|strop|ketting|sling)/, 3],
        [/(hijsband|band|strop|ketting|haak|hijs\w*|takel)\w* (\w+ ){0,3}(is |zijn )?(niet|nooit) (gekeurd|getest)|(strop|band|ketting|haak|sluiting)\w* (\w+ ){0,4}(afglipp\w*|glipt|glippen|schiet (er )?af)|afglipp\w*|(eraf|er af) (glipp\w*|schiet|valt)/, 3],
        [/hijsgebied|hijspad/, 1.5], [/\bhang(t|en)\b|\blast\b|\bhijs(t|en)\b|\bketting\w*/, 1]] },
    GLIJ: { regel: /uit de (trog|buis) glijden/, zie: [[/(glij|glip|schuif|zak|schiet|slip)\w* (\w+ ){0,4}uit (de )?(trog|buis)|uit de (trog|buis) (\w+ )?(glij|schuif|zak|schiet|weg)\w*/, 3],
        // ronde 7: "half uit de trog", "hangt alleen nog aan de bovenste strop" (bij het glijden: de tweede aanwijzing)
        [/(half|helemaal|een stuk) uit (de )?(trog|buis)|uit (de )?(trog|buis) (\w+ )?(gegleden|geglipt|geschoven|gezakt)|^(?=.*\buit (de )?(trog|buis)\b).*\b(alleen|nog maar) (nog )?aan (de |een |één |1 )?(bovenste |onderste |laatste )?(strop|band|ketting|haak)/, 2]] },
    SLINGER: { regel: /zwaaiend|zwaait|ongecontroleerd zwaaien|stuurlijn|onverwachte beweging van (de )?last|onverwachte beweging van last/,
      // de beweging en het ontbrekende stuurtouw zijn twee aanwijzingen (eerder één patroon: samen maar 3)
      zie: [[/\bzwaai\w*|\bzwiep\w*|\bslinger(t|en|ende)?\b(?! (rond|op|over|door))|\bpendel\w*|\bwind(kracht|stoot|vlaag|vlagen)?\b|heen en weer|alle kanten op/, 3],
        // ronddraaien/tollen is alleen zwaaien als het ding aan de kraan hangt (anders: draaiende delen)
        [/\bdraai\w* (\w+ ){0,2}rond\b|\brond ?(draai|tol)\w*|\btol(t|len|de)\b/, 3, /^(?!.*\b(kraan\w*|haak|takel\w*|hijs\w*|hangt|hangen|hing|bungel\w*|gehesen|getakeld|strop\w*)\b)/],
        // ronde 5: de beweging AAN de haak/kraan is een tweede aanwijzing ("zwiept rond aan de haak")
        [/\b(zwiep|zwaai|slinger|tol|pendel)\w* (\w+ ){0,3}aan de (haak|kraan|takel|strop|ketting)\b/, 2],
        // ontbrekende stuurlijn is een gevaarzin; een stuurlijn in de hand (zo hoort het) alleen een zwakke aanwijzing
        [/(geen|zonder) (\w+ ){0,2}(stuurlijn\w*|stuurtouw\w*|touw\w*)|(stuurlijn|stuurtouw|touw)\w* (\w+ ){0,3}(ontbreek\w*|vergeten|niet (aan|vast|gebruikt))|niemand (\w+ ){0,3}(een |het |de )?(stuur)?(lijn|touw)\w*|(geen|zonder) (stuur)?lijn(en|tje)? (\w+ )?(eraan|aan)\b|(geen|zonder) (stuur)?lijnen\b/, 3],
        [/stuurlijn\w*|stuurtouw\w*|\btouw(en|tje)?\b/, 1.5],
        ] },
    BEGELEID: { regel: /begeleiden van de last|onveilige positie|lopen over gladde/,
      zie: [[/\bbegeleid\w*|hand(en)? aan de (last|plank|damwand\w*|vijzel|pomp)|(z n|zijn|met de|blote) hand(en)? (\w+ )?(eraan|ertegen|op de last)\b|(duwt|duwen|trekt|trekken|houdt|houden|stuurt|sturen|draait|draaien) (de |het |die |dat )?(?!(bout|bouten|moer|moeren|schroef|schroeven|ankers?)\b)\w+ (met|bij|vast|weg|op z n plek|op zijn plek)\b/, 3],
        [/(duwt|duwen|trekt|trekken|houdt|houden|stuurt|sturen|pakt|pakken|zet|zetten|schuift|schuiven|draait|draaien|begeleidt)\b.*\bmet (de |zijn |z n |hun |blote )?hand(en)?\b/, 2.5], [/onveilige (plek|positie)|in de val ?zone|\bvalzone/, 2.5],
        [/(stuurt|sturen|stuurde|bijstuurt|bijsturen|begeleidt) (\w+ )?(de |het |die |dat )?(vijzel|last|plank|damwand|pomp|trog|trommel|filter|beluchter|brug|unit)\b/, 3],
        [/\bglad(de)?\b|\bglibber\w*|uitglij\w*|\bmodder\w*/, 2], [/\bachteruit\b/, 1]] },
    BEKNEL: { regel: /beknel\w*|pletten|klemzone|\bknel\w*|tussen de last/,
      zie: [[/\bvinger\w*|bekneld|beknel\w*|\bklem\w*|\bknel\w*|(hand|handen|voet|voeten|been|benen|arm|armen|vinger|vingers|handschoen\w*|mouw\w*) (\w+ ){0,2}(tussen|onder|achter|in\b(?! (de |het )?(put|vijzelput|pompput|tank|kanaal|bassin|water|kelder|lucht)\b))\b|tussen (de )?(last|flens|flenzen|constructie|plank|planken|damwand\w*|wand|vijzel|trog)\b|\bplet\w*/, 3],
        [/\bhand(en)?\b/, 1]] },
    HOOGTE: { regel: /vallen van hoogte|\bval van\b|\bval (van|met)\b|vallen in|valgevaar|rand van|open gat|steiger|hoogwerker|ladder|werkbordes|uitglijden of vallen|vallen door/,
      zie: [[/(zonder|geen) (val\w*|harnas|leuning\w*|hekwerk|randbeveiliging|lijnlijn|vanglijn|reling)/, 3], [/valbeveiliging|\bharnas\w*|\bvanglijn|\blijnlijn|randbeveiliging|\bleuning\w*|hekwerk\w*|\breling\b/, 3],
        [/(aan|op|over|bij|langs|naast|richting|vlak bij) de (rand|putrand|kant|reling)\b|putrand|\brand van (de |het )?(put|bak|tank|kanaal|bassin|dek)/, 3, VOORWERP_RAND],
        [/open (gat|put|luik|mangat)|gat in (het |de )?(dek|rooster|vloer)|(zonder|geen) hek\b/, 3], [OPEN_GAT, 3],
        // achteruit lopen terwijl er een gat, open luik of rand is (ronde 5: niet alleen "richting het gat")
        [/^(?=.*\b(gat|luik|dekluik|mangat|rand|ernaast|opzij|eruit|weggehaald|open)\b).*\b(achteruit|achterwaarts|achterstevoren|met (de|zijn|z n) rug (naar|richting))\b/, 2],
        // richting een gat lopen of er met de hakken aan staan: "loopt achteruit richting het gat"
        [/(richting|naar|aan|langs|naast|bij|vlak bij|tot aan) (het|een|dat|t) (open )?gat\b|achteruit (\w+ ){0,5}(gat|rand|kant|luik)\b|(hakken|tenen) (\w+ )?(aan|over|op) (de|het) (rand|gat|kant)/, 3],
        [/\bladder\w*|\b(rol)?steiger\w*|hoogwerker\w*|\bop hoogte\b|\bleunt\b/, 3],
        // "hij hangt half over de leuning" = valgevaar; "de band hangt over een scherpe rand" NIET (dan hangt er een hijsmiddel)
        [/(hangt|hangen|hing|buigt|buigen|reikt|reiken) (half |ver |helemaal |een stuk )?(over|buiten) (de |het |een )?(?!scherpe )(rand|reling|leuning|hek\w*|kant|putrand|balustrade|dek)|hangt (half |ver )?buiten/, 3, HIJSMIDDEL_OVER],
        [/(zonder|geen) (\w+ )?(hek\w*|leuning\w*|reling|lijn|lijnen|harnas|valbeveiliging|randbeveiliging|balustrade|vanglijn|lijnlijn)\b/, 3, new RegExp("(stuur|geleide)lijn|(zonder|geen) (stuur)?lijn(en)? (\\w+ )?(eraan|aan de (last|vijzel|plank|pomp|trommel|filter|frame|haak))|(hangt|zit) (er )?geen (stuur)?lijn(en)? aan|" + ZWAAI.source)],
        [/\bbuitenkant\b|\bbuitenrand\b/, 2], [/\bvalgevaar|(bijna|kan|kon) (er )?(in |eraf )?vallen|valt bijna/, 3],
        [/\bvallen\b|\bdiep\w*/, 1.2]] },
    // val van een ladder: de ladder zelf (los, niet vastgezet, afdalen langs de ladder)
    LADDER: { regel: /\bladder|\btrap\b/, zie: [[/\bladder\w*|\btrap(je|pen)?\b/, 2.5], [LADDER_LOS, 3]] },
    WATER: { regel: /in (het )?water|bassin|\bkanaal\b|golfslag|boven water|\bdrijv/,
      zie: [[/reddingsvest\w*|zwemvest\w*|reddingsboei\w*|in het water|boven (het )?water|\bbassin\b|te water|\bdrijver\w*|\bponton\w*|golfslag/, 3]] },
    // zelf in het water vallen (los van "vallen in bassin via open gat"): zonder vest op een wiebelend platform
    TEWATER: { regel: /in (het )?water(\/kanaal)? (vallen|raken)|te water raken|vallen in (het )?water|verdrink/,
      zie: [[/(zonder|geen) (zwem|redding)s? ?vest\w*|wiebel\w*|\bschommel\w*|overboord|(kan|kon|valt|viel|bijna) (\w+ ){0,2}(in het water|te water)/, 3]] },
    GAS: { regel: /besloten ruimte|\bgas(sen)?\b|h2s|ventilatie|toxisch|giftig|zuurstof|\bch4\b/,
      zie: [[/gasmeter\w*|gasmeting\w*|gasdetect\w*|\bgas\b|besloten|ventila\w*|\bh2s\b|zwavelwaterstof|rotte eieren|\bstank|\bstinkt|\bstinken|\bmuf\b|ruikt (\w+ ){0,2}(raar|vies|muf|gek|vreemd|naar|zuur|scherp)|mangatwacht\w*|\bmangat\b|ademlucht|afzuig\w* (\w+ ){0,2}(staat |is |zit )?(uit|kapot|niet aan|stil)\b|zuurstof\w*|\bmethaan|\bduizelig/, 3],
        // zonder te meten de put/tank in: "gaat zonder meter de tank in", "lopen de tank in zonder dat iemand gemeten heeft"
        [/(zonder|geen) (gas)?meter\b|(niet|niks|niets|nooit|niemand) (\w+ ){0,2}(gemeten|meet|meten)|zonder (dat )?(er |iemand |hij |ze )?(\w+ )?(gemeten|te meten|meting)/, 3, /spanning|duspol|\bkast\b|draad|draden|kabel|stroom|klemmen|schakelaar|\bdood\b|sleutel/],
        [/(gaat|gaan|stapt|stappen|loopt|lopen|klimt|klimmen|kruipt|kruipen|daalt|dalen) (\w+ ){0,4}(de |het )?(tank|put|kanaal|inlaatkanaal|pompput|vijzelput|microfilterput|kelder|kolk)\w* (in|binnen)\b/, 2],
        [/(zit|zitten|staat|staan|werkt|werken|is|zijn|gaat|gaan|klimt|klimmen|daalt|dalen) (af )?(beneden |onder |diep |helemaal )?(in|onderin|onder in) (de |het )?(put|kanaal|inlaatkanaal|vijzelput|pompput|tank|trog|kelder|bak)\b/, 2.5],
        // het meetkastje/de gasmeter geeft alarm: "zijn meetkastje staat te piepen"
        [/\bpiep\w*|(meter|meetkast\w*|kastje|detector|meetapparaat)\b (\w+ ){0,3}(alarm|gaat af|loeit|slaat aan)|gasalarm/, 3],
        // ronde 5: rare lucht, meter niet bij zich of uit
        [/(vieze|rare|vreemde|zure|muffe|scherpe) (lucht|geur|walm)|lucht (\w+ ){0,2}(raar|vies|vreemd|zuur|muf)|\bmeurt\b|\bmieft\b|\bwalm\w*|(gas)?meter\w* (\w+ ){0,3}(ligt|zit|staat|hangt|is|bleef|blijft) (\w+ ){0,3}(in de (bus|auto|wagen|keet|kist|kar|cabine)|thuis|uit|leeg|kapot|boven)\b|(gas)?meter\w* (\w+ ){0,2}(vergeten|niet bij|niet mee)/, 3],
        [/\bput\b|inlaatkanaal/, 1.2]] },
    ELEKTRA: { regel: /elektr\w*|spanning|elektrocutie|\bkabel/,
      zie: [[/\bspanning\w*(?! ?(vrij|zoeker|meter))|\bstroom\b|elektr(?!icien|o ?monteur|otechn)\w*|blanke? (draad|draden|kabel)|kabel\w* (ligt |is |zijn )?(bloot|kapot|beschadigd|open)|kapotte? kabel|aardlek|\bschok\b|losse (draad|draden|aders?|kabeleinden)|blanke? aders?|kabel\w* .*\b(doorgesneden|kapot|beschadigd|gescheurd|ligt in het water)\b/, 3, VEERSPANNING],
        [/open en bloot|(kabel|draad|draden|aders?)\w* (\w+ ){0,3}(bloot|open)\b|klemmenkast (\w+ ){0,3}open/, 3],
        [/schakelkast|klemmenkast|\bkast\b|\bkabel\w*|\bdraad\b|aansluit\w*/, 1.2]] },
    // ronde 5: afschakelen en dan NIET nameten ('meet niks na, zegt dat ie dood is') = ervan uitgaan dat het spanningsvrij is
    AANNAME: { regel: /gaat ervan uit|ervan uit dat|ervan uitgaan/,
      zie: [[/\b(meet|meten)\b (\w+ ){0,2}(niks|niets|niet)\b|(niet|niks|niets|nooit|geen) (\w+ ){0,2}(na)?gemeten|zonder (eerst |na |te )*(na)?meten|zonder (\w+ )?(duspol|spanningzoeker|spanningsmeter)|zegt dat (\w+ ){0,2}(dood|spanningsloos|spanningsvrij|uit|veilig|vrij) is|(gaat|ging) ervan uit|denkt dat (\w+ ){0,3}(dood|spanningsloos|spanningsvrij|uit|veilig)\b|\bis (toch )?dood\b/, 3.5, /\bput\b|\btank\b|kanaal|kelder|\bgas|lucht|ruikt|stinkt|besloten/]] },
    METEN: { regel: /spanningsvrij|spanningsmeter|geverifieerd|niet correct vrijgeschakeld|duspol/,
      zie: [[/\bduspol|spanningsvrij|spanningzoeker|spanningsmeter|\bmeten\b|\bgemeten\b|\bmeet\b/, 3]] },
    LOTOTO: { regel: /onverwacht\w* (inschakel|aanslaan|draai|opstart)|onmiddellijke activering|inschakelen tijdens|vrijgave/,
      zie: [[/kan (\w+ )?(zomaar |vanzelf |ineens |opeens )?(aan|aangaan|aangezet|starten|opstarten|inschakelen|aanslaan|aanspringen|gaan draaien|gaan lopen)\b|kan (\w+ ){0,3}(aangaan|starten|opstarten|inschakelen|aanslaan|aanspringen)\b|(elk|ieder) moment (\w+ ){0,2}(aan|starten|aanslaan|aanspringen|gaan draaien|gaan lopen|opstarten)\b|iedereen kan (hem |het )?(aanzetten|aan zetten|inschakelen)|onverwacht\w*|(zet|zette|zetten) (hem |het |de pomp |de installatie )?(weer )?aan\b|niet (afgeschakeld|uitgeschakeld|vrijgeschakeld|veiliggesteld)|\bslaat (\w+ ){0,2}aan\b|\b(ineens|opeens|plotseling|plots|zomaar|vanzelf)\b.*\b(aan|draai\w*|start\w*|loopt|lopen)\b/, 3],
        [/(aandrijving|motor|voeding)\w* (\w+ ){0,2}(nog )?(aangesloten|ingeschakeld|aan staat|onder spanning)|(nog )?(aangesloten|ingeschakeld) (\w+ ){0,2}(aandrijving|motor)/, 3],
        [/(geen|zonder) (hang)?slot|hoofdschakelaar|werkschakelaar|al (te |aan het )?(sleutel\w*|werk\w*|demonte\w*|losdraai\w*)/, 1.5],
        [/afgeschakeld|uitgeschakeld|schakelkast/, 1.2]] },
    SLOT: { regel: /\bslot\b|sloten|lototo|derden|niet vergrendeld/,
      zie: [[/(geen|zonder) (slot|sloten|hangslot|label|lototo|vergrendeling)|slot (ontbreekt|zit er niet|niet op|eraf)|\blototo|\bhangslot\w*|niet vergrendeld|vergrendel\w*|\bslot\b|\blabel\b/, 3], [/hoofdschakelaar|werkschakelaar|\bkast (staat |stond |is )?open/, 1.5]] },
    AUTO: { regel: /automatische bediening|niveauschakelaar|automatisch/,
      zie: [[/automatisch\w*|\bautomaat\b|niveauschakelaar|\bvlotter\w*|\bniveau\w*|tijdschakel\w*|tijdsturing|\bop auto\b/, 3]] },
    DRAAI: { regel: /\bdraai\w*|rotatie|bewegende|grijpgevaar|gevarenzone|werkende/,
      zie: [[/\bdraai(t|en|ende)\b(?! rond| de vijzel in| in\b)|roter\w*|rotatie|bewegende delen|(laten|laat|liet) (\w+ )?(lopen|draaien|proefdraaien)|\bloopt (al|nog|weer)\b|\bgevarenzone|\blopende (ketting|band|vijzel|trommel|borstel|rotor)/, 3, /\bdraai\w* (en \w+ )?(\w+ ){0,3}aan de (kraan|haak)|aan de (kraan|haak) (\w+ ){0,3}(rond)?draai/],
        // iemand (of een hand) nog in/op/bij het werkende deel terwijl het aangezet wordt: "collega staat nog in de goot
        // bij de rotor als ze hem aanzetten", "er wordt aangezet terwijl iemand er bovenop staat"
        [/^(?=.*\b(aanzet\w*|aangezet|inschakel\w*|ingeschakeld|opstart\w*|proefdraai\w*|testdraai\w*|gaat (lopen|draaien)|gaan (lopen|draaien)|aan gaat|aangaat|start\w*)\b).*?\b(?<w>(staat|staan|stond|zit|zitten|zat|ligt|liggen|kruipt|hand|handen|arm|vingers?|voet|benen|poten|iemand|collega|monteur)\b( \w+){0,5})/, 3],
        [/(steekt|stak|steken|reikt|reiken|grijpt|grijpen|grijp|duwt) (\w+ ){0,3}(hand|arm|vingers?)? ?(\w+ )?(erin|naar binnen|ertussen|in de (trommel|vijzel|borstel|rotor|ketting|band|trog)|door (het|de|een) (luik\w*|opening|gat|kijkgat|rooster\w*|inspectieluik\w*))|\b(hand|arm|vingers?) (\w+ ){0,2}(erin|naar binnen)\b/, 2.5],
        // de trommel/vijzel kan nog ronddraaien of doordraaien (niet: hangend aan de kraan, dat is zwaaien)
        [/\b(rond|door|mee|om|weg)(draai|rol)\w*|kan (\w+ ){0,3}(gaan )?(rond|om|door|weg)?(draaien|rollen)\b|draai(t|en) (\w+ )?(door|mee)\b/, 3, /aan de (kraan|haak|takel)|\bhijs\w*|\bhangt\b/],
        // ronde 5: niet geblokkeerd, lichaamsdeel in het draaiende deel, aandrijving die bijdraait ("terwijl de motor bijdraait")
        [ONGEBORGD_DRAAI, 3.5], [NIET_GEBLOKT, 3, /steiger|\bwiel\w*|hoogwerker|aanhanger|\bkar\b|ladder|trap/], [AFSCHERM_WEG, 3], [KLEDING_BIJ, 2.5, AAN_KRAAN], [IN_DRAAIDEEL, 3, AAN_KRAAN], [BIJ_DRAAIDEEL, 2, AAN_KRAAN],
        [/\b(trommel|vijzel|ketting|band|rotor|borstel|schroef|waaier|machine|installatie|zeef)\w* (\w+ ){0,2}(loopt|lopen|liep|draait|draaien|draaide|ronddraait)\b(?! (rond )?aan de (kraan|haak))|\bbijdraai\w*|\b(motor|aandrijving|tandwiel\w*|kettingwiel\w*|reductor)\b (\w+ ){0,2}(draait|draaien|loopt|lopen|bij|mee)\b|\baangedreven\b/, 3],
        [/\brotor\w*|\bschoep\w*|\bwaaier\w*|\bborstel\w*|\btandwiel\w*|\bkettingwiel\w*|\bspaken\b/, 1.5]] },
    OPVIJZEL: { regel: /op de vijzel|werken op de vijzel|iemand op de|in de trog staat/,
      zie: [[/(staat|stond|staan|loopt|liep|zit|zat|werkt|klimt) (nog )?(\w+ )?(\w+ )?(op|in) de (vijzel(?!s\b)\w*|trog|trommel|put|vijzelput)\b/, 3],
        [/\bop de (vijzel(?!s\b)\w*|schroef\w*|trommel) (\w+ ){0,2}(staat|staan|stond|zit|zitten|loopt|lopen|werkt|werken|te (boren|werken|sleutelen|slijpen|lassen))\b/, 3], [/\b(boven ?op|erop|erbovenop) (\w+ ){0,2}(staat|staan|stond|zit|zitten|loopt)\b|(staat|staan|stond|zit|zitten|loopt) (\w+ ){0,3}(boven ?op|erop|erbovenop)\b/, 2.5]] },
    GEVZONE: { regel: /gevarenzone|iemand op de|in de put staat|persoon bevindt/,
      zie: [[/(staat|stond|staan|zit|zat|zitten|werkt|werken|is|zijn|loopt) (nog |er |al )?(nog )?(\w+ )?(\w+ )?(in|op|bij|onderin) (de |het )?(put|vijzelput|pompput|trog|vijzel|gevarenzone|trommel|kanaal|bak|goot|rotor|borstel|ketting|band)\b|nog (iemand|een persoon|persoon|mensen) (in|op|bij)\b|\b(iemand|man|collega|monteur|jongen|gast|eentje|knul|leerling|stagiair|gozer|vent|kerel|knakker|peer|maat|elektricien) (\w+ ){0,4}(in|op|onderin) (de |het )?(put|vijzelput|pompput|trog|vijzel|schroef|trommel|kanaal|goot)\b/, 3]] },
    // ronde 7: ontkoppelen van de aandrijving/reductor ("terwijl hij de koppeling losmaakt"): de taakstap, geen gevaarzin op zich
    ONTKOPPEL: { regel: /ontkoppel\w*|afkoppel\w*/,
      zie: [[/ontkoppel\w*|afkoppel\w*|(koppeling|reductor|aandrijving|motor)\w* (\w+ ){0,2}(losmaak\w*|los ?maken|loshal\w*|eraf|los\b)|(losmaakt|losmaken|loshaalt|loshalen|afhaalt|afhalen|losdraait|losdraaien) (\w+ ){0,2}(koppeling|reductor|aandrijving)/, 2]] },
    VSNAAR: { regel: /v snaar|\bsnaar/, zie: [[/\bv ?snaar\w*|\bsnaar\w*/, 3]] },
    AFSCHERM: { regel: /afgedekt|afscherm\w*|afdekking/,
      zie: [[/(zonder|geen) (afscherm\w*|afdek\w*|kap\b|beschermkap)|(afscherming|kap|beschermkap) (ontbreekt|is eraf|ligt eraf|eraf|weg|open)|niet afgedekt|(afscherming|kap|beschermkap|afdekking|hekje) (zit|zat|is|staat) (er )?(nog )?(niet|niet meer|nog niet) (op|aan|voor|gemonteerd|dicht)|(kap|afscherming|beschermkap|afdekking|deksel) (zit |is |ligt |staat )?(er )?(nog |al )?(af|eraf|weg|open)\b/, 3], [AFSCHERM_WEG, 3]] },
    NOODSTOP: { regel: /noodstop/, zie: [[/noodstop\w*/, 3]] },
    FYSIEK: { regel: /fysieke|werkhouding|zware objecten|overbelasting bij|geforceerde houding|\btillen|ongemakkelijke/,
      zie: [[/\btil(t|len)\b|\bopt(il|ill)\w*|\bsjouw\w*|\brug\b|gebukt|geknield|op (z n|zijn|hun) knieen|werkhouding|\bbukk\w*|\bkrom\w*|voorover|\bgebogen|(werkt|werken|boort|boren|sleutelt|sleutelen|draait|las\w*) (\w+ ){0,3}boven (zijn|z n|het) hoofd|\bdraagt\b|\bdragen\b/, 3], [/\bzwaar\b|\bzware\b|hele (dag|middag|ochtend|tijd)|uren (lang|achter elkaar)/, 1.2]] },
    BIO: { regel: /biologisch\w*|afvalwater|\bslib|agentia|\balgen\b/,
      zie: [[/\bslib\w*|afvalwater|rioolwater|\bpoep|\bsmerig|\bvies\w*|handen (niet )?(ge)?wass\w*|\beet\b|\beten\b|\bdrinkt\b|\broken\b|\brookt\b|\bspat(?!bril)\w*/, 3], [/blote handen|(zonder|geen) handschoen\w*/, 1.5]] },
    STOF: { regel: /\bstof\b|kwarts\w*|slijp\w*|boren|lasrook|dampen|vonken|gehoor\w*|metaaldeeltjes|betonstof/,
      zie: [[/\bstof\w*|stofmasker\w*|mondkap\w*|\bffp\w*|\bboort\b|\bboren\b|boorhamer|\bslijp\w*|\bvonk\w*|lasrook|\blawaai|oorkap\w*|oordop\w*|gehoorbescherm\w*|(geen|zonder) (veiligheids)?bril/, 3]] },
    // ronde 7: oog- en gezichtsletsel (vonken, splinters, geen spatbril): eigen begrip naast stof
    OOG: { regel: /\boog\w*|\bogen\b|gezichtsletsel|gezicht\b/,
      zie: [[/\bvonk\w*|spatbril\w*|gelaatscherm\w*|(geen|zonder) (\w+ )?(veiligheids|spat|slijp|las)?bril\w*|\boog\b|\bogen\b|in (z n|zijn|het) (gezicht|oog|ogen)|splinter\w*|metaaldeeltjes|wegspring\w*|vliegen (\w+ ){0,3}(rond|in het rond|om de oren)/, 3]] },
    KRAAN: { regel: /\bkraan\b|hijskraan|kraanbeweging|kraanopstelling/, zie: [[/\bkraan\w*|machinist/, 1]] },
    STABIEL: { regel: /instabiliteit|draagkracht|ondergrond|kantel\w*|omvallen/,
      zie: [[/\bstempel\w*|rijpla(at|ten)|draagkracht|ondergrond|\bkantel\w*|staat scheef|\binstabiel/, 3, ONDERSTEUN_NIET],
        // ronde 7: de ondergrond zelf als aparte aanwijzing ("stempel … zakt langzaam weg")
        [/zakt (\w+ ){0,2}(weg|in)\b|wegzak\w*|(slappe|zachte|natte|losse|drassige) (grond|berm|ondergrond)|\bberm\w*|\bsloot\w*/, 2.5, ONDERSTEUN_NIET],
        // ronde 5: een steiger/hoogwerker die wiebelt, overhelt of op losse platen staat (niet: een platform op het water)
        [/\bwiebel\w*|\bschommel\w*|\bhelt (\w+ )?over\b|\bhellen\b|staat (\w+ ){0,2}scheef|\blosse (\w+ )?(pla(at|ten)|stelcon\w*|klinkers|tegels|stenen)|op (\w+ ){0,2}(losse|natte|zachte|slappe|ongelijke|schuine) (\w+ )?(platen|plaat|grond|ondergrond|stelcon\w*|klinkers|tegels|zand)|\bongelijk\w*/, 3, /ponton|drijver|platform|\bboot\b|\bwater\b|deinen|golf/]] },
    OVERBELAST: { regel: /overbelasting kraan|kraancapaciteit|bezwijken hijsmiddel of kraanarm/,
      zie: [[/overbelast\w*|te zwaar voor de kraan|lastmoment|capaciteit|lastentabel|lastdiagram/, 3]] },
    KABELTRACE: { regel: /kabeltrace|ondergronds kabel/, zie: [[/kabeltrace|\bklic\b|kabels? in de grond|leidingen in de grond|ondergrondse? (kabel|leiding)\w*/, 3]] },
    AANRIJ: { regel: /aanrijding|kraanbeweging/, zie: [[/draaicirkel|\bzwenk\w*|achter de kraan|rijdt achteruit|aanrijd\w*|draaibereik|loopt (langs|achter|onder) de kraan/, 3]] },
    VERSCHUIF: { regel: /losgekoppeld|plotseling verschuiven|verschuiv\w*|ingezekerd|fixatie|terugzakken|stutten|omvallen|store rack|niet vergrendeld|onvoldoende fixatie/,
      zie: [[/losgekoppeld|loskoppel\w*|\bontkoppel\w*|niet (geborgd|gezekerd|ingezekerd|vastgezet|gestut|vergrendeld)|(geen|zonder) (borging|zekering|stempels?|stut\w*|wig\w*)|\bschuift\b|verschuif\w*|verschuift|weg ?schuiv\w*|wegschuift|(ligt|staat|zit|hangt) (nog )?(helemaal )?los (in|op|tegen|naast) (de|het)\b|kan (\w+ )?(om)?vallen|\bomvallen|valt om|zakt (terug|weg)|terugzak\w*|\brack\b|\bstut\w*|\bfixatie|omkiep\w*|kiep(t|en)? (\w+ )?om\b|omkukel\w*|kukelt (\w+ )?om|omflikker\w*|los van de (bouten|flens|fundatie|voet|vloer)|(staat|hangt|zit) nergens (meer )?(tegen|aan vast|aan)\b/, 3, LADDER_LOS],
        [/(nergens|niet|slecht|onvoldoende|nauwelijks) (mee |aan )?(geborgd|gezekerd|vastgezet|gestut|vastgemaakt)|niemand (heeft|had) (hem|het|ze|die|dat) (\w+ )?(gezekerd|geborgd|vastgezet|gestut)/, 3, LADDER_LOS],
        [/bouten (zijn |zitten |liggen )?(al )?(los|eruit)|losmaken van de bouten/, 2], [TERUGZAK, 3.5]] },
    STRUIKEL: { regel: /struikel\w*|losliggende|rommel/,
      zie: [[/struikel\w*|kabels? (over|op|kris kras|door) (de |het )?(vloer|grond|pad|looppad|dek)|slingert? (rond|op de grond)|\brommel|\btroep\b|losliggend\w*|rondslinger\w*|ligt (van alles|overal)/, 3]] },
    BOTS: { regel: /\bbotsen|tegen de (geleiding|kanaalwand|putwand|vijzelwand|wand)/,
      zie: [[/\bbotst\w*|\bstoot\b|\bstoten\b|tegen de (wand|geleiding|kanaalwand|putwand|leuning)|schampt|raakt de (wand|geleiding)/, 3]] },
    CHEMIE: { regel: /chemisch\w*|cement\w*|epoxy|lijm|grouting|huidirritatie/,
      zie: [[/cement\w*|epoxy|\blijm\w*|mortel|grout\w*|chemisch\w*|bijtend|\bhuid\b|\bzuur\b|\bloog\b|\bspecie\b|betonspecie|\bnatte? beton|(handen|huid|armen) .*\bbeton\w*|\bbeton\w* .*\b(handen|huid)\b/, 3], [/blote handen|(zonder|geen) handschoen\w*/, 1.5]] },
    LASSEN: { regel: /\blas(sen|werk|rook)\b|\blassen/, zie: [[/\blas(sen|t|werk|apparaat)?\b/, 2]] },
    LASROOK: { regel: /lasrook|dampen/, zie: [[/lasrook|\brook\b|\bdamp\w*/, 3]] },
    BRAND: { regel: /brand\w*|explosie/, zie: [[/\bbrand\w*|blusser|explos\w*/, 3]] },
    SNIJ: { regel: /snijgevaar|scherpe/, zie: [[/\w*scherp\w*|\bsnij\w*|\bbraam\b|\bbramen\b/, 3]] },
    VEER: { regel: /veerkracht|spanmechanisme/, zie: [[/\bveer\w*|spanmechanisme|\bspanner\w*/, 2.5],
        [/(ketting|veer|veren|spanner|spanmechanisme)\w* (\w+ ){0,4}(op|onder) (de )?spanning|(op|onder) spanning (\w+ ){0,3}(ketting|veer|spanner)|\b(staat|zit|staan) (nog )?strak\b|wegschiet\w*|(schiet|springt|klapt|zwiept) (\w+ )?(los|weg|terug)/, 3],
        [/(pal|recht|vlak|direct|precies) (er)?voor\b/, 1]] },
    PARTIJ: { regel: /twee partijen/, zie: [[/andere (aannemer|partij|ploeg)|twee (partijen|ploegen)|\bderden\b/, 2.5]] },
    AFZET: { regel: /afzet\w*|afgezet|hijsgebied|hijspad|afscherming van (het )?gevaar/,
      zie: [[/(niet|geen|zonder) (afgezet|afzetting|hekken|lint)|afzetting\w*|afgezet|\bhekken\b|\blint\b|voetganger\w*|\bpubliek|hijsgebied|hijspad/, 3]] },
    COMM: { regel: /visueel en auditief contact|aanwijzer|communicatie met machinist|contact tussen monteur en kraan/,
      zie: [[/oogcontact|\bportofoon\w*|machinist ziet|geen (contact|zicht)|\baanwijzer\w*|\bseinen\b|seingever|handsignal\w*/, 3]] },
    DOCS: { regel: /\blmra\b|werkvergunning|werkinstructie/,
      zie: [[/werkvergunning|vergunning|\btra\b|\blmra\w*|toolbox\w*|werkinstructie|instructie|tekening|\bwms\b|papieren/, 3]] },
    PBM: { regel: /\bpbm\b/, zie: [[/\bhelm\w*|handschoen\w*|veiligheidsbril|\bbril\b|veiligheidsschoen\w*|\bschoenen\b|hesje|\bvest\b|gehoorbescherm\w*|\bpbm\w*|oordop\w*|oorkap\w*|overall/, 3]] },
    GEREEDSCHAP: { regel: /arbeidsmiddel|slagmoersleutel|trilling/,
      zie: [[/keuring\w*|gekeurd|keuringssticker|\bsticker|verlengkabel|\bhaspel|gereedschap\w*|slijptol|boormachine|arbeidsmiddel\w*/, 3]] },
    NOOD: { regel: /noodvoorziening|ehbo/, zie: [[/brandblusser|\bblusser|\behbo\b|verbanddoos|vluchtweg\w*|nooduitgang|reddingsboei|oogdouche|\baed\b|noodplan/, 3]] },
    GEDRAG: { regel: /gedrag/, zie: [[/\bhaast\b|telefoon|\bbelt\b|\bbellen\b|\bgrap\w*|negeert|luistert niet|ruzie|\bafspraak\w*/, 3]] },
  };
  // algemene onderwerpen A t/m I (voorbeelddata): welke begrippen ze dekken. Ze tellen voor 0,7 mee, zodat een
  // passende regel van de taak bij gelijke aanwijzingen vóór het algemene onderwerp komt.
  const ALG = { A: ["DOCS"], B: ["LOTOTO", "SLOT", "METEN", "AANNAME", "ELEKTRA", "AUTO"], C: ["PBM"], D: ["GEREEDSCHAP"], E: ["LAST", "SLINGER", "KRAAN", "STABIEL", "OVERBELAST", "COMM", "BEGELEID"],
    F: ["AFZET", "STRUIKEL"], G: ["BIO", "CHEMIE", "STOF"], H: ["NOOD", "BRAND"], I: ["GEDRAG", "COMM", "PARTIJ"] };
  // TWIJFEL: scoort de tweede regel ≥ 80% van de eerste, dan is het geen sterke match (één bevestigingstik)
  const ALG_F = 0.7, CAP = 5, STERK_MIN = 2.4, TWIJFEL = 0.8, CONFLICT = 0.6;
  // woorden die bijna overal staan of alleen het product/de persoon noemen: geen bewijs voor een bepaalde regel
  const GENERIEK = new Set(("monteur monteurs man mannen jongen jongens collega collegas ploeg onder boven bezig werkt werken gewoon beetje even " +
    "zie zag gezien kijk alles iemand niemand iets niets stuk deel onderdeel ding hele plank planken persoon").split(" "));

  // begrippen die een waarneming noemt: { c: { w, woorden: [...] } } (gewicht = som van de gevonden signalen, max CAP)
  function signalen(tekst) {
    const t = patroonTekst(tekst), uit = {};
    Object.keys(B).forEach((c) => {
      let w = 0, sterk = 0; const woorden = [];
      // [patroon, gewicht, niet]: "niet" = context waarin het patroon iets anders betekent (bv. "de band hangt over een
      // scherpe rand" is geen persoon die over de rand hangt)
      B[c].zie.forEach(([re, g, niet]) => { const m = t.match(re); if (m && !(niet && niet.test(t))) { w += g; sterk = Math.max(sterk, g); const wd = ((m.groups && m.groups.w) || m[0]).trim(); if (wd) woorden.push(wd); } });
      if (w) uit[c] = { w: Math.min(CAP, w), sterk, woorden };
    });
    return uit;
  }
  // risicozin opsplitsen: kop (vóór de eerste dubbele punt/puntkomma) en de rest (met de taakstap)
  function velden(r) {
    const risico = String(r.risico || ""), i = risico.search(/[:;]/);
    const kop = i > 0 && i < 90 ? risico.slice(0, i) : risico.slice(0, 90);
    return { kop: norm(kop), risico: norm(risico + " " + (r.taakstap || "")), mr: norm([].concat(r.maatregelen || []).join(" ")) };
  }
  // welke begrippen een regel draagt, met factor: kop 1, risicozin 0,7, maatregelen 0,4
  function begrippenVan(r) {
    const v = velden(r), uit = {};
    Object.keys(B).forEach((c) => { const re = B[c].regel; const f = re.test(v.kop) ? 1 : re.test(v.risico) ? 0.7 : re.test(v.mr) ? 0.4 : 0; if (f) uit[c] = f; });
    return uit;
  }
  const stammen = (s) => (WPI && WPI.toks ? WPI.toks(s) : norm(s).split(" ").filter((w) => w.length > 2).map((w) => w.slice(0, 6)));

  // ---- regels rangschikken ----
  // opt: { regels: [TRA-regels van de taak], alg: [{ ref, naam }], generiek: [extra algemene woorden, bv. productnaam] }
  // → { lijst: [{ id, s, woorden, harde, alg }], top, sterk, reden, enkel }
  function rangschik(tekst, opt) {
    opt = opt || {};
    const sig = signalen(tekst), pt = patroonTekst(tekst);
    const gen = new Set(stammen((opt.generiek || []).join(" ")).concat([...GENERIEK].map((w) => w.slice(0, 6))));
    const alleTok = [...new Set(stammen(ontPersoon(tekst)))], qTok = alleTok.filter((w) => !gen.has(w)), genTok = alleTok.filter((w) => gen.has(w));
    const kand = (opt.regels || []).map((r) => ({ id: r.id, alg: false, b: begrippenVan(r), doc: new Set(stammen((r.risico || "") + " " + (r.taakstap || ""))), direct: GEVAAR_REGEL.test(norm(r.risico)) }))
      .concat((opt.alg || []).map((o) => { const b = {}; (ALG[o.ref] || []).forEach((c) => { b[c] = 1; }); return { id: "ALG-" + o.ref, alg: true, b, doc: new Set(stammen(o.naam || "")) }; }));
    const N = kand.length, df = {}, begrVan = {};
    kand.forEach((k) => { begrVan[k.id] = k.b; k.doc.forEach((w) => { df[w] = (df[w] || 0) + 1; }); });
    const lijst = kand.map((k) => {
      let s = 0, harde = false; const woorden = [], begr = [];
      Object.keys(sig).forEach((c) => {
        const f = k.b[c]; if (!f) return;
        // een algemeen onderwerp telt alleen zijn sterkste begrip (anders wint het van de regel door breedte)
        if (k.alg) s = Math.max(s, sig[c].w * f); else s += sig[c].w * f;
        begr.push(c);
        if (sig[c].sterk >= 2.5 && f >= 0.7) harde = true;
        sig[c].woorden.forEach((w) => { if (!woorden.includes(w)) woorden.push(w); });
      });
      let ts = 0; const tw = [];
      qTok.forEach((w) => { if (k.doc.has(w)) { ts += Math.min(1, 0.35 * Math.log((N + 1) / df[w])); tw.push(w); } });
      s += Math.min(1.5, ts);
      // alleen bij gelijke stand: een algemeen woord (bv. "trommel" bij het Trommelfilter) dat ook in de regel staat
      if (s > 0 && genTok.some((w) => k.doc.has(w))) s += 0.05;
      if (k.alg) s *= ALG_F;
      return { id: k.id, alg: k.alg, direct: !!k.direct, s: Math.round(s * 100) / 100, harde, woorden: netjes(woorden, pt), tokens: tw, bewijs: woorden.length + tw.filter((w) => !woorden.some((x) => norm(x).includes(" " + w))).length, begr };
    }).filter((x) => x.s > 0.15).sort((a, b) => b.s - a.s || (a.alg - b.alg) || (b.direct - a.direct));   // gelijk: direct gevaar eerst
    // het Voorstel is altijd een regel van de TAAK; een algemeen onderwerp dat hoger scoort komt apart (alg)
    const taakLijst = lijst.filter((x) => !x.alg), top = taakLijst[0] || null, algTop = lijst.find((x) => x.alg);
    const alg = algTop && (!top || algTop.s > top.s) ? algTop.id : null;
    if (!top) return { lijst, top: null, sterk: false, reden: alg ? "algemeen" : "geen", enkel: "", alg };
    // twijfel: een andere regel van dezelfde taak scoort (bijna) even hoog
    const tweede = taakLijst[1];
    // of: een ANDERE gevaarzin (die de eerste regel niet heeft) wijst hard naar de tweede regel, en die zit niet ver
    // achter (≥ 60%). Dan noemde de inspecteur twee gevaren en kiest hij zelf (SCV: "hijsband niet gekeurd" tegenover
    // "hangt over … rand"); een kleine voorsprong is dan geen bewijs.
    // Een gevaarzin van 3 of meer die ALLEEN naar een andere regel wijst, blokkeert STERK ongeacht de verhouding: de
    // inspecteur noemde dan aantoonbaar een tweede gevaar (SHV "geen touw … draait rond aan de haak": 0,59 < 0,6).
    const eigen = (x, c) => sig[c].sterk >= 2.5 && (begrVan[x.id] || {})[c] >= 0.7;
    const ander = !!taakLijst.slice(1).some((x) => x.harde && x.begr.some((c) => !top.begr.includes(c) && eigen(x, c) && (sig[c].sterk >= 3 || x.s >= top.s * CONFLICT)));
    // ronde 5, vangnet bij direct gevaar: is de eerste regel GEEN direct gevaar, terwijl een regel met direct gevaar ook
    // een gevaarzin heeft, of de zin zelf direct gevaar noemt ("zonder gasmeter", "onder de hangende last"), dan is het
    // nooit sterk: liever één tik op de regel dan stil de verkeerde regel (en geen rode balk, geen ter-plaatse-vraag).
    const directAnder = !top.direct && taakLijst.slice(1, 4).find((x) => x.direct && (x.harde || x.s >= top.s * CONFLICT));
    const zinDirect = !top.direct && GEVAAR_ZIE.test(norm(tekst));
    const tweeRegels = !!(tweede && (tweede.s >= top.s * TWIJFEL || ander)), vangnet = !tweeRegels && (!!directAnder || zinDirect);
    const twijfel = tweeRegels || vangnet;
    const tweedeId = directAnder ? directAnder.id : !tweede ? (zinDirect ? (taakLijst.find((x) => x.direct) || {}).id || null : null)
      : ander && !(tweede.s >= top.s * TWIJFEL) ? (taakLijst.slice(1).find((x) => x.harde && x.begr.some((c) => !top.begr.includes(c) && eigen(x, c))) || tweede).id : tweede.id;
    // STERK alleen met een gevaarzin (≥ 2,5) die bij de kern van de regel hoort, duidelijk boven de rest
    const sterk = !twijfel && !alg && top.s >= STERK_MIN && top.harde;
    const enkel = !sterk && top.bewijs <= 1 ? (top.woorden[0] || origineelWoord(tekst, top.tokens[0]) || "") : "";
    return { lijst, top: top.id, sterk, reden: sterk ? "gevaarzin" : alg ? "algemeen" : vangnet ? "controle" : twijfel ? "twijfel" : top.bewijs <= 1 ? "een-woord" : "zwak", enkel, tweede: twijfel ? tweedeId : null, alg };
  }
  // "Waarom: je zei …" leesbaar houden: geen stukken die in een ander stuk zitten of ermee OVERLAPPEN (die worden één
  // stuk, zoals de inspecteur het zei: "loopt gewoon onder de vijzel door"), geen lange patroonspannes (> 4 woorden) als
  // er een korter stuk van hetzelfde is; hoogstens 4, in de volgorde van de zin
  function netjes(woorden, t) {
    const n = (w) => w.split(" ").length, uit = [];
    woorden.slice().sort((a, b) => n(a) - n(b)).forEach((w) => {
      const binnen = uit.filter((k) => (" " + w + " ").includes(" " + k + " "));
      if (binnen.length && n(w) > 4) return;                       // lange spanne: de kortere stukken zeggen het al
      binnen.forEach((k) => uit.splice(uit.indexOf(k), 1));        // korter stuk dat hierin zit: dit is preciezer
      if (!uit.includes(w)) uit.push(w);
    });
    const losse = woorden.filter((w) => uit.includes(w));
    if (!t) return losse.slice(0, 4);
    // plek van elk stuk in de zin (woordnummers); overlappende stukken samenvoegen (max 8 woorden)
    const tw = String(t).trim().split(" ");
    const plek = (w) => { const ww = w.split(" "); for (let i = 0; i + ww.length <= tw.length; i++) if (tw.slice(i, i + ww.length).join(" ") === w) return [i, i + ww.length]; return null; };
    const sp = [], los = [];
    losse.forEach((w) => { const p = plek(w); if (p) sp.push(p); else los.push(w); });
    sp.sort((a, b) => a[0] - b[0]);
    const samen = [];
    sp.forEach((p) => {
      const l = samen[samen.length - 1];
      if (l && p[0] < l[1]) { if (Math.max(l[1], p[1]) - l[0] <= 8) l[1] = Math.max(l[1], p[1]); }   // overlap: één stuk (te lang: het eerste blijft)
      else samen.push(p.slice());
    });
    return samen.map((p) => tw.slice(p[0], p[1]).join(" ")).concat(los).slice(0, 4);
  }
  // het woord zoals de inspecteur het zei, bij een stam
  function origineelWoord(tekst, stam) {
    if (!stam) return "";
    const w = String(tekst || "").split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}-]/gu, "")).find((x) => stammen(x)[0] === stam);
    return w ? w.toLowerCase() : "";
  }

  // ---- taak voorstellen: werkwoorden van de bouwplaats naar de taken uit de TRA ----
  // taak: herkent het soort taak in de taaknaam; zie: [patroon, gewicht] in wat de inspecteur vertelt
  const TAAK = {
    VERWIJDER: { taak: /verwijder|demont|afbouw|uit water/, zie: [[/\beruit\b|uit (de |het )?(put|water|kanaal|trog|bassin|sleuf|grond|tank|buis)\b|\btrek(t|ken)\b|uit ?hal(en|t)|weg ?hal(en|t)|\bhal(en|t) .*\b(uit|weg)\b|demonte\w*|demontage|\bslop\w*|afbre\w*|\bloshal\w*|verwijder\w*|uitbouw\w*|\bbouw(en|t) .*\baf\b|\bnem(en|t) .*\bweg\b|\bweg ?nem\w*|\btakel(en|t) .*\b(eruit|uit|weg|eraf)\b|\beraf\b|\b(eruit|eraf|uit|weg|los|af)(halen|trekken|takelen|hijsen|nemen|bouwen|breken|tillen)\b|\b(hijs|takel|trek|haal|hal|til)\w* (\w+ ){0,4}uit (de|het|een)\b|\buit elkaar\b/, 3], [/\b(hijs|takel)\w* (\w+ ){0,3}(omhoog|naar boven)\b/, 2], [/\blosmak\w*|\bmaken .* los\b|\bafvoer\w*|\bde oude\b|\boude\b/, 1.5]] },
    // taaknaam: "monter"/"montage" niet in "Demonteren"/"Demontage", "installatie" alleen vooraan (niet "...-installatie")
    PLAATS: { taak: /plaats|(?<!de)monte|(?<!de)montage|^installatie|indraai|assemblage/, zie: [[/\berin\b|in de grond|\bsla(an|at)\b|\bhei(en|t)\b|intril\w*|\btrillen\b|plaats(en|t)\b|\bzet(ten)? (?!(de |het )?(spanning|stroom))\S+ .*\b(neer|in|op|vast)\b|(?<!de)monte(er|ren|ert)\w*|(?<!de)montage|inbouw\w*|installe\w*|neerzet\w*|inhijs\w*|afmonte\w*|assemble\w*|uitlijn\w*|\bstellen\b|indraai\w*|\bbouw(en|t) .*\bin\b|\bbouw(en|t) (\w+ ){0,3}op (de|het)\b|\binhang\w*|\bneerlat\w*|\b(laten|laat|liet|lieten) .*\bzakken\b|\bzakken in\b|\b(de|het) (put|kanaal|bassin|trog|tank|buis|water|goot) in\b|\b(in|erin|neer|vast|op)(hijsen|takelen|zetten|hangen|bouwen|draaien|slaan|klemmen|stellen)\b|\bin elkaar\b/, 3], [/\bzetten\b|\bhang(en|t)\b|\bde nieuwe\b|\bnieuwe\b/, 1.5]] },
    LOTOTO: { taak: /afschakel|lototo|veiligstel/, zie: [[/\blototo|\bslot(en)?\b|\bsloten\b|hangslot\w*|afschakel\w*|\buitschakel\w*|\bschakel(en|t) .* (af|uit)\b|vergrendel\w*|spannings(vrij|loos)|\bvrij ?schakel\w*|vrijgeschakeld|\bduspol|schakelkast|hoofdschakelaar|veiligstel\w*|\blabel\b|werkschakelaar|(stroom|spanning) (eraf|af|weg)\b|\buitzetten\b|\bveilig ?(zetten|gezet|stellen|gesteld|maken|gemaakt)\b|\b(af|uit|veilig)(schakelen|zetten|stellen|maken)\b|\bzet(ten)? (\w+ )?(\w+ )?uit\b(?! de| het)/, 3], [/\bkast\b/, 1.5]] },
    AFMONT: { taak: /afmonter/, zie: [[/afmonte\w*|afdek\w*|\bdicht ?(maken|gemaakt|doen)\b|\b(maken|maakt|doen) .*\bdicht\b|stuwkant/, 3]] },
    // ronde 7: "ze zetten de spanning er weer op" is inschakelen, geen "opzetten" (plaatsen): 3,5
    INSCHAKEL: { taak: /^inschakel/, zie: [[/(spanning|stroom) (\w+ ){0,2}(erop|terug|er weer op|er op|weer op)\b/, 3.5], [/\binschakel\w*|(spanning|stroom) (erop|terug|er weer op|aan|op)\b|\bweer aan\b|\baanzet\w*|\baan(sluiten|klemmen|schakelen)\b|(zet\w*|zette|brengen|breng\w*|gezet|gebracht) (\w+ ){0,4}onder (stroom|spanning)\b|kabel .*aansluit\w*|aansluiten van de (kabel|motor|voeding)|\baansluit\w*|\baanklem\w*|\bklem(men|t)\b.*\baan\b|\bsluit(en)? .*\baan\b|\bbekabel\w*|\bschakel(en|t) .*\b(in|aan)\b/, 3]] },
    INBEDRIJF: { taak: /inbedrijf/, zie: [[/proefdraai\w*|testdraai\w*|\b(proef|test)(draaien|zetten|starten)\b|\bdraai\w* (\w+ ){0,4}proef\b|voor het eerst (\w+ ){0,2}(draaien|lopen|aan|draait|loopt|starten)|\b(draai|laat|laten|zet|zetten)\w* (\w+ ){0,4}voor het eerst\b|\btest(en|draaien)?\b|inbedrijf\w*|in bedrijf|opstart\w*|draai(t|en) proef|eerste keer (draaien|lopen)|\boplever\w*|(laten|laat|liet) (\w+ )?(\w+ )?(lopen|draaien)\b|\bdraait (al|nu|weer)\b/, 3], [/\baanzet\w*|\b(aan|op)starten\b/, 2.5]] },
    KRAAN: { taak: /kraanopstelling/, zie: [[/kraan (wordt |werd )?(opgesteld|opgebouwd|neergezet|opgezet)|kraanopstelling|\bstempel\w*|rijpla(at|ten)|kraan staat|\bopstellen\b|draagkracht|ondergrond|\bklic\b/, 3], [/\bkraan\b/, 1]] },
    BETON: { taak: /beton/, zie: [[/\bbeton\w*|\bstort(en|t)?\b|trilnaald|verdicht\w*|bekisting|uithard\w*|\bafwerk\w*/, 3]] },
    // ronde 7: "ze leggen de drijvende beluchter in het bassin", "de beluchter gaat het water in" (vóór plaatsen: 3,5)
    WATER: { taak: /tewaterlating/, zie: [[/^(?!.*\buit (het |de )?(water|bassin)\b).*\b((het|de) (water|bassin) in\b|in (het|de) (water|bassin)\b|te water|tewater\w*|op het water\b)/, 3.5], [/\bdrijver\w*|\bplatform\b|verankering|\bponton|\bboot\b|\bverankeren\b|\bverank\w*/, 3]] },
    LOSSEN: { taak: /aankomst|lossen/, zie: [[/\blossen\b|vrachtwagen|\baankomst|uitpak\w*|\bgeleverd\b/, 3]] },
    CONTROLE: { taak: /^controleren/, zie: [[/schoon (en droog )?opgeleverd|\bschoon\b|\bdroog\b|controleren of/, 2]] },
  };
  function taakSignalen(tekst) {
    const t = patroonTekst(tekst), uit = {};
    Object.keys(TAAK).forEach((c) => { let w = 0; const woorden = []; TAAK[c].zie.forEach(([re, g]) => { const m = t.match(re); if (m) { w = Math.max(w, g); woorden.push(m[0].trim()); } }); if (w) uit[c] = { w, woorden }; });
    return uit;
  }
  // → [{ id: taaknaam, s, woorden }] (beste eerst; alleen met aanwijzing)
  function taakRang(tekst, taken, regels, generiek) {
    const sig = taakSignalen(tekst);
    const gen = new Set(stammen((generiek || []).join(" ")).concat([...GENERIEK].map((w) => w.slice(0, 6))));
    // woordstammen van de zin met het samengestelde werkwoord ("aanzetten", niet "zetten" → plaatsen)
    const alleTok = [...new Set(stammen(ontPersoon(scheid(tekst).los)))], qTok = alleTok.filter((w) => !gen.has(w));
    const docs = taken.map((t) => ({ t, doc: new Set(stammen(t + " " + regels.filter((r) => r.taak === t).map((r) => (r.taakstap || "") + " " + (r.risico || "")).join(" "))), naam: new Set(stammen(t)) }));
    const N = docs.length || 1, df = {};
    docs.forEach((d) => d.doc.forEach((w) => { df[w] = (df[w] || 0) + 1; }));
    return docs.map((d) => {
      let s = 0; const woorden = [];
      Object.keys(sig).forEach((c) => { if (TAAK[c].taak.test(norm(d.t).trim())) { s += sig[c].w; sig[c].woorden.forEach((w) => { if (!woorden.includes(w)) woorden.push(w); }); } });
      let ts = 0; qTok.forEach((w) => { if (d.doc.has(w)) { ts += Math.min(1, 0.4 * Math.log((N + 1) / df[w])) * (d.naam.has(w) ? 2 : 1); } });
      // een algemeen woord (bv. de productnaam "stortmal") telt alleen als het in de táaknaam zelf staat
      alleTok.forEach((w) => { if (gen.has(w) && d.naam.has(w) && df[w] < N) ts += 0.3; });
      s += Math.min(2, ts);
      return { id: d.t, s: Math.round(s * 100) / 100, woorden };
    }).filter((x) => x.s >= 0.5).sort((a, b) => b.s - a.s);
  }

  // ---- direct gevaar: vallende of hangende last, val van hoogte of in water, gas, spanning, onverwacht inschakelen,
  //      iemand in de gevarenzone van een draaiende vijzel/trommel (meegesleurd of bekneld raken is dodelijk), een
  //      zwaaiende last aan de kraan (een vijzel van een paar ton die rondzwaait plet wie ertussen staat) ----
  const GEVAAR_REGEL = /vallen van (de |het )?(last|reductor|indraaireductor|schraper)|vallen van last|ongecontroleerd vallen|onder (de |een )?hangende last|werken onder hangende|vallen van hoogte|\bval van\b|\bvallen in\b|valgevaar|vallen door|uitglijden of vallen|besloten ruimte|gevaarlijke gassen|giftige gassen|elektrocutie|elektrisch gevaar|restspanning|onverwacht\w* (inschakel|draai|aanslaan|opstart|rotatie|roter|start)|onverwachte draaibeweging|onmiddellijke activering|plotseling inschakel|direct opstarten|terugzakken|instabiliteit kraan|kantelen van de (hijs)?kraan|omvallen van steiger|gevarenzone|ongewenst draaien|beknelling door (draaiende|bewegende)|draaiende (vijzel|trommel|delen|installatie)|draaiend trommelfilter|grijpgevaar door draaiende|bewegende (transportketting|ketting|delen)|werkende \w+|rest ?beweging|niet vergrendeld bij benaderen|veerkracht\w*|wegschiet\w*|in (het )?water vallen|te water raken|verdrink\w*|val van (de )?rand|val van ladder|bezwijken van (takel|strop|hijsmiddel)|plotseling verschuiven|vallen \w+ uit (store )?rack|uit de (trog|buis) glijden|omvallen (of instabiliteit )?van (de |het )?(steiger|hoogwerker|inlooptrommel)|omvallen of instabiliteit|onverwachte beweging van (de )?(ruimerbrug|loopwagen)|^ ?zwaaiend\w* \w+ (tijdens hijsen|boven water)|ongecontroleerd zwaaien/;
  const GEVAAR_ZIE = /onder (de |een |die )?(hangende |zwevende )?last|onder (een |de )?(hangende|zwevende)|(zonder|geen) (valbeveiliging|harnas|gasmeter|gasmeting|reddingsvest|zwemvest)|(?<!(ketting|veer|spanner)\w* (\w+ ){0,4})onder spanning|blanke? (draad|draden|aders?)|(geen|zonder) (hang)?slot op|(kruipt|kruipen|ligt|liggen|zit|zitten) (\w+ )?(eronder|onder de (vijzel|brug|last|trommel|pomp))|\bbungel\w*|gasalarm|meter (\w+ )?piept|staat te piepen|(zonder|geen) (gas)?meter\b|niemand (heeft )?gemeten|ruikt (\w+ ){0,2}(raar|vreemd|naar rotte)|(dekplaat|luik|rooster|deksel) (ligt |is |staat )?(eruit|eraf|open)|(losse|wiebelende) ladder|ladder (\w+ ){0,2}(staat los|niet vast\w*)|(vijzel|trommel|rotor|schroef|zeef)\w* (\w+ ){0,3}(niet|niks|niets|nergens) (geblokkeerd|geblokt)|(staat|staan|stond|zit|zitten|loopt|werkt|klimt) (\w+ ){0,3}op de (vijzel|schroef)(?!s\b)\w*|\bop de (vijzel|schroef)(?!s\b)\w* (\w+ ){0,2}(staat|staan|stond|zit|loopt|werkt|te \w+)|(kruipt|kruipen|ligt|zit) (\w+ ){0,2}eronder (\w+ ){0,3}(zonder|geen) (bok|bokken|stempels?|stut\w*|onderstop\w*)|afscherming (\w+ ){0,4}(ligt|staat|is) (\w+ ){0,2}(op de grond|ernaast|eraf|weg)/;
  // label (risicokop) als dit direct gevaar is, anders ""
  function directGevaar(risico, tekst) {
    const r = norm(risico), kop = String(risico || "").split(/[:;]/)[0].trim();
    if (GEVAAR_REGEL.test(r)) return kop.length > 70 ? kop.slice(0, 67).replace(/\s+\S*$/, "") + "…" : kop;
    const m = norm(tekst).match(GEVAAR_ZIE);
    return m ? "Je zag: " + m[0].trim() : "";
  }

  WPI.koppel = { norm, signalen, begrippenVan, rangschik, taakRang, directGevaar, BEGRIPPEN: B, ALG };
})();
