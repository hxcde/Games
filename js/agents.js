import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { ROAD_HALF, SIDEWALK, ROADS, ISLAND } from './config.js';

const JACKETS = [0x5e3a2e, 0x2f3b4f, 0x33363c, 0x44402f, 0x2f4a3a, 0x55454f, 0x6a5230, 0x3a3a44];
const PAINT = [0x9aa0a6, 0x1b1d22, 0x6b7079, 0x7a232f, 0x24405e, 0x2c3a2c, 0xb0a89a, 0x394b6b];
const SIDE = ROAD_HALF + SIDEWALK * 0.5;   // sidewalk lane offset
const GY = 0.26;                            // sidewalk top

export function createAgents(scene, A, ctx) {
  const T = A.tex, rnd = (a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  const mixers = [], peds = [], cars = [], obstacles = [];   // obstacles: {pos, r} for player collision

  // ---------- shared vehicle materials -------------------------------------
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcdd2d8, metalness: 1, roughness: 0.18, envMapIntensity: 1.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x090d12, metalness: 0.5, roughness: 0.05, envMapIntensity: 2.0 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x14151a, metalness: 0.4, roughness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffe9bd, emissiveIntensity: 3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff1414, emissiveIntensity: 2.2 });
  function tireTex(){ const c=document.createElement('canvas'); c.width=64;c.height=32; const g=c.getContext('2d'); g.fillStyle='#0c0d10'; g.fillRect(0,0,64,32); g.fillStyle='#1c1e22'; for(let x=0;x<64;x+=8){g.fillRect(x,4,4,24);} const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(16,1); return t; }
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9, metalness: 0.1, map: tireTex() });
  const rim = new THREE.MeshStandardMaterial({ color: T['metal_plate_02'].map?0xb8bcc2:0xb8bcc2, metalness: 1, roughness: 0.3, map: T['metal_plate_02'].map, normalMap: T['metal_plate_02'].normalMap });
  function paintMat(color, old=false){ if(old) return new THREE.MeshStandardMaterial({ color, map:T['rusty_metal_03'].map, normalMap:T['rusty_metal_03'].normalMap, roughnessMap:T['rusty_metal_03'].roughnessMap, metalness:0.5, roughness:0.7, envMapIntensity:0.8 });
    return new THREE.MeshPhysicalMaterial({ color, metalness:0.6, roughness:0.35, clearcoat:1, clearcoatRoughness:0.25, envMapIntensity:1.4 }); }
  function plateTex(){ const c=document.createElement('canvas'); c.width=128;c.height=40; const g=c.getContext('2d'); g.fillStyle='#d8d8c0'; g.fillRect(0,0,128,40); g.fillStyle='#15151a'; g.font='bold 26px monospace'; g.textAlign='center'; g.textBaseline='middle'; const s='NX-'+(1000+Math.floor(Math.random()*8999)); g.fillText(s,64,21); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  function wheel(g,x,z){ const w=new THREE.Mesh(new THREE.CylinderGeometry(0.37,0.37,0.32,18),tireMat); w.rotation.z=Math.PI/2; w.position.set(x,0.37,z); w.castShadow=true; g.add(w);
    const r=new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.21,0.34,12),rim); r.rotation.z=Math.PI/2; r.position.set(x,0.37,z); g.add(r); }
  function plate(g,z){ const p=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.16), new THREE.MeshStandardMaterial({map:plateTex(),roughness:0.6})); p.position.set(0,0.5,z); if(z<0) p.rotation.y=Math.PI; g.add(p); }

  function makeCar(color, old){
    const g=new THREE.Group(); const bm=paintMat(color,old);
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.85,0.55,4.3),bm); body.position.y=0.62; g.add(body);
    const hood=new THREE.Mesh(new THREE.BoxGeometry(1.75,0.28,1.3),bm); hood.position.set(0,0.78,1.45); g.add(hood);
    const trunk=new THREE.Mesh(new THREE.BoxGeometry(1.75,0.3,1.1),bm); trunk.position.set(0,0.8,-1.6); g.add(trunk);
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.62,2.2),bm); cabin.position.set(0,1.12,-0.15); g.add(cabin);
    // greenhouse glass
    for (const [zz,ll] of [[1.05,0.05],[-1.25,0.05]]){ const w=new THREE.Mesh(new THREE.BoxGeometry(1.55,0.5,0.06),glass); w.position.set(0,1.15,zz); g.add(w); }
    for (const sx of [-0.86,0.86]){ const sw=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.45,2.0),glass); sw.position.set(sx,1.15,-0.15); g.add(sw); }
    // bumpers + grille (chrome)
    for (const zz of [2.18,-2.18]){ const bp=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.2,0.18),chrome); bp.position.set(0,0.5,zz); g.add(bp); }
    // lights
    for (const sx of [-0.62,0.62]){ const hl=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.16),headMat); hl.position.set(sx,0.66,2.16); g.add(hl);
      const tl=new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.16),tailMat); tl.position.set(sx,0.72,-2.16); tl.rotation.y=Math.PI; g.add(tl); }
    // mirrors
    for (const sx of [-0.98,0.98]){ const mr=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.12,0.1),trim); mr.position.set(sx,1.05,0.9); g.add(mr); }
    plate(g,2.27); plate(g,-2.27);
    wheel(g,-0.92,1.4); wheel(g,0.92,1.4); wheel(g,-0.92,-1.5); wheel(g,0.92,-1.5);
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); return g;
  }
  function makeVan(color){
    const g=new THREE.Group(); const bm=paintMat(color,Math.random()<0.5);
    const cargo=new THREE.Mesh(new THREE.BoxGeometry(2.1,2.1,3.4),bm); cargo.position.set(0,1.35,-0.5); g.add(cargo);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(2.05,1.5,1.7),bm); cab.position.set(0,1.0,1.75); g.add(cab);
    const ws=new THREE.Mesh(new THREE.BoxGeometry(1.95,0.85,0.06),glass); ws.position.set(0,1.35,2.6); g.add(ws);
    for (const sx of [-0.95,0.95]){ const sw=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.7,1.2),glass); sw.position.set(sx,1.35,1.9); g.add(sw); }
    for (const zz of [2.62,-2.22]){ const bp=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.22,0.16),chrome); bp.position.set(0,0.5,zz); g.add(bp); }
    for (const sx of [-0.72,0.72]){ const hl=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.2),headMat); hl.position.set(sx,0.72,2.66); g.add(hl);
      const tl=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.3),tailMat); tl.position.set(sx,1.0,-2.21); tl.rotation.y=Math.PI; g.add(tl); }
    plate(g,2.7); plate(g,-2.25);
    wheel(g,-0.98,1.55); wheel(g,0.98,1.55); wheel(g,-0.98,-1.65); wheel(g,0.98,-1.65);
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); return g;
  }
  function makeBike(color){
    const g=new THREE.Group(); const bm=paintMat(color,false);
    const tank=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.34,1.0),bm); tank.position.set(0,0.78,0.1); g.add(tank);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.16,0.7),trim); seat.position.set(0,0.92,-0.5); g.add(seat);
    const fairing=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.5,0.4),bm); fairing.position.set(0,0.7,0.8); g.add(fairing);
    const fork=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.9,6),chrome); fork.position.set(0,0.7,0.85); fork.rotation.x=0.4; g.add(fork);
    for (const z of [0.95,-0.85]){ const w=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.14,18),tireMat); w.rotation.z=Math.PI/2; w.position.set(0,0.38,z); g.add(w);
      const rr=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.16,10),rim); rr.rotation.z=Math.PI/2; rr.position.set(0,0.38,z); g.add(rr); }
    const hl=new THREE.Mesh(new THREE.CircleGeometry(0.1,12),headMat); hl.position.set(0,0.78,1.0); g.add(hl);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(0.08,1.2),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.4,side:THREE.DoubleSide})); glow.rotation.y=Math.PI/2; glow.position.y=0.35; g.add(glow);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); return g;
  }

  // ---------- driving on the road grid -------------------------------------
  const R = ROADS, LANE = 2.4;
  const nb = (i,j)=>{ const o=[]; if(i>0)o.push([i-1,j]); if(i<R.length-1)o.push([i+1,j]); if(j>0)o.push([i,j-1]); if(j<R.length-1)o.push([i,j+1]); return o; };
  const np = (i,j)=> new THREE.Vector3(R[i],0,R[j]);
  function addCar(make){ const g=make; scene.add(g); const i=(Math.random()*R.length)|0, j=(Math.random()*R.length)|0; const n=nb(i,j); const [ti,tj]=n[(Math.random()*n.length)|0]; cars.push({g,fi:i,fj:j,ti,tj,t:Math.random(),speed:rnd(5,9)}); obstacles.push({pos:g.position,r:2.3}); }
  for (let i=0;i<5;i++) addCar(makeCar(pick(PAINT), Math.random()<0.4));
  addCar(makeVan(pick(PAINT)));

  // parked vehicles along curbs
  function park(g,x,z,rotY,r){ g.position.set(x,0,z); g.rotation.y=rotY; scene.add(g); obstacles.push({pos:g.position,r:r||2.3}); }
  park(makeCar(0x6b2f2f,true), ROAD_HALF-1.0, 30, 0, 2.5);
  park(makeVan(0x4a5240), -(ROAD_HALF-1.0), -22, Math.PI, 2.8);
  park(makeCar(0x24405e,false), ROAD_HALF-1.0, -50, 0, 2.5);
  park(makeBike(0x39d2ff), ROAD_HALF-0.7, 12, 0.2, 1.1);
  park(makeBike(0xff4db0), ROAD_HALF-0.7, 13.4, 0.18, 1.1);
  park(makeBike(0xffae3c), -(ROAD_HALF-0.7), 46, Math.PI-0.2, 1.1);

  function stepCars(dt){ const from=new THREE.Vector3(),to=new THREE.Vector3(),dir=new THREE.Vector3();
    for (const c of cars){ from.copy(np(c.fi,c.fj)); to.copy(np(c.ti,c.tj)); let L=Math.max(0.1,from.distanceTo(to)); c.t+=c.speed*dt/L;
      while(c.t>=1){ c.t-=1; const pf=[c.fi,c.fj]; c.fi=c.ti; c.fj=c.tj; let o=nb(c.fi,c.fj).filter(([a,b])=>!(a===pf[0]&&b===pf[1])); if(!o.length)o=nb(c.fi,c.fj); const[ti,tj]=o[(Math.random()*o.length)|0]; c.ti=ti;c.tj=tj; from.copy(np(c.fi,c.fj)); to.copy(np(c.ti,c.tj)); }
      dir.subVectors(to,from).normalize(); const right=new THREE.Vector3(dir.z,0,-dir.x); const p=from.clone().lerp(to,c.t).addScaledVector(right,LANE); c.g.position.set(p.x,0,p.z); c.g.rotation.y=Math.atan2(dir.x,dir.z); } }

  // ---------- people --------------------------------------------------------
  const clips=A.soldier.animations; const find=n=>THREE.AnimationClip.findByName(clips,n)||clips.find(c=>c.name.toLowerCase().includes(n.toLowerCase()));
  const walkClip=find('Walk')||clips[0], idleClip=find('Idle')||clips[0]; const FACE=Math.PI;
  function human(tint,clip,scale=1){ const r=cloneSkeleton(A.soldier.scene); r.scale.setScalar(scale); r.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false; o.material=o.material.clone(); if(tint!=null)o.material.color=new THREE.Color(tint);}}); const m=new THREE.AnimationMixer(r); const a=m.clipAction(clip); a.play(); a.time=Math.random()*1.5; mixers.push(m); scene.add(r); return r; }

  // pedestrians along every street, on the sidewalk, walking the street axis
  let pi=0;
  for (const r of R){ for (const side of [-1,1]){
    for (let k=0;k<2;k++){ const along = Math.random()<0.5; // along this vertical road (Z) or treat horizontally
      const h=human(JACKETS[pi++%JACKETS.length], walkClip, 0.95+Math.random()*0.12);
      // vertical road at x=r: lane at x=r+side*SIDE, walk along Z
      const dir = (k===0?1:-1);
      h.position.set(r+side*SIDE, GY+A.footOffset, rnd(-ISLAND+6,ISLAND-6));
      h.rotation.y=(dir>0?0:Math.PI)+FACE;
      peds.push({root:h, axis:'z', fixed:r+side*SIDE, dir, speed:1.1+Math.random()*0.5}); }
  }}
  // a few on a horizontal street too
  for (let k=0;k<3;k++){ const r=ROADS[1]; const side=k%2?1:-1; const h=human(pick(JACKETS),walkClip,1); const dir=k%2?1:-1;
    h.position.set(rnd(-ISLAND+6,ISLAND-6), GY+A.footOffset, r+side*SIDE); h.rotation.y=(dir>0?Math.PI/2:-Math.PI/2)+FACE;
    peds.push({root:h,axis:'x',fixed:r+side*SIDE,dir,speed:1.1+Math.random()*0.4}); }

  // vendor (INTERACTION) at the ramen shop on the main street (x≈8, z≈26)
  const vendor=human(0x8a5a2f,idleClip,1.0); vendor.position.set(7.2,GY+A.footOffset,26); vendor.rotation.y=-Math.PI/2+FACE;
  ctx.addInteractable(vendor,{prompt:'Mit Händler reden',who:'Old Hideo // Neo-Ramen',radius:2.6,
    lines:['„Setz dich, Choom. Heute Tonkotsu mit synthetischem Schweinebauch."','„Im Park treiben sich nachts Fixer rum. Und das Parkhaus... bleib da unten nicht zu lang."']});
  const stall=new THREE.Mesh(new THREE.BoxGeometry(2.2,1,1),new THREE.MeshStandardMaterial({color:0x3a2a20,roughness:0.8})); stall.position.set(6.6,GY+0.5,26); stall.castShadow=true; scene.add(stall); ctx.steam.push({x:6.6,y:GY+1.1,z:26,rate:0.5});
  // security + homeless
  const sec=human(0x20242c,idleClip,1.05); sec.position.set(-7.2,GY+A.footOffset,14); sec.rotation.y=Math.PI/2+FACE;
  const hobo=human(0x4a4034,idleClip,0.9); hobo.position.set(7.0,GY+A.footOffset,-12); hobo.rotation.y=-Math.PI/2+FACE; hobo.scale.set(0.95,0.6,0.95);

  // ---------- delivery drone -----------------------------------------------
  const drone=new THREE.Group();
  const db=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.2,0.7),trim); drone.add(db);
  for (const [ax,az] of [[-0.35,-0.45],[0.35,-0.45],[-0.35,0.45],[0.35,0.45]]){ const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.4,5),trim); arm.rotation.x=Math.PI/2; arm.position.set(ax,0,az*0.6); drone.add(arm); const rt=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.02,12),new THREE.MeshStandardMaterial({color:0x101216,transparent:true,opacity:0.35})); rt.position.set(ax,0.12,az); drone.add(rt); }
  const pkg=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4),new THREE.MeshStandardMaterial({color:0xb08a4a,roughness:0.9})); pkg.position.y=-0.35; drone.add(pkg);
  drone.add(new THREE.PointLight(0x9fd0ff,1.2,6,2));
  const dblink=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshBasicMaterial({color:0xff3b3b})); dblink.position.set(0,-0.12,0.36); drone.add(dblink);
  drone.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(drone);

  // ---------- distant flying vehicles (high background) --------------------
  const fliers=[]; for (let i=0;i<7;i++){ const f=new THREE.Group(); const b=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.5,1.0),new THREE.MeshStandardMaterial({color:0x15171c,metalness:0.6,roughness:0.5})); f.add(b);
    const tl=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.2),new THREE.MeshBasicMaterial({color:0xff5a5a})); tl.position.set(-1.3,0,0); f.add(tl);
    const hl=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.2),new THREE.MeshBasicMaterial({color:0xbfe9ff})); hl.position.set(1.3,0,0); f.add(hl);
    f.position.set((Math.random()-0.5)*240,60+Math.random()*60,(Math.random()-0.5)*240); f.scale.setScalar(1+Math.random()*2.5); scene.add(f); fliers.push({g:f,vx:(Math.random()<0.5?-1:1)*(4+Math.random()*7)}); }

  function update(t,dt){
    for (const m of mixers) m.update(dt);
    for (const p of peds){ if(p.axis==='z'){ p.root.position.z+=p.dir*p.speed*dt; if(p.dir>0&&p.root.position.z>ISLAND-5)p.root.position.z=-ISLAND+5; if(p.dir<0&&p.root.position.z<-ISLAND+5)p.root.position.z=ISLAND-5; }
      else { p.root.position.x+=p.dir*p.speed*dt; if(p.dir>0&&p.root.position.x>ISLAND-5)p.root.position.x=-ISLAND+5; if(p.dir<0&&p.root.position.x<-ISLAND+5)p.root.position.x=ISLAND-5; } }
    stepCars(dt);
    drone.position.set(Math.sin(t*0.2)*20, 5+Math.sin(t*1.4)*0.3, ((t*5)%(2*ISLAND))-ISLAND); drone.rotation.y=Math.PI+Math.sin(t*0.2)*0.3; dblink.visible=Math.sin(t*6)>0;
    for (const fl of fliers){ fl.g.position.x+=fl.vx*dt; if(fl.g.position.x>150)fl.g.position.x=-150; if(fl.g.position.x<-150)fl.g.position.x=150; fl.g.rotation.y=fl.vx>0?0:Math.PI; }
  }
  return { update, obstacles };
}
