
// Full Word Wand POV Engine
const textInput=document.getElementById('textInput');
const goBtn=document.getElementById('goBtn');
const stopBtn=document.getElementById('stopBtn');
const wand=document.getElementById('wand');
const ctx=wand.getContext('2d');
const colTiming=document.getElementById('colTiming');
const colTimingVal=document.getElementById('colTimingVal');
const colorSelect=document.getElementById('colorSelect');
const discoSpeedWrap=document.getElementById('discoSpeedWrap');
const discoSpeed=document.getElementById('discoSpeed');
const discoSpeedVal=document.getElementById('discoSpeedVal');
const helpBtn=document.getElementById('helpBtn');
const helpDialog=document.getElementById('helpDialog');
const closeHelp=document.getElementById('closeHelp');
const resetBtn=document.getElementById('resetBtn');

colTiming.addEventListener('input',()=>colTimingVal.textContent=colTiming.value+" ms");
discoSpeed.addEventListener('input',()=>discoSpeedVal.textContent=discoSpeed.value+"×");
colorSelect.addEventListener('change',()=>discoSpeedWrap.style.display=colorSelect.value==='disco'?'flex':'none');
textInput.addEventListener('input',()=>goBtn.disabled=!textInput.value.trim());
helpBtn.onclick=()=>helpDialog.showModal();
closeHelp.onclick=()=>helpDialog.close();
resetBtn.onclick=()=>location.reload();

// Full uppercase 5×7 bitmap font
const FONT={
"A":[30,5,5,30,0],"B":[31,21,21,10,0],"C":[14,17,17,10,0],"D":[31,17,17,14,0],"E":[31,21,21,17,0],"F":[31,5,5,1,0],
"G":[14,17,21,29,0],"H":[31,4,4,31,0],"I":[17,31,17,0,0],"J":[8,16,16,15,0],"K":[31,4,10,17,0],"L":[31,16,16,16,0],
"M":[31,2,4,2,31],"N":[31,2,4,31,0],"O":[14,17,17,14,0],"P":[31,5,5,2,0],"Q":[14,17,25,30,0],"R":[31,5,13,18,0],
"S":[18,21,21,9,0],"T":[1,31,1,1,0],"U":[15,16,16,15,0],"V":[7,8,16,8,7],"W":[31,8,4,8,31],"X":[27,4,4,27,0],
"Y":[3,4,24,4,3],"Z":[25,21,19,17,0],
"0":[14,17,17,14,0],"1":[0,18,31,16,0],"2":[18,25,21,18,0],"3":[17,21,21,10,0],"4":[7,4,4,31,0],
"5":[23,21,21,9,0],"6":[14,21,21,8,0],"7":[1,1,29,3,0],"8":[10,21,21,10,0],"9":[2,21,21,14,0]
};

const LETTER_SPACING=1;
const WORD_SPACING=6;
const PAD=6;

let columns=[];
let colIndex=0;
let lastTime=0;
let playing=false;
let hueBase=0;

function resize(){ wand.width=innerWidth; wand.height=innerHeight; }
resize();
addEventListener('resize',resize);

function build(){
  columns=[];
  const raw=textInput.value.toUpperCase();

  for(let i=0;i<PAD;i++) columns.push([0,0,0,0,0,0,0]);

  for(const ch of raw){
    if(ch===' '){ for(let i=0;i<WORD_SPACING;i++) columns.push([0,0,0,0,0,0,0]); continue; }
    const g=FONT[ch]; if(!g) continue;

    for(const b of g){
      let col=[]; for(let r=0;r<7;r++) col.push((b>>r)&1);
      columns.push(col);
    }

    for(let i=0;i<LETTER_SPACING;i++) columns.push([0,0,0,0,0,0,0]);
  }

  for(let i=0;i<PAD;i++) columns.push([0,0,0,0,0,0,0]);
}

function hsv(h,s,v){ let c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r=0,g=0,b=0;
 if(h<60){r=c;g=x;} else if(h<120){r=x;g=c;} else if(h<180){g=c;b=x;} else if(h<240){g=x;b=c;} else if(h<300){r=x;b=c;} else {r=c;b=x;}
 return `rgb(${(r+m)*255|0},${(g+m)*255|0},${(b+m)*255|0})`; }

function draw(t){
  if(!playing) return;
  const w=wand.width,h=wand.height;

  if(t-lastTime>parseInt(colTiming.value)){
    colIndex=(colIndex+1)%columns.length;
    lastTime=t;
  }

  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.fillRect(0,0,w,h);

  const col=columns[colIndex];
  const spacing=h*0.06;
  const diam=spacing*0.8;
  const top=h/2-(7*spacing)/2;

  const disco=colorSelect.value==='disco';

  for(let r=0;r<7;r++){
    if(col[r]){
      ctx.beginPath();
      ctx.fillStyle=disco ? hsv(hueBase+r*15,1,1) : colorSelect.value;
      ctx.arc(w/2,top+r*spacing,diam/2,0,Math.PI*2);
      ctx.fill();
    }
  }

  if(disco) hueBase=(hueBase+parseFloat(discoSpeed.value))%360;

  requestAnimationFrame(draw);
}

goBtn.onclick=()=>{
  build();
  playing=true;
  wand.style.display='block';
  goBtn.style.display='none';
  stopBtn.style.display='block';
  colIndex=0;
  lastTime=0;
  requestAnimationFrame(draw);
};

stopBtn.onclick=()=>{
  playing=false;
  wand.style.display='none';
  goBtn.style.display='block';
  stopBtn.style.display='none';
};
