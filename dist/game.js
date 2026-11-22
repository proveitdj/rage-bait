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
function label() {
  return world.theme[0];
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
function enterRoom(room) {
  world=makeEncounter(stage,level,room);
  player={x:70,y:345,vx:0,vy:0,ground:world.floors[0],coyote:6,face:1,stroke:0};
  ticks=0;delay=0;outcome='';won=false;jumpBuffer=0;
  $('status').textContent=world.theme[6];
  $('dangers').textContent=world.levelDangers+' THREATS';
  $('level').textContent='LEVEL '+String(level+1).padStart(2,'0')+' / '+counts[stage]
    +(world.rooms>1?' · ROOM '+(room+1)+' / '+world.rooms:'');
  $('title').textContent=label();
  $('stage').textContent='STAGE '+String(stage+1).padStart(2,'0')+' / '+(world.theme?.[1]||names[stage]).toUpperCase();
}
function start(next, refresh=true) {
  index=next;
  stage=offsets.findLastIndex(offset=>index>=offset);
  level=index-offsets[stage];
  enterRoom(0);
  if(!refresh) return;
  expanded=stage;
  $('progress').textContent=unlocked+' / '+total+' CLEARED';
  $('deaths').textContent='× '+deaths+' DEATHS';
  store();
  updateMenus();
}
function die(reason) {
  deaths++;
  store();
  $('deaths').textContent='× '+deaths+' DEATHS';
  $('status').textContent=reason || 'Ouch. Going again…';
  tone(90);
  outcome='death';delay=25;
}
function clear() {
  if(world.room+1<world.rooms){
    tone(540);
    enterRoom(world.room+1);
    return;
  }
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
    if(p.kind==='quake')p.x=p.baseX+Math.sin((ticks+p.phase)/24)*p.range;
    if(p.hit!==null && ticks-p.hit>=p.grace)p.gone=true;
    if(player.ground===p){
      if(!active(p))player.ground=null;
      else player.x+=p.x-old+(p.kind==='belt'?p.push:0);
    }
  }
  const left=keys.has('left')||[...pointers.values()].includes('left');
  const right=keys.has('right')||[...pointers.values()].includes('right');
  const direction=(Number(right)-Number(left))*(world.reverse?-1:1);
  const wet=waterAt(player.x,player.y);
  const desired=direction*(wet?3.4:4.4);
  player.vx=world.ice && !wet ? player.vx*.76+desired*.24 : desired;
  if(world.wind && !wet && !player.ground)player.vx+=windAt(ticks);
  if(direction)player.face=direction;
  const nextX=Math.max(12,Math.min(852,player.x+player.vx));
  const roof=tunnelCeiling(nextX);
  if(roof===undefined || player.y-22>=roof-1)player.x=nextX;
  if(player.ground && (player.x+8<=player.ground.x || player.x-8>=player.ground.x+player.ground.w)) player.ground=null;
  player.coyote=player.ground?6:Math.max(0,player.coyote-1);
  player.stroke=Math.max(0,player.stroke-1);
  if(jumpBuffer>0 && (player.coyote>0 || wet && player.stroke===0)){
    player.vy=wet?-8.5:player.ground?.kind==='spring'?-12.4:-10.8;
    if(wet)player.stroke=17;
    player.coyote=0;player.ground=null;jumpBuffer=0;tone(240);
  }
  jumpBuffer=Math.max(0,jumpBuffer-1);
  if(!player.ground){
    const oldY=player.y;
    player.vy=Math.min(wet?3.9:16,player.vy+(wet?.36:.53));
    player.y+=player.vy;
    const ceiling=tunnelCeiling(player.x);
    if(ceiling!==undefined && player.vy<0 && player.y-22<ceiling){
      player.y=ceiling+22;
      player.vy=0;
    }
    if(player.vy>=0){
      const landing=world.floors.filter(p=>active(p)&&oldY<=p.y&&player.y>=p.y&&player.x+8>p.x&&player.x-8<p.x+p.w).sort((a,b)=>a.y-b.y)[0];
      if(landing){
        player.y=landing.y;player.vy=0;player.ground=landing;
        if((['crumble','bait','cliff'].includes(landing.kind)) && landing.hit===null)landing.hit=ticks;
      }
    }
  }
  if(world.key && !world.key.collected && Math.abs(player.x-world.key.x)<20 && Math.abs(player.y-14-world.key.y)<23){
    world.key.collected=true;
    $('status').textContent='Exit unlocked';
    tone(480);
  }
  const reason=campaignTrapHit();
  if(reason){die(reason);return;}
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
  drawTerrainBackdrop();
  drawPlayfield();
}
function drawPlayfield(){
  ctx.save();
  if(world.quake && !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)){
    const tremor=Math.max(0,Math.sin((ticks+world.phase)/46));
    ctx.translate(Math.sin(ticks*1.8)*tremor*3,Math.cos(ticks*1.3)*tremor*2);
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
      if(p.kind==='cliff' && p.gone){
        const fall=ticks-p.hit-p.grace;
        if(fall<28){
          for(let i=0;i<4;i++)rect(p.x+i*p.w/4,p.y+fall*fall*.35+i*fall,p.w/4-2,14,'#876268');
        }
      }
      continue;
    }
    const cracking=p.hit!==null;
    const [terrainCap,body,detail]=terrainPlatformPalette(p);
    const cap=cracking?'#ff658c':p.kind==='quake'?'#7bdfec':p.kind==='timed'?'#c59fee':p.kind==='spring'?'#d8ff45':terrainCap;
    rect(p.x,p.y,p.w,16,body);
    rect(p.x,p.y,p.w,3,cap);
    rect(p.x,p.y+15,p.w,2,'#160f20');
    for(let x=7;x<p.w-3;x+=13)rect(p.x+x,p.y+7,5,3,detail);
    if(p.kind==='belt'){
      for(let i=7;i<p.w-5;i+=12)rect(p.x+(i+ticks*Math.sign(p.push))%p.w,p.y+6,4,4,cap);
    }
    if(p.kind==='spring')rect(p.x+p.w*.38,p.y-4,p.w*.24,5,cap);
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
  drawDoor(exit.x,exit.y,open);
  drawCampaignTraps();

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
  drawTerrainForeground();
  ctx.restore();
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
