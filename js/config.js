// Shared scene dimensions (metres). The street runs along Z; sun sets over the
// water at the -Z (south) end so it rakes down the canyon at golden hour.
export const ROAD_HALF = 4.5;                 // half carriageway width
export const SIDEWALK = 3.6;                  // sidewalk width
export const STREET_HALF = ROAD_HALF + SIDEWALK; // building frontage line (X = ±8.1)
export const Z_MIN = -52, Z_MAX = 52;         // street extent
export const ISLAND_X = 30;                   // island half-width
export const ISLAND_Z = 60;                   // island half-depth
export const WATER_Y = -1.4;                  // sea level (island sits above it)
export const SUN_DIR = { x: 0.34, y: 0.20, z: -1 };  // toward the low sun (-Z, low)
