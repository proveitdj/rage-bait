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
let attempt = 0;
let dailyRun = null, campaignState;
const store = (selected = index) => {
  if(dailyRun)return;
  try { localStorage.setItem('rage-bait-v1',JSON.stringify({unlocked,index:selected,deaths})); }
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
function updateMenus() {
  const menu = $('stages');
  menu.replaceChildren();
  if(dailyRun)return;
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
function showLedgeProgress(count) {
  $('route-progress').textContent=count+' / '+world.levelLedges+' LEDGES';
  const meter=$('route-meter');
  meter.max=world.levelLedges;
  meter.value=count;
}
function paintRoomHud(status) {
  $('status').textContent=status;
  $('dangers').textContent=world.levelDangers+' THREATS';
  showLedgeProgress(won?world.levelLedges:world.ledgeOffset+world.ledgeReached);
  $('level').textContent=(dailyRun?'DAILY CHALLENGE':'LEVEL '+String(level+1).padStart(2,'0')+' / '+counts[stage])
    +(world.rooms>1?' · ROOM '+(world.room+1)+' / '+world.rooms:'');
  $('title').textContent=world.scene.title;
  $('stage').textContent=dailyRun?dailyRun.challenge.date+' · DAILY RAGE BAIT'
    :'STAGE '+String(stage+1).padStart(2,'0')+' / '+world.scene.setting.toUpperCase();
}
function paintRunHud() {
  $('progress').textContent=dailyRun?formatDailyTime(dailyRun.ticks):unlocked+' / '+total+' CLEARED';
  $('deaths').textContent='× '+(dailyRun?dailyRun.deaths:deaths)+' DEATHS';
  $('daily').setAttribute('aria-pressed',String(Boolean(dailyRun)));
  $('campaign').setAttribute('aria-pressed',String(!dailyRun));
  $('campaign-panel').hidden=Boolean(dailyRun);
}
function enterRoom(room) {
  world=makeEncounter(stage,level,room,attempt);
  player={...world.spawn,vx:0,vy:0,scale:1,ground:world.floors[0],coyote:6,
    face:Math.sign(world.floors[1].x-world.spawn.x)||1,stroke:0};
  ticks=0;delay=0;outcome='';won=false;jumpBuffer=0;
  world.ledgeReached=0;
  const hint=gimmickHint(world)||(world.reverse?'Left and right are swapped. ':'')
    +(world.task?.title || (world.zones.length?'Space swims. Reach the exit.':'Reach the exit.'));
  paintRoomHud(hint);
}
function start(next, refresh=true, retry=false) {
  attempt=retry?attempt+1:0;
  index=next;
  stage=offsets.findLastIndex(offset=>index>=offset);
  level=index-offsets[stage];
  enterRoom(0);
  if(!refresh)return;
  expanded=stage;
  paintRunHud();
  store();
  updateMenus();
}
function setChallengeUrl(date) {
  if(!window.location || !window.history)return;
  const url=new URL(window.location.href);
  if(date)url.searchParams.set('challenge',date);
  else url.searchParams.delete('challenge');
  window.history.replaceState(null,'',url.href);
}
function beginDaily(challenge=dailyChallenge()) {
  if(!challenge)return;
  if(!dailyRun){
    campaignState={index,stage,level,world,player,ticks,delay,outcome,expanded,won,attempt,
      status:$('status').textContent};
  }
  dailyRun={challenge,ticks:0,deaths:0,started:false};
  clearInputs();
  start(challenge.index);
  setChallengeUrl(challenge.date);
}
function leaveDaily() {
  if(!dailyRun || !campaignState)return;
  dailyRun=null;
  const {status,...state}=campaignState;
  ({index,stage,level,world,player,ticks,delay,outcome,expanded,won,attempt}=state);
  campaignState=null;
  clearInputs();
  paintRoomHud(status);
  paintRunHud();
  updateMenus();
  setChallengeUrl(null);
}
function restartGame() {
  if(dailyRun)beginDaily(dailyRun.challenge);
  else start(index,true,true);
}
function die(reason) {
  if(dailyRun)dailyRun.deaths++;
  else{
    deaths++;
    store();
  }
  $('deaths').textContent='× '+(dailyRun?dailyRun.deaths:deaths)+' DEATHS';
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
  showLedgeProgress(world.levelLedges);
  tone(660);
  if(dailyRun){
    const {challenge,ticks:elapsed,deaths:runDeaths}=dailyRun;
    outcome='daily-complete';
    paintRunHud();
    $('status').textContent='Daily challenge cleared';
    clearInputs();
    showDailyResult({date:challenge.date,title:world.scene.title,ticks:elapsed,deaths:runDeaths,
      retry:()=>beginDaily(challenge),back:leaveDaily});
    return;
  }
  const firstClear=index>=unlocked;
  unlocked=Math.max(unlocked,index+1);
  $('progress').textContent=unlocked+' / '+total+' CLEARED';
  if(index===total-1){
    store();
    won=true;
    $('status').textContent='All '+total+' levels cleared!';
    updateMenus();
  }else if(firstClear && level===counts[stage]-1){
    const next=index+1;
    outcome='intermission';
    $('status').textContent='Stage cleared';
    store(next);
    clearInputs();
    showStageResults({stage:stage+1,title:names[stage],levels:counts[stage],deaths,next:()=>start(next)});
  }else{
    store();
    $('status').textContent='Level cleared';
    outcome='clear';delay=38;
  }
}
function playerHalfWidth() {
  return 8*player.scale;
}
function playerHeight() {
  return 22*player.scale;
}
function solidOverlaps(solid,x,y,halfWidth,height) {
  return gimmickSolidActive(solid) && x+halfWidth>solid.x && x-halfWidth<solid.x+solid.w &&
    y>solid.y && y-height<solid.y+solid.h;
}
function canFitPlayer(scale) {
  return !world.solids.some(solid=>solidOverlaps(solid,player.x,player.y,8*scale,22*scale));
}
function active(p) {
  return !p.gone && gimmickSolidActive(p) && (p.kind!=='timed'||(ticks+p.phase)%p.period < p.period-57);
}
function step() {
  if(won || outcome==='daily-complete' || outcome==='intermission' || monetizationDialogOpen())return;
  if(dailyRun){
    if(!dailyRun.started){
      if(!keys.size && !pointers.size && jumpBuffer===0)return;
      dailyRun.started=true;
    }
    dailyRun.ticks++;
    if(dailyRun.ticks%6===0)$('progress').textContent=formatDailyTime(dailyRun.ticks);
  }
  if(delay){
    if(--delay===0) {
      if(outcome==='clear') start(index+1);
      else start(index,false,true);
    }
    return;
  }
  ticks++;
  for(const p of world.floors){
    const old=p.x;
    if(p.form==='boat')p.x=boatPosition(p,ticks);
    else if(p.kind==='quake')p.x=p.baseX+Math.sin((ticks+p.phase)/24)*p.range;
    if(p.hit!==null){
      const age=ticks-p.hit;
      if(p.recovery && age>=p.grace+p.recovery){
        p.hit=null;
        p.gone=false;
      }else if(age>=p.grace)p.gone=true;
    }
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
  const halfWidth=playerHalfWidth(), height=playerHeight();
  const blocked=world.solids.some(solid=>solidOverlaps(solid,nextX,player.y,halfWidth,height));
  if(!blocked)player.x=nextX;
  if(player.ground && (player.x+halfWidth<=player.ground.x || player.x-halfWidth>=player.ground.x+player.ground.w)) player.ground=null;
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
    if(player.vy<0){
      const ceiling=world.solids.find(b=>gimmickSolidActive(b) &&
        player.x+halfWidth>b.x && player.x-halfWidth<b.x+b.w &&
        oldY-height>=b.y+b.h && player.y-height<b.y+b.h);
      if(ceiling){player.y=ceiling.y+ceiling.h+height;player.vy=0;}
      gimmickHeadbutt(oldY-height,player.y-height,halfWidth);
    }
    if(player.vy>=0){
      const landing=world.supports.filter(p=>active(p)&&oldY<=p.y&&player.y>=p.y&&player.x+halfWidth>p.x&&player.x-halfWidth<p.x+p.w).sort((a,b)=>a.y-b.y)[0];
      if(landing){
        player.y=landing.y;player.vy=0;player.ground=landing;
        if(landing.routeIndex>world.ledgeReached){
          world.ledgeReached=landing.routeIndex;
          showLedgeProgress(world.ledgeOffset+world.ledgeReached);
        }
        if((['crumble','bait','cliff'].includes(landing.kind)) && landing.hit===null)landing.hit=ticks;
      }
    }
  }
  updateGimmick();
  updateObjective();
  const reason=gimmickHit() || extraHazardHit() || surpriseHit() || retrySpikeHit() || campaignTrapHit();
  if(reason){die(reason);return;}
  if(Math.abs(player.x-world.exit.x)<17 && Math.abs(player.y-world.exit.y)<24 && taskOpen(world) && gimmickExitOpen(world)){clear();return;}
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
  drawAnthologyBackdrop();
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
    if(gimmickFloorHidden(p))continue;
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
    const [terrainCap,body,detail]=anthologyPalette(p);
    const cap=cracking?'#ff658c':p.kind==='quake'?'#7bdfec':p.kind==='timed'?'#c59fee':p.kind==='spring'?'#d8ff45':terrainCap;
    if(!drawLandform(p,[cap,body,detail])){
      rect(p.x,p.y,p.w,16,body);
      rect(p.x,p.y,p.w,3,cap);
      rect(p.x,p.y+15,p.w,2,'#160f20');
      for(let x=7;x<p.w-3;x+=13)rect(p.x+x,p.y+7,5,3,detail);
    }
    if(p.kind==='belt'){
      for(let i=7;i<p.w-5;i+=12)rect(p.x+(i+ticks*Math.sign(p.push))%p.w,p.y+6,4,4,cap);
    }
    if(p.kind==='spring')rect(p.x+p.w*.38,p.y-4,p.w*.24,5,cap);
    if(cracking){
      rect(p.x+p.w*.45,p.y+2,3,5,'#301427');
      rect(p.x+p.w*.45+3,p.y+6,3,7,'#301427');
    }
  }

  for(const b of world.solids){
    if(!gimmickSolidActive(b))continue;
    rect(b.x,b.y,b.w,b.h,world.scene.ink);
    rect(b.x,b.y,b.w,3,world.scene.accent);
    rect(b.x,b.y+b.h-3,b.w,3,'#111019');
    for(let x=10;x<b.w-9;x+=25)rect(b.x+x,b.y+b.h-9,9,3,'#ffffff30');
  }
  const exit=gimmickDoor(world);
  const falseDoor=world.gimmick?.type==='switch'&&!gimmickExitOpen(world);
  const open=falseDoor||taskOpen(world)&&gimmickExitOpen(world);
  const glow=ctx.createRadialGradient(exit.x,exit.y-20,4,exit.x,exit.y-20,46);
  glow.addColorStop(0,open?'#ccff4870':'#ffc46b50');
  glow.addColorStop(1,'#00000000');
  rect(exit.x-46,exit.y-66,92,92,glow);
  drawDoor(exit.x,exit.y,open,world.gimmick?.type==='switch');
  drawCampaignTraps();
  drawRetrySpikes();
  drawSurprise();
  drawExtraHazards();
  drawGimmick();
  drawObjective();

  if(outcome!=='death'){
    const {x,y,face}=player;
    const stride=player.ground&&player.vx ? Math.floor(ticks/4)%2*4 : 0;
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(player.scale,player.scale);
    const skin=supporterStyle().skin;
    const [coat,highlight,shadow]={
      golden:['#ffd95c','#fff5ab','#c48525'],
      fish:['#6ad6cf','#b1f7ef','#318d96'],
      apple:['#f27277','#ffb3a2','#ad3d55'],
      classic:['#ffce61','#fff2b5','#c67741']
    }[skin];
    rect(-10,-24,20,19,coat);
    rect(-10,-24,20,3,highlight);
    rect(-10,-8,20,3,shadow);
    if(skin==='fish')rect(-face*13-2,-20,4,9,coat);
    if(skin==='apple'){
      rect(-1,-29,3,5,'#82523e');
      rect(2,-30,5,3,'#8edf87');
    }
    if(skin==='golden')rect(-8,-15,3,3,'#fff5ab');
    rect(face*3-4,-17,3,4,'#211729');
    rect(face*3+2,-17,3,4,'#211729');
    rect(-9,-5,6,5-stride/2,coat);
    rect(3,-5,6,3+stride/2,coat);
    ctx.restore();
  }else{
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9;
      const radius=(26-delay)*1.8;
      const x=player.x+Math.cos(angle)*radius;
      const y=Math.min(player.y-15,417)+Math.sin(angle)*radius;
      if(supporterStyle().death==='apples'){
        rect(x,y,6,5,'#ff657c');
        rect(x+3,y-2,2,2,'#92db7a');
      }else rect(x,y,4,4,'#ff748e');
    }
  }
  drawAnthologyForeground();
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
  if(monetizationDialogOpen())return;
  const action=bindings[e.code];
  const interactive=e.target instanceof HTMLButtonElement;
  if(e.code==='KeyR'&&!e.repeat){restartGame();return;}
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
function clearInputs() {
  keys.clear();
  pressed.clear();
  pointers.clear();
  jumpBuffer=0;
}
window.addEventListener('blur',clearInputs);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInputs();});
for(const event of ['pointerup','pointercancel']){
  document.addEventListener(event,e=>pointers.delete(e.pointerId));
}
for(const action of ['left','right','jump']){
  const button=$(action);
  button.addEventListener('pointerdown',e=>{
    e.preventDefault();
    button.setPointerCapture?.(e.pointerId);
    if(action==='jump')jumpBuffer=7;
    else pointers.set(e.pointerId,action);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture']){
    button.addEventListener(event,e=>pointers.delete(e.pointerId));
  }
  button.addEventListener('contextmenu',e=>e.preventDefault());
  button.addEventListener('click',e=>{
    if(e.detail===0&&action==='jump')jumpBuffer=7;
  });
}
const playArea=$('play-area'), fullscreen=$('fullscreen');
function syncFullscreenButton() {
  const expanded=document.fullscreenElement===playArea || playArea.classList.contains('is-expanded');
  fullscreen.setAttribute('aria-pressed',String(expanded));
  fullscreen.textContent=expanded?'Exit full screen':'Full screen';
}
function expandGame(expanded) {
  playArea.classList.toggle('is-expanded',expanded);
  document.body.classList.toggle('play-expanded',expanded);
  syncFullscreenButton();
}
fullscreen.onclick=async()=>{
  if(document.fullscreenElement===playArea){
    await document.exitFullscreen();
    return;
  }
  if(playArea.classList.contains('is-expanded')){
    expandGame(false);
    return;
  }
  if(typeof playArea.requestFullscreen==='function'){
    try {
      await playArea.requestFullscreen();
      syncFullscreenButton();
      return;
    }catch {}
  }
  expandGame(true);
};
document.addEventListener('fullscreenchange',syncFullscreenButton);
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&playArea.classList.contains('is-expanded'))expandGame(false);
});
$('restart').onclick=()=>{restartGame();canvas.focus();};
$('daily').onclick=()=>{
  const today=dailyChallenge();
  if(dailyRun?.challenge.date!==today?.date)beginDaily(today);
  canvas.focus();
};
$('campaign').onclick=()=>{leaveDaily();canvas.focus();};
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
const sharedDaily=dailyFromLink();
if(sharedDaily)beginDaily(sharedDaily);
initializeStageAds();
let previous=0, elapsed=0;
function frame(now){
  if(previous)elapsed+=Math.min(now-previous,50);
  previous=now;
  while(elapsed>=1000/60){step();elapsed-=1000/60;}
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
