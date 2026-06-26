# SunsetBlock — UE5 Editor-Anleitung (Schritte 1–4)

Konkrete Klick-Pfade für den Einstieg. Voraussetzung: **Unreal Engine 5.4+**,
Windows-PC mit GPU, Visual Studio (für C++). Werte stammen aus
`../docs/DESIGN_REFERENCE.md` (Prototyp-Meter → UE: **× 100**, da UE in cm rechnet).

Mitgeliefert in diesem Ordner:
- `SunsetBlock.uproject` + `Source/…` — C++-Modul mit `ASunsetCharacter`,
  `UInteractableComponent`, `USunsetGameUserSettings`, DataTable-Structs.
- `Content/Data/*.csv` — Shops, Interaktionen, NPC-Spawns.

---

## Schritt 1 — Projekt anlegen & C++/Daten einhängen
1. **Epic Launcher → Unreal Engine 5.4 starten.** Neues Projekt: *Games →
   First Person* (oder Third Person), **C++**, Name **`SunsetBlock`**,
   Qualität *Maximum*, *Starter Content: aus*, *Raytracing: optional*.
2. Editor schließen. Den mitgelieferten Ordner `Source/` und
   `SunsetBlock.uproject` in dein Projekt kopieren/zusammenführen (überschreibt
   den generierten Stub-Source). Rechtsklick `.uproject` → **Generate Visual
   Studio project files** → in VS **Build**.
3. **Plugins** (Edit → Plugins): *Enhanced Input* (an), und falls vorhanden
   **NVIDIA DLSS** + *FSR/XeSS*. Danach in `Source/SunsetBlock/SunsetBlock.Build.cs`
   die DLSS-Zeile einkommentieren und neu builden.
4. **Project Settings → Maps & Modes:** GameMode mit Default Pawn =
   `BP_PlayerCharacter` (von `ASunsetCharacter` ableiten).
5. **Project Settings → Rendering:** *Default RHI = DirectX 12*, *SM6*,
   *Lumen* (GI + Reflections), *Virtual Shadow Maps*, *Generate Mesh Distance Fields = an*.
6. **Enhanced Input Assets:** `IMC_Default` (InputMappingContext) + `IA_Move`
   (Axis2D), `IA_Look` (Axis2D), `IA_Jump`, `IA_Sprint`, `IA_Interact` anlegen
   und im `BP_PlayerCharacter` in den Defaults zuweisen.
7. **DataTables importieren:** `Content/Data/*.csv` in den Editor ziehen → Row
   Type: `ShopRow` / `InteractionRow` / `NpcSpawnRow` (die mitgelieferten Structs).

---

## Schritt 2 — Straße blockouten (Layout aus der Referenz)
1. Neues Level **`L_SunsetBlock`** (File → New Level → *Empty Open World* oder *Basic*).
2. Maßstab: **1 m = 100 uu**. Insel-Halbgröße 78 m → **7800 uu**.
3. **Straßen-Mittellinien** bei **X/Z = −4000, 0, 4000 uu** (Prototyp −40/0/40 m).
   Fahrbahn-Halbbreite 450 uu, Gehweg 350 uu, Blockfront ab Straßenmitte 800 uu.
4. Mit *Cube*-Brushes/StaticMesh-Cubes die **Blöcke** setzen
   (`[-7800,-4800]`, `[-3200,-800]`, `[800,3200]`, `[4800,7800]` je Achse).
   Blocktypen markieren: **Plaza** (1,1), **Park** (2,1), **Parkhaus** (1,2),
   Rest Gebäude (siehe Referenz §1).
5. **Wasser** (Single Layer Water/Plane) bei Z = −140 uu rundum; auf **einer
   Seite (+X)** ferne Türme als grobe Boxen (später Skyline-Kit) im Dunst.
6. Spieler-Start (PlayerStart) bei (0, 170, 3400) uu, Blick nach **−Z** (zur Sonne/Wasser).

---

## Schritt 3 — Begehbare Ebenen mit Collision (der Prototyp-Bug)
1. **Plaza-Terrasse:** Cube X[−2900,−1700] Z[−2900,−1700], Höhe **300 uu**;
   *Collision Preset = BlockAll*. Treppe auf +Z-Seite (Mesh + Rampen-Collider).
2. **Fußgänger-Überführung:** Deck über die Hauptstraße bei Z = −1800 uu,
   X[−1100,1100], Höhe **520 uu**, Treppen an beiden Enden.
3. **Treppen:** entweder echte Stufen ≤ `MaxStepHeight` (im Character 45 uu)
   **oder** eine unsichtbare Rampe darunter (Collision an, Visibility aus →
   *Actor Hidden In Game*). Steigung ≤ `Walkable Floor Angle` (50°).
4. **NavMesh:** *NavMeshBoundsVolume* über alle Geh-Flächen ziehen; `P` drücken
   → grüne Fläche = begehbar für NPCs.
5. **Test:** Konsole `show Collision`; PIE durchlaufen — jede sichtbare Fläche
   muss begehbar sein, **keine** unsichtbaren Wände auf Wegen. Gassen mind.
   ~150–200 uu breiter als der Capsule-Durchmesser (Radius 40 uu).

---

## Schritt 4 — Goldene Abendsonne (Licht)
1. **Directional Light** = Sonne: *Mobility = Movable*, Farbe warm (~`#FFB163`),
   Intensity ~6–8 lux-äquiv., **Rotation Pitch ≈ −11°** (tief), Yaw so, dass die
   Sonne die Hauptstraße längs anstrahlt → lange Schatten. *Cast Shadows = an*
   (Virtual Shadow Maps).
2. **Sky Atmosphere** + **Sky Light** (*Real Time Capture* an) für Himmel/Indirekt.
3. **Exponential Height Fog:** Dichte niedrig, Farbe blau-grau (~`#4E5577`),
   *Volumetric Fog = an* (dezent, für Lichtschächte). **Kein** Regen/Nässe.
4. **Post Process Volume** (*Infinite Extent = an*):
   - *Exposure:* Metering = *Manual*, EV ~ so, dass es der Prototyp-Belichtung
     (ACES, Exposure 1.16) entspricht — kein Auto-Exposure-Pumpen.
   - *Bloom:* Intensity niedrig (~0.3-Äquiv.).
   - *Color Grading:* warmer Tint, leichte Sättigung, dezente Vignette, feines Korn.
5. **Test (Optik):** PIE bei goldener Stunde — warm, trocken, lange Schatten,
   ferne Skyline als Dunst-Silhouette.

---

## Danach (Kurzüberblick, Details in `../docs/UE5_MIGRATION.md`)
- **Schritt 5–8:** Bodenmaterialien (M_Ground + Decals) → Shops/Fußgängerzone
  (Shop-Kits + DataTable-Spawner) → Fahrzeuge (M_CarPaint/Glass/Tire) → NPCs
  (BP_NPC_Pedestrian auf NavMesh + Spawn aus `NPCSpawns.csv`).
- **Schritt 9 (Settings):** `WBP_GraphicsMenu` baut auf `USunsetGameUserSettings`
  auf: Presets `ApplyQualityPreset(Low/Medium/High/Ultra)` und Upscaling
  `SetUpscaleMode(...)`. **DLSS** im Widget über die Plugin-Nodes
  (`IsDLSSSupported`, `SetDLSSMode`) implementieren — sonst greift automatisch
  der **TSR-Fallback** aus `ApplyUpscale()`.
- **Schritt 10 (Perf):** `stat unit`, `stat GPU`, `ProfileGPU`, Unreal Insights;
  nach jeder Änderung gegen das FPS-Budget prüfen.

## Checkliste nach jeder größeren Änderung
1. **FPS** (`stat unit`) → 2. **Begehbarkeit** (`show Collision`, PIE) →
3. **Clipping** (Bäume/Props/Schilder nicht in Wänden) → 4. **Optik aus Spielersicht**.
