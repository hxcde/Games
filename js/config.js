// Small island city: a grid of streets with blocks for buildings, a park and a
// multi-storey car park. Night-leaning golden hour (sun just above the sea).
export const ROAD_HALF = 4.5;                 // half carriageway
export const SIDEWALK = 3.5;                  // sidewalk width
export const FRONT = ROAD_HALF + SIDEWALK;    // block frontage offset from a road centre (8.0)
export const ROADS = [-40, 0, 40];            // road centre-lines on both axes
export const ISLAND = 78;                     // island half-size
export const WATER_Y = -1.4;                  // sea level
export const SUN_DIR = { x: 0.34, y: 0.20, z: -1 };   // low dusk sun toward -Z (long shadows, still up)

// Block strips between roads (and out to the island edge) on one axis.
export function blockStrips() {
  const bounds = [-ISLAND, ISLAND];
  for (const r of ROADS) { bounds.push(r - FRONT, r + FRONT); }
  bounds.sort((a, b) => a - b);
  const strips = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i], b = bounds[i+1], mid = (a + b) / 2;
    const onRoad = ROADS.some(r => mid > r - FRONT - 0.01 && mid < r + FRONT + 0.01);
    if (!onRoad && b - a > 2) strips.push([a, b]);
  }
  return strips; // e.g. [-78,-48],[-32,-8],[8,32],[48,78]
}
