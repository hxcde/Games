# SUNSET BLOCK — Cyberpunk Island (Vertical Slice)

Eine spielbare, dichte Cyberpunk-**Inselstadt** der nahen Zukunft zur **Dämmerung**
(Golden Hour, noch nicht Nacht). Gebaut mit [three.js](https://threejs.org) (WebGL),
läuft im Browser.

## Look & Atmosphäre
- **Dämmerung / Golden Hour**: tiefe warme Sonne über dem Meer, lange Schatten,
  staubiger Dunst (aerial perspective). Trocken — **kein Regen, keine nassen Straßen**.
- **Echte HDRI-/PBR-Beleuchtung**: warmes Richtungslicht mit weichen Schatten,
  Himmel + Umgebungs-Reflexionen, dezenter Bloom, ACES-Tonemapping.
- **Fotografische Gebäude-Fassaden** (ambientCG, mit Fenstern/Emission), echte
  **2K-PBR-Texturen** (Asphalt, Beton, Metall – Color/Normal/Roughness), max. Anisotropie.
- **Dunkle Mega-City-Skyline** ringsum am Horizont (riesige Glas-/Betontürme mit
  beleuchteten Fenstern), durch Dunst in die Ferne gestaffelt.
- Subtile kalte Akzente (Screens, Neon, Automaten) gemischt mit warmem Sonnenlicht.

## Insel & Stadt
- Insel ringsum von **Meer** umgeben (Kaikante + Reling an allen Rändern), das den
  Sonnenuntergang spiegelt.
- **Mehrere Straßen** (Raster mit Kreuzungen, Zebrastreifen, Fahrbahnmarkierungen,
  Straßenlaternen).
- Bezirke: **Park** (Rasen, Wege, Bäume, Laternen, Brunnen, Bänke),
  **Parkhaus** (mehrstöckig, Rampen-Decks, Säulen, geparkte Autos, „P"-Schild),
  **Plaza**, sowie mehrere **Gebäude-Blocks** mit Läden (Neo-Ramen, Cyberware,
  Pawn, Bar), Automaten und Details (Klimaanlagen, Rohre, Kabel, Graffiti, Müll …).

## Leben & Fahrzeuge
- NPCs: animierte Passanten auf den Gehwegen, ein **Händler**, Security, eine
  obdachlose Figur, eine **Lieferdrohne**.
- Fahrzeuge mit echten Texturen: Autos & Lieferwagen mit Klarlack (Clearcoat),
  Chrom, Glas, Reifenprofil und Kennzeichen; **E-Bikes/Motorräder**; im
  Hintergrund hoch oben **fliegende Fahrzeuge**.

## Gameplay
Frei bewegen; Fadenkreuz auf ein Objekt → `E` / **USE**:
1. **Werbescreen / Terminal** (Plaza) – Infos & Wegweiser.
2. **Händler** (Neo-Ramen) – Dialog.
3. **Verschlossene Tür** (Parkhaus-Wachraum) – Keypad.

## Steuerung
| Eingabe | Aktion |
|---|---|
| `W A S D` / Pfeile | Laufen |
| Maus | Umsehen |
| `Shift` | Rennen |
| `E` | Interagieren |
| Touch | Joystick (links) + Wischen (rechts) + **USE** |

`?low=1` an die URL hängt = Performance-Modus (kleinere Schatten, kein MSAA) fürs Handy.

## Starten
ES-Module laden nicht per `file://` — lokalen Server nutzen:
```bash
./start.sh        # oder:  python3 -m http.server 8000
```
→ `http://localhost:8000` → **„Betreten"**.

## Projektstruktur
```
index.html      UI, Importmap, Lade-Overlay
js/game.js      Renderer, Licht, Himmel, Skyline, Atmosphäre, Steuerung, Loop
js/city.js      Insel, Straßenraster, Gebäude (Fassaden), Park, Parkhaus, Plaza, Props
js/agents.js    NPCs, Fahrzeuge (PBR), Drohne, fliegende Fahrzeuge
js/assets.js    Laden von Fassaden/Texturen + Charakter, Anisotropie, Foot-Offset
js/canvasart.js Prozedurale Schilder/Screens/Graffiti/Plakate
js/config.js    Maße/Raster der Insel
libs/, assets/  three.js + Addons, Texturen/HDRI/Modell (vendored)
```

## Asset-Credits
- **three.js** (MIT) + Charakter `Soldier.glb` aus den three.js-Beispielen.
- **PBR-Texturen** (asphalt_02, concrete_wall_008, concrete_floor_worn_001,
  pavement_02, aerial_grass_rock, metal_plate_02, rusty_metal_03) von
  [Poly Haven](https://polyhaven.com) — **CC0**.
- **Gebäude-Fassaden** (Facade001/006/009/012/018A/019A) von
  [ambientCG](https://ambientcg.com) — **CC0**.

## Hinweis
Echtzeit im Browser: realistische Beleuchtung, Materialien und Assets im AAA-Stil,
technisch fürs Web abgespeckt. Mögliche nächste Schritte: SSAO/GTAO-Kontaktschatten,
4K-Fassaden, mehr NPC-/Verkehrslogik, vertonte Dialoge.
