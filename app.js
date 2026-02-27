
const textInput=document.getElementById('textInput');
const goBtn=document.getElementById('goBtn');
const welcome=document.getElementById('welcome');
const wand=document.getElementById('wand');

goBtn.onclick=()=>{
 if(!textInput.value.trim()) return;
 welcome.style.display='none'; wand.style.display='block';
 setTimeout(()=>{wand.style.display='none'; welcome.style.display='flex';},3000);
}
