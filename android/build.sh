#!/usr/bin/env bash
# Bouwt de ondertekende Android-app (Trusted Web Activity) van Werkplekinspectie.
#
#   WPI_KEYSTORE=/pad/naar/werkplekinspectie-release.jks \
#   WPI_KEYSTORE_WACHTWOORD=/pad/naar/keystore-wachtwoord.txt \
#   ./android/build.sh
#
# Resultaat: android/build/werkplekinspectie.apk (staat niet in git).
# Instellingen (naam, adres, kleuren, versie) staan in android/app.conf.
# Zie android/README.md voor uitleg, benodigde tools en het installeren op een telefoon.
set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$HIER")"
BUILD="$HIER/build"
# shellcheck source=app.conf
source "$HIER/app.conf"

KEYSTORE="${WPI_KEYSTORE:-}"
WACHTWOORD_BESTAND="${WPI_KEYSTORE_WACHTWOORD:-}"
ALIAS="${WPI_KEY_ALIAS:-werkplekinspectie}"

fout() { echo "FOUT: $*" >&2; exit 1; }

# --- instellingen controleren ---------------------------------------------------------------
[[ "$PACKAGE_ID" == "nl.werkplekinspectie.app" ]] || fout "PACKAGE_ID is gewijzigd; dat mag niet (zie app.conf)."
[[ "$WEB_HOST" =~ ^[a-z0-9.-]+$ ]] || fout "WEB_HOST ongeldig: $WEB_HOST"
[[ "$START_PAD" == /* ]] || fout "START_PAD moet met / beginnen."
[[ "$THEMA_KLEUR" =~ ^#[0-9A-Fa-f]{6}$ ]] || fout "THEMA_KLEUR moet #RRGGBB zijn."
[[ "$ACHTERGROND_KLEUR" =~ ^#[0-9A-Fa-f]{6}$ ]] || fout "ACHTERGROND_KLEUR moet #RRGGBB zijn."
[[ "$VERSIE_CODE" =~ ^[1-9][0-9]*$ ]] || fout "VERSIE_CODE moet een geheel getal >= 1 zijn."
[[ -n "$APP_NAAM" ]] || fout "APP_NAAM is leeg."
[[ -n "$KEYSTORE" && -f "$KEYSTORE" ]] || fout "Zet WPI_KEYSTORE op het pad van de keystore (.jks). Zie README.md."
[[ -n "$WACHTWOORD_BESTAND" && -f "$WACHTWOORD_BESTAND" ]] || fout "Zet WPI_KEYSTORE_WACHTWOORD op het bestand met het keystore-wachtwoord."

# --- tools zoeken: Android SDK (ANDROID_HOME) als die er is, anders de Debian/Ubuntu-pakketten --
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
BT=""
if [[ -n "$SDK" && -d "$SDK/build-tools" ]]; then
  BT="$(ls -d "$SDK"/build-tools/*/ 2>/dev/null | sort -V | tail -n1)"
fi
tool() {  # tool <naam in SDK> <naam op PATH>
  if [[ -n "$BT" && -x "$BT/$1" ]]; then echo "$BT/$1"; return; fi
  command -v "$2" 2>/dev/null || true
}
AAPT2="$(tool aapt2 aapt2)"
ZIPALIGN="$(tool zipalign zipalign)"
APKSIGNER="$(tool apksigner apksigner)"
D8="$(tool d8 d8)"
DX="$(command -v dalvik-exchange 2>/dev/null || true)"
ANDROID_JAR=""
if [[ -n "$SDK" && -d "$SDK/platforms" ]]; then
  ANDROID_JAR="$(ls "$SDK"/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -n1 || true)"
fi
[[ -n "$ANDROID_JAR" ]] || ANDROID_JAR="$(ls /usr/lib/android-sdk/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -n1 || true)"

for t in AAPT2 ZIPALIGN APKSIGNER ANDROID_JAR; do
  [[ -n "${!t}" ]] || fout "$t niet gevonden. Zie README.md (benodigde tools)."
done
[[ -n "$D8" || -n "$DX" ]] || fout "Geen d8 (Android SDK) of dalvik-exchange (apt) gevonden."
command -v javac >/dev/null || fout "javac (JDK 17 of nieuwer) niet gevonden."
command -v zip >/dev/null || fout "zip niet gevonden."

echo "aapt2:       $AAPT2"
echo "android.jar: $ANDROID_JAR"

# --- bouwen -----------------------------------------------------------------------------------
rm -rf "$BUILD"
mkdir -p "$BUILD/gen-res/values" "$BUILD/gen" "$BUILD/classes" "$BUILD/dex"

xml_tekst() {  # tekst veilig in een Android-stringresource
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' \
    -e 's/\\/\\\\/g' -e "s/'/\\\\'/g" -e 's/"/\\"/g'
}
cat > "$BUILD/gen-res/values/instellingen.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_naam">$(xml_tekst "$APP_NAAM")</string>
    <string name="web_host" translatable="false">$WEB_HOST</string>
    <string name="start_pad" translatable="false">$(xml_tekst "$START_PAD")</string>
    <color name="thema">$THEMA_KLEUR</color>
    <color name="achtergrond">$ACHTERGROND_KLEUR</color>
</resources>
EOF

sed -e "s|@@PACKAGE_ID@@|$PACKAGE_ID|g" -e "s|@@WEB_HOST@@|$WEB_HOST|g" \
  "$HIER/app/AndroidManifest.xml" > "$BUILD/AndroidManifest.xml"

"$AAPT2" compile --dir "$HIER/app/res" -o "$BUILD/res.zip"
"$AAPT2" compile --dir "$BUILD/gen-res" -o "$BUILD/gen-res.zip"
"$AAPT2" link -I "$ANDROID_JAR" \
  --manifest "$BUILD/AndroidManifest.xml" \
  --min-sdk-version "$MIN_SDK" --target-sdk-version "$TARGET_SDK" \
  --version-code "$VERSIE_CODE" --version-name "$VERSIE_NAAM" \
  --java "$BUILD/gen" \
  -o "$BUILD/basis.apk" \
  "$BUILD/res.zip" "$BUILD/gen-res.zip"

find "$HIER/app/java" "$BUILD/gen" -name '*.java' > "$BUILD/bronnen.txt"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 \
  -bootclasspath "$ANDROID_JAR" -d "$BUILD/classes" @"$BUILD/bronnen.txt"

if [[ -n "$D8" ]]; then
  "$D8" --release --min-api "$MIN_SDK" --lib "$ANDROID_JAR" --output "$BUILD/dex" \
    $(find "$BUILD/classes" -name '*.class')
else
  "$DX" --dex --min-sdk-version="$MIN_SDK" --output="$BUILD/dex/classes.dex" "$BUILD/classes"
fi

cp "$BUILD/basis.apk" "$BUILD/onondertekend.apk"
(cd "$BUILD/dex" && zip -q -X "$BUILD/onondertekend.apk" classes.dex)
"$ZIPALIGN" -f -p 4 "$BUILD/onondertekend.apk" "$BUILD/uitgelijnd.apk"

"$APKSIGNER" sign \
  --ks "$KEYSTORE" --ks-key-alias "$ALIAS" \
  --ks-pass "file:$WACHTWOORD_BESTAND" \
  --out "$BUILD/werkplekinspectie.apk" "$BUILD/uitgelijnd.apk"
rm -f "$BUILD/werkplekinspectie.apk.idsig"

# --- controleren ------------------------------------------------------------------------------
"$ZIPALIGN" -c -p 4 "$BUILD/werkplekinspectie.apk" || fout "APK is niet goed uitgelijnd."
CERTS="$("$APKSIGNER" verify --print-certs "$BUILD/werkplekinspectie.apk" 2>/dev/null)" \
  || fout "Handtekening klopt niet (apksigner verify)."
SHA256="$(printf '%s\n' "$CERTS" | sed -n 's/.*certificate SHA-256 digest: //p' | head -n1 \
  | tr 'a-f' 'A-F' | sed 's/../&:/g; s/:$//')"
echo
echo "APK:          $BUILD/werkplekinspectie.apk ($(du -h "$BUILD/werkplekinspectie.apk" | cut -f1))"
echo "Certificaat:  SHA-256 $SHA256"
ASSETLINKS="$REPO/webapp/.well-known/assetlinks.json"
if [[ -f "$ASSETLINKS" ]] && grep -q "$SHA256" "$ASSETLINKS" && grep -q "\"$PACKAGE_ID\"" "$ASSETLINKS"; then
  echo "assetlinks:   webapp/.well-known/assetlinks.json klopt met deze sleutel."
else
  echo "LET OP: webapp/.well-known/assetlinks.json bevat deze package-id/vingerafdruk niet." >&2
  echo "        Zonder juiste assetlinks.json toont Chrome een adresbalk boven de app." >&2
fi
if command -v aapt >/dev/null; then
  aapt dump badging "$BUILD/werkplekinspectie.apk" \
    | grep -E "^(package|sdkVersion|targetSdkVersion|application-label):" || true
fi
