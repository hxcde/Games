import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const BUILD = '2026.06.25.dusk.1';
document.getElementById('build').textContent = 'Build ' + BUILD;

// ----------------------------------------------------------------------------
// Renderer
// ----------------------------------------------------------------------------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // applied once by OutputPass
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 360);

// ----------------------------------------------------------------------------
// Blue-hour sky (dusk gradient) -> background + PBR environment reflections
// ----------------------------------------------------------------------------
function makeSkyTexture() {
  const w = 1024, h = 512;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#10203f');   // zenith deep blue
  grad.addColorStop(0.40, '#1c3358');
  grad.addColorStop(0.60, '#3a4f73');
  grad.addColorStop(0.72, '#8a6f7e');   // transition
  grad.addColorStop(0.82, '#d68a5a');   // warm horizon (sun afterglow)
  grad.addColorStop(0.90, '#9c6a52');
  grad.addColorStop(1.0, '#3a2c2e');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  // soft sun glow near horizon
  const sunX = 0.7*w, sunY = 0.84*h;
  const sg = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, 240);
  sg.addColorStop(0, 'rgba(255,210,150,0.9)'); sg.addColorStop(0.4, 'rgba(240,150,90,0.4)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.fillRect(0, 0, w, h);
  // faint high clouds
  g.globalAlpha = 0.06; g.fillStyle = '#cdd8ec';
  for (let i = 0; i < 40; i++) { const x = Math.random()*w, y = Math.random()*h*0.4, rw = 60+Math.random()*160, rh = 8+Math.random()*16;
    g.beginPath(); g.ellipse(x, y, rw, rh, 0, 0, Math.PI*2); g.fill(); }
  g.globalAlpha = 1;
  // a few early stars at the top
  g.fillStyle = '#dfe7ff';
  for (let i = 0; i < 70; i++) { g.globalAlpha = Math.random()*0.5+0.1; g.fillRect(Math.random()*w, Math.random()*h*0.3, 1.2, 1.2); }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const skyTex = makeSkyTexture();
scene.background = skyTex;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromEquirectangular(skyTex).texture;
scene.fog = new THREE.FogExp2(0x5a6680, 0.0125);   // bluish aerial haze

// ----------------------------------------------------------------------------
// Lights: low warm sun (shadows) + cool sky fill
// ----------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0x4a6390, 0x2a2622, 0.55));
const sun = new THREE.DirectionalLight(0xffb877, 2.3);
const SUN_OFF = new THREE.Vector3(48, 26, 34);   // low angle -> long shadows
sun.position.copy(SUN_OFF);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 200;
const SH = 55; sun.shadow.camera.left = -SH; sun.shadow.camera.right = SH; sun.shadow.camera.top = SH; sun.shadow.camera.bottom = -SH;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);

// dynamic warm point-light budget (street lamps, storefronts, car heads)
let lightBudget = 22;
const warmLights = [];
function addLight(color, x, y, z, intensity, dist) {
  if (lightBudget <= 0) return null;
  lightBudget--;
  const pl = new THREE.PointLight(color, intensity, dist, 2);
  pl.position.set(x, y, z); scene.add(pl);
  return pl;
}

// ----------------------------------------------------------------------------
// Wet asphalt: subtle reflector + rough overlay (recent-rain look)
// ----------------------------------------------------------------------------
function makeAsphalt() {
  const s = 512, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const g = cv.getContext('2d');
  g.fillStyle = '#3a3d44'; g.fillRect(0, 0, s, s);   // roughness base (matte)
  for (let i = 0; i < 70; i++) {   // puddles = smooth/dark = reflective
    const x = Math.random()*s, y = Math.random()*s, r = 16 + Math.random()*60;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.85)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(x-r, y-r, r*2, r*2);
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()*0.05})`; g.fillRect(Math.random()*s, Math.random()*s, 1, 1); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(28, 28); return t;
}
const WORLD = 600;
const reflector = new Reflector(new THREE.PlaneGeometry(WORLD, WORLD), {
  clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x6a7286,
});
reflector.rotation.x = -Math.PI / 2;
scene.add(reflector);
const asphaltMat = new THREE.MeshStandardMaterial({
  color: 0x121317, metalness: 0.6, roughness: 0.7, roughnessMap: makeAsphalt(),
  envMapIntensity: 0.5, transparent: true, opacity: 0.78,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), asphaltMat);
ground.rotation.x = -Math.PI / 2; ground.position.y = 0.01; ground.receiveShadow = true;
scene.add(ground);

// ----------------------------------------------------------------------------
// Facade materials: realistic glass curtain-wall + concrete, muted palette
// ----------------------------------------------------------------------------
const LIT = ['#ffd9a0', '#ffe9c4', '#cfe0ff', '#ffeede'];   // warm/cool interior lights
function paintWindows(gb, ge, w, h, cols, rows, glass) {
  const mx = glass ? 4 : 10, my = glass ? 5 : 11;
  const cw = (w - mx*(cols+1)) / cols, ch = (h - my*(rows+1)) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = mx + c*(cw+mx), y = my + r*(ch+my);
    const lit = Math.random() < 0.16;
    if (lit) {
      const col = LIT[Math.floor(Math.random()*LIT.length)];
      gb.fillStyle = col; gb.fillRect(x, y, cw, ch);
      ge.fillStyle = col; ge.fillRect(x, y, cw, ch);
      gb.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 4; k < ch; k += 5) gb.fillRect(x, y+k, cw, 1);
    } else {
      gb.fillStyle = glass ? '#1a2230' : '#0e1018'; gb.fillRect(x, y, cw, ch);
    }
  }
}
function makeFacade(glass, baseCol) {
  const w = 256, h = 256;
  const base = document.createElement('canvas'); base.width = w; base.height = h;
  const emis = document.createElement('canvas'); emis.width = w; emis.height = h;
  const gb = base.getContext('2d'), ge = emis.getContext('2d');
  gb.fillStyle = baseCol; gb.fillRect(0, 0, w, h);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, w, h);
  paintWindows(gb, ge, w, h, glass ? 6 : 5, glass ? 8 : 6, glass);
  const mk = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  return new THREE.MeshStandardMaterial({
    map: mk(base), emissiveMap: mk(emis), emissive: 0xffffff, emissiveIntensity: 1.0,
    color: 0xffffff,
    metalness: glass ? 0.1 : 0.0, roughness: glass ? 0.22 : 0.82,
    envMapIntensity: glass ? 1.25 : 0.45,
  });
}
const facadeMats = [
  makeFacade(true,  '#26344a'),   // blue glass
  makeFacade(true,  '#2c3340'),   // grey glass
  makeFacade(false, '#3b3c40'),   // light concrete
  makeFacade(false, '#2c2a2a'),   // dark concrete
  makeFacade(false, '#473f39'),   // warm concrete
];
const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.5, roughness: 0.75 });
const concreteMat = new THREE.MeshStandardMaterial({ color: 0x4a4b50, metalness: 0.0, roughness: 0.92 });
const curbMat = new THREE.MeshStandardMaterial({ color: 0x5a5b60, metalness: 0.0, roughness: 0.9 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.75, roughness: 0.5 });

// warm storefront band for the ground floor
function makeShop() {
  const w = 256, h = 80, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = '#141414'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    const x = 8 + i*62; const lit = Math.random() < 0.7;
    g.fillStyle = lit ? '#ffdca0' : '#20242c'; g.fillRect(x, 22, 50, 50);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x+25, 22, 2, 50);
    g.fillStyle = '#3a3026'; g.fillRect(x-2, 14, 54, 7);   // awning
  }
  const mk = () => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; };
  return new THREE.MeshStandardMaterial({ map: mk(), emissiveMap: mk(), emissive: 0xffffff, emissiveIntensity: 0.7, metalness: 0.2, roughness: 0.7 });
}
const shopMats = [makeShop(), makeShop(), makeShop()];

// ----------------------------------------------------------------------------
// City layout
// ----------------------------------------------------------------------------
const colliders = [];
const blinkers = [];
const N = 6, CELL = 30, ROAD = 11;
const half = N * CELL / 2;
const lineAt = k => -half + k * CELL;
const plotAt = i => -half + CELL/2 + i * CELL;
const PLOT = CELL - ROAD - 3;

const tankGeo = new THREE.CylinderGeometry(1.1, 1.1, 1.8, 12);
const ventGeo = new THREE.BoxGeometry(1.3, 0.9, 1.3);
const antGeo = new THREE.CylinderGeometry(0.06, 0.06, 4, 6);
const blinkGeo = new THREE.SphereGeometry(0.16, 8, 8);

function tileWindows(geo, w, h, d, unit = 3.4) {
  const uv = geo.attributes.uv;
  const rh = Math.max(1, Math.round(h/unit)), rd = Math.max(1, Math.round(d/unit)), rw = Math.max(1, Math.round(w/unit));
  const sf = (f, ru, rv) => { for (let k = 0; k < 4; k++) { const i = f*4+k; uv.setXY(i, uv.getX(i)*ru, uv.getY(i)*rv); } };
  sf(0, rd, rh); sf(1, rd, rh); sf(4, rw, rh); sf(5, rw, rh);
  uv.needsUpdate = true;
}

function buildTower(cx, cz, footprint, totalH) {
  const group = new THREE.Group();
  const fmat = facadeMats[Math.floor(Math.random()*facadeMats.length)];

  const shopH = 2.7;
  const shopMat = shopMats[Math.floor(Math.random()*shopMats.length)];
  const shopGeo = new THREE.BoxGeometry(footprint+0.3, shopH, footprint+0.3);
  const su = shopGeo.attributes.uv;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i=f*4+k; su.setX(i, su.getX(i)*Math.max(1, Math.round(footprint/4))); }
  su.needsUpdate = true;
  const shop = new THREE.Mesh(shopGeo, [shopMat, shopMat, roofMat, roofMat, shopMat, shopMat]);
  shop.position.y = shopH/2; shop.castShadow = true; shop.receiveShadow = true; group.add(shop);

  let y = shopH, fw = footprint, remaining = totalH - shopH;
  const segs = 1 + Math.floor(Math.random()*3);
  for (let s = 0; s < segs; s++) {
    const segH = s === segs-1 ? remaining : remaining*(0.4 + Math.random()*0.3);
    remaining -= segH;
    const geo = new THREE.BoxGeometry(fw, segH, fw);
    tileWindows(geo, fw, segH, fw);
    const m = new THREE.Mesh(geo, [fmat, fmat, roofMat, roofMat, fmat, fmat]);
    m.position.y = y + segH/2; m.castShadow = true; m.receiveShadow = true; group.add(m);
    y += segH; fw *= 0.74 + Math.random()*0.12;
    if (remaining <= 1) break;
  }
  const roofY = y, rh = fw/2;
  const rr = r => (Math.random()*2-1)*r*0.6;
  if (Math.random() < 0.85) { const t = new THREE.Mesh(tankGeo, darkMetal); t.position.set(rr(rh), roofY+0.9, rr(rh)); t.castShadow = true; group.add(t); }
  for (let v = 0; v < 1 + (Math.random()*2|0); v++) { const vt = new THREE.Mesh(ventGeo, darkMetal); vt.position.set(rr(rh), roofY+0.45, rr(rh)); vt.castShadow = true; group.add(vt); }
  if (totalH > 32 && Math.random() < 0.8) {
    const ant = new THREE.Mesh(antGeo, darkMetal); ant.position.set(rr(rh*0.5), roofY+2, rr(rh*0.5)); group.add(ant);
    const blink = new THREE.Mesh(blinkGeo, new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    blink.position.set(ant.position.x, roofY+4, ant.position.z); group.add(blink);
    blinkers.push({ mesh: blink, phase: Math.random()*Math.PI*2 });
  }

  group.position.set(cx, 0, cz); scene.add(group);
  colliders.push({ minX: cx-footprint/2, maxX: cx+footprint/2, minZ: cz-footprint/2, maxZ: cz+footprint/2 });
}

function addSidewalk(cx, cz, size) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), concreteMat);
  slab.position.set(cx, 0.1, cz); slab.receiveShadow = true; scene.add(slab);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(size+0.5, 0.26, size+0.5), curbMat);
  curb.position.set(cx, 0.13, cz); curb.receiveShadow = true; scene.add(curb);
}

const spawnI = N>>1, spawnJ = N>>1;
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const cx = plotAt(i), cz = plotAt(j);
  addSidewalk(cx, cz, CELL - ROAD);
  if (i === spawnI && j === spawnJ) continue;
  const split = Math.random() < 0.35;
  if (split) {
    const fp = (PLOT-2)/2, off = fp/2 + 1.2;
    buildTower(cx-off, cz-off, fp, 9 + Math.random()*26);
    buildTower(cx+off, cz+off, fp, 9 + Math.random()*26);
  } else buildTower(cx, cz, PLOT, 12 + Math.random()*Math.random()*58);

  // occasional warm storefront light spill
  if (lightBudget > 0 && Math.random() < 0.4) addLight(0xffca88, cx + (Math.random()-0.5)*PLOT, 2.2, cz + (Math.random()-0.5)*PLOT, 3, 12);
}

// ----------------------------------------------------------------------------
// Road markings (realistic white) + crosswalks
// ----------------------------------------------------------------------------
const markMat = new THREE.MeshStandardMaterial({ color: 0xcfd2cf, roughness: 0.7, metalness: 0.0, emissive: 0x222222, emissiveIntensity: 0.4 });
function makeDash() { const w = 8, h = 64, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.clearRect(0,0,w,h); g.fillStyle = '#e8e8e0'; g.fillRect(3, 8, 3, 30); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const dashTex = makeDash();
const roadLen = N*CELL + ROAD;
function addRoad(isX, c) {
  const dt = dashTex.clone(); dt.repeat.set(1, roadLen/4);
  const center = new THREE.Mesh(new THREE.PlaneGeometry(0.16, roadLen),
    new THREE.MeshStandardMaterial({ map: dt, transparent: true, roughness: 0.7, emissive: 0x111111, emissiveIntensity: 0.3 }));
  center.rotation.x = -Math.PI/2; center.position.y = 0.022;
  const edge = off => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, roadLen), markMat); m.rotation.x = -Math.PI/2; m.position.y = 0.022;
    if (isX) { m.rotation.z = Math.PI/2; m.position.set(0, 0.022, c+off); } else m.position.set(c+off, 0.022, 0); scene.add(m); };
  if (isX) { center.rotation.z = Math.PI/2; center.position.set(0, 0.022, c); } else center.position.set(c, 0.022, 0);
  scene.add(center); edge(ROAD/2 - 0.5); edge(-ROAD/2 + 0.5);
}
for (let k = 0; k <= N; k++) { addRoad(false, lineAt(k)); addRoad(true, lineAt(k)); }

// crosswalk: zebra band near each side of every intersection
function makeCrosswalk() {
  const s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s; const g = cv.getContext('2d');
  g.clearRect(0,0,s,s); g.fillStyle = '#dcdcd2';
  const band = 22;
  for (let x = 6; x < s-6; x += 12) { g.fillRect(x, 2, 6, band); g.fillRect(x, s-band-2, 6, band); }   // top & bottom
  for (let y = 6; y < s-6; y += 12) { g.fillRect(2, y, band, 6); g.fillRect(s-band-2, y, band, 6); }     // left & right
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const crossTex = makeCrosswalk();
const crossMat = new THREE.MeshStandardMaterial({ map: crossTex, transparent: true, roughness: 0.7, emissive: 0x161616, emissiveIntensity: 0.3 });
const crossGeo = new THREE.PlaneGeometry(ROAD, ROAD);
for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) {
  const m = new THREE.Mesh(crossGeo, crossMat); m.rotation.x = -Math.PI/2; m.position.set(lineAt(a), 0.024, lineAt(b)); scene.add(m);
}

// street lamps along roads (warm, turning on at dusk)
const lampPole = new THREE.CylinderGeometry(0.08, 0.1, 5, 8);
const lampArm = new THREE.BoxGeometry(1.4, 0.12, 0.12);
const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe7b0, emissive: 0xffcaa0, emissiveIntensity: 2.2 });
function addLamp(x, z, dirX) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(lampPole, darkMetal); pole.position.y = 2.5; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(lampArm, darkMetal); arm.position.set(dirX*0.7, 4.9, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.4), bulbMat); head.position.set(dirX*1.4, 4.8, 0); g.add(head);
  g.position.set(x, 0, z); scene.add(g);
  addLight(0xffc98a, x + dirX*1.4, 4.6, z, 4.5, 16);
}
for (let k = 0; k <= N; k++) {
  for (let i = 0; i < N; i++) {
    if (lightBudget <= 2) break;
    if (Math.random() < 0.5) addLamp(lineAt(k) + ROAD/2 + 1.2, plotAt(i), -1);
    if (Math.random() < 0.5) addLamp(plotAt(i), lineAt(k) + ROAD/2 + 1.2, 1);
  }
}

// ----------------------------------------------------------------------------
// Cars (realistic) driving the road grid
// ----------------------------------------------------------------------------
const CAR_PAINT = [0xd6d8dc, 0x16181c, 0x6b7079, 0x7a232f, 0x24405e, 0x2c3a2c, 0x9a8f80, 0xb5b8bd];
const carBodyGeo = new THREE.BoxGeometry(1.8, 0.5, 4.1);
const carHoodGeo = new THREE.BoxGeometry(1.7, 0.16, 1.2);
const carCabinGeo = new THREE.BoxGeometry(1.62, 0.55, 1.9);
const carGlass = new THREE.MeshStandardMaterial({ color: 0x10151c, metalness: 0.6, roughness: 0.12, envMapIntensity: 1.2 });
const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.1, roughness: 0.85 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.3 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xfff0cc, emissiveIntensity: 3 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0xff4040, emissive: 0xff1818, emissiveIntensity: 2.2 });
const cars = [];
const LANE = 2.7;
let carHeadBudget = 6;

function makeCar() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: CAR_PAINT[Math.floor(Math.random()*CAR_PAINT.length)], metalness: 0.7, roughness: 0.32, envMapIntensity: 1.0 });
  const body = new THREE.Mesh(carBodyGeo, paint); body.position.y = 0.62; body.castShadow = true; g.add(body);
  const hood = new THREE.Mesh(carHoodGeo, paint); hood.position.set(0, 0.9, 1.2); g.add(hood);
  const cabin = new THREE.Mesh(carCabinGeo, carGlass); cabin.position.set(0, 1.08, -0.25); cabin.castShadow = true; g.add(cabin);
  for (const [wx, wz] of [[-0.92,1.3],[0.92,1.3],[-0.92,-1.3],[0.92,-1.3]]) {
    const wh = new THREE.Mesh(wheelGeo, tireMat); wh.rotation.z = Math.PI/2; wh.position.set(wx, 0.36, wz); g.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.3,8), hubMat); hub.rotation.z = Math.PI/2; hub.position.set(wx, 0.36, wz); g.add(hub);
  }
  for (const sx of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.16), headMat); hl.position.set(sx, 0.62, 2.06); g.add(hl);
    const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), tailMat); tl.position.set(sx, 0.66, -2.06); tl.rotation.y = Math.PI; g.add(tl);
  }
  if (carHeadBudget > 0) { carHeadBudget--; const hp = new THREE.PointLight(0xfff0d0, 2.0, 16, 2); hp.position.set(0, 0.7, 3.2); g.add(hp); }
  scene.add(g); return g;
}
function neighbors(i, j) { const o = []; if (i>0) o.push([i-1,j]); if (i<N) o.push([i+1,j]); if (j>0) o.push([i,j-1]); if (j<N) o.push([i,j+1]); return o; }
function nodePos(i, j) { return new THREE.Vector3(lineAt(i), 0, lineAt(j)); }
function spawnCar() {
  const g = makeCar();
  const i = Math.floor(Math.random()*(N+1)), j = Math.floor(Math.random()*(N+1));
  const nb = neighbors(i, j); const [ni, nj] = nb[Math.floor(Math.random()*nb.length)];
  cars.push({ g, fi: i, fj: j, ti: ni, tj: nj, t: Math.random(), speed: 6 + Math.random()*7 });
}
for (let n = 0; n < 16; n++) spawnCar();

function stepCars(dt) {
  const from = new THREE.Vector3(), to = new THREE.Vector3(), dir = new THREE.Vector3();
  for (const car of cars) {
    from.copy(nodePos(car.fi, car.fj)); to.copy(nodePos(car.ti, car.tj));
    let segLen = Math.max(0.001, from.distanceTo(to));
    car.t += (car.speed*dt)/segLen;
    while (car.t >= 1) {
      car.t -= 1; const pfi = car.fi, pfj = car.fj; car.fi = car.ti; car.fj = car.tj;
      let opts = neighbors(car.fi, car.fj).filter(([a,b]) => !(a===pfi && b===pfj));
      if (!opts.length) opts = neighbors(car.fi, car.fj);
      const [ni, nj] = opts[Math.floor(Math.random()*opts.length)]; car.ti = ni; car.tj = nj;
      from.copy(nodePos(car.fi, car.fj)); to.copy(nodePos(car.ti, car.tj));
    }
    dir.subVectors(to, from).normalize();
    const right = new THREE.Vector3(dir.z, 0, -dir.x);
    const pos = from.clone().lerp(to, car.t).addScaledVector(right, LANE);
    car.g.position.set(pos.x, 0, pos.z);
    car.g.rotation.y = Math.atan2(dir.x, dir.z);
  }
}

// ----------------------------------------------------------------------------
// Light drizzle (recent rain)
// ----------------------------------------------------------------------------
const RAIN_N = 900, RAIN_R = 36;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N*3), rainVel = new Float32Array(RAIN_N);
for (let i = 0; i < RAIN_N; i++) { rainPos[i*3] = (Math.random()-0.5)*RAIN_R*2; rainPos[i*3+1] = Math.random()*30; rainPos[i*3+2] = (Math.random()-0.5)*RAIN_R*2; rainVel[i] = 20 + Math.random()*16; }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaebed6, size: 0.045, transparent: true, opacity: 0.32, depthWrite: false }));
scene.add(rain);

// ----------------------------------------------------------------------------
// Post-processing: gentle bloom only on the brightest highlights
// ----------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.28, 0.4, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ----------------------------------------------------------------------------
// Controls + movement
// ----------------------------------------------------------------------------
const EYE = 1.7;
camera.position.set(lineAt(spawnI), EYE, lineAt(spawnJ) + 3);
const controls = new PointerLockControls(camera, renderer.domElement);
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });

const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const playBtn = document.getElementById('play');
const isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
function startGame() { overlay.classList.add('hidden'); hud.classList.add('playing'); if (!isTouch) controls.lock(); if (isTouch) document.getElementById('touch').style.display = 'block'; }
playBtn.addEventListener('click', startGame);
controls.addEventListener('unlock', () => { if (!isTouch) { overlay.classList.remove('hidden'); hud.classList.remove('playing'); } });

const vel = new THREE.Vector3(), dir = new THREE.Vector3();
const PLAYER_R = 0.55;
function resolveCollisions(pos) {
  for (const b of colliders) {
    const minX = b.minX-PLAYER_R, maxX = b.maxX+PLAYER_R, minZ = b.minZ-PLAYER_R, maxZ = b.maxZ+PLAYER_R;
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      const dxL = pos.x-minX, dxR = maxX-pos.x, dzL = pos.z-minZ, dzR = maxZ-pos.z;
      const m = Math.min(dxL, dxR, dzL, dzR);
      if (m === dxL) pos.x = minX; else if (m === dxR) pos.x = maxX; else if (m === dzL) pos.z = minZ; else pos.z = maxZ;
    }
  }
  const lim = half + CELL;
  pos.x = Math.max(-lim, Math.min(lim, pos.x)); pos.z = Math.max(-lim, Math.min(lim, pos.z));
}

let moveX = 0, moveY = 0, lookId = null, lastLX = 0, lastLY = 0, stickId = null, stickCx = 0, stickCy = 0, yaw = 0, pitch = 0;
const touchEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const stick = document.getElementById('stick'), nub = document.getElementById('nub');
if (isTouch) {
  document.body.classList.add('touch');
  stick.addEventListener('touchstart', e => { const t = e.changedTouches[0]; stickId = t.identifier; const r = stick.getBoundingClientRect(); stickCx = r.left+r.width/2; stickCy = r.top+r.height/2; e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => { for (const t of e.changedTouches) {
    if (t.identifier === stickId) { let dx = t.clientX-stickCx, dy = t.clientY-stickCy; const max = 46, d = Math.hypot(dx, dy); if (d>max){dx*=max/d; dy*=max/d;} nub.style.transform = `translate(${dx}px,${dy}px)`; moveX = dx/max; moveY = dy/max; }
    else if (t.identifier === lookId) { yaw -= (t.clientX-lastLX)*0.004; pitch -= (t.clientY-lastLY)*0.004; lastLX = t.clientX; lastLY = t.clientY; pitch = Math.max(-1.2, Math.min(1.2, pitch)); } } }, { passive: false });
  addEventListener('touchstart', e => { for (const t of e.changedTouches) if (t.identifier !== stickId && lookId === null && t.clientX > innerWidth*0.35) { lookId = t.identifier; lastLX = t.clientX; lastLY = t.clientY; } }, { passive: false });
  addEventListener('touchend', e => { for (const t of e.changedTouches) { if (t.identifier === stickId) { stickId = null; moveX = moveY = 0; nub.style.transform = ''; } if (t.identifier === lookId) lookId = null; } });
}

// ----------------------------------------------------------------------------
// Loop
// ----------------------------------------------------------------------------
const clock = new THREE.Clock();
let bob = 0, fpsFrames = 0, fpsTime = 0;
const fpsEl = document.getElementById('fps');

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const playing = hud.classList.contains('playing');

  if (playing) {
    const sprint = (keys['ShiftLeft'] || keys['ShiftRight']) ? 1.9 : 1;
    const speed = 4.4*sprint;
    let fwd = 0, str = 0;
    if (keys['KeyW'] || keys['ArrowUp']) fwd += 1;
    if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) str += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) str -= 1;
    if (isTouch) { fwd += -moveY; str += moveX; touchEuler.set(pitch, yaw, 0, 'YXZ'); camera.quaternion.setFromEuler(touchEuler); }
    dir.set(0, 0, 0);
    const moving = fwd || str;
    if (moving) {
      camera.getWorldDirection(vel); vel.y = 0; vel.normalize();
      const right = new THREE.Vector3().crossVectors(vel, camera.up).normalize();
      dir.addScaledVector(vel, fwd).addScaledVector(right, str);
      if (dir.lengthSq() > 0) dir.normalize();
    }
    const pos = camera.position;
    pos.addScaledVector(dir, speed*dt); resolveCollisions(pos);
    if (moving) { bob += dt*speed*1.6; pos.y = EYE + Math.sin(bob)*0.055; } else pos.y += (EYE-pos.y)*0.1;
  }

  // keep shadow frustum tight around the player for crisp shadows
  sun.position.copy(camera.position).add(SUN_OFF);
  sun.target.position.copy(camera.position);
  sun.target.updateMatrixWorld();

  stepCars(dt);
  for (const b of blinkers) b.mesh.visible = Math.sin(t*3 + b.phase) > 0.3;

  const rp = rainGeo.attributes.position.array;
  for (let i = 0; i < RAIN_N; i++) { rp[i*3+1] -= rainVel[i]*dt; if (rp[i*3+1] < 0) { rp[i*3+1] = 26+Math.random()*6; rp[i*3] = camera.position.x+(Math.random()-0.5)*RAIN_R*2; rp[i*3+2] = camera.position.z+(Math.random()-0.5)*RAIN_R*2; } }
  rainGeo.attributes.position.needsUpdate = true;

  composer.render();
  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 0.5) { fpsEl.textContent = Math.round(fpsFrames/fpsTime) + ' FPS'; fpsFrames = 0; fpsTime = 0; }
}
animate();

addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });

document.getElementById('loading').style.display = 'none';
playBtn.style.display = 'inline-block';
window.__game = { scene, camera, renderer, colliders, cars };
