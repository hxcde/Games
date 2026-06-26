import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { loadAll } from './assets.js';
import { buildCity } from './city.js';
import { createAgents } from './agents.js';
import { SUN_DIR, ISLAND, WATER_Y } from './config.js';

const BUILD = '2026.06.26.island.1';
document.getElementById('build').textContent = 'Build ' + BUILD;
const LOW = new URLSearchParams(location.search).has('low');

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
const BASE_PR = Math.min(devicePixelRatio, LOW ? 1 : 1.75);
renderer.setPixelRatio(BASE_PR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;          // dusk (lifted so shadows/interiors read)
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LOW ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.3, 5400);
camera.position.set(0, 1.7, 34);

function softCircle(){ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const r=g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); }
const soft = softCircle();

// dusk sky (warm horizon to blue zenith) for background + IBL — not night yet
function makeSky(){ const w=1024,h=512,c=document.createElement('canvas'); c.width=w;c.height=h; const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'#1b2c54'); grad.addColorStop(0.42,'#28406e'); grad.addColorStop(0.60,'#3f527e');
  grad.addColorStop(0.72,'#7a6a72'); grad.addColorStop(0.80,'#c88a52'); grad.addColorStop(0.87,'#e0a35e'); grad.addColorStop(0.93,'#7a4a32'); grad.addColorStop(1,'#2a2230');
  g.fillStyle=grad; g.fillRect(0,0,w,h);
  const sg=g.createRadialGradient(w*0.5,h*0.85,0,w*0.5,h*0.85,420); sg.addColorStop(0,'rgba(255,200,130,0.75)'); sg.addColorStop(0.5,'rgba(235,150,90,0.3)'); sg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=sg; g.fillRect(0,0,w,h);
  g.fillStyle='#dfe7ff'; for(let i=0;i<70;i++){ g.globalAlpha=Math.random()*0.4+0.1; g.fillRect(Math.random()*w,Math.random()*h*0.3,1.1,1.1); } g.globalAlpha=1;
  const t=new THREE.CanvasTexture(c); t.mapping=THREE.EquirectangularReflectionMapping; t.colorSpace=THREE.SRGBColorSpace; return t; }

// realistic distant megacity skyline (glass/concrete towers, lit windows, haze)
function skylineFacade(kind){
  const w=256,h=512,c=document.createElement('canvas'); c.width=w;c.height=h;
  const base=c.getContext('2d');
  const em=document.createElement('canvas'); em.width=w;em.height=h; const ge=em.getContext('2d');
  ge.fillStyle='#000'; ge.fillRect(0,0,w,h);
  // glass/concrete base with a subtle vertical gradient
  const office = kind%2===0;
  const g1=base.createLinearGradient(0,0,0,h);
  if (office){ g1.addColorStop(0,'#26303f'); g1.addColorStop(1,'#39465a'); } else { g1.addColorStop(0,'#332f33'); g1.addColorStop(1,'#46423f'); }
  base.fillStyle=g1; base.fillRect(0,0,w,h);
  const cols=office?10:8, rows=24, mx=office?3:5, my=4;
  const cw=(w-mx*(cols+1))/cols, ch=(h-my*(rows+1))/rows;
  const litFrac=0.05+Math.random()*0.07;   // distant city: only a few windows lit
  for(let r=0;r<rows;r++) for(let cc=0;cc<cols;cc++){ const x=mx+cc*(cw+mx), y=my+r*(ch+my);
    const lit=Math.random()<litFrac; const warm=Math.random()<0.65;
    const glass = office ? (lit?(warm?'#ffe0ad':'#cfe0ff'):'#1d2735') : (lit?(warm?'#ffd49a':'#dfe7ff'):'#211d22');
    base.fillStyle=glass; base.fillRect(x,y,cw,ch);
    if(lit){ ge.fillStyle=warm?'#ffcaa0':'#bcd2ff'; ge.fillRect(x,y,cw,ch); }
  }
  // mullion grid
  base.strokeStyle='rgba(0,0,0,0.45)'; base.lineWidth=1;
  for(let r=0;r<=rows;r++){ base.beginPath(); base.moveTo(0,my/2+r*(ch+my)); base.lineTo(w,my/2+r*(ch+my)); base.stroke(); }
  const mk=cv=>{ const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; };
  return new THREE.MeshStandardMaterial({ map:mk(c), emissiveMap:mk(em), emissive:0xffffff, emissiveIntensity:0.6, color:0x9aa3b4, roughness:office?0.4:0.75, metalness:office?0.2:0.05, envMapIntensity:0.5 });
}
function buildSkyline(){
  const mats=[skylineFacade(0),skylineFacade(1),skylineFacade(2),skylineFacade(3)];
  const roofMat=new THREE.MeshStandardMaterial({color:0x161a22,roughness:0.9});
  const grp=new THREE.Group();
  const scaleUV=(geo,w,h,d,tx,ty)=>{ const uv=geo.attributes.uv; const s=(f,ru,rv)=>{for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*ru,uv.getY(i)*rv);}}; s(0,d/tx,h/ty);s(1,d/tx,h/ty);s(2,w/tx,d/tx);s(3,w/tx,d/tx);s(4,w/tx,h/ty);s(5,w/tx,h/ty); uv.needsUpdate=true; };
  function tower(x,z,bw,bd,bh){ const m=mats[(Math.random()*mats.length)|0];
    const g=new THREE.BoxGeometry(bw,bh,bd); scaleUV(g,bw,bh,bd,7,16);
    const b=new THREE.Mesh(g,[m,m,roofMat,roofMat,m,m]); b.position.set(x,WATER_Y+bh/2,z); grp.add(b);
    if(Math.random()<0.5){ const uw=bw*0.62,ud=bd*0.62,uh=bh*(0.25+Math.random()*0.3); const g2=new THREE.BoxGeometry(uw,uh,ud); scaleUV(g2,uw,uh,ud,7,16);
      const u=new THREE.Mesh(g2,[m,m,roofMat,roofMat,m,m]); u.position.set(x,WATER_Y+bh+uh/2,z); grp.add(u);
      if(Math.random()<0.6){ const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,bh*0.15,6),roofMat); ant.position.set(x,WATER_Y+bh+uh+bh*0.07,z); grp.add(ant); } }
  }
  // distant mainland on ONE side only (a far coastline); open sea everywhere else
  const CENTER = 0;        // +X direction (atan2(z,x)=0)
  const SPREAD = 1.05;     // ~±60° sector
  for (const [rad,count] of [[1350,30],[1750,34],[2250,30],[2850,24],[3500,18]]){
    for (let i=0;i<count;i++){ const a=CENTER + (Math.random()*2-1)*SPREAD; const r=rad+Math.random()*320;
      tower(Math.cos(a)*r, Math.sin(a)*r, 60+Math.random()*120, 60+Math.random()*120, 240+Math.random()*480+rad*0.05); } }
  scene.add(grp);
}

const overlay=document.getElementById('overlay'), hud=document.getElementById('hud'), playBtn=document.getElementById('play');
const bar=document.querySelector('#bar > i'), loadtxt=document.getElementById('loadtxt');
const isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
let world=null;

loadAll(renderer, (p,label)=>{ bar.style.width=Math.round(p*100)+'%'; loadtxt.textContent='Lade: '+label; })
  .then(A=>{ world=buildWorld(A); loadtxt.textContent='Bereit.'; playBtn.disabled=false; })
  .catch(err=>{ loadtxt.textContent='Fehler: '+err.message; console.error(err); });

function buildWorld(A){
  const sky=makeSky(); scene.background=sky;
  const pmrem=new THREE.PMREMGenerator(renderer); scene.environment=pmrem.fromEquirectangular(sky).texture;
  scene.fog=new THREE.Fog(0x4e5577, 160, 4400); // dusk haze; distant coast reads as a hazy silhouette

  const sunDir=new THREE.Vector3(SUN_DIR.x,SUN_DIR.y,SUN_DIR.z).normalize();
  const sun=new THREE.DirectionalLight(0xffb163, 3.7); sun.castShadow=true;
  sun.shadow.mapSize.set(LOW?1024:2048, LOW?1024:2048); sun.shadow.camera.near=1; sun.shadow.camera.far=240;
  const SH=70; Object.assign(sun.shadow.camera,{left:-SH,right:SH,top:SH,bottom:-SH}); sun.shadow.bias=-0.0005; sun.shadow.normalBias=0.05;
  scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0x6e88b8, 0x3a3026, 0.95));   // stronger fill so shadow sides aren't too dark

  buildSkyline();

  // ocean
  const wn=A.tex.waterNormals; wn.repeat.set(90,90);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000), new THREE.MeshStandardMaterial({ color:0x0c1622, metalness:0.9, roughness:0.18, normalMap:wn, normalScale:new THREE.Vector2(0.4,0.4), envMapIntensity:0.8 }));
  sea.rotation.x=-Math.PI/2; sea.position.y=WATER_Y; scene.add(sea);

  // setting sun disc over the water
  const sunS=new THREE.Sprite(new THREE.SpriteMaterial({ map:soft, color:0xffb060, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }));
  sunS.position.copy(sunDir).multiplyScalar(900); sunS.scale.setScalar(220); scene.add(sunS);
  const sunC=new THREE.Sprite(new THREE.SpriteMaterial({ map:soft, color:0xffe0b0, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }));
  sunC.position.copy(sunDir).multiplyScalar(890); sunC.scale.setScalar(90); scene.add(sunC);

  const interactables=[];
  const ctx={ colliders:[], steam:[], blink:[], walkables:[], lightBudget:{n:0,max:LOW?10:18}, addInteractable:(o,d)=>interactables.push({obj:o,def:d}) };
  const city=buildCity(scene,A,ctx);
  const agents=createAgents(scene,A,ctx);

  // PERF: only large objects (buildings, big structures, instanced trees) cast
  // shadows. Turn shadow-casting off for all small props/signs/wheels/etc.
  const _sz=new THREE.Vector3();
  scene.traverse(o=>{ if(o.isMesh && !o.isInstancedMesh && o.castShadow && o.geometry){
    if(!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    o.geometry.boundingBox.getSize(_sz);
    if (Math.max(_sz.x,_sz.y,_sz.z) < 4) o.castShadow=false; } });

  // dust motes
  const DN=460,dp=new Float32Array(DN*3); for(let i=0;i<DN;i++){dp[i*3]=(Math.random()-0.5)*70;dp[i*3+1]=Math.random()*18;dp[i*3+2]=(Math.random()-0.5)*70;}
  const dg=new THREE.BufferGeometry(); dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
  const dust=new THREE.Points(dg,new THREE.PointsMaterial({map:soft,color:0xffc890,size:0.12,transparent:true,opacity:0.45,depthWrite:false,blending:THREE.AdditiveBlending}));
  scene.add(dust);

  // steam
  const em=ctx.steam; const SP=Math.min(700,Math.max(60,em.length*55)); const sp=new Float32Array(SP*3),sc=new Float32Array(SP*3),parts=[];
  for(let i=0;i<SP;i++){ const e=em[i%em.length]||{x:0,y:0,z:0,rate:0}; parts.push({e,age:Math.random()*3,life:2.5+Math.random()*2.5,vx:(Math.random()-0.5)*0.2,vz:(Math.random()-0.5)*0.2}); }
  const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.BufferAttribute(sp,3)); sg.setAttribute('color',new THREE.BufferAttribute(sc,3));
  const steam=new THREE.Points(sg,new THREE.PointsMaterial({map:soft,vertexColors:true,size:1.7,transparent:true,opacity:0.45,depthWrite:false}));
  scene.add(steam);
  function updateSteam(dt){ for(let i=0;i<SP;i++){ const p=parts[i]; p.age+=dt; if(p.age>p.life){p.age=0;p.e=em[(Math.random()*em.length)|0]||p.e;} const k=p.age/p.life;
    sp[i*3]=p.e.x+p.vx*p.age*3; sp[i*3+1]=p.e.y+p.age*0.7; sp[i*3+2]=p.e.z+p.vz*p.age*3; const a=Math.sin(k*Math.PI)*0.3*(p.e.rate||1); sc[i*3]=a*0.85;sc[i*3+1]=a*0.8;sc[i*3+2]=a*0.78; }
    sg.attributes.position.needsUpdate=true; sg.attributes.color.needsUpdate=true; }

  return { sun, sunDir, city, agents, interactables, dust, updateSteam, walkables: ctx.walkables };
}

// ---- post processing ------------------------------------------------------
const rt=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType, samples:LOW?0:4});
const composer=new EffectComposer(renderer,rt);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.3,0.6,0.85); composer.addPass(bloom);
composer.addPass(new OutputPass());
// cinematic grade: contrast, saturation, vignette, subtle chromatic aberration + film grain
const GradeShader={ uniforms:{ tDiffuse:{value:null}, uTime:{value:0}, uVig:{value:0.16}, uGrain:{value:0.02}, uCA:{value:0.001}, uSat:{value:1.05}, uCon:{value:1.0} },
  vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:`uniform sampler2D tDiffuse; uniform float uTime,uVig,uGrain,uCA,uSat,uCon; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 d=vUv-0.5;
      float r=texture2D(tDiffuse,vUv-d*uCA).r, g=texture2D(tDiffuse,vUv).g, b=texture2D(tDiffuse,vUv+d*uCA).b;
      vec3 col=vec3(r,g,b);
      col=(col-0.5)*uCon+0.5;
      float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=mix(vec3(l),col,uSat);
      float vig=smoothstep(0.92,0.25,length(d)); col*=mix(1.0,vig,uVig);
      col+=(rand(vUv*(1.0+fract(uTime)))-0.5)*uGrain;
      gl_FragColor=vec4(clamp(col,0.0,1.0),1.0); }` };
const grade=new ShaderPass(GradeShader); composer.addPass(grade);

// --- Upscaling (resolution scaling = WebGL DLSS-equivalent) ---------------
let renderScale = parseFloat(localStorage.getItem('sb_scale')||'1') || 1;
function applyRenderScale(s){
  renderScale = Math.max(0.3, Math.min(1, s));
  localStorage.setItem('sb_scale', String(renderScale));
  const pr = BASE_PR * renderScale;
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight);
  document.querySelectorAll('#upscale button').forEach(b => b.classList.toggle('active', Math.abs(parseFloat(b.dataset.s)-renderScale) < 0.001));
}
{
  const gear=document.getElementById('gear'), panel=document.getElementById('settings');
  gear.addEventListener('click', ()=> panel.classList.toggle('show'));
  addEventListener('keydown', e=>{ if(e.code==='KeyG') panel.classList.toggle('show'); });
  document.querySelectorAll('#upscale button').forEach(b => b.addEventListener('click', ()=> applyRenderScale(parseFloat(b.dataset.s))));
}
applyRenderScale(renderScale);

// ---- controls / movement / interaction ------------------------------------
const controls=new PointerLockControls(camera,renderer.domElement);
const keys={}; addEventListener('keydown',e=>{keys[e.code]=true; if(e.code==='KeyE')onUse();}); addEventListener('keyup',e=>{keys[e.code]=false;});
function startGame(){ overlay.classList.add('hidden'); hud.classList.add('playing'); if(!isTouch)controls.lock(); if(isTouch)document.getElementById('touch').style.display='block'; }
playBtn.addEventListener('click',()=>{ if(!playBtn.disabled)startGame(); });
controls.addEventListener('unlock',()=>{ if(!isTouch&&!dialogueOpen){ overlay.classList.remove('hidden'); hud.classList.remove('playing'); } });

const vel=new THREE.Vector3(),dir=new THREE.Vector3(),PR=0.4;
// vertical traversal: sample ground/stairs/platform height under the player
const downRay=new THREE.Raycaster(); downRay.far=140; const _o=new THREE.Vector3(), DOWN=new THREE.Vector3(0,-1,0), _right=new THREE.Vector3(); let floorY=0;
function sampleFloor(pos){ if(!world||!world.walkables.length) return floorY; _o.set(pos.x,pos.y+1.2,pos.z); downRay.set(_o,DOWN); const h=downRay.intersectObjects(world.walkables,false); return h.length?h[0].point.y:floorY; }
function collide(pos){ if(!world)return; for(const b of world.city.colliders){ if(b.top!==undefined && (pos.y-1.7)>b.top-0.4) continue; const m0x=b.minX-PR,m1x=b.maxX+PR,m0z=b.minZ-PR,m1z=b.maxZ+PR;
  if(pos.x>m0x&&pos.x<m1x&&pos.z>m0z&&pos.z<m1z){ const dl=pos.x-m0x,dr=m1x-pos.x,du=pos.z-m0z,dd=m1z-pos.z,mm=Math.min(dl,dr,du,dd); if(mm===dl)pos.x=m0x;else if(mm===dr)pos.x=m1x;else if(mm===du)pos.z=m0z;else pos.z=m1z; } }
  // vehicles (circle push-out), only while near street level
  const ob=world.agents&&world.agents.obstacles;
  if(ob&&(pos.y-1.7)<2.0){ for(const o of ob){ const dx=pos.x-o.pos.x, dz=pos.z-o.pos.z, rr=o.r+PR, d2=dx*dx+dz*dz;
    if(d2<rr*rr&&d2>1e-4){ const d=Math.sqrt(d2); pos.x=o.pos.x+dx/d*rr; pos.z=o.pos.z+dz/d*rr; } } }
  pos.x=Math.max(-(ISLAND-1.5),Math.min(ISLAND-1.5,pos.x)); pos.z=Math.max(-(ISLAND-1.5),Math.min(ISLAND-1.5,pos.z)); }

const prompt=document.getElementById('prompt'),dlg=document.getElementById('dialogue'),useBtn=document.getElementById('useBtn');
let current=null,dialogueOpen=false,dlgLines=[],dlgIdx=0; const fwd=new THREE.Vector3(),to=new THREE.Vector3();
function pickInteractable(){ if(!world)return null; camera.getWorldDirection(fwd); fwd.y=0; fwd.normalize(); let best=null,bd=1e9;
  for(const it of world.interactables){ to.copy(it.obj.position).sub(camera.position); to.y=0; const d=to.length(),r=it.def.radius||4.0; if(d>r)continue; to.normalize(); if(to.dot(fwd)<0.5)continue; if(d<bd){bd=d;best=it;} } return best; }
function onUse(){ if(!hud.classList.contains('playing'))return; if(dialogueOpen){closeDlg();return;} if(current)openDlg(current.def); }
function openDlg(def){ dialogueOpen=true; dlgLines=def.lines; dlgIdx=0; dlg.querySelector('.who').textContent=def.who||''; dlg.querySelector('.line').textContent=dlgLines[0]; dlg.classList.add('show'); }
function closeDlg(){ dialogueOpen=false; dlg.classList.remove('show'); }
if(useBtn)useBtn.addEventListener('touchstart',e=>{e.preventDefault();onUse();},{passive:false});
addEventListener('click',()=>{ if(dialogueOpen){ dlgIdx++; if(dlgIdx>=dlgLines.length)closeDlg(); else dlg.querySelector('.line').textContent=dlgLines[dlgIdx]; } });

let moveX=0,moveY=0,lookId=null,lastLX=0,lastLY=0,stickId=null,stickCx=0,stickCy=0,yaw=0,pitch=0; const tE=new THREE.Euler(0,0,0,'YXZ');
const stick=document.getElementById('stick'),nub=document.getElementById('nub');
if(isTouch){ document.body.classList.add('touch');
  stick.addEventListener('touchstart',e=>{const t=e.changedTouches[0];stickId=t.identifier;const r=stick.getBoundingClientRect();stickCx=r.left+r.width/2;stickCy=r.top+r.height/2;e.preventDefault();},{passive:false});
  addEventListener('touchmove',e=>{for(const t of e.changedTouches){ if(t.identifier===stickId){let dx=t.clientX-stickCx,dy=t.clientY-stickCy;const mx=46,d=Math.hypot(dx,dy);if(d>mx){dx*=mx/d;dy*=mx/d;}nub.style.transform=`translate(${dx}px,${dy}px)`;moveX=dx/mx;moveY=dy/mx;} else if(t.identifier===lookId){yaw-=(t.clientX-lastLX)*0.004;pitch-=(t.clientY-lastLY)*0.004;lastLX=t.clientX;lastLY=t.clientY;pitch=Math.max(-1.2,Math.min(1.2,pitch));} }},{passive:false});
  addEventListener('touchstart',e=>{for(const t of e.changedTouches)if(t.identifier!==stickId&&lookId===null&&t.clientX>innerWidth*0.4){lookId=t.identifier;lastLX=t.clientX;lastLY=t.clientY;}},{passive:false});
  addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===stickId){stickId=null;moveX=moveY=0;nub.style.transform='';}if(t.identifier===lookId)lookId=null;}}); }

const clock=new THREE.Clock(); let bob=0,ff=0,ft=0; const fpsEl=document.getElementById('fps');
function animate(){ requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime; const playing=hud.classList.contains('playing');
  if(playing&&world&&!dialogueOpen){ const sp=(keys['ShiftLeft']||keys['ShiftRight'])?1.9:1, speed=3.4*sp; let f=0,s=0;
    if(keys['KeyW']||keys['ArrowUp'])f+=1; if(keys['KeyS']||keys['ArrowDown'])f-=1; if(keys['KeyD']||keys['ArrowRight'])s+=1; if(keys['KeyA']||keys['ArrowLeft'])s-=1;
    if(isTouch){f+=-moveY;s+=moveX;tE.set(pitch,yaw,0,'YXZ');camera.quaternion.setFromEuler(tE);}
    dir.set(0,0,0); const mv=f||s; if(mv){camera.getWorldDirection(vel);vel.y=0;vel.normalize();_right.crossVectors(vel,camera.up).normalize();dir.addScaledVector(vel,f).addScaledVector(_right,s);if(dir.lengthSq()>0)dir.normalize();}
    const pos=camera.position; pos.addScaledVector(dir,speed*dt); collide(pos);
    if(mv) bob+=dt*speed*1.7; const hb=mv?Math.sin(bob)*0.05:0;
    const fl=sampleFloor(pos); floorY+=(fl-floorY)*Math.min(1,dt*12);
    pos.y+=((floorY+1.7+hb)-pos.y)*Math.min(1,dt*14); }
  if(world){ world.sun.position.copy(camera.position).addScaledVector(world.sunDir,100); world.sun.target.position.copy(camera.position); world.sun.target.updateMatrixWorld();
    world.agents.update(t,dt); world.updateSteam(dt); world.dust.position.set(Math.round(camera.position.x/70)*70,0,Math.round(camera.position.z/70)*70);
    if(playing&&!dialogueOpen){ current=pickInteractable(); if(current){prompt.innerHTML='<span class="key">E</span>'+current.def.prompt;prompt.classList.add('show');if(useBtn)useBtn.classList.add('show');} else {prompt.classList.remove('show');if(useBtn)useBtn.classList.remove('show');} }
    else if(!dialogueOpen){prompt.classList.remove('show');if(useBtn)useBtn.classList.remove('show');} }
  grade.uniforms.uTime.value=t;
  composer.render(); ff++; ft+=dt; if(ft>=0.5){fpsEl.textContent=Math.round(ff/ft)+' FPS';ff=0;ft=0;} }
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
window.__game={scene,camera, get world(){return world;}};
