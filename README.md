# SUNSET BLOCK — Cyberpunk Vertical Slice

Eine spielbare Straßenszene als **Vertical Slice** für ein realistisches
Cyberpunk-Spiel. Eine enge Großstadtgasse einer **Inselstadt** der nahen
Zukunft zur **goldenen Abendstunde** — trocken, staubig, warm und technisch
überladen. Kein Regen, keine nasse Nacht. Gebaut mit [three.js](https://threejs.org)
(WebGL), läuft im Browser.

## Atmosphäre & Look
- **Golden Hour**: tiefe warme Sonne am Ende der Straße über dem Wasser, lange
  Schatten von Gebäuden, Schildern und Kabeln, staubiger Dunst in der Luft.
- **Image-Based Lighting** aus einem echten Sonnenuntergangs-HDRI (realistisches
  Licht & Reflexionen) + warmes Richtungslicht mit weichen Schatten.
- **Echte PBR-Texturen** (Asphalt, Beton, Backstein – mit Normal-/Roughness-Maps).
- Warmes Sonnenlicht mischt sich mit **kalten Akzentlichtern** von Werbescreens,
  Neon-Schildern und Automaten – subtil, kein Neon-Kitsch.
- Trockener Asphalt, **keine nassen Flächen, kein Regen**. Wasser nur rund um die
  Insel (spiegelt den Sonnenuntergang).

## Szene
- Inselstadt-Block, ringsum Meer mit Reling/Kaikante an den Rändern.
- Dichte Gasse mit hohen Gebäuden links und rechts, Gehwege, Bordsteine, Gullys.
- Läden: **Neo-Ramen**, **Akari Cyberware**, **Pawn 24H**, **The Wired Bar**,
  Getränkeautomaten, Hinterhof-Gasse.
- Details: Klimaanlagen, Rohre, Kabel über der Straße, Kameras, Stromkästen,
  Graffiti, Plakate, Warnschilder, Müllsäcke, Kartons, Hydranten, Bänke.
- NPCs: Passanten, ein Händler, Security, eine obdachlose Figur, eine
  Lieferdrohne. Fahrzeuge: umgebaute Autos, Lieferwagen, E-Bikes; fliegende
  Fahrzeuge weit oben im Hintergrund.
- Leichter Dampf aus Lüftungsschächten und Gullys.

## Gameplay & Interaktion
Frei durch die Straße bewegen. Drei interaktive Punkte (Fadenkreuz drauf →
`E` / USE):
1. **Werbescreen / Terminal** – Infos & Wegweiser.
2. **Händler** (Neo-Ramen) – Dialog.
3. **Verschlossene Tür** in der Seitengasse – Keypad.

Wegeführung durch Licht (Sonne am Straßenende), Schilder und Architektur.

## Steuerung
| Eingabe | Aktion |
|---|---|
| `W A S D` / Pfeile | Laufen |
| Maus | Umsehen |
| `Shift` | Rennen |
| `E` | Interagieren |
| Touch | Joystick (links) + Wischen (rechts), **USE**-Button |

## Starten
ES-Module laden nicht per `file://` — ein lokaler Server ist nötig:
```bash
./start.sh        # oder:  python3 -m http.server 8000
```
→ `http://localhost:8000` öffnen → **„Betreten"**.

## Projektstruktur
```
index.html        UI, Importmap, Start-/Lade-Overlay
js/game.js        Renderer, Licht, Atmosphäre, Steuerung, Interaktion, Loop
js/city.js        Insel, Straßen, Gebäude, Läden, Props, Schilder
js/agents.js      NPCs, Fahrzeuge, Drohne, fliegende Fahrzeuge
js/assets.js      Laden von HDRI, PBR-Texturen, Charakter-Modell
js/canvasart.js   Prozedurale Schilder/Screens/Graffiti/Plakate
js/config.js      Gemeinsame Maße der Szene
libs/             three.js + Addons (vendored, kein CDN nötig)
assets/           HDRI, PBR-Texturen, Charakter-Modell
```

## Asset-Credits
- **three.js** (MIT) und das Charakter-Modell `Soldier.glb` aus den three.js-Beispielen.
- **HDRI** `venice_sunset` und **PBR-Texturen** (asphalt_02, concrete_wall_008,
  dirty_concrete, brick_wall_006) von [Poly Haven](https://polyhaven.com) — **CC0**.

## Hinweis zum „Fotorealismus"
Dies ist eine Browser-Echtzeitszene: realistische Beleuchtung, Materialien und
Assets im AAA-Stil, aber technisch fürs Web abgespeckt. Für mehr Realismus ließe
sich später ergänzen: SSAO/Kontaktschatten, höhere Textur-/Schattenauflösung,
mehr Geometrie-Detail und echte vertonte Dialoge.
