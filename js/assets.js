import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Loads HDRI environment, PBR textures and the character model with progress.
export async function loadAll(renderer, onProgress) {
  const steps = [];
  const tloader = new THREE.TextureLoader();
  const loadTex = (url, { srgb = false, repeat = 1 } = {}) => new Promise((res, rej) => {
    tloader.load(url, t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      res(t);
    }, undefined, rej);
  });

  const texSet = async (slug) => ({
    map: await loadTex(`assets/textures/${slug}/diff.jpg`, { srgb: true }),
    normalMap: await loadTex(`assets/textures/${slug}/nor.jpg`),
    roughnessMap: await loadTex(`assets/textures/${slug}/rough.jpg`),
  });

  let done = 0; const total = 7;
  const tick = (label) => { done++; onProgress && onProgress(done/total, label); };

  // environment (HDRI) -> PMREM for IBL + background
  const hdr = await new Promise((res, rej) => new RGBELoader().load('assets/hdri/venice_sunset_1k.hdr', res, undefined, rej));
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  tick('Himmel');

  const asphalt = await texSet('asphalt_02');       tick('Asphalt');
  const concrete = await texSet('concrete_wall_008'); tick('Beton');
  const dirty = await texSet('dirty_concrete');     tick('Wände');
  const brick = await texSet('brick_wall_006');     tick('Backstein');
  const waterNormals = await loadTex('assets/textures/waternormals.jpg');
  waterNormals.colorSpace = THREE.NoColorSpace; tick('Wasser');

  const gltf = await new Promise((res, rej) => new GLTFLoader().load('assets/models/Soldier.glb', res, undefined, rej));
  tick('Figuren');

  return { envMap, hdr, asphalt, concrete, dirty, brick, waterNormals, soldier: gltf };
}
