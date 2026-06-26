# Sunset Block — Asset-Inventar (Prototyp → Unreal Engine 5)

Was aus dem Three.js-Prototyp **direkt importierbar** ist und was **neu** gebaut wird.
Quelle-Ordner: `assets/` (Modelle/Texturen), `js/` (prozedurale Geometrie = nur Code).

---

## A) Direkt nach UE5 übernehmbar (glTF / Texturen)

### Modelle (glTF → UE5 Interchange/glTF-Import)
| Datei | Inhalt | UE5-Import | Hinweis |
|---|---|---|---|
| `assets/models/Soldier.glb` | gerigte Figur + Anims (Idle/Walk/Run) | Skeletal Mesh + Animationen | Platzhalter-NPC; für Final ggf. MetaHuman. **Lizenz vor Release prüfen** (three.js-Beispiel). |
| `assets/models/island_tree_02.glb` | Baum (Photogrammetrie, dezimiert + meshopt) | Static Mesh (Nanite) | Für UE besser die **Original-Auflösung** neu von Poly Haven laden (Nanite verträgt High-Poly) statt der web-dezimierten Version. |

### Texturen (PBR, kacheln) — Poly Haven, **CC0**
`assets/textures/<slug>/` mit `diff.jpg` (sRGB), `nor.jpg` (Normal GL), `rough.jpg`:
- `asphalt_02`, `concrete_wall_008`, `concrete_floor_worn_001`, `pavement_02`,
  `aerial_grass_rock`, `metal_plate_02`, `rusty_metal_03`, `waternormals.jpg`
- **UE-Import:** Normal als „Normal Map" (GL→evtl. Grün invertieren), Roughness als Linear/Masks-Gruppe, Diff als sRGB. Für Final gern 2K/4K-Originale neu von polyhaven.com ziehen (CC0).

### Gebäude-Fassaden — ambientCG, **CC0**
`assets/textures/FacadeXXX/` mit `diff/nor/rough` (+ teils `emis.jpg` für beleuchtete Fenster):
- `Facade001, 002, 003, 006, 009, 012, 014, 018A, 019A, 020A`
- **UE-Nutzung:** als `M_Facade`-Instanzen (BaseColor/Normal/Roughness + Emissive-Maske für Fensterlicht, Tint pro Gebäude). Höher aufgelöst (2K/4K, inkl. AO/Displacement) direkt bei ambientcg.com nachladbar (CC0).

> **Wichtig:** Beim Import keine Duplikate anlegen — pro Textur-Set **ein** Master/Instanz-Material in `Content/Materials`.

---

## B) Neu aufbauen in UE5 (Prototyp ist nur Code-Geometrie)

Diese Dinge sind im Prototyp prozedurale Box/Cylinder/Plane-Meshes (`js/city.js`,
`js/agents.js`) — **nicht exportierbar**, daher in UE **modular neu**:

- **Gebäude** (Blocks, Setbacks, Dach-Props) → `SM_Building_*` modular + Fassaden-Material.
- **Straße/Gehweg/Bordstein/Gully** → modulare Tiles + Decals (`M_Ground`, `M_Decal_*`).
- **Ebenen:** Plaza-Terrasse (Podium), Fußgänger-Überführung, Treppen → modulare Meshes **mit Collision**.
- **Parkhaus** (Decks, Säulen, Rampe, Schild) → modulares Kit.
- **Props:** Klimaanlagen, Rohre, Kabel, Schilder/Hängeschilder, Mülltonnen, Kartons, Hydranten, Bänke, Automaten, Werbescreens, Terminal → Static Meshes als **Instanced Static Mesh**.
- **Fahrzeuge:** Auto/Lieferwagen/E-Bike → modulare Meshes + `M_CarPaint/Glass/Tire/Chrome` (Prototyp-Boxen nur als Proportions-Referenz).
- **Skyline** (ferne Türme), **Wasserfläche**, **Dampf/Staub** (Niagara).

---

## C) Logik/Daten als Referenz (nicht importieren, nachbauen)
- **Layout/Maße/Positionen:** `docs/DESIGN_REFERENCE.md` (Raster, Blocktypen, Shop- & Interaktions-Positionen, Ebenen, Licht).
- **Fahrverhalten:** Autos fahren im Prototyp Node-zu-Node auf den Straßen-Mittellinien → in UE Spline-/Punkt-Bewegung.
- **Interaktion/Dialoge:** Prompt-+Dialog-Texte (Werbescreen, Terminal, Tür, Händler) aus `js/city.js`/`js/agents.js` übernehmbar als Datatable.

---

## D) Lizenzen (vor Release verifizieren)
- **Poly Haven** (Texturen, Baum): **CC0** — frei nutzbar.
- **ambientCG** (Fassaden): **CC0** — frei nutzbar.
- **three.js** (Loader/Engine): MIT. **`Soldier.glb`**: aus three.js-Beispielen — Herkunft/Lizenz der Figur vor kommerziellem Release prüfen; sicherer: eigener Charakter / MetaHuman.
- Für UE5: NVIDIA **DLSS/Streamline**-Plugin und FSR/XeSS unterliegen ihren eigenen Lizenzen (kostenlos nutzbar, Attribution beachten).
