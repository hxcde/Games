import * as THREE from 'three';
import { ROAD_HALF, SIDEWALK, FRONT, ROADS, ISLAND, blockStrips } from './config.js';

// extend a block boundary out over its sidewalk to the carriageway edge
const extLo = v => { const r = ROADS.find(r => Math.abs(v - (r + FRONT)) < 0.01); return r !== undefined ? r + ROAD_HALF : v; };
const extHi = v => { const r = ROADS.find(r => Math.abs(v - (r - FRONT)) < 0.01); return r !== undefined ? r - ROAD_HALF : v; };
import { makeSign, makeScreen, makeShopfront, makeGraffiti, makePoster, makeWarning, makeKeypad } from './canvasart.js';

const COOL = [0x39d2ff, 0xff6db0, 0x6a8bff, 0x7dffc0, 0xffae5e];

export function buildCity(scene, A, ctx) {
  const colliders = ctx.colliders, steam = ctx.steam, T = A.tex;
  const screens = [];
  const treeXf = [];   // collected tree transforms -> built as InstancedMesh (perf)
  const rnd = (a,b)=>a+Math.random()*(b-a), pick = a=>a[Math.floor(Math.random()*a.length)];
  const tmp = new THREE.Object3D();

  // ---- materials -----------------------------------------------------------
  const mat = (slug, o={}) => { const s=T[slug]; const p={ map:s.map, normalMap:s.normalMap, roughnessMap:s.roughnessMap, metalness:o.metalness??0, roughness:o.roughness??1, color:o.color??0xffffff, normalScale:new THREE.Vector2(o.ns??1,o.ns??1) };
    if (s.emissiveMap && o.emis!==false){ p.emissive=0xffffff; p.emissiveMap=s.emissiveMap; p.emissiveIntensity=o.emis??1.0; } return new THREE.MeshStandardMaterial(p); };
  const matAsphalt = mat('asphalt_02');
  const matGrass = mat('aerial_grass_rock',{color:0x8a9a6a});
  const matPave = mat('pavement_02');
  const matFloor = mat('concrete_floor_worn_001',{roughness:0.95});
  const matCurb = new THREE.MeshStandardMaterial({ color:0x6a6660, roughness:0.9 });
  const matMetal = mat('metal_plate_02',{metalness:0.9,roughness:0.45});
  const matRust = mat('rusty_metal_03',{metalness:0.5,roughness:0.8});
  const matDark = new THREE.MeshStandardMaterial({ color:0x16171b, roughness:0.7, metalness:0.4 });
  const matGlassDark = new THREE.MeshStandardMaterial({ color:0x0a0e15, roughness:0.08, metalness:0.3, envMapIntensity:1.6 });
  const matGlassLit = new THREE.MeshStandardMaterial({ color:0x2a2012, emissive:0xffcaa0, emissiveIntensity:2.2, roughness:0.4 });
  const FACADES = A.facades;
  const matRoof = mat('concrete_floor_worn_001',{color:0x33343a, roughness:0.95});

  function scaleUV(geo,w,h,d,tile){ const uv=geo.attributes.uv; const s=(f,ru,rv)=>{for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*ru,uv.getY(i)*rv);}};
    const rw=Math.max(1,w/tile),rh=Math.max(1,h/tile),rd=Math.max(1,d/tile); s(0,rd,rh);s(1,rd,rh);s(2,rw,rd);s(3,rw,rd);s(4,rw,rh);s(5,rw,rh); uv.needsUpdate=true; }
  function planeUV(geo,ru,rv){ const uv=geo.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*ru,uv.getY(i)*rv); uv.needsUpdate=true; }

  // ---- island, sea wall, base asphalt --------------------------------------
  const slabH=6, slab=new THREE.Mesh(new THREE.BoxGeometry(ISLAND*2+6,slabH,ISLAND*2+6), mat('concrete_wall_008',{color:0x4a4842}));
  scaleUV(slab.geometry,ISLAND*2,slabH,ISLAND*2,5); slab.position.y=-slabH/2; slab.receiveShadow=true; scene.add(slab);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(ISLAND*2,ISLAND*2), matAsphalt); planeUV(road.geometry,ISLAND*2/4,ISLAND*2/4); road.rotation.x=-Math.PI/2; road.position.y=0.01; road.receiveShadow=true; scene.add(road); ctx.walkables.push(road);
  // perimeter railing
  for (const s of [-1,1]) { const rx=new THREE.Mesh(new THREE.BoxGeometry(0.2,1,ISLAND*2),matMetal); rx.position.set(s*(ISLAND-0.5),0.5,0); rx.castShadow=true; scene.add(rx);
    const rz=new THREE.Mesh(new THREE.BoxGeometry(ISLAND*2,1,0.2),matMetal); rz.position.set(0,0.5,s*(ISLAND-0.5)); rz.castShadow=true; scene.add(rz); }

  // ---- window instancing ---------------------------------------------------
  const winDark=[], winLit=[], winGeo=new THREE.PlaneGeometry(1.3,1.8);
  function windowsBox(cx,cz,w,d,topY){
    const faces=[ {rotY:Math.PI/2,fx:cx+w/2,axis:'z',len:d,nx:1}, {rotY:-Math.PI/2,fx:cx-w/2,axis:'z',len:d,nx:-1},
                  {rotY:0,fz:cz+d/2,axis:'x',len:w,nz:1}, {rotY:Math.PI,fz:cz-d/2,axis:'x',len:w,nz:-1} ];
    for (const f of faces){ const cols=Math.max(1,Math.floor((f.len-2)/2.7)); const gap=f.len/cols;
      for (let y=3.6; y<topY-1.8; y+=3.1){ for (let c=0;c<cols;c++){ const t=-f.len/2+gap*(c+0.5);
        if (f.axis==='z') tmp.position.set(f.fx+(f.nx)*0.05, y, cz+t); else tmp.position.set(cx+t, y, f.fz+(f.nz)*0.05);
        tmp.rotation.set(0,f.rotY,0); tmp.updateMatrix(); (Math.random()<0.3?winLit:winDark).push(tmp.matrix.clone()); } } }
  }

  // ---- wall-mounted props --------------------------------------------------
  function decal(tx,w,h,x,y,z,rotY){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({map:tx,transparent:true,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2})); m.position.set(x,y,z); m.rotation.y=rotY; scene.add(m); return m; }
  function ac(x,y,z,rotY){ const g=new THREE.Group(); const b=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.9,0.7),matMetal); b.castShadow=true; g.add(b); const gr=new THREE.Mesh(new THREE.CircleGeometry(0.3,16),matDark); gr.position.z=0.36; g.add(gr); g.position.set(x,y,z); g.rotation.y=rotY; scene.add(g); }
  function pipe(x,y0,y1,z){ const h=y1-y0; const p=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,h,8),pick([matMetal,matRust])); p.position.set(x,(y0+y1)/2,z); p.castShadow=true; scene.add(p); }

  // ---- one building (photographic facade, windows baked in) ----------------
  function building(cx,cz,w,d,h){
    const slug=pick(FACADES); const tint=new THREE.Color().setHSL(rnd(0,1)<0.5?0.07:0.6, rnd(0,0.05), rnd(0.72,0.95)); // subtle, keep photo realism
    const m=mat(slug,{color:tint, roughness:1, emis:0.5});
    const tile=rnd(7,10); const geo=new THREE.BoxGeometry(w,h,d); scaleUV(geo,w,h,d,tile);
    const b=new THREE.Mesh(geo,[m,m,matRoof,matRoof,m,m]); b.position.set(cx,h/2,cz); b.castShadow=true; b.receiveShadow=true; scene.add(b);
    colliders.push({minX:cx-w/2,maxX:cx+w/2,minZ:cz-d/2,maxZ:cz+d/2});
    const rim=new THREE.Mesh(new THREE.BoxGeometry(w+0.3,0.7,d+0.3),matDark); rim.position.set(cx,h+0.35,cz); rim.castShadow=true; scene.add(rim);
    // rooftop
    if (Math.random()<0.9) ac(cx+rnd(-w/3,w/3),h+1.0,cz+rnd(-d/3,d/3),rnd(0,6));
    if (Math.random()<0.7){ const t=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1.6,12),matRust); t.position.set(cx+rnd(-w/4,w/4),h+1.4,cz+rnd(-d/4,d/4)); t.castShadow=true; scene.add(t); }
    if (h>34 && Math.random()<0.8){ const a=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,5,5),matMetal); a.position.set(cx+rnd(-2,2),h+3,cz+rnd(-2,2)); scene.add(a);
      const bl=new THREE.Mesh(new THREE.SphereGeometry(0.13,8,8),new THREE.MeshBasicMaterial({color:0xff3b3b})); bl.position.set(a.position.x,h+5.4,a.position.z); scene.add(bl); ctx.blink.push(bl); }
    // facade clutter on a random face
    const fx=cx + (Math.random()<0.5?1:-1)*w/2; for (let k=0;k<2;k++) if(Math.random()<0.5) ac(fx,rnd(5,h-3),cz+rnd(-d/3,d/3), fx>cx?Math.PI/2:-Math.PI/2);
    if (Math.random()<0.6) decal(makeGraffiti(),3,1.9, cx + (Math.random()<0.5?1:-1)*(w/2+0.06), 2.0, cz+rnd(-d/3,d/3), Math.random()<0.5?Math.PI/2:-Math.PI/2);
    return b;
  }

  // ---- block pad (extends over its sidewalks to the carriageway edge) ------
  function pad(x0,x1,z0,z1,material,hgt=0.2){
    const ax0=extLo(x0), ax1=extHi(x1), az0=extLo(z0), az1=extHi(z1);   // sidewalk-extended
    const w=ax1-ax0,d=az1-az0,cx=(ax0+ax1)/2,cz=(az0+az1)/2;
    // sidewalk apron (concrete) under everything
    const apron=new THREE.Mesh(new THREE.BoxGeometry(w,hgt,d), new THREE.MeshStandardMaterial({color:0x6f6c66, roughness:0.95}));
    apron.position.set(cx,hgt/2,cz); apron.receiveShadow=true; scene.add(apron);
    // curb lip at the carriageway edges
    const curb=new THREE.Mesh(new THREE.BoxGeometry(w+0.06,hgt+0.14,d+0.06),matCurb); curb.position.set(cx,(hgt+0.14)/2,cz); curb.receiveShadow=true; scene.add(curb);
    // the actual district surface on top of the apron (covers the block interior)
    const iw=x1-x0,id=z1-z0;
    const p=new THREE.Mesh(new THREE.BoxGeometry(iw,0.06,id),material); scaleUV(p.geometry,iw,0.06,id,4); p.position.set((x0+x1)/2,hgt+0.03,(z0+z1)/2); p.receiveShadow=true; scene.add(p); ctx.walkables.push(p);
    return {cx:(x0+x1)/2,cz:(z0+z1)/2,w:iw,d:id}; }

  // ---- districts -----------------------------------------------------------
  function placeTree(x,y,z){ if(!A.tree) return;
    for(const t of treeXf){ const dx=t.x-x,dz=t.z-z; if(dx*dx+dz*dz<9) return; }   // min 3 m spacing -> no clipping
    const s=A.treeScale*rnd(0.85,1.3); treeXf.push({x, y:y - A.treeMinY*s, z, s, rotY:rnd(0,Math.PI*2)}); }
  function alleyClutter(x,z){ if(Math.random()<0.6) trash(x+rnd(-0.6,0.6),z+rnd(-0.6,0.6)); if(Math.random()<0.6) box(x+rnd(-0.6,0.6),z+rnd(-0.6,0.6),rnd(0.4,0.7)); if(Math.random()<0.4) pipe(x+rnd(-0.5,0.5),0.3,rnd(5,12),z+rnd(-0.5,0.5)); if(Math.random()<0.3) steam.push({x,y:0.25,z,rate:0.25}); }
  // denser blocks: many smaller buildings separated by narrow walkable alleys
  function districtBuildings(x0,x1,z0,z1){
    pad(x0,x1,z0,z1,matPave);
    const inset=1.2; x0+=inset;x1-=inset;z0+=inset;z1-=inset; const W=x1-x0,D=z1-z0;
    const nx=Math.max(1,Math.round(W/12)), nz=Math.max(1,Math.round(D/12)); const gx=W/nx, gz=D/nz;
    const a=1.15; // half alley width (wide enough for the player capsule)
    for (let i=0;i<nx;i++) for (let j=0;j<nz;j++){
      const bx0=x0+i*gx+a, bx1=x0+(i+1)*gx-a, bz0=z0+j*gz+a, bz1=z0+(j+1)*gz-a;
      if (bx1-bx0<3.5||bz1-bz0<3.5) continue;
      if (Math.random()<0.07){ alleyClutter((bx0+bx1)/2,(bz0+bz1)/2); continue; } // occasional courtyard/gap
      building((bx0+bx1)/2,(bz0+bz1)/2, bx1-bx0, bz1-bz0, rnd(13,22)+Math.random()*Math.random()*48);
      if (Math.random()<0.5) alleyClutter((bx0+bx1)/2, bz1+a); // clutter in the alley behind
    }
  }

  function districtPark(x0,x1,z0,z1){
    pad(x0,x1,z0,z1,matGrass,0.18);
    const cx=(x0+x1)/2,cz=(z0+z1)/2;
    // crossing paths
    for (const [w,d,px,pz] of [[x1-x0-2,3,cx,cz],[3,z1-z0-2,cx,cz]]){ const p=new THREE.Mesh(new THREE.BoxGeometry(w,0.04,d),matPave); planeUVbox(p.geometry); p.position.set(px,0.3,pz); p.receiveShadow=true; scene.add(p); }
    function planeUVbox(geo){ scaleUV(geo,4,1,4,2); }
    // real trees (photogrammetry model, instanced clones)
    for (let i=0;i<10;i++){ const tx=rnd(x0+2.5,x1-2.5),tz=rnd(z0+2.5,z1-2.5); if (Math.abs(tx-cx)<2.8&&Math.abs(tz-cz)<2.8) continue; placeTree(tx,0.24,tz); }
    // benches + lamps + fountain
    for (let i=0;i<4;i++){ bench(rnd(x0+3,x1-3),rnd(z0+3,z1-3),rnd(0,6)); }
    parkLamp(cx-6,cz-6); parkLamp(cx+6,cz+6); parkLamp(cx+6,cz-6); parkLamp(cx-6,cz+6);
    const basin=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.6,0.6,20),matPave); basin.position.set(cx,0.5,cz); basin.castShadow=true; basin.receiveShadow=true; scene.add(basin);
    const water=new THREE.Mesh(new THREE.CircleGeometry(2.2,20),new THREE.MeshStandardMaterial({color:0x20303a,metalness:0.9,roughness:0.15,envMapIntensity:1.2})); water.rotation.x=-Math.PI/2; water.position.set(cx,0.82,cz); scene.add(water);
    steam.push({x:cx,y:1.0,z:cz,rate:0.3});
  }
  function bench(x,z,rotY){ const g=new THREE.Group(); const s=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.1,0.5),matRust); s.position.y=0.5; g.add(s); const bk=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.5,0.1),matRust); bk.position.set(0,0.75,-0.2); g.add(bk); g.position.set(x,0.28,z); g.rotation.y=rotY; g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(g); }
  function parkLamp(x,z){ const g=new THREE.Group(); const p=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,4.5,8),matDark); p.position.y=2.25; p.castShadow=true; g.add(p);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.28,12,12),new THREE.MeshStandardMaterial({color:0xfff0d0,emissive:0xffe2a8,emissiveIntensity:3})); head.position.y=4.6; g.add(head); g.position.set(x,0.28,z); scene.add(g);
    if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(0xffce95,6,16,2); pl.position.set(x,4.6,z); scene.add(pl);} }

  function districtParking(x0,x1,z0,z1){
    pad(x0,x1,z0,z1,matFloor);
    const cx=(x0+x1)/2,cz=(z0+z1)/2, W=x1-x0-3, D=z1-z0-3;
    const levels=[0.25,3.6,6.95,10.3]; const deckMat=mat('concrete_floor_worn_001',{roughness:0.95,color:0x8f8c86});
    // decks
    for (let l=1;l<levels.length;l++){ const deck=new THREE.Mesh(new THREE.BoxGeometry(W,0.3,D),deckMat); scaleUV(deck.geometry,W,0.3,D,3); deck.position.set(cx,levels[l],cz); deck.castShadow=true; deck.receiveShadow=true; scene.add(deck);
      // spandrel bands (open sides)
      for (const s of [-1,1]){ const bx=new THREE.Mesh(new THREE.BoxGeometry(W,0.5,0.3),matDark); bx.position.set(cx,levels[l]+0.9,cz+s*D/2); scene.add(bx); const bz=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.5,D),matDark); bz.position.set(cx+s*W/2,levels[l]+0.9,cz); scene.add(bz);} }
    // columns
    const top=levels[levels.length-1]+0.5;
    for (let gx=-1;gx<=1;gx++) for (let gz=-1;gz<=1;gz++){ const col=new THREE.Mesh(new THREE.BoxGeometry(0.8,top,0.8),deckMat); col.position.set(cx+gx*W/3,top/2,cz+gz*D/3); col.castShadow=true; col.receiveShadow=true; scene.add(col);
      colliders.push({minX:col.position.x-0.6,maxX:col.position.x+0.6,minZ:col.position.z-0.6,maxZ:col.position.z+0.6}); }
    // roof
    const roof=new THREE.Mesh(new THREE.BoxGeometry(W+1,0.4,D+1),deckMat); roof.position.set(cx,top,cz); roof.castShadow=true; scene.add(roof);
    // parked cars on each deck
    for (let l=0;l<levels.length-1;l++){ for (let k=0;k<4;k++){ const pc=parkedCar(); pc.position.set(cx+rnd(-W/2.6,W/2.6), levels[l]+0.05, cz+rnd(-D/2.6,D/2.6)); pc.rotation.y=Math.random()<0.5?0:Math.PI; scene.add(pc);} }
    // entrance "P" sign facing the main street (-X side)
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6), new THREE.MeshStandardMaterial({color:0x103a6a,emissive:0x2a6cff,emissiveIntensity:2,roughness:0.5}));
    sign.position.set(x0-0.05, 4, cz); sign.rotation.y=-Math.PI/2; scene.add(sign);
    const pLabel=decal(letterP(), 1.2,1.2, x0-0.07, 4, cz, -Math.PI/2); pLabel.material.emissive=new THREE.Color(0xffffff); pLabel.material.emissiveMap=pLabel.material.map; pLabel.material.emissiveIntensity=2.5; pLabel.material.transparent=true;
    if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(0x6aa0ff,5,18,2); pl.position.set(x0-1.5,4,cz); scene.add(pl);}
    // emissive ceiling tube fixtures (read as light without costly real lights)
    for (let l=1;l<levels.length;l++) for (const oz of [-D/4,D/4]){ const tube=new THREE.Mesh(new THREE.BoxGeometry(W*0.7,0.12,0.2), new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xe6eeff,emissiveIntensity:3.2})); tube.position.set(cx,levels[l]-0.25,cz+oz); scene.add(tube); }
    // a couple of real lights so the ground deck + cars actually catch light
    for (const oz of [-D/4, D/4]) if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(0xcfe6ff,6,20,2); pl.position.set(cx,1.8,cz+oz); scene.add(pl);}
    // locked office door (INTERACTION) on the street side
    const door=new THREE.Mesh(new THREE.BoxGeometry(0.2,2.3,1.3),new THREE.MeshStandardMaterial({color:0x2a2d33,metalness:0.7,roughness:0.5})); door.position.set(x0-0.05,1.15,cz+4); scene.add(door);
    decal(makeKeypad(),0.4,0.55,x0-0.1,1.3,cz+4.9,-Math.PI/2);
    ctx.addInteractable(door,{prompt:'Tür zum Wachraum',who:'Parkhaus // Wachraum',lines:['Verschlossen. Drinnen flackert ein Monitor.','„Nachtschicht — bin auf Rundgang. Zugang nur mit Karte."']});
  }
  function letterP(){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'); g.clearRect(0,0,128,128); g.fillStyle='#dfeeff'; g.font='bold 110px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('P',64,68); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  function parkedCar(){ const g=new THREE.Group(); const bm=new THREE.MeshStandardMaterial({color:pick([0x6b2f2f,0x2f3b5a,0x3a3a3a,0x5a5a50]),metalness:0.7,roughness:0.45,envMapIntensity:0.8}); const b=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.6,4),bm); b.position.y=0.7; g.add(b); const cab=new THREE.Mesh(new THREE.BoxGeometry(1.65,0.55,2),new THREE.MeshStandardMaterial({color:0x0c1014,metalness:0.5,roughness:0.15,envMapIntensity:1.2})); cab.position.set(0,1.15,-0.2); g.add(cab); g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); return g; }

  function districtPlaza(x0,x1,z0,z1){
    pad(x0,x1,z0,z1,matPave); const cx=(x0+x1)/2,cz=(z0+z1)/2;
    podium(x0+3, x0+15, z0+3, z0+15, 3);   // raised terrace level with stairs
    for(let i=0;i<2;i++) placeTree(rnd(x0+16,x1-3),0.26,rnd(z0+4,z1-4));   // a few real trees
    for (let i=0;i<3;i++) bench(rnd(x0+3,x1-3),rnd(z0+3,z1-3),rnd(0,6));
    // planters
    for (let i=0;i<4;i++){ const p=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.6,1.4),matCurb); p.position.set(rnd(x0+3,x1-3),0.5,rnd(z0+3,z1-3)); p.castShadow=true; scene.add(p);
      const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(0.8,1),new THREE.MeshStandardMaterial({color:0x2f4a28,roughness:0.95})); bush.position.set(p.position.x,1.1,p.position.z); bush.scale.y=0.7; bush.castShadow=true; scene.add(bush); }
    // big ad screen (INTERACTION) facing the intersection (+X,+Z corner toward center 0,0 which is +X,+Z from this SW plaza)
    const sx=x1-0.3, sz=cz; const scr=makeScreen(0);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(0.3,6,3.6),matDark); frame.position.set(sx,9,sz); scene.add(frame);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(3.2,5.4),new THREE.MeshStandardMaterial({map:scr,emissive:0xffffff,emissiveMap:scr,emissiveIntensity:1.4,roughness:0.5})); screen.position.set(sx+0.18,9,sz); screen.rotation.y=Math.PI/2; scene.add(screen); screens.push(screen.material);
    if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(0x4fc3ff,6,16,2); pl.position.set(sx+1.6,9,sz); scene.add(pl);}
    ctx.addInteractable(screen,{prompt:'Werbescreen lesen',who:'SYNTH-CORP // Ad-Net',lines:['„BLEIB VERNETZT. BLEIB SICHER. BLEIB SYNTH."','Darunter scrollt eine Störmeldung: Sektor 7 Stromnetz instabil.']});
    // terminal
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.5,0.3),matDark); post.position.set(cx,0.95,cz+3); post.castShadow=true; scene.add(post);
    const ts=makeScreen(2); const t=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.42),new THREE.MeshStandardMaterial({map:ts,emissive:0xffffff,emissiveMap:ts,emissiveIntensity:1.3,roughness:0.5})); t.position.set(cx,1.45,cz+3.16); scene.add(t); screens.push(t.material);
    ctx.addInteractable(t,{prompt:'Terminal benutzen',who:'Stadt-Terminal // Insel 7',lines:['WILLKOMMEN AUF INSEL 7.','Park im Osten, Parkhaus im Westen. Folge der Hauptstraße nach Süden zur Hafenkante.']});
  }

  // ---- vertical levels: stairs (with invisible walkable ramp), podium, overpass
  function stairs(sx,sz,len,fromY,toY,width,axis,sign){
    const steps=Math.max(4,Math.round((toY-fromY)/0.2));
    for(let i=0;i<steps;i++){ const h=fromY+(toY-fromY)*((i+1)/steps); const off=sign*len*((i+0.5)/steps);
      const sw=axis==='z'?width:len/steps+0.06, sd=axis==='z'?len/steps+0.06:width;
      const st=new THREE.Mesh(new THREE.BoxGeometry(sw,h,sd),matFloor); st.position.set(axis==='z'?sx:sx+off, h/2, axis==='z'?sz+off:sz); st.castShadow=true; st.receiveShadow=true; scene.add(st); }
    const ramp=new THREE.Mesh(new THREE.BoxGeometry(axis==='z'?width:len,0.16,axis==='z'?len:width), new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    ramp.position.set(axis==='z'?sx:sx+sign*len/2,(fromY+toY)/2+0.12,axis==='z'?sz+sign*len/2:sz);
    const ang=Math.atan2(toY-fromY,len); if(axis==='z') ramp.rotation.x=-sign*ang; else ramp.rotation.z=sign*ang;
    scene.add(ramp); ctx.walkables.push(ramp);
  }
  function podium(x0,x1,z0,z1,h){
    const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
    const base=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat('concrete_wall_008',{color:0x6a665e})); scaleUV(base.geometry,w,h,d,4); base.position.set(cx,h/2,cz); base.castShadow=true; base.receiveShadow=true; scene.add(base);
    colliders.push({minX:x0,maxX:x1,minZ:z0,maxZ:z1,top:h});
    const top=new THREE.Mesh(new THREE.BoxGeometry(w,0.1,d),matPave); scaleUV(top.geometry,w,0.1,d,3); top.position.set(cx,h+0.05,cz); top.receiveShadow=true; scene.add(top); ctx.walkables.push(top);
    for(const s of [-1,1]){ const r=new THREE.Mesh(new THREE.BoxGeometry(w,0.8,0.1),matMetal); r.position.set(cx,h+0.5,cz+s*d/2); scene.add(r); }
    const r2=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.8,d),matMetal); r2.position.set(x0,h+0.5,cz); scene.add(r2);
    stairs(cx, z1+4, 4, 0, h, Math.min(6,w*0.6), 'z', -1); // ground at z1+4 up to the z1 edge
  }
  function overpass(z,x0,x1,h,width){
    const len=x1-x0,cx=(x0+x1)/2;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(len,0.3,width),matFloor); scaleUV(deck.geometry,len,0.3,width,3); deck.position.set(cx,h,z); deck.castShadow=true; deck.receiveShadow=true; scene.add(deck);
    const top=new THREE.Mesh(new THREE.BoxGeometry(len,0.06,width),matFloor); top.position.set(cx,h+0.18,z); top.receiveShadow=true; scene.add(top); ctx.walkables.push(top);
    for(const s of [-1,1]){ const rail=new THREE.Mesh(new THREE.BoxGeometry(len,1,0.1),matMetal); rail.position.set(cx,h+0.7,z+s*width/2); scene.add(rail); }
    for(const ex of [x0,x1]) for(const sz of [-1,1]){ const p=new THREE.Mesh(new THREE.BoxGeometry(0.5,h,0.5),mat('concrete_wall_008',{color:0x5a5650})); p.position.set(ex,h/2,z+sz*(width/2-0.1)); p.castShadow=true; scene.add(p); }
    stairs(x0-4.5, z, 4.5, 0, h, width-0.6, 'x', +1); // ground at x0-4.5 up to x0
    stairs(x1+4.5, z, 4.5, 0, h, width-0.6, 'x', -1); // ground at x1+4.5 up to x1
  }

  // ---- lay out the grid ----------------------------------------------------
  const X = blockStrips(), Z = blockStrips();
  const TYPE = { '1,1':'plaza', '2,1':'park', '1,2':'parking' };
  for (let i=0;i<X.length;i++) for (let j=0;j<Z.length;j++){
    const [x0,x1]=X[i], [z0,z1]=Z[j]; const t=TYPE[i+','+j]||'buildings';
    if (t==='park') districtPark(x0,x1,z0,z1);
    else if (t==='parking') districtParking(x0,x1,z0,z1);
    else if (t==='plaza') districtPlaza(x0,x1,z0,z1);
    else districtBuildings(x0,x1,z0,z1);
  }
  overpass(-18, -11, 11, 5.2, 4);   // pedestrian bridge across the main street (another level)

  // commit windows
  if (winDark.length){ const im=new THREE.InstancedMesh(winGeo,matGlassDark,winDark.length); winDark.forEach((m,i)=>im.setMatrixAt(i,m)); im.instanceMatrix.needsUpdate=true; im.castShadow=false; scene.add(im); }
  if (winLit.length){ const im=new THREE.InstancedMesh(winGeo,matGlassLit,winLit.length); winLit.forEach((m,i)=>im.setMatrixAt(i,m)); im.instanceMatrix.needsUpdate=true; scene.add(im); }

  // ---- roads: lane markings, crosswalks, lamps -----------------------------
  const paintMat=new THREE.MeshStandardMaterial({color:0xb9b3a0,roughness:0.8,emissive:0x141414,emissiveIntensity:0.3,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  function dashLine(isX,c){ for (let p=-ISLAND+4;p<ISLAND-4;p+=4){ const d=new THREE.Mesh(new THREE.PlaneGeometry(0.16,2),paintMat); d.rotation.x=-Math.PI/2; if(isX){d.rotation.z=Math.PI/2; d.position.set(p+1,0.02,c);} else d.position.set(c,0.02,p+1); scene.add(d);} }
  for (const r of ROADS){ dashLine(false,r); dashLine(true,r); }
  // crosswalks at intersections
  const cwTex=crosswalkTex(); const cwMat=new THREE.MeshStandardMaterial({map:cwTex,transparent:true,roughness:0.8,emissive:0x111111,emissiveIntensity:0.25,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}); const cwGeo=new THREE.PlaneGeometry(ROAD_HALF*2,ROAD_HALF*2);
  for (const rx of ROADS) for (const rz of ROADS){ const m=new THREE.Mesh(cwGeo,cwMat); m.rotation.x=-Math.PI/2; m.position.set(rx,0.018,rz); scene.add(m); }
  function crosswalkTex(){ const s=128,c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d'); g.clearRect(0,0,s,s); g.fillStyle='#d8d8cc'; const b=18; for(let x=6;x<s-6;x+=12){g.fillRect(x,2,6,b);g.fillRect(x,s-b-2,6,b);} for(let y=6;y<s-6;y+=12){g.fillRect(2,y,b,6);g.fillRect(s-b-2,y,b,6);} const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  // street lamps along the main roads
  for (const r of ROADS){ for (let p=-ISLAND+10;p<ISLAND-6;p+=18){ streetLamp(r+ROAD_HALF+1,p,-1); streetLamp(p,r+ROAD_HALF+1,1,true); } }
  function streetLamp(x,z,dirX,along){ const g=new THREE.Group(); const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,5.5,8),matDark); pole.position.y=2.75; pole.castShadow=true; g.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.12,0.12),matDark); arm.position.set(dirX*0.8,5.4,0); g.add(arm); const head=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.22,0.4),new THREE.MeshStandardMaterial({color:0xffe7b0,emissive:0xffcf95,emissiveIntensity:3})); head.position.set(dirX*1.6,5.3,0); g.add(head);
    g.position.set(x,0.2,z); if(along) g.rotation.y=Math.PI/2; scene.add(g);
    if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(0xffc98a,5,17,2); pl.position.set(x+(along?0:dirX*1.6),5,z+(along?dirX*1.6:0)); scene.add(pl);} }

  // ---- shops on the main street (right side faces -X) ----------------------
  function shopfront(faceX,z,normalSign,name,color){
    const scr=makeShopfront(name,color); const rotY=normalSign>0?Math.PI/2:-Math.PI/2;
    const f=decal(scr,5,1.8,faceX+normalSign*0.06,1.6,z,rotY); f.material.emissive=new THREE.Color(0xffffff); f.material.emissiveMap=f.material.map; f.material.emissiveIntensity=1.0; f.material.transparent=false;
    const awn=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.12,4.6),new THREE.MeshStandardMaterial({color:pick([0x6b2b2b,0x2b3b6b,0x3b3b2b]),roughness:0.85})); awn.position.set(faceX+normalSign*0.9,2.8,z); awn.castShadow=true; scene.add(awn);
    const sgn=makeSign(name.split(' ')[0],color); const hs=new THREE.Mesh(new THREE.BoxGeometry(0.1,2.4,1.2),new THREE.MeshStandardMaterial({map:sgn,emissive:0xffffff,emissiveMap:sgn,emissiveIntensity:1.6,roughness:0.6})); hs.position.set(faceX+normalSign*1.3,5,z); hs.castShadow=true; scene.add(hs);
    if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(0xffcaa0,3.5,8,2); pl.position.set(faceX+normalSign*1.4,2.4,z); scene.add(pl);}
    if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(color,2.5,7,2); pl.position.set(faceX+normalSign*1.5,5,z); scene.add(pl);}
  }
  // right side of main street (block X[8,32]) faces -X toward the road at x=8
  shopfront(8,26,-1,'NEO-RAMEN','#ff8a3c');
  shopfront(8,14,-1,'AKARI CYBERWARE','#39d2ff');
  shopfront(8,56,-1,'PAWN 24H','#ffd23f');
  shopfront(8,64,-1,'THE WIRED BAR','#ff4db0');
  shopfront(-8,30,1,'STOP-N-GO','#6a8bff');       // Mini-Markt (Westseite)
  shopfront(-8,52,1,'FIXIT CYBERTECH','#ffae5e');  // Repair-Shop (Westseite)

  // market stalls, seating cluster, delivery pallets (pedestrian-zone life)
  function stall(x,z,rotY,color){ const g=new THREE.Group();
    const top=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.1,1.6),new THREE.MeshStandardMaterial({color,roughness:0.8})); top.position.y=2.2; g.add(top);
    const cnt=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.0,1.2),matDark); cnt.position.y=0.5; g.add(cnt);
    for(const sx of [-1,1]) for(const sz of [-1,1]){ const leg=new THREE.Mesh(new THREE.BoxGeometry(0.08,2.2,0.08),matMetal); leg.position.set(sx*1.05,1.1,sz*0.7); g.add(leg); }
    g.position.set(x,0.2,z); g.rotation.y=rotY; scene.add(g); steam.push({x,y:1.2,z,rate:0.2}); }
  stall(ROAD_HALF+2, 8, 0, 0x7a2b2b); stall(ROAD_HALF+2, 4, 0, 0x2b3b6b); stall(-(ROAD_HALF+2), -6, Math.PI, 0x3b3b2b);
  function pallet(x,z){ const p=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.2,1.2),matRust); p.position.set(x,0.3,z); scene.add(p);
    for(let i=0;i<3;i++){ const bx=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),new THREE.MeshStandardMaterial({color:0x6b5a3f,roughness:0.95})); bx.position.set(x+rnd(-0.3,0.3),0.6+i*0.5,z+rnd(-0.3,0.3)); bx.rotation.y=rnd(0,6); scene.add(bx); } }
  pallet(-(FRONT-1.2),18); pallet(FRONT-1.2,-30);   // Lieferzonen
  // vending machines near ramen
  for (let i=0;i<3;i++){ const x=8.5,z=20+i*1.3; const vm=new THREE.Mesh(new THREE.BoxGeometry(1.1,2,0.8),matDark); vm.position.set(x,1,z); vm.castShadow=true; scene.add(vm);
    const face=decal(makeScreen(i),1,1.7,x-0.41,1.1,z,-Math.PI/2); face.material.emissive=new THREE.Color(0xffffff); face.material.emissiveMap=face.material.map; face.material.emissiveIntensity=1.1; face.material.transparent=false; screens.push(face.material);
    if (ctx.lightBudget.n<ctx.lightBudget.max){ ctx.lightBudget.n++; const pl=new THREE.PointLight(pick(COOL),2,5,2); pl.position.set(x-0.7,1.4,z); scene.add(pl);} }

  // ---- scattered street clutter -------------------------------------------
  function box(x,z,s){ const b=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),new THREE.MeshStandardMaterial({color:pick([0x6b5a3f,0x7a6a4a,0x4a4438]),roughness:0.95})); b.position.set(x,0.2+s/2,z); b.rotation.y=rnd(0,6); b.castShadow=true; b.receiveShadow=true; scene.add(b); }
  function trash(x,z){ const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.4,1),matDark); b.position.set(x,0.5,z); b.scale.y=0.8; b.castShadow=true; scene.add(b); }
  function gully(x,z){ const m=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.5),new THREE.MeshStandardMaterial({color:0x14140f,roughness:0.8,metalness:0.5})); m.rotation.x=-Math.PI/2; m.position.set(x,0.02,z); scene.add(m); if(Math.random()<0.5) steam.push({x,y:0.05,z,rate:0.25}); }
  for (let i=0;i<10;i++){ const r=pick(ROADS); box(r+rnd(-5,5),rnd(-ISLAND+12,ISLAND-12),rnd(0.4,0.8)); }
  for (let i=0;i<10;i++){ const r=pick(ROADS); trash(r+rnd(-5,5),rnd(-ISLAND+12,ISLAND-12)); }
  for (const r of ROADS) for (let p=-ISLAND+16;p<ISLAND-10;p+=22) gully(r+ROAD_HALF-1,p);

  // ---- ground decals: oil stains, tyre marks, manholes (dry, worn look) ----
  function stainTex(){ const s=128,c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d'); g.clearRect(0,0,s,s);
    for(let i=0;i<5;i++){ const x=rnd(30,98),y=rnd(30,98),r=rnd(18,42); const rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,'rgba(8,7,6,0.55)'); rg.addColorStop(1,'rgba(8,7,6,0)'); g.fillStyle=rg; g.fillRect(0,0,s,s); }
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  function tyreTex(){ const s=128,c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d'); g.clearRect(0,0,s,s); g.fillStyle='rgba(10,9,8,0.5)'; g.fillRect(40,4,14,120); g.fillRect(74,4,14,120); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  function manholeTex(){ const s=128,c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d'); g.clearRect(0,0,s,s); g.fillStyle='#1a1a1e'; g.beginPath(); g.arc(64,64,52,0,7); g.fill(); g.strokeStyle='#2c2c30'; g.lineWidth=3; for(let r=12;r<52;r+=10){ g.beginPath(); g.arc(64,64,r,0,7); g.stroke(); } const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  const stainT=stainTex(), tyreT=tyreTex(), manT=manholeTex();
  function gdecal(tex,w,h,x,z,rotY){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:0.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4})); m.rotation.x=-Math.PI/2; m.rotation.z=rotY||0; m.position.set(x,0.03,z); scene.add(m); }
  for(let i=0;i<8;i++){ gdecal(stainT, rnd(2,4), rnd(2,4), pick(ROADS)+rnd(-3,3), rnd(-ISLAND+14,ISLAND-14)); }
  for(let i=0;i<5;i++){ gdecal(tyreT, 1.6, rnd(5,9), pick(ROADS)+rnd(-2,2), rnd(-ISLAND+16,ISLAND-16)); }
  for(const r of ROADS) for(const p of [-ISLAND/2, ISLAND/2]) gdecal(manT, 1.2, 1.2, r+ROAD_HALF-1.5, p);

  // a few street trees along the main sidewalks (more "boulevard" feel)
  for (const z of [-58, -34, 34, 58]) { placeTree(FRONT-0.8, 0.26, z); placeTree(-(FRONT-0.8), 0.26, z); }

  // ---- commit trees as InstancedMesh (one batch per tree sub-mesh) ----------
  if (A.tree && treeXf.length) {
    A.tree.updateMatrixWorld(true);
    const subs = []; A.tree.traverse(o => { if (o.isMesh) subs.push({ geo: o.geometry, mat: o.material, off: o.matrixWorld.clone() }); });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
    for (const sub of subs) {
      const im = new THREE.InstancedMesh(sub.geo, sub.mat, treeXf.length);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      treeXf.forEach((t, i) => { E.set(0, t.rotY, 0); Q.setFromEuler(E); P.set(t.x, t.y, t.z); S.set(t.s, t.s, t.s); M.compose(P, Q, S); M.multiply(sub.off); im.setMatrixAt(i, M); });
      im.instanceMatrix.needsUpdate = true; scene.add(im);
    }
  }

  return { colliders, steam, screens };
}
