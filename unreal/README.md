# SunsetBlock — Unreal Engine 5 Projekt (Skelett)

Dies ist das **Ordnergerüst** für den UE5-Neuaufbau (siehe `docs/UE5_MIGRATION.md`).
Die eigentlichen Binärdateien (`SunsetBlock.uproject`, `.umap`, `.uasset`,
Material-/Blueprint-Graphen) werden **im Unreal-Editor** auf einem Windows-PC
mit GPU angelegt — diese (Linux/headless) Umgebung kann UE5 nicht ausführen.

## Setup (am PC)
1. UE 5.4+ installieren, neues Projekt `SunsetBlock` (Third/First Person, Blueprint).
2. Plugins: NVIDIA DLSS (falls verfügbar), FSR/XeSS (Fallback), Nanite/Lumen (Standard).
3. Diese `Content/`-Struktur im Editor spiegeln (Ordner sind hier als Referenz angelegt).
4. Assets importieren laut `docs/ASSET_INVENTORY.md`, Layout/Licht laut `docs/DESIGN_REFERENCE.md`.

## Empfohlene Projekteinstellungen
- RHI: DirectX 12, Shader Model 6.
- Lumen GI + Reflections, Virtual Shadow Maps, Mesh Distance Fields an.
- Default AA/Upscaling: TSR (Fallback), DLSS via Plugin wenn vorhanden.

> Der Three.js-Stand (Repo-Wurzel) bleibt als **Prototyp / visuelle Referenz** erhalten.
