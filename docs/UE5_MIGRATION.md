# Sunset Block — Migration von Three.js/WebGL zu Unreal Engine 5

> **Status:** Der bestehende Three.js-Stand (`/index.html`, `/js`, `/assets`) gilt
> ab hier als **Prototyp / visuelle & gestalterische Referenz**, nicht als finale
> technische Basis. Dieses Dokument ist der Plan für den Neuaufbau als echtes
> PC-Spiel (Vertical Slice) in **Unreal Engine 5**.
>
> Begleitdokumente:
> - `docs/DESIGN_REFERENCE.md` — exakte Maße, Licht-, Atmosphären- und Layout-Werte aus dem Prototyp (1:1 reproduzierbar in UE5)
> - `docs/ASSET_INVENTORY.md` — welche Assets übernommen / neu gebaut werden
>
> Zielversion: **Unreal Engine 5.4+ (5.5 empfohlen)**. Stil bleibt: Abendstunde,
> goldene tiefe Sonne, trocken, kein Regen, kein Neon-Kitsch.

---

## 1. Entscheidung

### Warum UE5 für dieses Projekt besser geeignet ist als Three.js/WebGL
- **Beleuchtung:** Lumen liefert dynamische Global Illumination + Reflexionen out of the box. In WebGL muss alles (IBL, Fake-Reflexionen, Kontaktschatten) mühsam von Hand gebaut werden und bleibt limitiert.
- **Performance-Skalierung:** UE5 hat **TSR** (eingebaut) und **DLSS/FSR/XeSS** (Plugins) als echtes Temporal Upscaling. In WebGL gibt es nur reines Render-Resolution-Scaling — kein echtes Upscaling, kein Temporal AA dieser Qualität.
- **Geometrie-Budget:** **Nanite** erlaubt hochpolygonale Meshes (Fassaden, Props, Fahrzeuge) ohne manuelles LOD-Babysitting. Im Prototyp musste der Baum erst dezimiert + meshopt-komprimiert werden, um überhaupt ladbar zu sein.
- **Schatten:** Virtual Shadow Maps geben großflächige, hochaufgelöste Schatten — im WebGL-Prototyp nur eine kleine Shadow-Map, die dem Spieler folgen muss.
- **Tooling:** Material-Editor, Sequencer, Profiler (Unreal Insights, `stat`-Befehle), Blueprint-Logik, Niagara (Dampf/Staub), Animations-/AI-System (NavMesh, Behavior Trees) — alles vorhanden statt selbstgebaut.
- **Charaktere/Fahrzeuge:** Chaos Vehicle / Control Rig / MetaHuman vs. handgeklonte SkinnedMeshes.

### Nachteile / Kosten des Wechsels
- **Kein Browser-Deploy mehr.** Auslieferung als Windows-Build (oder Pixel-Streaming, deutlich teurer). Das aktuelle "einfach Link teilen" entfällt.
- **Hardware:** UE5 + Lumen/Nanite brauchen eine ordentliche GPU; DLSS nur auf NVIDIA RTX.
- **Build-/Iterationszeiten** und Projektgröße steigen massiv (zig GB statt ~130 MB).
- **Lernkurve & Arbeitszeit:** sauberer Aufbau (Materialien, Blueprints, Collision, Lighting) ist deutlich mehr Aufwand als das Prototyp-Tweaken.
- **Diese Umgebung kann UE5 nicht ausführen** (Linux-Container ohne Editor/GPU). Der UE5-Aufbau passiert im Editor auf einem Windows-PC; dieses Repo liefert Plan, Referenzwerte, Asset-Quellen und Projektgerüst.

### Was aus dem Prototyp übernommen wird (1:1 als Vorlage)
- **Layout & Maße:** Straßenraster, Inselgröße, Blockaufteilung (Park, Parkhaus, Plaza), Ebenen (Terrasse, Fußgänger-Überführung) → siehe `DESIGN_REFERENCE.md`.
- **Atmosphäre & Licht:** Sonnenrichtung/-farbe, Belichtung, Dunstfarbe, „golden hour, trocken".
- **Inhalt & Storybeats:** Shop-Liste & Positionen (Neo-Ramen, Akari Cyberware, Pawn 24H, The Wired Bar), Interaktionspunkte (Werbescreen, Terminal, verschlossene Wachraum-Tür), NPC-Rollen.
- **Direkt importierbare Assets (glTF/JPG):** das Charakter-Modell und der Baum sowie alle PBR-/Fassaden-Texturen (CC0). Details in `ASSET_INVENTORY.md`.

### Was besser neu aufgebaut wird
- **Alle prozeduralen Three.js-Geometrien** (Gebäude, Straßen, Bordsteine, Treppen, Überführung, Props, Fahrzeuge) sind nur Box/Cylinder-Code → in UE5 **sauber modular** neu bauen (modulare Meshes + Instancing), nicht importieren.
- **Materialien:** in UE5 als Master-Material + Instanzen neu, nicht die three.js-`MeshStandardMaterial`-Setups.
- **Bewegung/Kollision/Interaktion:** über CharacterMovement + Collision + Interaction-Component statt Raycast-Höhensampling.
- **Post/Grade:** über Post Process Volume (kein selbstgebauter ShaderPass).

---

## 2. Migrationsplan (Schritt für Schritt)

**Schritt 1 — Unreal-Projekt anlegen**
- UE 5.4+; Template **„Third Person"** oder **„First Person"** (Blueprint). Projektname `SunsetBlock`.
- Plugins aktivieren: *NVIDIA DLSS* (Streamline) — falls vorhanden —, *Nanite* (Core), Lumen (Standard), *NVIDIA FSR*/*XeSS* optional als Fallback.
- Projekteinstellungen: Default RHI **DirectX 12 + SM6**, *Generate Mesh Distance Fields* an, *Virtual Shadow Maps* an, *Lumen* (Software- oder Hardware-RT je nach Ziel-Hardware).

**Schritt 2 — Grundlayout der Straße blockouten**
- Map `L_SunsetBlock` (Open- oder Standard-Level).
- Blockout mit **Geometry/BSP oder einfachen Cubes** anhand `DESIGN_REFERENCE.md` (Raster, Inselgröße, Blocktypen). Maßstab: 1 Prototyp-Einheit = 1 m = **100 Unreal Units**.
- Wasserfläche (Single Layer Water oder Plane) rund um die Insel, eine Seite ferne Skyline (siehe Referenz).

**Schritt 3 — Begehbare Ebenen korrekt mit Collision bauen**
- Jede Plattform/Terrasse/Überführung als modulares Mesh **mit Collision** (Simple Box/Convex).
- **Treppen** als Mesh + **unsichtbare Ramp-Collision** (oder echte Steps mit `MaxStepHeight`), `Walkable Floor Angle` prüfen.
- **NavMeshBoundsVolume** über alle begehbaren Flächen für NPCs.
- Regel: jede sichtbar begehbare Fläche bekommt Collision; **keine** Blocking Volumes auf logischen Wegen. (Das war im Prototyp der Hauptbug — siehe Ebenen-Fix in Abschnitt 4.)

**Schritt 4 — Lichtsetup goldene Abendsonne**
- **Directional Light** als Sonne: tiefer Winkel, warme Farbe, lange Schatten (VSM). Werte aus Referenz.
- **Sky Atmosphere + Sky Light** (Lumen) für Himmel/Indirektlicht; warmer Horizont, kühles Zenit.
- **Exponential Height Fog** (trockener Dunst, kein Volumetric-Regen), leichte Volumetrik für Lichtschächte zwischen Gebäuden.
- **Post Process Volume:** Belichtung (manuell, kein Auto-Exposure-Pumpen), leichter Bloom, dezenter Film-Grain/Vignette, warme Color-Grade. Kein nasser Look.

**Schritt 5 — Bodenmaterialien**
- Master-Material `M_Ground` (tiling) mit Parametern: BaseColor/Normal/Roughness, Detail-Normal (Nahbereich), Dirt-Layer, Tint.
- Instanzen: `MI_Asphalt`, `MI_Sidewalk`, `MI_Curb`, `MI_ConcreteFloor`.
- **Decals** für Gullys, Ölflecken, Reifenabrieb, Risse, Fahrbahnmarkierung/Zebrastreifen (Deferred Decals statt Unique-Texturen).
- Optional **Vertex Painting**/RVT für Schmutzübergänge. Trocken/staubig, warmes Licht.

**Schritt 6 — Shops / Fußgängerzone**
- Modulare Fassaden-Kits (`SM_Facade_*`) + Shopfront-Blueprints (`BP_Shop_*`) mit Schaufenster, Schild, Markise, Innenlicht.
- Shops aus Referenz: Noodle, Cyberware-Clinic, Mini-Markt, Bar, Repair-Shop, Pawn Shop + Verkaufsstände, Sitzbereiche, Lieferzonen, digitale Anzeigen.
- Props (Automaten, Müll, Kartons, Kabel, Plakate, Graffiti) als **Instanced Static Meshes**; Graffiti/Plakate als Decals.

**Schritt 7 — Fahrzeuge verbessern**
- Modulare Fahrzeug-Meshes (Body/Glass/Wheels) mit `M_CarPaint` (Clearcoat), `M_Glass`, `M_Tire`, `M_Chrome`, Dirt-Mask.
- Cyberpunk-Details: dezente LED-Streifen (Emissive, **kein** dynamisches Licht pro Auto), kleine Displays, Sensoren/Kameras, modifizierte Stoßstangen.
- Stehende Fahrzeuge als Static Mesh + LOD; fahrende als einfache spline-/Blueprint-Bewegung (kein volles Chaos-Vehicle nötig für den Slice).

**Schritt 8 — NPCs / Passanten**
- `BP_NPC_Pedestrian` (Character + NavMesh + simple State Machine: walk path / idle).
- Logische Platzierung: Kunden vor Shops, Händler an Ständen, Security am Konzern-Eingang, Passanten auf Gehwegen (Spline-Pfade).
- Crowd-Performance: Animation Budget Allocator, Significance Manager, LOD/Imposter für ferne NPCs.

**Schritt 9 — DLSS/TSR/Performance-Settings**
- Grafik-Menü (UMG): Presets Low/Medium/High/Ultra (Scalability Groups) + Upscaling-Dropdown (siehe Abschnitt 5).
- DLSS via Plugin-Blueprint-Nodes; wenn `DLSS Supported == false` → automatisch **TSR** als Fallback.

**Schritt 10 — Testing & Optimierung**
- Von Anfang an profilen: `stat unit`, `stat fps`, `stat GPU`, `ProfileGPU`, Unreal Insights, Lumen/Nanite-Overview, `stat RHI`.
- Checkliste nach jeder größeren Änderung: **FPS → Begehbarkeit → Clipping → Optik aus Spielersicht**.

---

## 3. Unreal-Projektstruktur (`Content/`)

```
Content/
  Maps/         L_SunsetBlock (Hauptlevel), L_Lighting_Test, L_Perf_Test
  Blueprints/   BP_PlayerCharacter, BP_GameMode, BP_InteractionStation,
                BP_Shop_*, BP_Door_Keypad, BP_AdScreen, BP_VendingMachine,
                BP_TrafficCar (fahrend), BP_GraphicsSettings
  Materials/    M_Ground, M_Facade, M_CarPaint, M_Glass, M_Tire, M_Chrome,
                M_Emissive_Sign, M_Decal_* ; Subfolder Instances/ (MI_*)
  Meshes/       Modular: SM_Building_*, SM_Sidewalk_*, SM_Curb, SM_Stairs_*,
                SM_Overpass_*, SM_Podium, SM_Props_* (AC, Pipe, Bin, Box, Lamp…)
  Vehicles/     SM_Car_*, SM_Van, SM_Bike, MI_CarPaint_* , BP_TrafficCar
  Shops/        Shopfront-Kits, Schilder, Markisen, Automaten, Schaufenster-Setups
  Characters/   Pedestrian (Skeletal Mesh + Anim), Vendor, Security; BP_NPC_*
  Lighting/     Light-Presets, Sky/Fog-Setups, PostProcess-Presets
  UI/           WBP_HUD, WBP_Prompt, WBP_Dialogue, WBP_GraphicsMenu
  Audio/        Ambience (Stadt, Wind), SFX (Schritte, Türen), Shop-Loops
```

Eine leere Spiegelung dieser Struktur liegt vorbereitet unter
`unreal/SunsetBlock/Content/` (mit Kurz-READMEs pro Ordner) — der eigentliche
`.uproject` + Assets werden im UE5-Editor angelegt (kann diese Umgebung nicht).

---

## 4. Technische Umsetzung

### Benötigte Blueprints
- `BP_PlayerCharacter` — First/Third-Person, CharacterMovement (Walk/Sprint), Kamera, Interaction-Trace.
- `BP_GameMode` — Default Pawn/Controller/HUD.
- `BP_InteractionStation` (Basis) → Ableitungen `BP_AdScreen`, `BP_Terminal`, `BP_Door_Keypad`, `BP_Vendor` (Dialog/Prompt wie im Prototyp).
- `BP_Shop_*` — Shopfront mit Schild/Markise/Innenlicht/Schaufenster.
- `BP_TrafficCar` — Spline-/Punkt-zu-Punkt-Bewegung entlang der Straßen (ersetzt den Prototyp-„road grid"-Fahralgorithmus).
- `BP_NPC_Pedestrian` — NavMesh-Wandern + Idle vor Shops.
- `BP_GraphicsSettings` / `WBP_GraphicsMenu` — Presets + Upscaling.

### Sinnvolle C++ Klassen (optional, Blueprint-first für den Slice)
- `ASunsetCharacter` — Bewegung/Interaction performant (statt reines BP-Tick).
- `UInteractableComponent` — wiederverwendbare Interaktion (Prompt, OnUse-Event).
- `USunsetGameUserSettings : UGameUserSettings` — Upscaling/DLSS/TSR + Presets persistent speichern.
- `ATrafficManager` — leichte Verkehrs-/Crowd-Verwaltung (Pooling, Significance).

### Materialien (Master + Instanzen)
- `M_Ground` (tiling, Detail-Normal, Dirt), `M_Facade` (Fenster/Emissive-Maske, Tint),
  `M_CarPaint` (Clearcoat, Dirt-Mask, Tint), `M_Glass` (rough reflektiv), `M_Tire`,
  `M_Chrome`, `M_Emissive_Sign` (animierbar), `M_Decal_*` (Gully, Stain, Tiremark, Crack, Crosswalk).
- Variation über **Material Instances** (Farb-/Tiling-/Dirt-Parameter) statt vieler Unique-Materialien.

### Collision-Regeln
- Gebäude/Plattformen: **Simple Collision** (Box/Convex), Object Type `WorldStatic`.
- Boden/Bürgersteig/Decks: Collision an, `Can Character Step Up On = Yes`.
- Treppen: Mesh + Ramp-Collider **oder** Steps mit `MaxStepHeight ~45cm`; `Walkable Floor Angle ~50°`.
- Props (klein): meist **No Collision** oder simple Box; keine Complex-Collision auf Kleinkram.
- **Keine** manuellen Blocking Volumes auf Wegen; Außenkanten der Insel über Geländer-Collider/Kill-Z.
- NavMesh: `RecastNavMesh` + `NavMeshBoundsVolume` über alle Geh-Flächen; `NavModifier` für Sperrzonen.

### Wie die begehbaren Ebenen gefixt werden (Hauptbug aus dem Prototyp)
Im Prototyp kam man auf Terrasse/Überführung teils nicht hoch, weil Höhen-Sampling/Collider-Logik klemmte. In UE5 sauber:
1. Jede Ebene = Mesh **mit** Collision; Treppe/Rampe physisch verbunden (kein Gap an der Oberkante).
2. `MaxStepHeight` ausreichend; Stufen ≤ Step Height **oder** Rampe darunter.
3. Mit `show Collision` / `stat Navigation` prüfen: jede sichtbare Fläche begehbar, kein unsichtbares Blocking.
4. Player-Capsule-Radius vs. Gassenbreite testen — **Gassen mindestens ~Capsule-Durchmesser + Puffer** (im Prototyp waren Gassen zu schmal; in UE die Modular-Tiles entsprechend breit setzen).

### Wie Shops & Fußgängerbereiche aufgebaut werden
- Modulare Fassaden-Tiles + Shopfront-Blueprints, an die Gehweg-Linie gesnappt.
- Gehwege breit genug, Sitzbereiche/Lieferzonen als kleine „Set Pieces", Decals für Schmutz/Plakate, ISMs für Wiederholprops.
- NPC-Spline-Pfade entlang der Gehwege; Spawn-Punkte mit Rollen (Kunde/Händler/Security/Passant).

### Wie Autos bessere Materialien bekommen
- `M_CarPaint` mit Clearcoat + Flake + Dirt-Mask (Roughness-Variation), `M_Glass`, `M_Tire` (Profil-Normal), `M_Chrome` (Felgen/Stoßstange), Emissive für Lichter/LED.
- Variation per Material Instance (Lackfarbe, Dirt-Stärke). Nanite/LODs fürs Mesh; **keine** dynamischen Lichter pro Auto (Emissive + Lumen reicht).

### Wie Performance getestet wird
- `stat unit` (Game/Draw/GPU ms), `stat fps`, `stat GPU`, `ProfileGPU`, `stat RHI` (Draw Calls).
- Unreal Insights für Frame-Breakdown; Nanite-/Lumen-/VSM-Overview-Visualizer.
- Zielbudget je Preset definieren (siehe Abschnitt 5); nach jeder Änderung gegen Budget messen.

---

## 5. Performance-Ziel

**Ziel:** flüssig spielbarer Vertical Slice. Richtwerte (1440p):
- High/Ultra mit DLSS/TSS Quality: **≥ 60 FPS** auf RTX-3060-Klasse.
- Frame-Budget Ultra ~16 ms; Medium-Ziel **≥ 60 FPS** auf breiterer Hardware via Upscaling.

**Grafik-Presets (Scalability Groups):** Low / Medium / High / Ultra
(steuern Shadows, GI/Lumen-Qualität, Post, View Distance, Texturen, Effekte).

**Upscaling-Menü:**
- Native (100 % Screen Percentage, TAA/TSR off-Upscale)
- TSR Quality / TSR Balanced / TSR Performance  *(eingebaut, Fallback)*
- DLSS Quality / DLSS Balanced / DLSS Performance  *(NVIDIA-Plugin, falls verfügbar)*
- (optional FSR/XeSS Quality/Balanced/Performance als weitere Fallbacks)

**Logik:** Beim Start `DLSS Supported?` prüfen → falls nein, DLSS-Einträge ausgrauen und auf **TSR** defaulten. Mapping grob: Quality ≈ 67 %, Balanced ≈ 58 %, Performance ≈ 50 % Screen Percentage (TSR via `r.ScreenPercentage`; DLSS über Plugin-Mode-Enum).

---

## 6. Leitplanken (Wichtig)

- **Nicht** weiter blind in WebGL bauen; WebGL = Prototyp/Referenz.
- **Erst analysieren, dann gezielt** in UE5 aufbauen — kein chaotischer 1:1-Import.
- Atmosphäre konsequent halten: **Abendstunde, goldene Sonne, trocken, kein Regen, kein Neon-Kitsch.**
- Performance-Profiling **von Anfang an**, nicht erst am Ende.
- Nach jeder größeren Änderung testen: **FPS, Begehbarkeit, Clipping, Optik aus Spielersicht.**
- Vorhandene Dateien/Assets sauber wiederverwenden (siehe `ASSET_INVENTORY.md`), veraltete Duplikate vermeiden.
```
