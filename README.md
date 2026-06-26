# BLUE HOUR — City Walk

Eine kleine Open-World-Demo: First-Person durch eine Stadt zur **blauen Stunde**
laufen. Realistische Beton- und Glas-Hochhäuser mit beleuchteten Fenstern, echte
Straßen mit Fahrbahnmarkierungen und Zebrastreifen, Autos mit Scheinwerfern, nasser
spiegelnder Asphalt, tiefe warme Sonne mit langen Schatten und atmosphärischer
Dunst. Gebaut mit [three.js](https://threejs.org) (WebGL), läuft im Browser.

> Stilrichtung: realistisch (AAA-artig), aber technisch abgespeckt fürs
> Browser-Budget — PBR-Materialien, Sonnenlicht mit weichen Schatten,
> Umgebungs-Reflexionen, dezenter Bloom, HDR-Tonemapping.

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

Die Stadt wird prozedural erzeugt (Gebäude mit Setbacks & Dachaufbauten,
Fenster, Erdgeschoss-Shops, Straßenlaternen, fahrende Autos), ist also bei
jedem Laden etwas anders.
