'use strict';

const counts = [10,15,20,25,30,34,38,42,46,50];
const names = ['The Warm-Up','Loose Ends','Moving Targets','Bad Timing','Look Twice','Wrong Way','Under Pressure','Trust Issues','No Safe Bets','Final Straw'];
const offsets = counts.map((_, i) => counts.slice(0,i).reduce((a,b)=>a+b,0));
const total = counts.reduce((a,b)=>a+b,0);
const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const load = () => {
  try { return JSON.parse(localStorage.getItem('rage-bait-v1')) || {}; }
  catch { return {}; }
};
const saved = load();
let unlocked = Number.isInteger(saved.unlocked) ? Math.max(0,Math.min(total,saved.unlocked)) : 0;
let index = Number.isInteger(saved.index) ? Math.max(0,Math.min(total-1,unlocked,saved.index)) : Math.min(total-1,unlocked);
let deaths = Number.isInteger(saved.deaths) ? Math.max(0,saved.deaths) : 0;
let muted = true, audio;
let stage, level, world, player, ticks, delay, outcome, expanded, won = false;
const keys = new Set();
const pointers = new Map();
let jumpBuffer = 0;
const store = () => {
  try { localStorage.setItem('rage-bait-v1',JSON.stringify({unlocked,index,deaths})); }
  catch {}
};
function tone(frequency) {
  if (muted || !audio) return;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(frequency,audio.currentTime);
  gain.gain.setValueAtTime(.045,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime+.14);
}
function platform(x,y,w,kind='solid',options={}) {
  return {x,y,w,kind,baseX:x,baseY:y,hit:null,gone:false,...options};
}
function makeWorld(s,l) {
  const n = offsets[s]+l;
  const count = 4 + Math.floor(s/3);
  const w = Math.round(73 - s*2.8 - l/counts[s]*10);
  const xs = Array.from({length:count},(_,i)=>Math.round(169+i*(510/(count-1))));
  const route = n ^ (n >> 1);
  const floors = [platform(34,345,102)];
  const keyIndex = (l+2*s)%count;
  let key = null;
  for (let i=0;i<count;i++) {
    const x = xs[i] + (((n*7+i*17)%13)-6)*(s>0);
    const y = 328 - ((route >> i)&1)*38 - ((n*13+i*19)%5)*6;
    let kind = 'solid';
    if (s>=2 && (i+l)%4===0) kind='moving';
    else if (s>=3 && (i+l)%4===1) kind='timed';
    else if ((i+l)%4===2 && n>0) kind='crumble';
    const required = s>=4 && i===keyIndex;
    if (required) kind='solid';
    floors.push(platform(x,y,w,kind,{phase:(n*19+i*37)%176,range:12+s*1.4,period:Math.round(195-s*6-l/counts[s]*19),grace:Math.round(37-s*2-l/counts[s]*5)}));
    if (required) key={x:x+w/2,y:y-27,collected:false};
    if (s>=1 && (i+l)%3!==1) {
      floors.push(platform(x+((i+s)%2?15:-12),y+72,w-5,'bait',{grace:7}));
    }
  }
  if (n===0) { floors[2].kind='bait'; floors[2].grace=18; }
  if (s>=7) {
    const index = (l+s)% (count-1);
    const x = Math.round((xs[index]+xs[index+1])/2);
    floors.push(platform(x-16,365,32,'bait',{grace:6}));
  }
  const exitY = 307 + ((n*3)%5)*8;
  floors.push(platform(763,exitY,76));
  return {floors,key,exit:{x:790,y:exitY},reverse:s===9 && l%5===4};
}
function label() {
  if (index===0) return 'First Jump';
  if (world.reverse) return 'Wrong Way Round';
  const titles = ['Watch Your Step','Mind the Gap','A Small Favor','One More Jump','Too Good to Be True','Think Fast','A Leg to Stand On','Almost There','Second Thoughts','Leap of Faith'];
  return titles[(index+stage*3)%titles.length];
}
function updateMenus() {
  const menu = $('stages');
  menu.replaceChildren();
  counts.forEach((count,s)=>{
    const button = document.createElement('button');
    const available = offsets[s]<=unlocked;
    const cleared = Math.max(0,Math.min(count,unlocked-offsets[s]));
    button.className='stage-button';
    button.disabled=!available;
    button.setAttribute('aria-current',String(s===stage));
    button.innerHTML='<b>'+String(s+1).padStart(2,'0')+'</b><span>'+names[s]+'</span><small>'+cleared+'/'+count+'</small>';
    button.onclick=()=>{expanded=expanded===s?-1:s;updateMenus();};
    menu.append(button);
    if(expanded!==s) return;
    const levels = document.createElement('div');
    levels.className='levels';
    levels.setAttribute('aria-label','Stage '+(s+1)+' levels');
    for(let i=0;i<count;i++){
      const b=document.createElement('button'), target=offsets[s]+i;
      b.className='level-button';
      b.textContent=i+1;
      b.setAttribute('aria-label','Play stage '+(s+1)+', level '+(i+1));
      b.setAttribute('aria-current',String(target===index));
      b.disabled=target>unlocked;
      b.onclick=()=>{start(target);canvas.focus();};
      levels.append(b);
    }
    menu.append(levels);
  });
}
function start(next, refresh=true) {
  index=next;
  stage=offsets.findLastIndex(offset=>index>=offset);
  level=index-offsets[stage];
  world=makeWorld(stage,level);
  player={x:70,y:345,vx:0,vy:0,ground:world.floors[0],coyote:6,face:1};
  ticks=0;delay=0;outcome='';won=false;jumpBuffer=0;
  $('status').textContent=world.reverse?'Controls are reversed':world.key?'Collect the diamond to unlock the exit':index===0?'Reach the green exit':'';
  if(!refresh) return;
  expanded=stage;
  $('title').textContent=label();
  $('stage').textContent='STAGE '+String(stage+1).padStart(2,'0')+' / '+names[stage].toUpperCase();
  $('level').textContent='LEVEL '+String(level+1).padStart(2,'0')+' / '+counts[stage];
  $('progress').textContent=unlocked+' / '+total+' CLEARED';
  $('deaths').textContent='× '+deaths+' DEATHS';
  store();
  updateMenus();
}
function die() {
  deaths++;
  store();
  $('deaths').textContent='× '+deaths+' DEATHS';
  $('status').textContent='Ouch. Going again…';
  tone(90);
  outcome='death';delay=25;
}
function clear() {
  unlocked=Math.max(unlocked,index+1);
  store();
  $('progress').textContent=unlocked+' / '+total+' CLEARED';
  tone(660);
  if(index===total-1){
    won=true;
    $('status').textContent='All '+total+' levels cleared!';
    updateMenus();
  }else{
    $('status').textContent='Level cleared';
    outcome='clear';delay=38;
  }
}
function active(p) {
  return !p.gone && (p.kind!=='timed'||(ticks+p.phase)%p.period < p.period-57);
}
function step() {
  if(won)return;
  if(delay){
    if(--delay===0) {
      if(outcome==='clear') start(index+1);
      else start(index,false);
    }
    return;
  }
  ticks++;
  for(const p of world.floors){
    const old=p.x;
    if(p.kind==='moving')p.x=p.baseX+Math.sin((ticks+p.phase)/31)*p.range;
    if(p.hit!==null && ticks-p.hit>=p.grace)p.gone=true;
    if(player.ground===p){
      if(!active(p))player.ground=null;
      else player.x+=p.x-old;
    }
  }
  const left=keys.has('left')||[...pointers.values()].includes('left');
  const right=keys.has('right')||[...pointers.values()].includes('right');
  const direction=(Number(right)-Number(left))*(world.reverse?-1:1);
  player.vx=direction*4.4;
  if(direction)player.face=direction;
  player.x=Math.max(12,Math.min(852,player.x+player.vx));
  if(player.ground && (player.x+8<=player.ground.x || player.x-8>=player.ground.x+player.ground.w)) player.ground=null;
  player.coyote=player.ground?6:Math.max(0,player.coyote-1);
  if(jumpBuffer>0 && player.coyote>0){
    player.vy=-10.8;player.coyote=0;player.ground=null;jumpBuffer=0;tone(240);
  }
  jumpBuffer=Math.max(0,jumpBuffer-1);
  if(!player.ground){
    const oldY=player.y;
    player.vy+=.53;
    player.y+=player.vy;
    if(player.vy>=0){
      const landing=world.floors.filter(p=>active(p)&&oldY<=p.y&&player.y>=p.y&&player.x+8>p.x&&player.x-8<p.x+p.w).sort((a,b)=>a.y-b.y)[0];
      if(landing){
        player.y=landing.y;player.vy=0;player.ground=landing;
        if((landing.kind==='crumble'||landing.kind==='bait') && landing.hit===null)landing.hit=ticks;
      }
    }
  }
  if(world.key && !world.key.collected && Math.abs(player.x-world.key.x)<20 && Math.abs(player.y-14-world.key.y)<23){
    world.key.collected=true;
    $('status').textContent='Exit unlocked';
    tone(480);
  }
  if(Math.abs(player.x-world.exit.x)<17 && Math.abs(player.y-world.exit.y)<24 && (!world.key||world.key.collected)){clear();return;}
  if(player.y>442)die();
}

function rect(x,y,w,h,color) {
  ctx.fillStyle=color;
  ctx.fillRect(Math.round(x),Math.round(y),w,h);
}
function words(value,x,y,color,size=12) {
  ctx.fillStyle=color;
  ctx.font='bold '+size+'px monospace';
  ctx.fillText(value,x,y);
}
function draw() {
  const bg=ctx.createLinearGradient(0,0,0,460);
  bg.addColorStop(0,'#1b1628');
  bg.addColorStop(.72,'#22182d');
  bg.addColorStop(1,'#381829');
  rect(0,0,864,460,bg);
  for(let x=0;x<864;x+=24) rect(x,0,1,460,'#ffffff09');
  for(let y=0;y<460;y+=24) rect(0,y,864,1,'#ffffff09');
  for(let i=0;i<32;i++){
    const x=(i*139+33)%864,y=(i*71+17)%242;
    rect(x,y,i%5===0?3:1,i%5===0?3:1,i%5===0?'#a884be66':'#a884be38');
  }
  ctx.strokeStyle='#a46bb43d';
  ctx.beginPath();
  ctx.arc(710,121,74,0,Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(710,121,62,0,Math.PI*2);
  ctx.stroke();
  for(let i=0;i<15;i++){
    const x=i*63-11, h=20+(i*77%102);
    rect(x,425-h,34+(i%3)*7,h,'#171322');
    rect(x+5,430-h,2,Math.max(3,h-12),'#262034');
  }
  rect(0,432,864,28,'#241222');
  rect(0,432,864,2,'#873752');
  for(let x=-15;x<870;x+=26){
    ctx.fillStyle='#b84668';
    ctx.beginPath();ctx.moveTo(x,432);ctx.lineTo(x+8,422);ctx.lineTo(x+16,432);ctx.fill();
  }
  for(let i=0;i<38;i++)rect((i*47+ticks*.6)%864,415+(i*13)%42,4+(i%4)*3,1,'#ff54864d');

  for(const p of world.floors){
    if(!active(p)){
      if(!p.gone)rect(p.x,p.y,p.w,2,'#8c77a54d');
      continue;
    }
    const cracking=p.hit!==null;
    const cap=cracking?'#ff658c':p.kind==='moving'?'#7bdfec':p.kind==='timed'?'#c59fee':'#aa91bf';
    rect(p.x,p.y,p.w,16,'#493453');
    rect(p.x,p.y,p.w,3,cap);
    rect(p.x,p.y+15,p.w,2,'#160f20');
    for(let x=7;x<p.w-3;x+=13)rect(p.x+x,p.y+7,5,3,'#654a73');
    if(cracking){
      rect(p.x+p.w*.45,p.y+2,3,5,'#301427');
      rect(p.x+p.w*.45+3,p.y+6,3,7,'#301427');
    }
  }

  if(world.key && !world.key.collected){
    const {x,y}=world.key;
    const floating=Math.sin(ticks/13)*4;
    ctx.save();ctx.translate(x,y+floating);ctx.rotate(Math.PI/4);
    rect(-7,-7,14,14,'#ffce61');rect(-4,-4,8,8,'#fff4b9');ctx.restore();
  }
  const exit=world.exit, open=!world.key||world.key.collected;
  const glow=ctx.createRadialGradient(exit.x,exit.y-20,4,exit.x,exit.y-20,46);
  glow.addColorStop(0,open?'#ccff4870':'#ffc46b50');
  glow.addColorStop(1,'#00000000');
  rect(exit.x-46,exit.y-66,92,92,glow);
  const door=open?'#d8ff45':'#ffc46b';
  rect(exit.x-17,exit.y-38,34,38,'#151b1d');
  rect(exit.x-17,exit.y-38,3,38,door);
  rect(exit.x+14,exit.y-38,3,38,door);
  rect(exit.x-17,exit.y-38,34,3,door);
  rect(exit.x-9,exit.y-29,18,29,open?'#84a92e':'#715530');
  for(let i=0;i<4;i++)rect(exit.x-7+i*4,exit.y-25,1,24,open?'#b8e247':'#9c733a');
  words('EXIT',exit.x-14,exit.y-46,door);

  if(outcome!=='death'){
    const {x,y,face}=player;
    const stride=player.ground&&player.vx ? Math.floor(ticks/4)%2*4 : 0;
    rect(x-10,y-24,20,19,'#ffce61');
    rect(x-10,y-24,20,3,'#fff2b5');
    rect(x-10,y-8,20,3,'#c67741');
    rect(x+face*3-4,y-17,3,4,'#211729');
    rect(x+face*3+2,y-17,3,4,'#211729');
    rect(x-9,y-5,6,5-stride/2,'#ffce61');
    rect(x+3,y-5,6,3+stride/2,'#ffce61');
  }else{
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9;
      const radius=(26-delay)*1.8;
      rect(player.x+Math.cos(angle)*radius,Math.min(player.y-15,417)+Math.sin(angle)*radius,4,4,'#ff748e');
    }
  }
  if(won){
    rect(0,0,864,460,'#141019e0');
    ctx.textAlign='center';words('YOU BEAT RAGE BAIT',432,231,'#d8ff45',38);
    words(total+' levels cleared • '+deaths+' deaths',432,263,'#ddd4e9',16);
    ctx.textAlign='left';
  }
}
const bindings={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
document.addEventListener('keydown',e=>{
  const action=bindings[e.code];
  const interactive=e.target instanceof HTMLButtonElement;
  if(e.code==='KeyR'&&!e.repeat){start(index);return;}
  if(!action || (interactive&&e.code==='Space'))return;
  e.preventDefault();
  if(action==='jump'){
    if(!e.repeat)jumpBuffer=7;
  }else keys.add(action);
});
document.addEventListener('keyup',e=>{
  const action=bindings[e.code];
  if(action){
    const secondary={left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']};
    pressed.delete(e.code);
    if(!secondary[action]?.some(code=>pressed.has(code)))keys.delete(action);
  }
});
const pressed=new Set();
document.addEventListener('keydown', e=>pressed.add(e.code));
window.addEventListener('blur',()=>{keys.clear();pressed.clear();pointers.clear();jumpBuffer=0;});
for(const action of ['left','right','jump']){
  const button=$(action);
  button.addEventListener('pointerdown',e=>{
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    if(action==='jump')jumpBuffer=7;
    else pointers.set(e.pointerId,action);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture']){
    button.addEventListener(event,e=>pointers.delete(e.pointerId));
  }
  button.addEventListener('click',e=>{
    if(e.detail===0&&action==='jump')jumpBuffer=7;
  });
}
$('restart').onclick=()=>{start(index);canvas.focus();};
$('sound').onclick=()=>{
  muted=!muted;
  if(!muted){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(Audio){audio||=new Audio();audio.resume().catch(()=>{});}
  }
  $('sound').textContent=muted?'Sound off':'Sound on';
  $('sound').setAttribute('aria-pressed',String(!muted));
  canvas.focus();
};
start(index);
let previous=0, elapsed=0;
function frame(now){
  if(previous)elapsed+=Math.min(now-previous,50);
  previous=now;
  while(elapsed>=1000/60){step();elapsed-=1000/60;}
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
