# Android-app Werkplekinspectie

Deze map maakt een Android-app (`.apk`) die de web-app https://werkplekinspectie-app.netlify.app
opent als **Trusted Web Activity (TWA)**. Een TWA is gewoon Google Chrome, maar dan schermvullend,
met een eigen icoon en zonder adresbalk.

Waarom Chrome en geen "WebView"-app: spraakinvoer (inspreken van tekst) werkt alleen in Chrome,
niet in een WebView.

- Package-id: `nl.werkplekinspectie.app` (nooit wijzigen)
- Naam onder het icoon: `Werkplekinspectie`
- Verspreiding: zelf (bestand delen of via het beheersysteem van de telefoons), niet via de Play Store

## Wat staat waar

| Bestand | Waarvoor |
|---|---|
| `app.conf` | **Alle instellingen**: naam, webadres, kleuren, versienummer. Normaal het enige wat je aanpast. |
| `build.sh` | Bouwt en ondertekent de app. |
| `app/AndroidManifest.xml` | Beschrijving van de app voor Android (sjabloon). |
| `app/java/.../LauncherActivity.java` | Het kleine stukje code dat Chrome in TWA-stand opent. |
| `app/res/` | Iconen en opmaak. |
| `maak-iconen.py` | Maakt de iconen opnieuw uit `webapp/icon-512.png` (alleen nodig als het icoon verandert). |
| `../webapp/.well-known/assetlinks.json` | Bewijs op de website dat deze app erbij hoort (zie hieronder). |

## De naam of andere instellingen wijzigen

1. Pas `app.conf` aan (bijvoorbeeld `APP_NAAM="WPI"`).
2. Verhoog `VERSIE_CODE` met 1 (anders installeert de nieuwe versie niet over de oude heen).
3. Bouw opnieuw (zie hieronder) en verspreid de nieuwe `.apk`.

## Opnieuw bouwen

Nodig (Linux, bijvoorbeeld Ubuntu 24.04):

```bash
sudo apt-get install -y openjdk-17-jdk-headless zip aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
```

Heb je al een Android SDK (Android Studio)? Dan mag dat ook: zet `ANDROID_HOME` en het script
gebruikt de `build-tools` en `platforms` daaruit.

Bouwen:

```bash
WPI_KEYSTORE=/veilige/plek/werkplekinspectie-release.jks \
WPI_KEYSTORE_WACHTWOORD=/veilige/plek/keystore-wachtwoord.txt \
./android/build.sh
```

Het resultaat staat in `android/build/werkplekinspectie.apk`. Het script controleert zelf of de
handtekening klopt en of `webapp/.well-known/assetlinks.json` bij de sleutel past, en toont
package-id, versie, naam en Android-versies.

Handmatig controleren kan ook:

```bash
apksigner verify --print-certs android/build/werkplekinspectie.apk
aapt dump badging android/build/werkplekinspectie.apk | head -5
```

Opmerking: de gebruikelijke bouwhulpmiddelen (Bubblewrap of Gradle met `android-browser-helper`)
halen onderdelen van de downloadservers van Google. Die waren niet bereikbaar toen deze app werd
gemaakt; daarom bouwt `build.sh` de app rechtstreeks met de losse Android-tools. Wie later toch
Bubblewrap/Gradle wil gebruiken: gebruik **dezelfde sleutel** en **dezelfde package-id**, anders
kan de app niet over de bestaande heen worden bijgewerkt.

## De sleutel (keystore) — belangrijk voor Sven/IT

Elke versie van de app moet met **dezelfde sleutel** worden ondertekend. De sleutel bestaat uit
twee bestanden:

- `werkplekinspectie-release.jks` (de keystore, alias `werkplekinspectie`)
- `keystore-wachtwoord.txt` (het wachtwoord)

Ze zijn aangemaakt in een tijdelijke map van de bouwomgeving:
`/tmp/claude-0/-home-user-Werkplekinspectie-nl/adfe6aea-7525-5cd6-bd37-65ba662568b4/scratchpad/android-sleutel/`.
**Die map is tijdelijk.** Sven/IT moet beide bestanden direct naar een veilige plek kopiëren:

- keystore + wachtwoord in de wachtwoordkluis van het bedrijf, en
- een tweede kopie offline (bijvoorbeeld versleutelde USB-stick in de kluis).

Regels:

- **Nooit** in git, mail of chat zetten. (`android/.gitignore` houdt `.jks`-bestanden en
  wachtwoordbestanden al buiten git.)
- **Kwijt** = geen updates meer mogelijk. Een app met een andere sleutel ziet Android als een
  andere app: iedereen moet dan de oude app verwijderen en de nieuwe installeren, en
  `assetlinks.json` moet de nieuwe vingerafdruk krijgen.
- **Uitgelekt** = iemand anders kan een "update" maken die Android accepteert. Meld dit direct.

De openbare vingerafdruk (SHA-256) van het certificaat staat in
`webapp/.well-known/assetlinks.json`. Die is niet geheim.

## assetlinks.json: zonder dit verschijnt een adresbalk

Chrome toont de app alleen zonder adresbalk als de website bevestigt dat de app erbij hoort.
Dat gebeurt met `https://werkplekinspectie-app.netlify.app/.well-known/assetlinks.json`
(bron: `webapp/.well-known/assetlinks.json`). Voorwaarden:

- het bestand moet echt online staan (de map `.well-known/` moet mee in de publicatie);
- met `Content-Type: application/json`, zonder doorverwijzing;
- package-id en vingerafdruk moeten precies kloppen met de sleutel waarmee de APK is ondertekend.

Controleren: open het adres hierboven in een browser, of gebruik
https://developers.google.com/digital-asset-links/tools/generator.

Klopt het niet of staat het bestand er (nog) niet? Dan **werkt de app gewoon**, maar toont Chrome
bovenaan een smalle balk met het webadres (zoals een gewoon browsertabblad). Na het herstellen
van `assetlinks.json` verdwijnt de balk; soms pas na het opnieuw starten van de app of na een dag
(Chrome onthoudt de controle een tijd).

## Microfoon en spraakinvoer

De app zelf vraagt **geen** microfoon-toestemming (en heeft die ook niet nodig). De site draait in
Chrome, en Chrome vraagt de toestemming:

1. de eerste keer: Android vraagt of **Chrome** de microfoon mag gebruiken;
2. daarna vraagt Chrome of **deze website** de microfoon mag gebruiken.

Per ongeluk geweigerd? Chrome → Instellingen → Site-instellingen → Microfoon → de site toestaan,
en/of Android-instellingen → Apps → Chrome → Rechten → Microfoon.

Goed om te weten: de gegevens van de web-app (ook wat offline is opgeslagen) staan in Chrome,
niet in deze app. "Gegevens wissen" van Chrome wist dus ook die gegevens.

## De app installeren op een telefoon (zonder Play Store)

Vereist: Android 5 of nieuwer, met **Google Chrome** geïnstalleerd en bijgewerkt.

1. Zet `werkplekinspectie.apk` op de telefoon: als bijlage, via een gedeelde map (Drive/OneDrive),
   een downloadlink of een USB-kabel.
2. Tik op het bestand (in Downloads of de app Bestanden).
3. Android vraagt toestemming om "onbekende apps" te installeren vanuit die app (bijvoorbeeld
   Bestanden, Chrome of Gmail): kies **Instellingen** → zet **Toestaan van deze bron** aan → terug.
4. Tik op **Installeren**. Waarschuwt Google Play Protect voor een onbekende ontwikkelaar, kies
   **Meer details** → **Toch installeren**. (Dat komt doordat de app niet via de Play Store gaat.)
5. Open **Werkplekinspectie** vanaf het startscherm. Zet daarna eventueel "onbekende apps"
   weer uit voor de app uit stap 3.

Met een computer en USB-foutopsporing kan het ook met: `adb install werkplekinspectie.apk`.
Beheert het bedrijf de telefoons met een MDM (bijvoorbeeld Intune), dan kan IT de APK daar als
"line-of-business"-app uitrollen.

**Bijwerken:** nieuwe APK (met hogere `VERSIE_CODE`, zelfde sleutel) op dezelfde manier
installeren; Android werkt de bestaande app bij. Meestal is bijwerken van de APK niet eens nodig:
de inhoud komt van de website, dus wijzigingen in de web-app zijn direct zichtbaar. Alleen naam,
icoon, kleuren of webadres vragen om een nieuwe APK.
