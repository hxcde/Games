# Sunset Block — Design-Referenz (aus dem Three.js-Prototyp)

Exakte Werte des Prototyps, damit das Layout, Licht und die Atmosphäre in UE5
**1:1 reproduziert** werden können. Quelle: `js/config.js`, `js/city.js`, `js/game.js`.

> **Maßstab / Achsen:** Prototyp ist in **Metern**, Y = oben, Spieleraugen 1,7 m.
> UE5 nutzt **cm** und Z = oben → **× 100** umrechnen (1 m = 100 uu).
> Prototyp `-Z` (Sonne/Wasser-Seite, „Süden") = die Blickrichtung beim Start.

---

## 1. Insel & Straßenraster
| Größe | Prototyp (m) | UE5 (uu) |
|---|---|---|
| Insel-Halbgröße | 78 | 7800 |
| Fahrbahn-Halbbreite | 4,5 | 450 |
| Gehweg-Breite | 3,5 | 350 |
| Block-Frontlinie ab Straßenmitte | 8,0 | 800 |
| Meeresspiegel (Y) | −1,4 | −140 |

- **Straßen-Mittellinien** auf beiden Achsen bei **X/Z = −40, 0, 40 m**. Ergibt ein
  Raster aus Hauptstraße (X=0, Nord-Süd) + Querstraßen + zwei Parallelstraßen.
- **Blockstreifen** (zwischen den Straßen + bis zur Inselkante), je Achse:
  `[−78,−48]`, `[−32,−8]`, `[8,32]`, `[48,78]` → Index 0..3.
- Rundherum **Meer**; auf **einer Seite (+X)** eine ferne, dunstige Großstadt-Skyline
  (Prototyp: Türme bei ~1350–3800 m, wenige beleuchtete Fenster, stark im Dunst).

### Block-Belegung (X-Index, Z-Index)
| Block | Bereich (m) | Typ |
|---|---|---|
| (1,1) | X[−32,−8] Z[−32,−8] | **Plaza** (mit erhöhter Terrasse) |
| (2,1) | X[8,32] Z[−32,−8] | **Park** |
| (1,2) | X[−32,−8] Z[8,32] | **Parkhaus** (mehrstöckig) |
| alle übrigen | — | **Gebäude-Blocks** (dicht, schmale Gassen) |

---

## 2. Begehbare Ebenen (in UE mit echter Collision + Treppen/Rampen bauen)
- **Plaza-Terrasse (Podium):** Bereich X[−29,−17] Z[−29,−17], Höhe **3 m**, Treppe auf der +Z-Seite.
- **Fußgänger-Überführung:** quer über die Hauptstraße bei **Z = −18**, X[−11,11], Höhe **5,2 m**, Deckbreite 4 m, Treppen an beiden Enden.
- Hinweis: Im Prototyp waren manche Ebenen schwer begehbar (Höhen-Sampling/zu schmale Gassen). In UE5 jede Ebene physisch an Treppe/Rampe anschließen, Gassen breit genug für die Player-Capsule (siehe `UE5_MIGRATION.md`, Abschnitt 4).

---

## 3. Licht & Atmosphäre (Abendstunde, golden, trocken)
| Element | Prototyp-Wert | UE5-Entsprechung |
|---|---|---|
| Sonne (Directional) | Farbe `#ffb163` (warm), Intensität 3.7 | Directional Light, warm, **Pitch ≈ −11°** (tief), lange Schatten (VSM) |
| Sonnenrichtung | Vektor (0.34, 0.20, −1) → Elevation ~11°, kommt aus −Z (über dem Wasser) | Yaw so wählen, dass die Sonne die Hauptstraße längs anstrahlt |
| Fülllicht (Hemisphere) | Himmel `#6e88b8`, Boden `#3a3026`, Int. 0.95 | Sky Light (Lumen) + Sky Atmosphere |
| Nebel/Dunst | linear, Farbe `#4e5577`, 160→4400 m | Exponential Height Fog (trocken), leichte Volumetrik |
| Belichtung | ACES, Exposure 1.16 (manuell) | Post Process: manuelle Exposure, kein Auto-Pumpen |
| Bloom | Stärke 0.3, Threshold 0.85 (dezent) | Post Process Bloom dezent |
| Grade | Kontrast 1.0, Sätt. 1.05, Vignette 0.16, leichtes Korn | Post Process Color Grading dezent |
| **Kein** Regen / **keine** nassen Flächen | — | trockener, staubiger Look |

- **Spieler-Start:** Position (0, 1.7, 34) m, Blick nach **−Z** (Hauptstraße entlang Richtung Sonne/Wasser).

---

## 4. Shops & Interaktionen (Positionen aus dem Prototyp)
Hauptstraße, Gebäude-Ostseite (Fassade bei **X = +8 m**, Blick nach −X zur Straße):
| Shop | Z (m) | Schildfarbe |
|---|---|---|
| **NEO-RAMEN** (Noodle) | 26 | `#ff8a3c` (warm orange) |
| **AKARI CYBERWARE** (Clinic) | 14 | `#39d2ff` (cyan) |
| **PAWN 24H** | 56 | `#ffd23f` (amber) |
| **THE WIRED BAR** | 64 | `#ff4db0` (magenta) |
| Getränke-**Automaten** | ~20–23 (X≈8.5) | kühle Screens |

Für UE ergänzen (laut Zielbild): **Mini-Markt, Repair-Shop, Verkaufsstände, Sitzbereiche, Lieferzonen, mehr digitale Anzeigen.**

**Interaktionspunkte (Dialog/Prompt aus dem Prototyp):**
- **Werbescreen** „SYNTH-CORP // Ad-Net" (in der Plaza, erhöht).
- **Stadt-Terminal** „Insel 7" (Plaza) — Wegweiser: Park im Osten, Parkhaus im Westen, Hauptstraße nach Süden zur Hafenkante.
- **Verschlossene Tür** „Parkhaus // Wachraum" (Keypad, am Parkhaus).
- **Händler** „Old Hideo // Neo-Ramen" (am Ramen-Stand, Z≈26–37).

---

## 5. NPCs (logische Rollen/Platzierung)
- **Passanten** auf den Gehwegen (Spline-Pfade entlang beider Straßenseiten).
- **Kunden** vor Shops (Neo-Ramen, Cyberware …).
- **Händler** am Ramen-Stand/Verkaufsständen.
- **Security** am Konzern-/Parkhaus-Eingang.
- **Obdachlose Figur** sitzend an einer Wand (Atmosphäre).
- Prototyp-Charaktermodell: `assets/models/Soldier.glb` (rigged, Walk/Idle) — als Platzhalter übernehmbar.

---

## 6. Fahrzeuge
- **Typen:** umgebaute Autos, **Lieferwagen**, **E-Bikes/Motorräder**; weit oben im Hintergrund **fliegende Fahrzeuge** (nur Deko).
- **Look-Ziel (UE):** gebraucht/realistisch — guter Lack (Clearcoat), Glas, Reifenprofil, Felgen, Scheinwerfer/Rücklichter (Emissive), Schmutz/Staub; dezente Cyberpunk-Details (LED-Streifen, kleine Displays, Sensoren/Kameras, mod. Stoßstangen). **Keine** dynamischen Lichter pro Auto.
- **Bewegung:** fahrende Autos folgen dem Straßenraster (im Prototyp Node-zu-Node auf den Mittellinien) → in UE als Spline-/Punkt-zu-Punkt-Bewegung.

---

## 7. Farb-/Stilpalette
- **Warm (Sonne/Innenlicht):** `#ffb163`, `#ffd9a0`, `#ff8a3c`.
- **Kühle Akzente (Screens/Neon, dezent):** `#39d2ff`, `#ff4db0`, `#6a8bff`, `#ffae5e`.
- **Boden/Beton/Metall:** gedeckte Grautöne, Rost `#6b4a36`, staubig.
- Grundsatz: **realistisch, dreckig, warm** — Neon vorhanden, aber **nicht dominant**.
