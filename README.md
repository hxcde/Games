# SUNSET BLOCK — Cyberpunk Island (Vertical Slice)

Eine dichte Cyberpunk-**Inselstadt** der nahen Zukunft zur **Dämmerung**
(Golden Hour, noch nicht Nacht). Gebaut mit [three.js](https://threejs.org) (WebGL),
läuft im Browser.

> **Status: Prototyp / visuelle Referenz.** Die finale technische Basis wird
> **Unreal Engine 5**. Migrationsplan, Design-Referenz (mit allen Maßen/Licht-
> werten) und Asset-Inventar liegen unter **`docs/`**, das UE5-Projektgerüst
> unter **`unreal/`**:
> - [`docs/UE5_MIGRATION.md`](docs/UE5_MIGRATION.md) — Entscheidung, 10-Schritte-Plan, Struktur, Technik, Performance/DLSS-TSR
> - [`docs/DESIGN_REFERENCE.md`](docs/DESIGN_REFERENCE.md) — exakte Layout-/Licht-/Shop-/Ebenen-Werte des Prototyps
> - [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md) — was übernommen / neu gebaut wird
>
> Der folgende Abschnitt beschreibt den **WebGL-Prototyp** (lokal spielbar).

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
- **Mehrere Ebenen**: begehbare Treppen, eine erhöhte Plaza-Terrasse und eine
  Fußgänger-Überführung über die Hauptstraße (Höhen-Sampling per Raycast).
- **Kollision** mit Gebäuden und Fahrzeugen (man läuft nicht mehr durch Autos).
- **Echte Bäume** (Photogrammetrie-Modell, Poly Haven CC0) im Park/Plaza.
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
| `G` / ⚙ | Grafik: Upscaling (Off/Quality/Balanced/Performance/Ultra) |
| Touch | Joystick (links) + Wischen (rechts) + **USE** |

`?low=1` an die URL hängt = Performance-Modus (kleinere Schatten, kein MSAA) fürs Handy.

## Lokal spielen (mit Auto-Update) — empfohlen
Einmalig das Repo klonen (nicht als ZIP), dann starten:
```bash
git clone <repo-url>
cd Games
./play.sh           # macOS/Linux
# Windows:  play.bat doppelklicken (oder in der Eingabeaufforderung ausführen)
```
Der Launcher (`launcher.py`):
1. holt per `git pull` die **neuesten Dateien von GitHub**,
2. startet einen lokalen Webserver (ES-Module brauchen `http://`),
3. öffnet den Browser auf `http://localhost:8000/index.html`.

Optionen: `--no-update` (ohne Update), `--port 9000` (fester Port).
Voraussetzungen: **Python 3** und **git** im PATH.

Ganz ohne Launcher geht auch: `python3 -m http.server 8000` → `http://localhost:8000`.

## Veröffentlichen mit Cloudflare Pages
Statische Seite, **kein Build-Step**. Zwei Wege:

**A) Dashboard (Git-Integration, empfohlen — Auto-Deploy bei jedem Push)**
1. Cloudflare Dashboard → *Workers & Pages* → *Create* → *Pages* → *Connect to Git*.
2. Repo `hxcde/games` wählen, Branch `claude/mobile-block-blast-game-dxj04r`
   (oder vorher in `main` mergen).
3. Build-Einstellungen: **Framework preset: None**, **Build command: leer**,
   **Build output directory: `/`** (Repo-Wurzel). Speichern & deployen.
4. Ergebnis liegt unter `https://<projekt>.pages.dev`.

**B) Wrangler CLI (Direkt-Upload)**
```bash
npx wrangler@latest pages deploy .      # fragt einmalig Login/Token ab
```
(`wrangler.toml` mit `pages_build_output_dir = "."` liegt bei.)

Caching der schweren Assets steuert `_headers`. Grenzen von Pages sind eingehalten
(größte Datei ~6,5 MB ≪ 25 MiB, 74 Dateien ≪ 20 000).

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
