
// Core elements
const textInput=textInput=document.getElementById('textInput');
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
const resetBtn=document.getElementById('resetBtn');
const debugToggle=document.getElementById('debugToggle');
const debugPanel=document.getElementById('debugPanel');

let debug=false;let isPlaying=false;let sessionEnd=0;

function logDebug(){if(!debug)return;debugPanel.textContent=`playing=${isPlaying}
color=${colorSelect.value}
disco=${discoSpeed.value}
autoMirror=${autoMirrorChk.checked}
haptics=${hapticsChk.checked}`;}

setInterval(logDebug,300);

textInput.addEventListener('input',()=>goBtn.disabled=!textInput.value.trim());
colorSelect.addEventListener('change',()=>{discoSpeedWrap.style.display=(colorSelect.value==='disco')?'flex':'none';});
discoSpeed.addEventListener('input',()=>discoSpeedVal.textContent=discoSpeed.value+'×');
helpBtn.onclick=()=>helpDialog.showModal();
closeHelp.onclick=()=>helpDialog.close();
debugToggle.onclick=()=>{debug=!debug;debugPanel.style.display=debug?'block':'none';};

resetBtn.onclick=()=>{
  if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(regs=>{for(let r of regs)r.unregister();location.reload();});}
};

function startPlay(){
 isPlaying=true;
 const dur=(durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value);
 welcome.style.transition='opacity .4s'; welcome.style.opacity='0';
 setTimeout(()=>{
   welcome.style.display='none'; wand.style.display='block'; stopBtn.style.display='block';
   sessionEnd=performance.now()+dur;
 },400);
}

function stopPlay(){isPlaying=false;wand.style.display='none';stopBtn.style.display='none';welcome.style.display='flex';setTimeout(()=>welcome.style.opacity='1',20);}
stopBtn.onclick=stopPlay;

goBtn.onclick=startPlay;

function animate(){requestAnimationFrame(animate);if(isPlaying&&performance.now()>sessionEnd)stopPlay();}
animate();
