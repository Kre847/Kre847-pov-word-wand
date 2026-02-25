
// POV Wand v8 — simplified UI, portrait-first, kid-friendly theme
// Features kept: rows=7 big dots, auto-mirror, disco + speed, go/stop + duration, haptics, full-screen sweep

// ---------- Elements ----------
const canvas = document.getElementById('wand');
const ctx = canvas.getContext('2d', { alpha: false });
const dpr = Math.max(1, window.devicePixelRatio || 1);

const ui = document.getElementById('ui');
const textInput = document.getElementById('textInput');
const colorSelect = document.getElementById('colorSelect');
const discoSpeedWrap = document.getElementById('discoSpeedWrap');
const discoSpeed = document.getElementById('discoSpeed');
const discoSpeedVal = document.getElementById('discoSpeedVal');
const durationSelect = document.getElementById('durationSelect');
const autoMirrorChk = document.getElementById('autoMirrorChk');
const hapticsChk = document.getElementById('hapticsChk');
const goBtn = document.getElementById('goBtn');
const helpBtn = document.getElementById('helpBtn');
const helpDialog = document.getElementById('helpDialog');
const closeHelp = document.getElementById('closeHelp');
const rotateOverlay = document.getElementById('rotateOverlay');

// ---------- Defaults (simplified) ----------
const NUM_ROWS = 7;                 // fewer, bigger dots
const VERTICAL_DILATE = 2;          // bolder letters
const HORIZ_THICKNESS = 4;          // column duplication for brightness
let DOT_COLOR = colorSelect.value;  // static color or 'disco'

// Session state
let isPlaying = false;
let sessionEndsAt = 0;
let sessionDurationMs = 20000; // default 20s; Infinity for no limit

// Orientation / sensors / direction
let sensorsStarted = false;
let currentYaw = 0; // surrogate for left-right angle
let minYaw = -35, maxYaw = 35; // auto-calibration window
let calibrating = false; let calStart = 0;
let lastSensorTs = 0;
let filtYaw = 0, prevFiltYaw = 0, vel = 0, filtVel = 0;
let lastDirection = 'ltr'; // 'ltr' or 'rtl'
let lastDirChangeTs = 0; const VEL_THR = 0.20; const DIR_COOLDOWN = 650;
let sweepBoost = 0; // 0..1 — expand to full height when moving

// Disco
let hueBase = 0; let DISCO_SPEED = parseFloat(discoSpeed.value) || 1.8; const DISCO_ROW_STEP = 12;

// Text columns
let textColumns = []; let colCount = 0;

// ---------- Helpers ----------
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const deg = (rad)=>rad*180/Math.PI;
const PORTRAIT = ()=>window.matchMedia('(orientation: portrait)').matches;
function setRotateOverlay(v){ rotateOverlay.hidden = !v; }
function markSensorUpdate(){ lastSensorTs = performance.now(); }

// ---------- Resize / Canvas ----------
function resize(){
  const w = canvas.clientWidth; const h = canvas.clientHeight;
  canvas.width = Math.floor(w*dpr); canvas.height = Math.floor(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
}
addEventListener('resize',()=>{ resize(); setRotateOverlay(!PORTRAIT()); });
resize(); setRotateOverlay(!PORTRAIT());

// ---------- Text → Columns ----------
function updateTextColumns(){
  const txtRaw = textInput.value || '';
  const txt = txtRaw.toUpperCase().slice(0,24);

  if (!txt) {
    // No text: render blanks
    const blanks = []; for(let i=0;i<60;i++) blanks.push(new Uint8Array(NUM_ROWS));
    textColumns = blanks; colCount = blanks.length; goBtn.disabled = true; return;
  }
  goBtn.disabled = false;

  // Render text to offscreen canvas then sample into rows
  const off = document.createElement('canvas'); const g = off.getContext('2d');
  const fontSize = 300; g.font = `800 ${fontSize}px system-ui, Segoe UI, Roboto, sans-serif`;
  const m = g.measureText(txt); const width = Math.ceil(m.width + fontSize*0.4);
  const height = Math.ceil(fontSize*1.5); off.width=width; off.height=height;
  g.fillStyle='#000'; g.fillRect(0,0,width,height);
  g.fillStyle='#fff'; g.textBaseline='top'; g.font = `800 ${fontSize}px system-ui, Segoe UI, Roboto, sans-serif`;
  g.fillText(txt, fontSize*0.2, fontSize*0.1);

  const img = g.getImageData(0,0,width,height).data; const cols=[];
  const targetRows = NUM_ROWS;
  const padCols = 6; for(let s=0;s<padCols;s++) cols.push(new Uint8Array(targetRows));
  for(let x=0;x<width;x++){
    const col = new Uint8Array(targetRows);
    for(let r=0;r<targetRows;r++){
      const y = Math.floor((r+0.5)/targetRows*height);
      const idx=(y*width+x)*4; const lum=img[idx]*0.2126+img[idx+1]*0.7152+img[idx+2]*0.0722;
      col[r] = lum>40 ? 1:0;
    }
    if (VERTICAL_DILATE>0){
      const thick = new Uint8Array(targetRows);
      for(let r=0;r<targetRows;r++){
        let on=0; for(let k=-VERTICAL_DILATE;k<=VERTICAL_DILATE;k++){ const rr=r+k; if(rr>=0&&rr<targetRows&&col[rr]){on=1;break;} }
        thick[r]=on;
      }
      cols.push(thick);
    } else cols.push(col);
  }
  for(let s=0;s<padCols;s++) cols.push(new Uint8Array(targetRows));
  textColumns = cols; colCount = cols.length;
}

textInput.addEventListener('input', updateTextColumns);
colorSelect.addEventListener('change', ()=>{
  DOT_COLOR = colorSelect.value;
  discoSpeedWrap.style.display = (DOT_COLOR==='disco') ? '' : 'none';
});
discoSpeed.addEventListener('input', ()=>{ DISCO_SPEED = parseFloat(discoSpeed.value)||1.8; discoSpeedVal.textContent = `${DISCO_SPEED.toFixed(1)}×`; });
durationSelect.addEventListener('change', ()=>{
  const v = durationSelect.value==='Infinity' ? Infinity : Number(durationSelect.value);
  sessionDurationMs = (v===0||Number.isNaN(v)) ? Infinity : v;
});
helpBtn.addEventListener('click', ()=>helpDialog.showModal());
closeHelp.addEventListener('click', ()=>helpDialog.close());

// Initialize once
updateTextColumns();

// ---------- Sensors (start on Go/Stop) ----------
function quatToEulerY(q){ const [w,x,y,z]=q; const sinp=2*(w*y - z*x); const pitch=(Math.abs(sinp)>=1)?Math.sign(sinp)*Math.PI/2:Math.asin(sinp); return deg(pitch); }
async function startSensors(){
  if (sensorsStarted) return; sensorsStarted = true; lastSensorTs=0;
  // iOS permission (after user gesture via Go)
  try{ const DOE = globalThis.DeviceOrientationEvent; if(DOE && typeof DOE.requestPermission==='function'){ const res = await DOE.requestPermission(); if(res!=='granted') throw new Error('iOS motion denied'); } }catch{}
  // Generic Sensor API
  try{
    const Rel=globalThis.RelativeOrientationSensor; const Abs=globalThis.AbsoluteOrientationSensor; const Ctor=Rel||Abs;
    if(Ctor){ const sensor=new Ctor({frequency:60, referenceFrame:'device'});
      sensor.addEventListener('reading',()=>{ if(sensor.quaternion){ const ydeg=quatToEulerY(sensor.quaternion); currentYaw=currentYaw*0.8 + ydeg*0.2; markSensorUpdate(); }});
      sensor.addEventListener('error',e=>console.warn('Sensor error',e)); sensor.start();
    }
  }catch(e){ console.warn('Generic Sensor API start failed:', e); }
  // Legacy events
  try{
    globalThis.addEventListener('deviceorientation',(e)=>{ if(typeof e.gamma==='number'&&!Number.isNaN(e.gamma)){ currentYaw=currentYaw*0.85 + e.gamma*0.15; markSensorUpdate(); } }, {passive:true});
    globalThis.addEventListener('devicemotion',(e)=>{ if(e.rotationRate && (e.rotationRate.gamma||e.rotationRate.beta||e.rotationRate.alpha)) markSensorUpdate(); }, {passive:true});
  }catch(e){ console.warn('Legacy events failed', e); }
}

// ---------- Calibration & direction ----------
function beginAutoCalibration(){ calibrating=true; calStart=performance.now(); minYaw=+Infinity; maxYaw=-Infinity; }
function updateCalibration(){ if(!calibrating) return; const t=performance.now()-calStart; minYaw=Math.min(minYaw,currentYaw); maxYaw=Math.max(maxYaw,currentYaw); if(t>2500){ calibrating=false; if(Math.abs(maxYaw-minYaw)<10){ minYaw=-35; maxYaw=35; } }}

function updateDirection(){
  filtYaw = 0.85*filtYaw + 0.15*currentYaw;
  vel = filtYaw - prevFiltYaw; prevFiltYaw = filtYaw;
  filtVel = 0.8*filtVel + 0.2*vel;
  const speeding = Math.abs(filtVel) > VEL_THR;
  sweepBoost = sweepBoost*0.85 + (speeding?1:0)*0.15;
  const now = performance.now();
  if (Math.abs(filtVel)>VEL_THR && (now-lastDirChangeTs)>DIR_COOLDOWN){ const nd = (filtVel>0)?'ltr':'rtl'; if(nd!==lastDirection){ lastDirection=nd; lastDirChangeTs=now; } }
  // Haptics
  if (hapticsChk.checked && 'vibrate' in navigator && isPlaying && speeding){ if(!updateDirection._last||now-updateDirection._last>900){ navigator.vibrate(12); updateDirection._last=now; }}
}

// ---------- Render ----------
function hsvToRgb(h,s,v){ const c=v*s, hh=(h%360)/60, x=c*(1-Math.abs((hh%2)-1)); let r=0,g=0,b=0; if(0<=hh&&hh<1){r=c;g=x;} else if(1<=hh&&hh<2){r=x;g=c;} else if(2<=hh&&hh<3){g=c;b=x;} else if(3<=hh&&hh<4){g=x;b=c;} else if(4<=hh&&hh<5){r=x;b=c;} else {r=c;b=x;} const m=v-c; return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]; }

function getColumn(idx){ return textColumns[Math.max(0, Math.min(colCount-1, idx))] || new Uint8Array(NUM_ROWS); }
function drawColumn(bits){
  const w=canvas.clientWidth, h=canvas.clientHeight; ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
  const base=0.94, heightFactor = base + (1.0-base)*sweepBoost; const spacing=(h*heightFactor)/NUM_ROWS;
  const diam=Math.min(spacing, Math.max(10, spacing*0.9)); const gap=Math.max(1, spacing-diam);
  const total=NUM_ROWS*(diam+gap); const top=(h-total)/2 + diam/2;
  const disco=(DOT_COLOR==='disco'); const baseHue=hueBase;
  for(let r=0;r<NUM_ROWS;r++) if(bits[r]){ const y=top + r*(diam+gap), x=w/2; if(disco){ const hue=(baseHue + r*DISCO_ROW_STEP)%360; const [rr,gg,bb]=hsvToRgb(hue,1,0.95); ctx.fillStyle=`rgb(${rr},${gg},${bb})`; } else { ctx.fillStyle=DOT_COLOR||'#fff'; } ctx.beginPath(); ctx.arc(x,y,diam/2,0,Math.PI*2); ctx.fill(); }
}

let autoPhase=0;
function animate(){
  requestAnimationFrame(animate); setRotateOverlay(!PORTRAIT()); updateCalibration(); updateDirection();
  if(isPlaying && sessionDurationMs!==Infinity && performance.now()>sessionEndsAt) stopSession();
  if(!isPlaying){ ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight); hueBase=(hueBase + DISCO_SPEED*0.3)%360; return; }

  // Effective mirror
  let effectiveMirror = autoMirrorChk.checked ? (lastDirection==='rtl') : false;
  let left=minYaw, right=maxYaw; if(effectiveMirror) [left,right]=[right,left];
  const range=(right-left); let s=0.5; if(Math.abs(range)>5 && isFinite(range)) s = (currentYaw-left)/range; s = clamp(s,0,1);

  const idx=Math.floor(s*(colCount-1)); for(let i=0;i<HORIZ_THICKNESS;i++) drawColumn(getColumn(idx));
  hueBase=(hueBase + DISCO_SPEED)%360;
}
animate();

// ---------- Session control ----------
function startSession(){
  if (!sensorsStarted) startSensors();
  beginAutoCalibration();
  isPlaying=true; if(sessionDurationMs!==Infinity) sessionEndsAt = performance.now()+sessionDurationMs;
  goBtn.textContent='Stop';
}
function stopSession(){ isPlaying=false; sessionEndsAt=0; goBtn.textContent='Go'; }

goBtn.addEventListener('click', ()=>{ if(goBtn.disabled) return; if(isPlaying) stopSession(); else startSession(); });

// Enable disco speed control visibility if selected at load
if (DOT_COLOR==='disco') discoSpeedWrap.style.display='';
