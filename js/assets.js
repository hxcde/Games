import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// real photographic building facades (windows/floors baked in; some have emission)
const FACADE_SLUGS = ['Facade001','Facade006','Facade009','Facade012','Facade018A','Facade019A'];
const PLAIN_SLUGS  = ['concrete_wall_008','concrete_floor_worn_001'];
const GROUND_SLUGS = ['asphalt_02','pavement_02','aerial_grass_rock'];
const VEH_SLUGS    = ['rusty_metal_03','metal_plate_02'];

export async function loadAll(renderer, onProgress) {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tl = new THREE.TextureLoader();
  const load = (url, srgb) => new Promise((res, rej) => tl.load(url, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; res(t);
  }, undefined, rej));
  const opt = (url, srgb) => load(url, srgb).catch(() => null);   // optional map
  const set = async (slug, withEmis) => {
    const o = { map: await load(`assets/textures/${slug}/diff.jpg`, true),
      normalMap: await load(`assets/textures/${slug}/nor.jpg`, false),
      roughnessMap: await load(`assets/textures/${slug}/rough.jpg`, false) };
    if (withEmis) { const e = await opt(`assets/textures/${slug}/emis.jpg`, true); if (e) o.emissiveMap = e; }
    return o;
  };

  const all = [...FACADE_SLUGS.map(s=>[s,true]), ...PLAIN_SLUGS.map(s=>[s,false]), ...GROUND_SLUGS.map(s=>[s,false]), ...VEH_SLUGS.map(s=>[s,false])];
  const total = all.length + 2;
  let done = 0; const tick = l => { done++; onProgress && onProgress(done/total, l); };

  const tex = {};
  for (const [s, e] of all) { tex[s] = await set(s, e); tick(s.replace(/_/g,' ')); }
  tex.waterNormals = await load('assets/textures/waternormals.jpg', false); tex.waterNormals.repeat.set(80,80); tick('Wasser');

  const gltf = await new Promise((res, rej) => new GLTFLoader().load('assets/models/Soldier.glb', res, undefined, rej));
  const box = new THREE.Box3().setFromObject(gltf.scene); const footOffset = -box.min.y;
  tick('Figuren');

  return { tex, facades: FACADE_SLUGS, soldier: gltf, footOffset, maxAniso };
}
