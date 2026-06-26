# NEON DRIFT — Cyberpunk Walk

Eine kleine Open-World-Demo: First-Person durch eine nächtliche Cyberpunk-Stadt
laufen. Neon-beleuchtete Hochhäuser, nasse spiegelnde Straßen, holografische
Werbetafeln, Regen und Nebel. Gebaut mit [three.js](https://threejs.org) (WebGL),
läuft komplett im Browser.

> Stilrichtung: „neon-noir", realistisch *wirkende* Beleuchtung (PBR-Materialien,
> Reflexionen, Bloom, HDR-Tonemapping). Echtes AAA-Fotorealismus-Niveau ist im
> Browser nicht in einer einzelnen Datei möglich — das hier ist der atmosphärische
> Kompromiss.

## Starten

Das Spiel nutzt ES-Module, die der Browser aus Sicherheitsgründen **nicht** per
Doppelklick (`file://`) lädt. Es muss über einen lokalen Webserver laufen:

```bash
# Option A: Python (fast überall vorinstalliert)
python3 -m http.server 8000
#  -> dann im Browser öffnen:  http://localhost:8000

# Option B: Node
npx serve .

# Option C: Skript in diesem Repo
./start.sh
```

Danach `http://localhost:8000` öffnen und **„Betreten"** klicken.

## Steuerung

| Eingabe            | Aktion          |
|--------------------|-----------------|
| `W A S D` / Pfeile | Laufen          |
| Maus               | Umsehen         |
| `Shift`            | Sprinten        |
| `Esc`              | Pause           |
| Touch              | Joystick (links) + Wischen (rechts) zum Umsehen |

Auf dem Handy erscheinen automatisch Touch-Steuerungen.

## Aufbau

```
index.html      UI-Hülle, Importmap, Start-Overlay
js/game.js      Spiel: Stadtgenerierung, Beleuchtung, Steuerung, Render-Loop
libs/           Vendorte three.js + Addons (kein CDN nötig, läuft offline)
```

Die Stadt wird prozedural erzeugt (Gebäude, Fenster, Neon-Schilder, Laternen),
ist also bei jedem Laden etwas anders.
