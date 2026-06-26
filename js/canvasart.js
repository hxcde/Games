import * as THREE from 'three';

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(canvas, { srgb = true } = {}) { const t = new THREE.CanvasTexture(canvas); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// hanging neon shop sign (vertical), subtle glow
export function makeSign(text, color, { vertical = true } = {}) {
  const w = vertical ? 128 : 320, h = vertical ? 320 : 110;
  const c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = '#0c0a0a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = color; g.lineWidth = 4; g.shadowColor = color; g.shadowBlur = 16; g.strokeRect(7, 7, w-14, h-14);
  g.fillStyle = color; g.shadowBlur = 18; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (vertical) {
    const chars = [...text].slice(0, 5); g.font = 'bold 54px "Segoe UI", sans-serif';
    chars.forEach((ch, i) => g.fillText(ch, w/2, h*0.16 + i*(h*0.7/Math.max(1,chars.length-1))));
  } else { g.font = 'bold 64px "Segoe UI", sans-serif'; g.fillText(text, w/2, h/2); }
  return tex(c);
}

// digital ad screen (animated content baked as one frame)
export function makeScreen(kind = 0) {
  const w = 256, h = 384, c = cv(w, h), g = c.getContext('2d');
  const palette = [['#1a2b4a', '#4fc3ff', 'SYNTH-CORP'], ['#3a1030', '#ff5db4', 'NEO-RAMEN'], ['#10261a', '#5dffa0', 'AKARI MEDTECH']][kind % 3];
  g.fillStyle = palette[0]; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()*0.05})`; g.fillRect(0, Math.random()*h, w, 1); }
  g.fillStyle = palette[1]; g.shadowColor = palette[1]; g.shadowBlur = 18;
  g.beginPath(); g.arc(w/2, h*0.34, 56, 0, Math.PI*2); g.lineWidth = 8; g.strokeStyle = palette[1]; g.stroke();
  g.font = 'bold 30px "Segoe UI", sans-serif'; g.textAlign = 'center';
  g.fillText(palette[2], w/2, h*0.66);
  g.shadowBlur = 6; g.font = '16px "Segoe UI", sans-serif'; g.fillStyle = '#cfe9ff';
  g.fillText('近未来都市', w/2, h*0.74); g.fillText('// LIVE FEED 24H', w/2, h*0.8);
  return tex(c);
}

// shopfront with lit interior + name banner
export function makeShopfront(name, color) {
  const w = 512, h = 160, c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = '#0e0c0b'; g.fillRect(0, 0, w, h);
  // banner
  g.fillStyle = '#15110e'; g.fillRect(0, 0, w, 40);
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 14; g.font = 'bold 26px "Segoe UI", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w/2, 21);
  g.shadowBlur = 0;
  // lit windows / interior
  for (let i = 0; i < 4; i++) {
    const x = 12 + i*125; const lit = Math.random() < 0.85;
    g.fillStyle = lit ? '#ffdca0' : '#23201c'; g.fillRect(x, 54, 110, 92);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x+54, 54, 2, 92);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, 54, 110, 4);
  }
  return tex(c);
}

// graffiti decal (transparent bg)
export function makeGraffiti() {
  const w = 256, h = 160, c = cv(w, h), g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  const cols = ['#ff4d6d', '#4dd2ff', '#ffe14d', '#a14dff', '#4dff88'];
  const tags = ['VØID', 'ƎRR0R', 'KØDE', 'RUN', '∆ULT', '404'];
  g.globalAlpha = 0.92; g.font = 'bold 80px "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.translate(w/2, h/2); g.rotate((Math.random()-0.5)*0.3);
  const col = cols[Math.floor(Math.random()*cols.length)];
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.6)'; g.fillStyle = col;
  const t = tags[Math.floor(Math.random()*tags.length)];
  g.strokeText(t, 0, 0); g.fillText(t, 0, 0);
  for (let i = 0; i < 12; i++) { g.fillStyle = col; g.globalAlpha = 0.3; g.fillRect((Math.random()-0.5)*w, (Math.random()-0.5)*h, 3, 14); }
  const tt = tex(c); tt.colorSpace = THREE.SRGBColorSpace; return tt;
}

// torn poster
export function makePoster() {
  const w = 160, h = 240, c = cv(w, h), g = c.getContext('2d');
  const base = ['#b1352f', '#2f5db1', '#b18a2f', '#5a2fb1'][Math.floor(Math.random()*4)];
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 5; i++) g.fillRect(0, 30+i*42, w, 3);
  g.fillStyle = '#f4ead8'; g.font = 'bold 44px "Segoe UI", sans-serif'; g.textAlign = 'center';
  g.fillText('未来', w/2, h*0.4); g.font = 'bold 22px "Segoe UI", sans-serif'; g.fillText('TOKYO 2099', w/2, h*0.6);
  // grime
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random()*w, Math.random()*h, Math.random()*40, 1);
  const tt = tex(c); return tt;
}

// warning / metal grille small decal
export function makeWarning() {
  const w = 128, h = 128, c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = '#1a1712'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8b21f'; g.beginPath(); g.moveTo(64, 16); g.lineTo(112, 104); g.lineTo(16, 104); g.closePath(); g.fill();
  g.fillStyle = '#1a1712'; g.font = 'bold 60px "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 64, 76);
  return tex(c);
}

// keypad / locked door panel
export function makeKeypad() {
  const w = 96, h = 128, c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = '#15140f'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ff3b3b'; g.shadowColor = '#ff3b3b'; g.shadowBlur = 10; g.fillRect(20, 12, 56, 14);
  g.shadowBlur = 0;
  for (let r = 0; r < 3; r++) for (let cl = 0; cl < 3; cl++) { g.fillStyle = '#2a2820'; g.fillRect(18+cl*22, 40+r*26, 16, 18); }
  return tex(c);
}

export { tex };
