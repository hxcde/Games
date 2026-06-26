import * as THREE from 'three';
import { ROAD_HALF, SIDEWALK, STREET_HALF, Z_MIN, Z_MAX, ISLAND_X, ISLAND_Z, WATER_Y } from './config.js';
import { makeSign, makeScreen, makeShopfront, makeGraffiti, makePoster, makeWarning, makeKeypad } from './canvasart.js';

const COOL = [0x39d2ff, 0xff4db0, 0x5a7bff, 0x5dffa0];

export function buildCity(scene, A, ctx) {
  const colliders = ctx.colliders, steam = ctx.steam;
  const screens = [];          // animated screen materials
  const rnd = (a, b) => a + Math.random()*(b-a);
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  // ---- shared materials from PBR textures ----------------------------------
  const wallMat = (set, rough = 1, metal = 0) => new THREE.MeshStandardMaterial({
    map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap,
    roughness: rough, metalness: metal, normalScale: new THREE.Vector2(1, 1),
  });
  const matConcrete = wallMat(A.concrete), matDirty = wallMat(A.dirty), matBrick = wallMat(A.brick);
  const WALLS = [matConcrete, matDirty, matBrick, matDirty];
  const matAsphalt = new THREE.MeshStandardMaterial({ map: A.asphalt.map, normalMap: A.asphalt.normalMap, roughnessMap: A.asphalt.roughnessMap, roughness: 1, metalness: 0 });
  const matCurb = new THREE.MeshStandardMaterial({ color: 0x6b6862, roughness: 0.9 });
  const matSidewalk = new THREE.MeshStandardMaterial({ map: A.concrete.map, normalMap: A.concrete.normalMap, roughnessMap: A.concrete.roughnessMap, roughness: 1, color: 0x9a948c });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.85, envMapIntensity: 1 });
  const matRust = new THREE.MeshStandardMaterial({ color: 0x6b4a36, roughness: 0.85, metalness: 0.4 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.8, metalness: 0.3 });
  const matGlassDark = new THREE.MeshStandardMaterial({ color: 0x0c1016, roughness: 0.12, metalness: 0.2, envMapIntensity: 1.4 });
  const matGlassLit = new THREE.MeshStandardMaterial({ color: 0x20180e, emissive: 0xffd49a, emissiveIntensity: 1.6, roughness: 0.4 });

  function scaleBoxUV(geo, w, h, d, tile) {
    const uv = geo.attributes.uv;
    const set = (f, ru, rv) => { for (let k = 0; k < 4; k++) { const i = f*4+k; uv.setXY(i, uv.getX(i)*ru, uv.getY(i)*rv); } };
    const rw = Math.max(1, w/tile), rh = Math.max(1, h/tile), rd = Math.max(1, d/tile);
    set(0, rd, rh); set(1, rd, rh); set(2, rw, rd); set(3, rw, rd); set(4, rw, rh); set(5, rw, rh);
    uv.needsUpdate = true;
  }

  // ---- island + sea wall ---------------------------------------------------
  const slabH = 5;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(ISLAND_X*2, slabH, ISLAND_Z*2), matDirty.clone());
  scaleBoxUV(slab.geometry, ISLAND_X*2, slabH, ISLAND_Z*2, 4);
  slab.position.set(0, -slabH/2, 0); slab.receiveShadow = true; scene.add(slab);

  // asphalt over the whole top, sidewalks + curbs on top of that
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_X*2, ISLAND_Z*2), matAsphalt.clone());
  scaleBoxUV2(road.geometry, ISLAND_X*2/3, ISLAND_Z*2/3);
  road.rotation.x = -Math.PI/2; road.position.y = 0.01; road.receiveShadow = true; scene.add(road);

  function scaleBoxUV2(geo, ru, rv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i)*ru, uv.getY(i)*rv); uv.needsUpdate = true; }

  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK, 0.22, ISLAND_Z*2), matSidewalk.clone());
    scaleBoxUV(sw.geometry, SIDEWALK, 0.22, ISLAND_Z*2, 2);
    sw.position.set(side*(ROAD_HALF + SIDEWALK/2), 0.11, 0); sw.receiveShadow = true; sw.castShadow = true; scene.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, ISLAND_Z*2), matCurb);
    curb.position.set(side*(ROAD_HALF+0.12), 0.15, 0); curb.receiveShadow = true; scene.add(curb);
    // perimeter railing along island edge
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, ISLAND_Z*2), matMetal);
    rail.position.set(side*(ISLAND_X-0.4), 0.5, 0); rail.castShadow = true; scene.add(rail);
  }
  // end railings (north/south water edges)
  for (const z of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(ISLAND_X*2, 1.0, 0.2), matMetal);
    rail.position.set(0, 0.5, z*(ISLAND_Z-0.4)); rail.castShadow = true; scene.add(rail);
  }

  // road markings (dry paint)
  const paint = new THREE.MeshStandardMaterial({ color: 0xb9b3a0, roughness: 0.8 });
  for (let z = Z_MIN; z < Z_MAX; z += 4) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 2), paint); d.rotation.x = -Math.PI/2; d.position.set(0, 0.02, z+1); scene.add(d);
  }

  // ---- window instancing accumulators -------------------------------------
  const winDark = [], winLit = [];
  const winGeo = new THREE.PlaneGeometry(1.25, 1.7);
  const tmp = new THREE.Object3D();
  function addWindows(side, zc, lenZ, baseY, topY, depthFaceX) {
    const rotY = -side * Math.PI/2;
    const cols = Math.max(1, Math.floor(lenZ/2.4));
    const colGap = lenZ/cols;
    for (let r = baseY+3.2; r < topY-1.5; r += 3.0) {
      for (let c = 0; c < cols; c++) {
        const z = zc - lenZ/2 + colGap*(c+0.5);
        tmp.position.set(depthFaceX - side*0.06, r, z); tmp.rotation.set(0, rotY, 0); tmp.scale.set(1,1,1); tmp.updateMatrix();
        (Math.random() < 0.16 ? winLit : winDark).push(tmp.matrix.clone());
      }
    }
  }

  // ---- a wall-mounted prop helper -----------------------------------------
  function decal(texture, w, h, x, y, z, rotY) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m); return m;
  }
  function acUnit(x, y, z, rotY) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.7), matMetal); b.castShadow = true; g.add(b);
    const grille = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), matDark); grille.position.z = 0.36; g.add(grille);
    const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.2,5), matRust); drip.position.set(0.4,-1,0.2); g.add(drip);
    g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g); return g;
  }
  function pipe(x, y0, y1, z, r=0.09) {
    const h = y1-y0; const p = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,8), pick([matMetal, matRust]));
    p.position.set(x, (y0+y1)/2, z); p.castShadow = true; scene.add(p); return p;
  }
  function camera(x, y, z, rotY) {
    const g = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.06,0.06), matDark); arm.position.x = 0.25; g.add(arm);
    const bod = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,0.2), matDark); bod.position.set(0.55,0,0); g.add(bod);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.03,6,6), new THREE.MeshBasicMaterial({ color: 0xff2b2b })); led.position.set(0.78,0,0.08); g.add(led);
    g.position.set(x,y,z); g.rotation.y = rotY; scene.add(g);
  }
  function junction(x, y, z, rotY) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.8,0.25), matRust); b.position.set(x,y,z); b.rotation.y = rotY; b.castShadow = true; scene.add(b);
    decal(makeWarning(), 0.4, 0.4, x - Math.sin(rotY)*0.13, y, z - Math.cos(rotY)*0.13 + (rotY===0?0.14:0), rotY);
  }

  // ---- buildings -----------------------------------------------------------
  const ALLEY_Z0 = 0.5, ALLEY_Z1 = 5.0;   // gap in the left frontage
  function buildSide(side) {
    let z = Z_MIN;
    while (z < Z_MAX) {
      let len = rnd(8, 14);
      if (z + len > Z_MAX) len = Z_MAX - z;
      // leave the alley gap on the left side
      if (side === -1 && z < ALLEY_Z1 && z + len > ALLEY_Z0) {
        if (z < ALLEY_Z0) len = ALLEY_Z0 - z; else { z = ALLEY_Z1; continue; }
      }
      if (len < 4) { z += len + 0.6; continue; }
      const depth = rnd(13, 17);
      const height = rnd(18, 26) + Math.random()*Math.random()*34;
      const cx = side*(STREET_HALF + depth/2 + 0.2);
      const cz = z + len/2;
      const mat = pick(WALLS).clone();
      const geo = new THREE.BoxGeometry(depth, height, len - 0.6);
      scaleBoxUV(geo, depth, height, len-0.6, 3.2);
      const b = new THREE.Mesh(geo, mat);
      b.position.set(cx, height/2, cz); b.castShadow = true; b.receiveShadow = true; scene.add(b);
      colliders.push({ minX: cx-depth/2, maxX: cx+depth/2, minZ: cz-(len-0.6)/2, maxZ: cz+(len-0.6)/2 });

      // parapet rim
      const rim = new THREE.Mesh(new THREE.BoxGeometry(depth+0.3, 0.6, len-0.3), matDark);
      rim.position.set(cx, height+0.3, cz); rim.castShadow = true; scene.add(rim);

      // windows on street face
      addWindows(side, cz, len-1.2, 0, height, side*STREET_HALF);

      // rooftop clutter
      const ry = height+0.6;
      if (Math.random()<0.9) acUnit(cx+rnd(-depth/3,depth/3), ry+0.5, cz+rnd(-len/3,len/3), rnd(0,6));
      if (Math.random()<0.7) { const t = new THREE.Mesh(new THREE.CylinderGeometry(1,1,1.6,12), matRust); t.position.set(cx+rnd(-3,3), ry+0.8, cz+rnd(-3,3)); t.castShadow = true; scene.add(t); }
      if (height>40 && Math.random()<0.8) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,5,5), matMetal); a.position.set(cx+rnd(-2,2), height+3, cz+rnd(-2,2)); scene.add(a);
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.13,8,8), new THREE.MeshBasicMaterial({color:0xff3b3b})); bl.position.set(a.position.x, height+5.4, a.position.z); scene.add(bl); ctx.blink.push(bl); }

      // facade props on the street face
      const fx = side*STREET_HALF;
      for (let k = 0; k < 3; k++) if (Math.random()<0.6) acUnit(fx - side*0.55, rnd(5, height-3), cz+rnd(-len/2.5,len/2.5), -side*Math.PI/2);
      if (Math.random()<0.8) pipe(fx - side*0.2, 3, height-2, cz + rnd(-len/2.5,len/2.5));
      if (Math.random()<0.5) camera(fx - side*0.3, rnd(4,7), cz+rnd(-len/3,len/3), side===1?Math.PI:0);
      if (Math.random()<0.5) junction(fx - side*0.16, 2.2, cz+rnd(-len/3,len/3), side===1?Math.PI/2:-Math.PI/2);
      if (Math.random()<0.7) decal(makeGraffiti(), 3, 1.9, fx - side*0.07, 2.0, cz+rnd(-len/3,len/3), -side*Math.PI/2);
      if (Math.random()<0.6) decal(makePoster(), 1.1, 1.7, fx - side*0.07, 2.4, cz+rnd(-len/2.5,len/2.5), -side*Math.PI/2);

      z += len + 0.6;
    }
  }
  buildSide(-1); buildSide(1);

  // commit window instances
  if (winDark.length) { const im = new THREE.InstancedMesh(winGeo, matGlassDark, winDark.length); winDark.forEach((m,i)=>im.setMatrixAt(i,m)); im.instanceMatrix.needsUpdate = true; scene.add(im); }
  if (winLit.length)  { const im = new THREE.InstancedMesh(winGeo, matGlassLit, winLit.length);  winLit.forEach((m,i)=>im.setMatrixAt(i,m));  im.instanceMatrix.needsUpdate = true; scene.add(im); }

  // ---- cables across the street (long golden-hour shadows) -----------------
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.9 });
  for (let z = Z_MIN+6; z < Z_MAX-4; z += rnd(7, 11)) {
    const y = rnd(7, 13), sag = rnd(1, 2.2);
    const a = new THREE.Vector3(-STREET_HALF+0.2, y, z), b = new THREE.Vector3(STREET_HALF-0.2, y-rnd(0,2), z+rnd(-1,1));
    const mid = new THREE.Vector3((a.x+b.x)/2, Math.min(a.y,b.y)-sag, (a.z+b.z)/2);
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.035, 5), cableMat);
    tube.castShadow = true; scene.add(tube);
  }
  // a couple of cables running along the street too
  for (const side of [-1,1]) {
    const x = side*(STREET_HALF-0.3);
    const pts = []; for (let z = Z_MIN+4; z <= Z_MAX-4; z += 9) pts.push(new THREE.Vector3(x+rnd(-0.3,0.3), rnd(6,9), z));
    if (pts.length>1) { const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length*4, 0.03, 5), cableMat); tube.castShadow = true; scene.add(tube); }
  }

  // ---- hanging neon signs over the street ----------------------------------
  function hangingSign(side, z, text, color) {
    const fx = side*STREET_HALF;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4,0.08,0.08), matDark); arm.position.set(fx - side*0.7, 6.2, z); scene.add(arm);
    const tx = makeSign(text, color);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 1.3), new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 1.5, roughness: 0.6 }));
    sign.position.set(fx - side*1.3, 5.2, z); sign.castShadow = true; scene.add(sign);
    if (ctx.lightBudget.n < 12) { ctx.lightBudget.n++; const pl = new THREE.PointLight(color, 4, 9, 2); pl.position.set(fx - side*1.6, 5.2, z); scene.add(pl); }
  }

  // ---- shops (ground-floor fitouts + interactions) -------------------------
  function shopfront(side, z, name, color) {
    const fx = side*STREET_HALF; const rotY = -side*Math.PI/2;
    const front = decal(makeShopfront(name, color), 5.2, 1.7, fx - side*0.05, 1.5, z, rotY);
    front.material.emissive = new THREE.Color(0xffffff); front.material.emissiveMap = front.material.map; front.material.emissiveIntensity = 0.9; front.material.transparent = false;
    // awning
    const awn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 5), new THREE.MeshStandardMaterial({ color: pick([0x6b2b2b,0x2b3b6b,0x3b3b2b]), roughness: 0.85 }));
    awn.position.set(fx - side*0.9, 2.7, z); awn.rotation.z = side*0.12; awn.castShadow = true; scene.add(awn);
    hangingSign(side, z, name.split(' ')[0], color);
    if (ctx.lightBudget.n < 12) { ctx.lightBudget.n++; const pl = new THREE.PointLight(0xffcaa0, 3.5, 7, 2); pl.position.set(fx - side*1.2, 2.2, z); scene.add(pl); }
  }
  shopfront(1, 38, 'NEO-RAMEN', '#ff8a3c');
  shopfront(-1, 30, 'AKARI CYBERWARE', '#39d2ff');
  shopfront(1, 22, 'PAWN 24H', '#ffd23f');
  shopfront(-1, 14, 'THE WIRED BAR', '#ff4db0');

  // vending machines cluster
  for (let i = 0; i < 3; i++) {
    const x = STREET_HALF - 0.6, z = 7 + i*1.3;
    const vm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.8), matDark); vm.position.set(x, 1.0, z); vm.castShadow = true; scene.add(vm);
    const face = decal(makeScreen(i), 1.0, 1.7, x-0.41, 1.1, z, -Math.PI/2);
    face.material.emissive = new THREE.Color(0xffffff); face.material.emissiveMap = face.material.map; face.material.emissiveIntensity = 1.1; face.material.transparent = false;
    screens.push(face.material);
    if (ctx.lightBudget.n < 12) { ctx.lightBudget.n++; const pl = new THREE.PointLight(pick(COOL), 2, 5, 2); pl.position.set(x-0.7, 1.4, z); scene.add(pl); }
  }

  // ---- big ad screen (INTERACTION 1) --------------------------------------
  {
    const z = 2, side = 1, fx = side*STREET_HALF;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.4, 3.4), matDark); frame.position.set(fx-0.2, 9, z); scene.add(frame);
    const scr = makeScreen(0);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), new THREE.MeshStandardMaterial({ map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 1.3, roughness: 0.5 }));
    screen.position.set(fx-0.36, 9, z); screen.rotation.y = -Math.PI/2; scene.add(screen);
    screens.push(screen.material);
    if (ctx.lightBudget.n < 12) { ctx.lightBudget.n++; const pl = new THREE.PointLight(0x4fc3ff, 5, 12, 2); pl.position.set(fx-1.6, 9, z); scene.add(pl); }
    ctx.addInteractable(screen, { prompt: 'Werbescreen lesen', who: 'SYNTH-CORP // Ad-Net',
      lines: ['„BLEIB VERNETZT. BLEIB SICHER. BLEIB SYNTH."', 'Der Screen flackert — darunter scrollt eine Störmeldung: Sektor 7 Stromnetz instabil.'] });
  }

  // ---- alley + locked door (INTERACTION 3) --------------------------------
  {
    const ax0 = ALLEY_Z0, ax1 = ALLEY_Z1; const cz = (ax0+ax1)/2;
    const depth = 12; // alley goes into the block (toward -X beyond frontage)
    // alley side walls
    for (const dz of [ax0-0.1, ax1+0.1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(depth, 14, 0.4), matDirty.clone());
      scaleBoxUV(w.geometry, depth, 14, 0.4, 3); w.position.set(-(STREET_HALF + depth/2), 7, dz); w.castShadow = true; w.receiveShadow = true; scene.add(w);
    }
    // back wall with door
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 14, ax1-ax0+0.4), matBrick.clone());
    scaleBoxUV(back.geometry, 0.4, 14, ax1-ax0+0.4, 3); back.position.set(-(STREET_HALF+depth), 7, cz); back.castShadow = true; back.receiveShadow = true; scene.add(back);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 1.4), new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.7, roughness: 0.5 }));
    door.position.set(-(STREET_HALF+depth)+0.3, 1.2, cz); scene.add(door);
    decal(makeKeypad(), 0.4, 0.55, -(STREET_HALF+depth)+0.42, 1.3, cz+0.9, Math.PI/2);
    // alley clutter + steam
    const dump = new THREE.Mesh(new THREE.BoxGeometry(2.2,1.3,1.1), matRust); dump.position.set(-(STREET_HALF+3), 0.65, ax0+0.8); dump.castShadow = true; scene.add(dump);
    steam.push({ x: -(STREET_HALF+depth)+1, y: 0.4, z: cz, rate: 1 });
    steam.push({ x: -(STREET_HALF+5), y: 0.3, z: cz+0.5, rate: 0.6 });
    ctx.addInteractable(door, { prompt: 'Tür öffnen', who: 'Stahltür // Keypad',
      lines: ['Verschlossen. Das Keypad leuchtet rot.', 'Eine eingeritzte Notiz: „Zugang nur mit Level-3 Clearance."'] });
  }

  // ---- street clutter ------------------------------------------------------
  function box(x,y,z,s,col){ const b = new THREE.Mesh(new THREE.BoxGeometry(s,s,s), new THREE.MeshStandardMaterial({color:col,roughness:0.95})); b.position.set(x,y+s/2,z); b.rotation.y=rnd(0,6); b.castShadow=true; b.receiveShadow=true; scene.add(b); }
  function trashBag(x,z){ const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4,1), matDark); b.position.set(x,0.32,z); b.scale.set(1,0.8,1); b.castShadow=true; scene.add(b); }
  function hydrant(x,z){ const g=new THREE.Group(); const b=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.18,0.7,10), new THREE.MeshStandardMaterial({color:0x9a3b2f,roughness:0.6,metalness:0.3})); b.position.y=0.35; g.add(b); const cap=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),b.material); cap.position.y=0.7; g.add(cap); g.position.set(x,0,z); g.traverse(o=>o.castShadow=true); scene.add(g); }
  function bench(x,z,rotY){ const g=new THREE.Group(); const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.1,0.5),matRust); seat.position.y=0.5; g.add(seat); const back=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.5,0.1),matRust); back.position.set(0,0.75,-0.2); g.add(back); g.position.set(x,0,z); g.rotation.y=rotY; g.traverse(o=>o.castShadow=true); scene.add(g); }
  function gully(x,z){ const m=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.5), new THREE.MeshStandardMaterial({color:0x14140f,roughness:0.8,metalness:0.5})); m.rotation.x=-Math.PI/2; m.position.set(x,0.02,z); scene.add(m); steam.push({x,y:0.05,z,rate:0.25}); }

  for (let i = 0; i < 7; i++) { const side = pick([-1,1]); box(side*(STREET_HALF-1)+rnd(-0.5,0.5), 0, rnd(Z_MIN+6,Z_MAX-6), rnd(0.4,0.8), pick([0x6b5a3f,0x7a6a4a,0x4a4438])); }
  for (let i = 0; i < 6; i++) trashBag(pick([-1,1])*(STREET_HALF-0.7)+rnd(-0.4,0.4), rnd(Z_MIN+6,Z_MAX-6));
  hydrant(STREET_HALF-1.1, 34); hydrant(-(STREET_HALF-1.1), 18);
  bench(STREET_HALF-1.5, 26, -Math.PI/2); bench(-(STREET_HALF-1.5), 40, Math.PI/2);
  for (let z = Z_MIN+8; z < Z_MAX; z += 13) { gully(ROAD_HALF-0.6, z); gully(-(ROAD_HALF-0.6), z+4); }
  // traffic cones near a small barrier
  for (let i = 0; i < 4; i++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18,0.5,10), new THREE.MeshStandardMaterial({color:0xd9622b,roughness:0.7})); cone.position.set(rnd(-2,2), 0.25, 6+i*1.2); cone.castShadow=true; scene.add(cone); }

  // ---- terminal near spawn (INTERACTION extra) ----------------------------
  {
    const x = STREET_HALF-1.3, z = 44;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5,1.5,0.3), matDark); post.position.set(x,0.75,z); post.castShadow=true; scene.add(post);
    const scr = makeScreen(2);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.4), new THREE.MeshStandardMaterial({ map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 1.2, roughness: 0.5 }));
    t.position.set(x-0.26, 1.25, z); t.rotation.y = -Math.PI/2 - 0.3; scene.add(t); screens.push(t.material);
    ctx.addInteractable(t, { prompt: 'Terminal benutzen', who: 'Stadt-Terminal // Block 7-A',
      lines: ['WILLKOMMEN IN BLOCK 7-A.', 'Folge der Straße nach Süden zur Hafenkante. Läden: Ramen, Cyberware, Pawn, Bar.'] });
  }

  return { colliders, steam, screens };
}
