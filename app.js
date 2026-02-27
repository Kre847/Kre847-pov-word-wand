
// Simplified POV v9.1
const textInput=document.getElementById('textInput');
const goBtn=document.getElementById('goBtn');
const welcome=document.getElementById('welcome');
const wand=document.getElementById('wand');
const stopBtn=document.getElementById('stopBtn');
const colorSelect=document.getElementById('colorSelect');
const discoSpeedWrap=document.getElementById('discoSpeedWrap');
const discoSpeed=document.getElementById('discoSpeed');
const discoSpeedVal=document.getElementById('discoSpeedVal');
const durationSelect=document.getElementById('durationSelect');
const autoMirrorChk=document.getElementById('autoMirrorChk');
const hapticsChk=document.getElementById('hapticsChk');
const helpBtn=document.getElementById('helpBtn');
const helpDialog=document.getElementById('helpDialog');
const closeHelp=document.getElementById('closeHelp');

let isPlaying=false; let sessionEnd=0; let DOT_COLOR='#fff'; let DISCO_SPEED=1.8;

textInput.addEventListener('input',()=>{
 goBtn.disabled = !textInput.value.trim();
});
colorSelect.addEventListener('change',()=>{
 DOT_COLOR=colorSelect.value;
 discoSpeedWrap.style.display = (DOT_COLOR==='disco') ? 'flex':'none';
});
discoSpeed.addEventListener('input',()=>{
 DISCO_SPEED=parseFloat(discoSpeed.value)||1.8;
 discoSpeedVal.textContent=DISCO_SPEED.toFixed(1)+'×';
});
helpBtn.onclick=()=>helpDialog.showModal();
closeHelp.onclick=()=>helpDialog.close();

function fadeOutWelcome(cb){ welcome.style.transition='opacity .4s'; welcome.style.opacity='0'; setTimeout(cb,400); }
function fadeInWelcome(){ welcome.style.display='flex'; setTimeout(()=>welcome.style.opacity='1',20); }

function startPlay(){
 isPlaying=true;
 const dur = (durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value);
 fadeOutWelcome(()=>{
   welcome.style.display='none';
   wand.style.display='block';
   stopBtn.style.display='block';
   sessionEnd = performance.now()+dur;
 });
}

function stopPlay(){ isPlaying=false; wand.style.display='none'; stopBtn.style.display='none'; fadeInWelcome(); }

stopBtn.onclick=stopPlay;

// Dummy animation for now
function animate(){ requestAnimationFrame(animate);
 if(isPlaying){ if(performance.now()>sessionEnd) stopPlay(); }
}
animate();

goBtn.onclick=()=>{ startPlay(); };
