import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { ROAD_HALF, SIDEWALK, STREET_HALF, Z_MIN, Z_MAX } from './config.js';

const JACKETS = [0x6b3b2f, 0x2f3b4f, 0x3a3a3a, 0x4a4030, 0x2f4a3a, 0x5a4a55];

export function createAgents(scene, A, ctx) {
  const mixers = [], peds = [], updaters = [];
  const clips = A.soldier.animations;
  const findClip = n => THREE.AnimationClip.findByName(clips, n) || clips.find(c => c.name.toLowerCase().includes(n.toLowerCase()));
  const walkClip = findClip('Walk') || clips[0];
  const idleClip = findClip('Idle') || clips[0];
  const FACE = Math.PI; // model faces -Z; offset to align with travel direction

  function makeHuman(tint, clip, scale = 1) {
    const root = cloneSkeleton(A.soldier.scene);
    root.scale.setScalar(scale);
    root.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false;
        o.material = o.material.clone(); if (tint != null) o.material.color = new THREE.Color(tint); }
    });
    const mixer = new THREE.AnimationMixer(root);
    const act = mixer.clipAction(clip); act.play(); act.time = Math.random()*1.5;
    mixers.push(mixer); scene.add(root);
    return root;
  }

  // ---- pedestrians walking the sidewalks ----------------------------------
  const lanes = [
    { x: -(ROAD_HALF + SIDEWALK*0.35), dir: 1 }, { x: -(ROAD_HALF + SIDEWALK*0.7), dir: -1 },
    { x:  (ROAD_HALF + SIDEWALK*0.35), dir: -1 }, { x:  (ROAD_HALF + SIDEWALK*0.7), dir: 1 },
  ];
  for (let i = 0; i < 8; i++) {
    const lane = lanes[i % lanes.length];
    const h = makeHuman(JACKETS[i % JACKETS.length], walkClip, 0.96 + Math.random()*0.1);
    const z = THREE.MathUtils.lerp(Z_MIN+4, Z_MAX-4, Math.random());
    h.position.set(lane.x + (Math.random()-0.5)*0.5, 0, z);
    h.rotation.y = (lane.dir > 0 ? 0 : Math.PI) + FACE;
    peds.push({ root: h, x: h.position.x, dir: lane.dir, speed: 1.2 + Math.random()*0.5 });
  }

  // ---- stationary characters ----------------------------------------------
  // vendor at the ramen shop (INTERACTION 2)
  const vendor = makeHuman(0x8a5a2f, idleClip, 1.0);
  vendor.position.set(STREET_HALF - 1.4, 0, 37);
  vendor.rotation.y = -Math.PI/2 + FACE;
  ctx.addInteractable(vendor, { prompt: 'Mit Händler reden', who: 'Old Hideo // Neo-Ramen',
    lines: ['„Setz dich, Choom. Heute gibt’s Tonkotsu mit synthetischem Schweinebauch."',
            '„Pass auf in der Gasse da hinten — die Security mag keine Neugier."'], radius: 2.4 });
  // a noodle-stall counter + steam
  const stall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.8 }));
  stall.position.set(STREET_HALF - 2.2, 0.5, 37); stall.castShadow = true; scene.add(stall);
  ctx.steam.push({ x: STREET_HALF - 2.2, y: 1.1, z: 37, rate: 0.5 });

  // security guard near the alley
  const sec = makeHuman(0x20242c, idleClip, 1.05);
  sec.position.set(-(STREET_HALF - 1.6), 0, 6.5); sec.rotation.y = Math.PI/2 + FACE; scene.add(sec);

  // homeless figure sitting against a wall
  const hobo = makeHuman(0x4a4034, idleClip, 0.9);
  hobo.position.set(STREET_HALF - 1.0, 0.0, 12); hobo.rotation.y = -Math.PI/2 + FACE; hobo.scale.set(0.95, 0.62, 0.95);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.5,1.2), new THREE.MeshStandardMaterial({color:0x5a3b2f,roughness:0.95}));
  blanket.position.set(STREET_HALF-1.0, 0.25, 12); blanket.castShadow = true; scene.add(blanket);

  // ---- delivery drone ------------------------------------------------------
  const drone = new THREE.Group();
  const db = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.2,0.7), new THREE.MeshStandardMaterial({color:0x2a2d33,metalness:0.7,roughness:0.4})); drone.add(db);
  for (const [ax,az] of [[-0.35,-0.45],[0.35,-0.45],[-0.35,0.45],[0.35,0.45]]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.4,5), new THREE.MeshStandardMaterial({color:0x15171b})); arm.rotation.x=Math.PI/2; arm.position.set(ax,0,az*0.6); drone.add(arm);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.02,12), new THREE.MeshStandardMaterial({color:0x101216,transparent:true,opacity:0.4})); rotor.position.set(ax,0.12,az); drone.add(rotor);
  }
  const pkg = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), new THREE.MeshStandardMaterial({color:0xb08a4a,roughness:0.9})); pkg.position.y=-0.35; drone.add(pkg);
  const dlight = new THREE.PointLight(0x66ccff, 1.5, 6, 2); dlight.position.y=-0.1; drone.add(dlight);
  const dblink = new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6), new THREE.MeshBasicMaterial({color:0xff3b3b})); dblink.position.set(0,-0.12,0.36); drone.add(dblink);
  drone.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  scene.add(drone);

  // ---- vehicles (worn / improvised) ---------------------------------------
  const matBody = c => new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.5, envMapIntensity: 0.9 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x0c1014, metalness: 0.5, roughness: 0.15, envMapIntensity: 1.2 });
  const matTire = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 });
  const headOn = new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffe6b0, emissiveIntensity: 2.5 });
  const tailOn = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff1414, emissiveIntensity: 2 });
  function wheels(g, w, zf, zb) { for (const [x,z] of [[-w,zf],[w,zf],[-w,zb],[w,zb]]) { const t=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.3,12),matTire); t.rotation.z=Math.PI/2; t.position.set(x,0.38,z); t.castShadow=true; g.add(t);} }
  function makeVan(color) {
    const g = new THREE.Group(); const bm = matBody(color);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.1,2.0,3.2), bm); cargo.position.set(0,1.3,-0.6); g.add(cargo);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0,1.5,1.6), bm); cab.position.set(0,1.0,1.7); g.add(cab);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.8,0.1), matGlass); ws.position.set(0,1.3,2.5); g.add(ws);
    for (const sx of [-0.7,0.7]) { const hl=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.2),headOn); hl.position.set(sx,0.7,2.56); g.add(hl);
      const tl=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.25),tailOn); tl.position.set(sx,0.9,-2.21); tl.rotation.y=Math.PI; g.add(tl); }
    wheels(g, 0.95, 1.5, -1.6); g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); return g;
  }
  function makeCar(color) {
    const g = new THREE.Group(); const bm = matBody(color);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.7,4.2), bm); body.position.y=0.7; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75,0.6,2.0), bm); cabin.position.set(0,1.2,-0.2); g.add(cabin);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.5,0.1), matGlass); ws.position.set(0,1.2,0.8); g.add(ws);
    // improvised roof rack + junk
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.1,1.6), matTire); rack.position.set(0,1.55,-0.2); g.add(rack);
    for (const sx of [-0.65,0.65]) { const hl=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.16),headOn); hl.position.set(sx,0.7,2.12); g.add(hl);
      const tl=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.16),tailOn); tl.position.set(sx,0.75,-2.11); tl.rotation.y=Math.PI; g.add(tl); }
    wheels(g, 0.9, 1.4, -1.5); g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); return g;
  }
  function makeBike(color) {
    const g = new THREE.Group(); const bm = matBody(color);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.35,1.7), bm); body.position.y=0.7; g.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.15,0.6), matTire); seat.position.set(0,0.92,-0.3); g.add(seat);
    for (const z of [0.8,-0.8]) { const w=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.36,0.12,16),matTire); w.rotation.z=Math.PI/2; w.position.set(0,0.36,z); g.add(w); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.1,1.4), new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.5,side:THREE.DoubleSide})); glow.position.set(0,0.3,0); glow.rotation.y=Math.PI/2; g.add(glow);
    const hl=new THREE.Mesh(new THREE.PlaneGeometry(0.12,0.12),headOn); hl.position.set(0,0.7,0.86); g.add(hl);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); return g;
  }

  // parked vehicles
  const van = makeVan(0x4a5240); van.position.set(ROAD_HALF-1.1, 0, 28); van.rotation.y = 0; scene.add(van);
  const car1 = makeCar(0x6b2f2f); car1.position.set(-(ROAD_HALF-1.1), 0, 20); car1.rotation.y = Math.PI; scene.add(car1);
  const bike1 = makeBike(0x39d2ff); bike1.position.set(ROAD_HALF-0.9, 0, 16); bike1.rotation.z = 0.18; bike1.rotation.y = 0.2; scene.add(bike1);
  const bike2 = makeBike(0xff4db0); bike2.position.set(ROAD_HALF-0.9, 0, 17.4); bike2.rotation.z = 0.18; bike2.rotation.y = 0.15; scene.add(bike2);
  // one moving car cruising the street
  const mover = makeCar(0x2f3b5a); scene.add(mover);
  const moverState = { z: Z_MAX-6, speed: 5 };

  // ---- distant flying vehicles (background only, high up) ------------------
  const fliers = [];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.5,1.0), new THREE.MeshStandardMaterial({color:0x15171c,metalness:0.6,roughness:0.5})); f.add(b);
    const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.2), new THREE.MeshBasicMaterial({color:0xff5a5a})); tl.position.set(-1.2,0,0); f.add(tl);
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.2), new THREE.MeshBasicMaterial({color:0xbfe9ff})); hl.position.set(1.2,0,0); f.add(hl);
    f.position.set((Math.random()-0.5)*200, 55 + Math.random()*45, (Math.random()-0.5)*200);
    f.scale.setScalar(1 + Math.random()*2);
    scene.add(f); fliers.push({ g: f, vx: (Math.random()<0.5?-1:1)*(4+Math.random()*6) });
  }

  // ---- update --------------------------------------------------------------
  function update(t, dt) {
    for (const m of mixers) m.update(dt);
    for (const p of peds) {
      p.root.position.z += p.dir * p.speed * dt;
      if (p.dir > 0 && p.root.position.z > Z_MAX-3) p.root.position.z = Z_MIN+3;
      if (p.dir < 0 && p.root.position.z < Z_MIN+3) p.root.position.z = Z_MAX-3;
    }
    // drone cruise + bob
    drone.position.set(Math.sin(t*0.25)*5, 4.2 + Math.sin(t*1.5)*0.25, ((t*4) % (Z_MAX-Z_MIN)) + Z_MIN);
    drone.rotation.y = Math.sin(t*0.25) * 0.3 + Math.PI;
    dblink.visible = Math.sin(t*6) > 0;
    // moving car
    moverState.z -= moverState.speed * dt;
    if (moverState.z < Z_MIN+4) moverState.z = Z_MAX-4;
    mover.position.set(ROAD_HALF*0.5, 0, moverState.z); mover.rotation.y = Math.PI;
    // fliers
    for (const fl of fliers) { fl.g.position.x += fl.vx * dt; if (fl.g.position.x > 140) fl.g.position.x = -140; if (fl.g.position.x < -140) fl.g.position.x = 140; fl.g.rotation.y = fl.vx>0?0:Math.PI; }
  }

  return { update };
}
