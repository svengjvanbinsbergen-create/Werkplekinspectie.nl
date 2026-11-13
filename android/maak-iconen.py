#!/usr/bin/env python3
"""Maakt de Android-iconen (app/res/mipmap-*) uit het PWA-icoon webapp/icon-512.png.

Alleen nodig als het icoon van de web-app verandert. Vereist Python 3 met Pillow:
    python3 -m pip install pillow
    python3 android/maak-iconen.py
De achtergrondkleur van het adaptieve icoon (app/res/values/icoon.xml) wordt uit de
linkerbovenhoek van het icoon gehaald.
"""
from pathlib import Path

from PIL import Image

HIER = Path(__file__).resolve().parent
BRON = HIER.parent / "webapp" / "icon-512.png"
RES = HIER / "app" / "res"

# dichtheid -> schaal t.o.v. mdpi
DICHTHEDEN = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}
LEGACY_DP = 48       # klassiek icoon
ADAPTIEF_DP = 108    # laag van een adaptief icoon
ZICHTBAAR_DP = 72    # zichtbaar deel daarvan (rest is marge voor masker/animatie)


def main():
    bron = Image.open(BRON).convert("RGBA")
    achtergrond = bron.getpixel((0, 0))[:3]

    # Monochroom (Android 13 "thema-iconen"): alleen de lichte delen, wit op transparant.
    grijs = bron.convert("L")
    mono = Image.new("RGBA", bron.size, (255, 255, 255, 0))
    mono.putalpha(grijs.point(lambda v: 255 if v > 128 else 0))

    for naam, schaal in DICHTHEDEN.items():
        map_ = RES / f"mipmap-{naam}"
        map_.mkdir(parents=True, exist_ok=True)

        legacy = round(LEGACY_DP * schaal)
        bron.resize((legacy, legacy), Image.LANCZOS).convert("RGB").save(
            map_ / "ic_launcher.png", optimize=True)

        laag = round(ADAPTIEF_DP * schaal)
        zichtbaar = round(ZICHTBAAR_DP * schaal)
        marge = (laag - zichtbaar) // 2
        for bestand, beeld in (("ic_launcher_voorgrond.png", bron),
                               ("ic_launcher_monochroom.png", mono)):
            canvas = Image.new("RGBA", (laag, laag), (0, 0, 0, 0))
            canvas.paste(beeld.resize((zichtbaar, zichtbaar), Image.LANCZOS), (marge, marge))
            canvas.save(map_ / bestand, optimize=True)

    kleur = "#{:02X}{:02X}{:02X}".format(*achtergrond)
    (RES / "values" / "icoon.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        "    <!-- Gemaakt door maak-iconen.py (kleur uit webapp/icon-512.png). -->\n"
        f'    <color name="icoon_achtergrond">{kleur}</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )
    print(f"Iconen gemaakt in {RES} (achtergrond {kleur}).")


if __name__ == "__main__":
    main()
