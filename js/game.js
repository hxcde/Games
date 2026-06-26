import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const BUILD = '2026.06.25.world.1';
document.getElementById('build').textContent = 'Build ' + BUILD;

// ----------------------------------------------------------------------------
// Renderer
// ----------------------------------------------------------------------------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // applied once by OutputPass
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 320);

// ----------------------------------------------------------------------------
// Sky / environment (procedural equirect night sky -> background + PBR env)
// ----------------------------------------------------------------------------
function makeSkyTexture() {
  const w = 1024, h = 512;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#04050d');
  grad.addColorStop(0.45, '#0a0a1c');
  grad.addColorStop(0.62, '#1a0f2e');
  grad.addColorStop(0.74, '#3a1644');   // horizon city glow
  grad.addColorStop(0.8, '#120a1e');
  grad.addColorStop(1.0, '#050509');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);

  // light-pollution glow blobs near the horizon
  const blobs = [['#ff4fa3', 0.78, 0.12], ['#4fd8ff', 0.74, 0.5], ['#b06bff', 0.8, 0.82], ['#ffae5e', 0.76, 0.32]];
  for (const [col, yy, xx] of blobs) {
    const rg = g.createRadialGradient(xx*w, yy*h, 0, xx*w, yy*h, 150);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.2; g.fillStyle = rg; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
  }
  // stars
  g.fillStyle = '#cdd8ff';
  for (let i = 0; i < 260; i++) {
    const x = Math.random()*w, y = Math.random()*h*0.5;
    const s = Math.random()*1.4;
    g.globalAlpha = Math.random()*0.7 + 0.2;
    g.fillRect(x, y, s, s);
  }
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
scene.fog = new THREE.FogExp2(0x07070f, 0.026);

// ----------------------------------------------------------------------------
// Lights — low ambient, the city lights itself with emissives
// ----------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0x3a4a80, 0x080810, 0.22));
const moon = new THREE.DirectionalLight(0x91a6ff, 0.18);
moon.position.set(-40, 80, -30);
scene.add(moon);

// ----------------------------------------------------------------------------
// Ground — wet, reflective asphalt
// ----------------------------------------------------------------------------
function makeAsphaltRoughness() {
  const s = 512;
  const cv = document.createElement('canvas'); cv.width = cv.height = s;
  const g = cv.getContext('2d');
  g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, s, s);                 // mid roughness base
  // puddles = dark = smooth/reflective
  for (let i = 0; i < 60; i++) {
    const x = Math.random()*s, y = Math.random()*s, r = 20 + Math.random()*70;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.9)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(x-r, y-r, r*2, r*2);
  }
  // speckle
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random()*0.06})`;
    g.fillRect(Math.random()*s, Math.random()*s, 1, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16);
  return t;
}

// Reflective wet street: a Reflector mirror with a semi-transparent rough
// asphalt overlay on top so neon reflects through "puddles".
const reflector = new Reflector(new THREE.PlaneGeometry(600, 600), {
  clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x2c333f,
});
reflector.rotation.x = -Math.PI / 2;
reflector.position.y = 0.0;
scene.add(reflector);

const groundMat = new THREE.MeshStandardMaterial({
  color: 0x05060a, metalness: 0.85, roughness: 0.55,
  roughnessMap: makeAsphaltRoughness(), envMapIntensity: 0.3,
  transparent: true, opacity: 0.62,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.01;
scene.add(ground);

// ----------------------------------------------------------------------------
// Building facade textures (a small reusable set)
// ----------------------------------------------------------------------------
const NEON = [0x5ef0ff, 0xff5da2, 0xb06bff, 0xffae5e, 0x6bff9e, 0xff4f4f];

function makeFacade(seed) {
  const w = 256, h = 256;
  const base = document.createElement('canvas'); base.width = w; base.height = h;
  const emis = document.createElement('canvas'); emis.width = w; emis.height = h;
  const gb = base.getContext('2d'), ge = emis.getContext('2d');
  gb.fillStyle = '#0a0c14'; gb.fillRect(0, 0, w, h);
  ge.fillStyle = '#000000'; ge.fillRect(0, 0, w, h);

  const cols = 6, rows = 7;
  const mx = 6, my = 6;
  const cw = (w - mx*(cols+1)) / cols;
  const ch = (h - my*(rows+1)) / rows;
  const tint = NEON[seed % NEON.length];
  const tintHex = '#' + tint.toString(16).padStart(6, '0');

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = mx + c*(cw+mx), y = my + r*(ch+my);
      const lit = Math.random() < 0.4;
      if (lit) {
        const col = Math.random() < 0.7 ? '#e8d6a8' : tintHex;
        gb.fillStyle = col; gb.fillRect(x, y, cw, ch);
        ge.fillStyle = col; ge.fillRect(x, y, cw, ch);
        // window blinds detail
        gb.fillStyle = 'rgba(0,0,0,0.25)';
        for (let k = 2; k < ch; k += 4) gb.fillRect(x, y+k, cw, 1);
      } else {
        gb.fillStyle = '#070910'; gb.fillRect(x, y, cw, ch);
      }
    }
  }
  const tb = new THREE.CanvasTexture(base);
  const te = new THREE.CanvasTexture(emis);
  tb.colorSpace = THREE.SRGBColorSpace; te.colorSpace = THREE.SRGBColorSpace;
  return { map: tb, emissiveMap: te };
}

const facades = [];
for (let i = 0; i < 6; i++) {
  const f = makeFacade(i);
  facades.push(new THREE.MeshStandardMaterial({
    map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.85,
    metalness: 0.5, roughness: 0.6, envMapIntensity: 0.35,
  }));
}
const roofMat = new THREE.MeshStandardMaterial({ color: 0x070810, metalness: 0.7, roughness: 0.6 });

// ----------------------------------------------------------------------------
// Neon sign texture (text)
// ----------------------------------------------------------------------------
const SIGN_WORDS = ['電脳', 'NOODLE', '寿司', 'OPEN', 'CYBER', '24H', 'SAKE', 'ネオン', 'LIVE', 'XR'];
function makeSign(word, color) {
  const w = 256, h = 128;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.font = 'bold 64px -apple-system, "Segoe UI", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 24;
  g.fillStyle = color;
  g.fillText(word, w/2, h/2);
  g.shadowBlur = 12; g.fillText(word, w/2, h/2);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ----------------------------------------------------------------------------
// City generation
// ----------------------------------------------------------------------------
const colliders = []; // {minX,maxX,minZ,maxZ}
const neonLights = []; // {light, base, phase}
const animatedSigns = [];

function addBuilding(cx, cz, fw, fd, fh) {
  const geo = new THREE.BoxGeometry(fw, fh, fd);
  const mat = facades[Math.floor(Math.random()*facades.length)];
  // tile windows: clone material? we reuse; set repeat on a per-build copy of the map
  const m = mat.clone();
  m.map = mat.map.clone();      m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
  m.emissiveMap = mat.emissiveMap.clone(); m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping;
  const ru = Math.max(1, Math.round(fw/6)), rv = Math.max(1, Math.round(fh/5));
  m.map.repeat.set(ru, rv); m.emissiveMap.repeat.set(ru, rv);
  m.map.needsUpdate = m.emissiveMap.needsUpdate = true;
  const mats = [m, m, roofMat, roofMat, m, m];
  const b = new THREE.Mesh(geo, mats);
  b.position.set(cx, fh/2, cz);
  scene.add(b);
  colliders.push({ minX: cx-fw/2, maxX: cx+fw/2, minZ: cz-fd/2, maxZ: cz+fd/2 });
  return b;
}

function addNeonSign(x, y, z, rotY, word) {
  const color = NEON[Math.floor(Math.random()*NEON.length)];
  const hex = '#' + color.toString(16).padStart(6, '0');
  const tex = makeSign(word, hex);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const aspect = 2;
  const hgt = 1.6 + Math.random()*1.2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(hgt*aspect, hgt), mat);
  sign.position.set(x, y, z); sign.rotation.y = rotY;
  scene.add(sign);
  animatedSigns.push({ mat, phase: Math.random()*Math.PI*2, flick: Math.random() < 0.3 });

  // colored point light spilling from the sign
  if (neonLights.length < 22) {
    const pl = new THREE.PointLight(color, 6, 16, 2);
    pl.position.set(x + Math.sin(rotY)*0.6, y, z + Math.cos(rotY)*0.6);
    scene.add(pl);
    neonLights.push({ light: pl, base: 6, phase: Math.random()*Math.PI*2 });
  }
}

const BLOCK = 22, GRID = 7, STREET = 9;
const half = (GRID*BLOCK) / 2;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const cx = -half + BLOCK/2 + i*BLOCK;
    const cz = -half + BLOCK/2 + j*BLOCK;
    // leave the central block open as a little plaza / spawn
    if (i === (GRID>>1) && j === (GRID>>1)) continue;
    const footprint = BLOCK - STREET;
    // sometimes split a block into two towers
    const split = Math.random() < 0.4;
    const heights = () => 8 + Math.random()*Math.random()*46;
    if (split) {
      const fw = footprint, fd = (footprint-2)/2;
      addBuilding(cx, cz - (fd/2+1), fw, fd, heights());
      addBuilding(cx, cz + (fd/2+1), fw, fd, heights());
    } else {
      const jitter = () => (Math.random()-0.5)*2;
      addBuilding(cx+jitter(), cz+jitter(), footprint, footprint, heights());
    }
    // neon signs facing the street on some buildings
    if (Math.random() < 0.7) {
      const word = SIGN_WORDS[Math.floor(Math.random()*SIGN_WORDS.length)];
      const side = Math.floor(Math.random()*4);
      const off = footprint/2 + 0.15;
      const yy = 2.5 + Math.random()*8;
      if (side === 0) addNeonSign(cx, yy, cz+off, 0, word);
      else if (side === 1) addNeonSign(cx, yy, cz-off, Math.PI, word);
      else if (side === 2) addNeonSign(cx+off, yy, cz, Math.PI/2, word);
      else addNeonSign(cx-off, yy, cz, -Math.PI/2, word);
    }
  }
}

// street lamps at intersections (warm, pooling on wet ground)
const lampGeo = new THREE.CylinderGeometry(0.06, 0.06, 4, 6);
const lampMat = new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.8, roughness: 0.4 });
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
for (let i = 0; i <= GRID; i++) {
  for (let j = 0; j <= GRID; j++) {
    if ((i+j) % 2 === 1) continue; // sparse
    const x = -half + i*BLOCK, z = -half + j*BLOCK;
    if (Math.abs(x) > half+1 || Math.abs(z) > half+1) continue;
    const pole = new THREE.Mesh(lampGeo, lampMat); pole.position.set(x, 2, z); scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bulbMat);
    bulb.position.set(x, 4, z); scene.add(bulb);
    if (neonLights.length < 34) {
      const pl = new THREE.PointLight(0xffcaa0, 4, 14, 2);
      pl.position.set(x, 3.8, z); scene.add(pl);
      neonLights.push({ light: pl, base: 4, phase: Math.random()*Math.PI*2, lamp: true });
    }
  }
}

// holographic billboards (tall ad screens) around the plaza
function makeHologram(label, sub, color) {
  const w = 256, h = 448;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(8,10,20,0.95)'); grad.addColorStop(1, 'rgba(20,8,30,0.95)');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  // border glow
  g.strokeStyle = color; g.lineWidth = 4; g.shadowColor = color; g.shadowBlur = 18;
  g.strokeRect(8, 8, w-16, h-16);
  // big glyph
  g.shadowBlur = 26; g.fillStyle = color; g.textAlign = 'center';
  g.font = 'bold 150px -apple-system, "Segoe UI", sans-serif';
  g.fillText(label, w/2, h*0.42);
  // sub text
  g.shadowBlur = 10; g.font = 'bold 30px -apple-system, sans-serif';
  g.fillStyle = '#dff2ff'; g.fillText(sub, w/2, h*0.72);
  // scanlines
  g.shadowBlur = 0; g.globalAlpha = 0.12; g.fillStyle = '#000';
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const HOLO = [['電', 'CYBERTECH'], ['零', 'ZERO-G BAR'], ['夢', 'DREAMNET'], ['力', 'POWER CELL']];
function addBillboard(x, z, rotY) {
  const c = NEON[Math.floor(Math.random()*NEON.length)];
  const hex = '#' + c.toString(16).padStart(6, '0');
  const [a, b] = HOLO[Math.floor(Math.random()*HOLO.length)];
  const tex = makeHologram(a, b, hex);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(4, 7), mat);
  bb.position.set(x, 5.5, z); bb.rotation.y = rotY; scene.add(bb);
  animatedSigns.push({ mat, phase: Math.random()*Math.PI*2, hologram: true, baseOp: 0.92 });
  if (neonLights.length < 30) {
    const pl = new THREE.PointLight(c, 3, 14, 2);
    pl.position.set(x, 4, z); scene.add(pl);
    neonLights.push({ light: pl, base: 3, phase: Math.random()*Math.PI*2 });
  }
}
addBillboard(-8, -8, 0.4); addBillboard(9, -7, -0.5); addBillboard(-7, 9, 0.25); addBillboard(8, 8, -2.6);

// ----------------------------------------------------------------------------
// Rain
// ----------------------------------------------------------------------------
const RAIN_N = 1800, RAIN_R = 40;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 3);
const rainVel = new Float32Array(RAIN_N);
for (let i = 0; i < RAIN_N; i++) {
  rainPos[i*3]   = (Math.random()-0.5)*RAIN_R*2;
  rainPos[i*3+1] = Math.random()*30;
  rainPos[i*3+2] = (Math.random()-0.5)*RAIN_R*2;
  rainVel[i] = 22 + Math.random()*18;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.PointsMaterial({ color: 0x9fc4ff, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false });
const rain = new THREE.Points(rainGeo, rainMat);
scene.add(rain);

// ----------------------------------------------------------------------------
// Post-processing: bloom for neon glow
// ----------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ----------------------------------------------------------------------------
// Controls + movement
// ----------------------------------------------------------------------------
const EYE = 1.7;
camera.position.set(0, EYE, 4);
const controls = new PointerLockControls(camera, renderer.domElement);

const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup',   e => { keys[e.code] = false; });

const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const playBtn = document.getElementById('play');

const isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);

function startGame() {
  overlay.classList.add('hidden');
  hud.classList.add('playing');
  if (!isTouch) controls.lock();
  if (isTouch) { document.getElementById('touch').style.display = 'block'; touchActive = true; }
}
playBtn.addEventListener('click', startGame);

controls.addEventListener('unlock', () => {
  if (!isTouch) { overlay.classList.remove('hidden'); hud.classList.remove('playing'); }
});

// --- desktop look already handled by PointerLockControls ---

// --- movement with collision (slide along walls) ---
const vel = new THREE.Vector3();
const dir = new THREE.Vector3();
const PLAYER_R = 0.55;

function resolveCollisions(pos) {
  for (const b of colliders) {
    const minX = b.minX - PLAYER_R, maxX = b.maxX + PLAYER_R;
    const minZ = b.minZ - PLAYER_R, maxZ = b.maxZ + PLAYER_R;
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      const dxL = pos.x - minX, dxR = maxX - pos.x;
      const dzL = pos.z - minZ, dzR = maxZ - pos.z;
      const m = Math.min(dxL, dxR, dzL, dzR);
      if (m === dxL) pos.x = minX; else if (m === dxR) pos.x = maxX;
      else if (m === dzL) pos.z = minZ; else pos.z = maxZ;
    }
  }
  const lim = half + BLOCK; // soft world bound
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}

// --- mobile joystick ---
let touchActive = false;
let moveX = 0, moveY = 0;     // joystick output [-1,1]
let lookId = null, lastLX = 0, lastLY = 0;
const stick = document.getElementById('stick'), nub = document.getElementById('nub');
let stickId = null, stickCx = 0, stickCy = 0;

if (isTouch) {
  document.body.classList.add('touch');
  stick.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; stickId = t.identifier;
    const r = stick.getBoundingClientRect(); stickCx = r.left + r.width/2; stickCy = r.top + r.height/2;
    e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - stickCx, dy = t.clientY - stickCy;
        const max = 46, d = Math.hypot(dx, dy);
        if (d > max) { dx *= max/d; dy *= max/d; }
        nub.style.transform = `translate(${dx}px,${dy}px)`;
        moveX = dx/max; moveY = dy/max;
      } else if (t.identifier === lookId) {
        const dx = t.clientX - lastLX, dy = t.clientY - lastLY;
        lastLX = t.clientX; lastLY = t.clientY;
        yaw -= dx * 0.004; pitch -= dy * 0.004;
        pitch = Math.max(-1.2, Math.min(1.2, pitch));
      }
    }
  }, { passive: false });
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== stickId && lookId === null && t.clientX > innerWidth*0.35) {
        lookId = t.identifier; lastLX = t.clientX; lastLY = t.clientY;
      }
    }
  }, { passive: false });
  addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; moveX = moveY = 0; nub.style.transform = ''; }
      if (t.identifier === lookId) lookId = null;
    }
  });
}
let yaw = 0, pitch = 0;       // used for touch look
const touchEuler = new THREE.Euler(0, 0, 0, 'YXZ');

// ----------------------------------------------------------------------------
// Loop
// ----------------------------------------------------------------------------
const clock = new THREE.Clock();
let bob = 0;
const fpsEl = document.getElementById('fps');
let fpsAcc = 0, fpsFrames = 0, fpsTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const playing = hud.classList.contains('playing');
  const moving = playing && (keys['KeyW']||keys['KeyS']||keys['KeyA']||keys['KeyD']||
                 keys['ArrowUp']||keys['ArrowDown']||keys['ArrowLeft']||keys['ArrowRight']||
                 Math.abs(moveX)+Math.abs(moveY) > 0.05);

  if (playing) {
    const sprint = keys['ShiftLeft'] || keys['ShiftRight'] ? 1.8 : 1;
    const speed = 4.2 * sprint;

    // input direction
    let fwd = 0, str = 0;
    if (keys['KeyW']||keys['ArrowUp']) fwd += 1;
    if (keys['KeyS']||keys['ArrowDown']) fwd -= 1;
    if (keys['KeyD']||keys['ArrowRight']) str += 1;
    if (keys['KeyA']||keys['ArrowLeft']) str -= 1;
    if (isTouch) { fwd += -moveY; str += moveX; }

    // touch look -> apply to camera
    if (isTouch) {
      touchEuler.set(pitch, yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(touchEuler);
    }

    dir.set(0, 0, 0);
    if (fwd || str) {
      camera.getWorldDirection(vel);
      vel.y = 0; vel.normalize();
      const right = new THREE.Vector3().crossVectors(vel, camera.up).normalize();
      dir.addScaledVector(vel, fwd).addScaledVector(right, str);
      if (dir.lengthSq() > 0) dir.normalize();
    }

    const pos = camera.position;
    pos.addScaledVector(dir, speed * dt);
    resolveCollisions(pos);

    // head bob
    if (moving) { bob += dt * speed * 1.6; pos.y = EYE + Math.sin(bob)*0.06; }
    else pos.y += (EYE - pos.y) * 0.1;
  }

  // animate neon flicker + light pulse
  for (const n of neonLights) {
    const f = n.lamp ? 1 : (0.85 + Math.sin(t*6 + n.phase)*0.06 + (Math.random()<0.02?-0.4:0));
    n.light.intensity = n.base * f;
  }
  for (const s of animatedSigns) {
    if (s.hologram) s.mat.opacity = s.baseOp + Math.sin(t*2.0 + s.phase)*0.08 - (Math.random()<0.015?0.5:0);
    else if (s.flick) s.mat.opacity = Math.random() < 0.06 ? 0.25 : 1.0;
    else s.mat.opacity = 0.85 + Math.sin(t*3 + s.phase)*0.15;
  }

  // rain follows camera, recycles
  const rp = rainGeo.attributes.position.array;
  for (let i = 0; i < RAIN_N; i++) {
    rp[i*3+1] -= rainVel[i] * dt;
    if (rp[i*3+1] < 0) {
      rp[i*3+1] = 26 + Math.random()*6;
      rp[i*3]   = camera.position.x + (Math.random()-0.5)*RAIN_R*2;
      rp[i*3+2] = camera.position.z + (Math.random()-0.5)*RAIN_R*2;
    }
  }
  rainGeo.attributes.position.needsUpdate = true;

  composer.render();

  // fps
  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 0.5) { fpsEl.textContent = Math.round(fpsFrames/fpsTime) + ' FPS'; fpsFrames = 0; fpsTime = 0; }
}
animate();

// ----------------------------------------------------------------------------
// Resize + ready
// ----------------------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// signal ready
document.getElementById('loading').style.display = 'none';
playBtn.style.display = 'inline-block';

// expose for headless smoke test
window.__game = { scene, camera, renderer, colliders, neonLights };
