import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { loadAll } from './assets.js';
import { buildCity } from './city.js';
import { createAgents } from './agents.js';
import { SUN_DIR, ISLAND_X, ISLAND_Z, WATER_Y } from './config.js';

const BUILD = '2026.06.26.cyber.1';
document.getElementById('build').textContent = 'Build ' + BUILD;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 2000);
camera.position.set(0, 1.7, 46);

// soft round sprite for dust / steam
function softCircle() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const rg = g.createRadialGradient(32,32,0,32,32,32); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c);
}
const soft = softCircle();

// ---------------------------------------------------------------------------
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const playBtn = document.getElementById('play');
const bar = document.querySelector('#bar > i');
const loadtxt = document.getElementById('loadtxt');
const isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);

let world = null;

loadAll(renderer, (p, label) => { bar.style.width = Math.round(p*100)+'%'; loadtxt.textContent = 'Lade: ' + label; })
  .then(A => { world = buildWorld(A); loadtxt.textContent = 'Bereit.'; playBtn.disabled = false; })
  .catch(err => { loadtxt.textContent = 'Fehler beim Laden: ' + err.message; console.error(err); });

function buildWorld(A) {
  // sky + image-based lighting from the sunset HDRI
  scene.background = A.hdr;
  scene.environment = A.envMap;
  scene.fog = new THREE.FogExp2(0x6a5236, 0.011);   // warm dusty haze

  // key light: low warm sun
  const sunDir = new THREE.Vector3(SUN_DIR.x, SUN_DIR.y, SUN_DIR.z).normalize();
  const sun = new THREE.DirectionalLight(0xffb066, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
  const SH = 60; Object.assign(sun.shadow.camera, { left:-SH, right:SH, top:SH, bottom:-SH });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);

  scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x2a2018, 0.35));
  const bounce = new THREE.DirectionalLight(0x6a78a0, 0.25); bounce.position.set(-sunDir.x, 0.5, -sunDir.z); scene.add(bounce);

  // ocean around the island (reflects the sunset env; no street wetness)
  const waterN = A.waterNormals; waterN.repeat.set(60, 60);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ color: 0x10202e, metalness: 0.92, roughness: 0.14, normalMap: waterN, normalScale: new THREE.Vector2(0.5,0.5), envMapIntensity: 1.0 }));
  sea.rotation.x = -Math.PI/2; sea.position.y = WATER_Y; sea.receiveShadow = false; scene.add(sea);

  // the setting sun as a glowing disc down the street (bloom anchor)
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffdca0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sunSprite.position.copy(sunDir).multiplyScalar(600); sunSprite.scale.setScalar(150); scene.add(sunSprite);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffe9c4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sunCore.position.copy(sunDir).multiplyScalar(595); sunCore.scale.setScalar(60); scene.add(sunCore);

  // build city + agents
  const interactables = [];
  const ctx = {
    colliders: [], steam: [], blink: [],
    lightBudget: { n: 0 },
    addInteractable: (mesh, def) => interactables.push({ obj: mesh, def }),
  };
  const city = buildCity(scene, A, ctx);
  const agents = createAgents(scene, A, ctx);

  // dust motes near the camera
  const DUST = 420; const dpos = new Float32Array(DUST*3);
  for (let i=0;i<DUST;i++){ dpos[i*3]=(Math.random()-0.5)*60; dpos[i*3+1]=Math.random()*16; dpos[i*3+2]=(Math.random()-0.5)*60; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos,3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: soft, color: 0xffcea0, size: 0.13, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(dust);

  // steam puffs from vents / manholes / stalls
  const emitters = ctx.steam;
  const SP = Math.min(700, emitters.length * 60); const spos = new Float32Array(SP*3); const scol = new Float32Array(SP*3);
  const sParts = [];
  for (let i=0;i<SP;i++){ const e = emitters[i % emitters.length]; sParts.push({ e, age: Math.random()*3, life: 2.5+Math.random()*2.5, vx:(Math.random()-0.5)*0.2, vz:(Math.random()-0.5)*0.2 }); }
  const steamGeo = new THREE.BufferGeometry(); steamGeo.setAttribute('position', new THREE.BufferAttribute(spos,3)); steamGeo.setAttribute('color', new THREE.BufferAttribute(scol,3));
  const steam = new THREE.Points(steamGeo, new THREE.PointsMaterial({ map: soft, vertexColors: true, size: 1.6, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true }));
  scene.add(steam);
  function updateSteam(dt) {
    for (let i=0;i<SP;i++){ const p = sParts[i]; p.age += dt; if (p.age > p.life) { p.age = 0; p.e = emitters[(Math.random()*emitters.length)|0]; }
      const k = p.age/p.life; const y = p.e.y + p.age*0.7;
      spos[i*3]=p.e.x + p.vx*p.age*3; spos[i*3+1]=y; spos[i*3+2]=p.e.z + p.vz*p.age*3;
      const a = Math.sin(k*Math.PI) * 0.32 * (p.e.rate||1); scol[i*3]=a*0.9; scol[i*3+1]=a*0.85; scol[i*3+2]=a*0.8;
    }
    steamGeo.attributes.position.needsUpdate = true; steamGeo.attributes.color.needsUpdate = true;
  }

  return { sun, sunDir, city, agents, interactables, dust, updateSteam };
}

// ---------------------------------------------------------------------------
// Post-processing
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.6, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Controls, movement, interaction
const controls = new PointerLockControls(camera, renderer.domElement);
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE') onUse(); });
addEventListener('keyup', e => { keys[e.code] = false; });

function startGame() { overlay.classList.add('hidden'); hud.classList.add('playing'); if (!isTouch) controls.lock(); if (isTouch) document.getElementById('touch').style.display = 'block'; }
playBtn.addEventListener('click', () => { if (!playBtn.disabled) startGame(); });
controls.addEventListener('unlock', () => { if (!isTouch && !dialogueOpen) { overlay.classList.remove('hidden'); hud.classList.remove('playing'); } });

const vel = new THREE.Vector3(), dir = new THREE.Vector3();
const PR = 0.5;
function collide(pos) {
  if (!world) return;
  for (const b of world.city.colliders) {
    const minX=b.minX-PR, maxX=b.maxX+PR, minZ=b.minZ-PR, maxZ=b.maxZ+PR;
    if (pos.x>minX && pos.x<maxX && pos.z>minZ && pos.z<maxZ) {
      const dxL=pos.x-minX, dxR=maxX-pos.x, dzL=pos.z-minZ, dzR=maxZ-pos.z, m=Math.min(dxL,dxR,dzL,dzR);
      if (m===dxL) pos.x=minX; else if (m===dxR) pos.x=maxX; else if (m===dzL) pos.z=minZ; else pos.z=maxZ;
    }
  }
  pos.x = Math.max(-(ISLAND_X-1.2), Math.min(ISLAND_X-1.2, pos.x));
  pos.z = Math.max(-(ISLAND_Z-1.2), Math.min(ISLAND_Z-1.2, pos.z));
}

// interaction
const prompt = document.getElementById('prompt');
const dlg = document.getElementById('dialogue');
const useBtn = document.getElementById('useBtn');
let current = null, dialogueOpen = false;
const fwd = new THREE.Vector3(), to = new THREE.Vector3();

function pickInteractable() {
  if (!world) return null;
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  let best = null, bestD = 1e9;
  for (const it of world.interactables) {
    to.copy(it.obj.position).sub(camera.position); to.y = 0;   // horizontal distance (works for elevated screens)
    const d = to.length(); const r = it.def.radius || 4.0;
    if (d > r) continue;
    to.normalize();
    if (to.dot(fwd) < 0.5) continue;
    if (d < bestD) { bestD = d; best = it; }
  }
  return best;
}
function onUse() {
  if (!hud.classList.contains('playing')) return;
  if (dialogueOpen) { closeDialogue(); return; }
  if (current) openDialogue(current.def);
}
let dlgLines = [], dlgIdx = 0;
function openDialogue(def) {
  dialogueOpen = true; dlgLines = def.lines; dlgIdx = 0;
  dlg.querySelector('.who').textContent = def.who || '';
  dlg.querySelector('.line').textContent = dlgLines[0];
  dlg.classList.add('show');
}
function closeDialogue() { dialogueOpen = false; dlg.classList.remove('show'); }
if (useBtn) useBtn.addEventListener('touchstart', e => { e.preventDefault(); onUse(); }, { passive:false });
// advance dialogue on click while open (desktop)
addEventListener('click', () => { if (dialogueOpen) { dlgIdx++; if (dlgIdx >= dlgLines.length) closeDialogue(); else dlg.querySelector('.line').textContent = dlgLines[dlgIdx]; } });

// mobile joystick + drag look
let moveX=0, moveY=0, lookId=null, lastLX=0, lastLY=0, stickId=null, stickCx=0, stickCy=0, yaw=0, pitch=0;
const tEuler = new THREE.Euler(0,0,0,'YXZ');
const stick = document.getElementById('stick'), nub = document.getElementById('nub');
if (isTouch) {
  document.body.classList.add('touch');
  stick.addEventListener('touchstart', e => { const t=e.changedTouches[0]; stickId=t.identifier; const r=stick.getBoundingClientRect(); stickCx=r.left+r.width/2; stickCy=r.top+r.height/2; e.preventDefault(); }, {passive:false});
  addEventListener('touchmove', e => { for (const t of e.changedTouches) {
    if (t.identifier===stickId){ let dx=t.clientX-stickCx, dy=t.clientY-stickCy; const mx=46, d=Math.hypot(dx,dy); if(d>mx){dx*=mx/d;dy*=mx/d;} nub.style.transform=`translate(${dx}px,${dy}px)`; moveX=dx/mx; moveY=dy/mx; }
    else if (t.identifier===lookId){ yaw-=(t.clientX-lastLX)*0.004; pitch-=(t.clientY-lastLY)*0.004; lastLX=t.clientX; lastLY=t.clientY; pitch=Math.max(-1.2,Math.min(1.2,pitch)); } } }, {passive:false});
  addEventListener('touchstart', e => { for (const t of e.changedTouches) if (t.identifier!==stickId && lookId===null && t.clientX>innerWidth*0.4) { lookId=t.identifier; lastLX=t.clientX; lastLY=t.clientY; } }, {passive:false});
  addEventListener('touchend', e => { for (const t of e.changedTouches){ if(t.identifier===stickId){stickId=null;moveX=moveY=0;nub.style.transform='';} if(t.identifier===lookId) lookId=null; } });
}

// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let bob = 0, fpsFrames = 0, fpsTime = 0;
const fpsEl = document.getElementById('fps');

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const playing = hud.classList.contains('playing');

  if (playing && world && !dialogueOpen) {
    const sprint = (keys['ShiftLeft']||keys['ShiftRight']) ? 1.9 : 1;
    const speed = 3.4*sprint;
    let f=0, s=0;
    if (keys['KeyW']||keys['ArrowUp']) f+=1; if (keys['KeyS']||keys['ArrowDown']) f-=1;
    if (keys['KeyD']||keys['ArrowRight']) s+=1; if (keys['KeyA']||keys['ArrowLeft']) s-=1;
    if (isTouch) { f += -moveY; s += moveX; tEuler.set(pitch, yaw, 0, 'YXZ'); camera.quaternion.setFromEuler(tEuler); }
    dir.set(0,0,0); const moving = f||s;
    if (moving) { camera.getWorldDirection(vel); vel.y=0; vel.normalize(); const right=new THREE.Vector3().crossVectors(vel,camera.up).normalize(); dir.addScaledVector(vel,f).addScaledVector(right,s); if (dir.lengthSq()>0) dir.normalize(); }
    const pos = camera.position; pos.addScaledVector(dir, speed*dt); collide(pos);
    if (moving) { bob += dt*speed*1.7; pos.y = 1.7 + Math.sin(bob)*0.05; } else pos.y += (1.7-pos.y)*0.1;
  }

  if (world) {
    // sun follows player for tight, crisp long shadows
    world.sun.position.copy(camera.position).addScaledVector(world.sunDir, 90);
    world.sun.target.position.copy(camera.position); world.sun.target.updateMatrixWorld();
    world.agents.update(t, dt);
    world.updateSteam(dt);
    world.dust.position.set(Math.round(camera.position.x/60)*60, 0, Math.round(camera.position.z/60)*60);
    world.dust.rotation.y = t*0.01;
    // animate window/screen flicker subtly
    // interaction prompt
    if (playing && !dialogueOpen) {
      current = pickInteractable();
      if (current) { prompt.innerHTML = '<span class="key">E</span>' + current.def.prompt; prompt.classList.add('show'); if (useBtn) useBtn.classList.add('show'); }
      else { prompt.classList.remove('show'); if (useBtn) useBtn.classList.remove('show'); }
    } else if (!dialogueOpen) { prompt.classList.remove('show'); if (useBtn) useBtn.classList.remove('show'); }
  }

  composer.render();
  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 0.5) { fpsEl.textContent = Math.round(fpsFrames/fpsTime)+' FPS'; fpsFrames=0; fpsTime=0; }
}
animate();

addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });

window.__game = { scene, camera, get world(){ return world; } };
