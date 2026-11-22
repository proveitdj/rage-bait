'use strict';

const encounters = [
  ['Ceiling Inspection','Mine','#2c261e','#6a3725','#e6af62','roof','Watch the ceiling before you commit.'],
  ['Fault Line','Canyon','#302033','#6e322f','#eeab84','quake','The ledges shift when the ground shakes.'],
  ['Fire Forecast','Volcano','#381727','#7b2925','#ff8c49','fire','The warning marks show where fire will land.'],
  ['Something in the Water','Reef','#102c43','#124764','#67e4d1','fish','Look below before you jump.'],
  ['Edge of Reason','Sea Cliffs','#182e3d','#414556','#a4dce2','cliff','The cliff edges break under your weight.'],
  ['Exit Through the Gift Shop','Carnival','#381b43','#682958','#ff94d1','decoy','An exit sign can lie.'],
  ['Assembly Required','Factory','#252a31','#574539','#ffbd59','belt','The belts keep moving under your feet.'],
  ['Lights Out','Catacombs','#171935','#392345','#bca1ef','blink','Remember where the ledges were.'],
  ['Wrong Way Round','Mirror Hall','#1b213e','#383366','#a1a1ff','mirror','Left and right are swapped.'],
  ['Storm Warning','Sky Islands','#1d3049','#344365','#8aecff','wind','Clouds show which way the wind is blowing.'],
  ['Liquid Assets','Magma Works','#381d24','#793328','#ff9d67','lava','Stay above the rising lava.'],
  ['Security Check','Laboratory','#183437','#324853','#6cf5ba','laser','Cross the beam between pulses.'],
  ['Thin Ice','Glacier','#183440','#355873','#b6f1ff','ice','Give yourself room to brake.'],
  ['Key Evidence','Vault','#302337','#514042','#ffd788','key','Find the diamond before heading for the exit.'],
  ['Spring Loaded','Junkyard','#292e28','#575040','#d6ed86','spring','Use the high bounce to reach the next ledge.'],
  ['False Floor','Ruins','#332732','#53404a','#edb18f','crumble','Some platforms are there to waste your time.'],
];
const routes = [
  [166,314,464,618], [159,276,440,582,687], [156,290,413,549,684],
  [163,288,425,569,686], [166,308,448,572,694], [159,272,398,527,659],
  [153,261,367,479,592,696], [160,260,357,468,575,687],
  [149,235,338,444,536,621,705], [156,276,395,524,662],
  [164,299,404,520,645], [153,245,361,454,565,686]
];
const heights = [
  [328,299,330,288,310,319,308], [321,280,312,348,320,289,314],
  [323,344,305,280,311,343,302], [352,308,264,290,322,344,312],
  [333,315,298,278,298,330,318], [305,277,310,274,312,288,324],
  [334,354,318,351,309,345,320], [290,315,351,313,275,308,334],
  [345,302,339,294,330,284,318], [323,302,281,306,281,306,329],
  [343,323,291,253,290,318,324], [315,343,316,342,311,341,308]
];
const longLevels = new Map([[9,5],[24,6],[44,6],[69,7],[99,7],[133,7],[171,7],[213,7],[259,8],[309,8]]);
function roomCount(n,s,l) {
  return longLevels.get(n) || (s>=5 && l%11===8 ? 4 : s>=2 && l%6===5 ? 3 : s>=1 && l%5===4 ? 2 : 1);
}
function mix(n) {
  let x = Math.imul(n + 1, 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  return (x ^ (x >>> 15)) >>> 0;
}
function makeEncounter(s,l,room) {
  const n = offsets[s]+l;
  const seed=mix(n*13+room);
  const themeIndex=n<=9 && room===0 ? n-1 : (n+Math.floor(n/16)*3+room*5)%encounters.length;
  const theme=encounters[themeIndex];
  const primary=theme[5];
  const secondary = s>=3 && (l%3!==0 || room>0) ? encounters[(themeIndex+1+seed%15)%16][5] : '';
  const rules = [primary,secondary];
  const layout=n<=9 && room===0 ? (n-1)%routes.length : (seed>>>6)%routes.length;
  const width=75 - Math.floor(n/15) - (room>0?3:0);
  const floors=[platform(34,345,102)];
  const spots=routes[layout];
  const keyAt= (rules.includes('key')|| (s>=4 && (seed%6===0))) ? (seed>>>17)%spots.length : -1;
  const cliffAt=1+(seed%Math.max(1,spots.length-2));
  let key=null;
  spots.forEach((base,i)=>{
    const x=base+(s>0?((seed>>>(i*4))&7)-3:0);
    const baseY=heights[layout][i]+(s>0?((seed>>>(i*3))&7)-3:0);
    const y=rules.includes('lava') && i%2===0 ? Math.min(322,baseY) : baseY;
    let kind='solid';
    if(rules.includes('cliff') && i===cliffAt)kind='cliff';
    else if(rules.includes('quake') && i%2===1)kind='quake';
    else if(rules.includes('blink') && i%2===0)kind='timed';
    else if(rules.includes('belt') && i%2===1)kind='belt';
    else if(rules.includes('spring') && i===1)kind='spring';
    else if((s>=2 || rules.includes('crumble')) && (i+seed)%4===1)kind='crumble';
    if(i===keyAt)kind='solid';
    const p=platform(x,y,width+(i%3===0?8:0),kind,{
      phase:(seed+i*47)%189,
      range:10+s*1.65,
      period:Math.max(130,210-s*7),
      grace:kind==='cliff'?Math.max(8,22-s):Math.max(13,37-s*2),
      push:i%4===1?1.6:-1.6
    });
    floors.push(p);
    if(i===keyAt)key={x:p.x+p.w/2,y:p.y-27,collected:false};
  });
  const exitY=310+seed%21;
  const decoy=rules.includes('decoy') ? {x:floors[2].x+floors[2].w/2,y:floors[2].y-54} : null;
  floors.push(platform(767,exitY,72));
  const traps=[];
  rules.forEach((rule,slot)=>{
    if(!['roof','fire','fish','laser'].includes(rule))return;
    const p=floors[2+(seed+slot)%Math.max(1,spots.length-2)];
    const hazard = {
      kind:rule,x:p.x+p.w/2,y:p.y,period:230-s*5,offset:seed%140+slot*31,
      radius:rule==='fish'?30+s:rule==='roof'?32+s:rule==='laser'?14+s:19+s,
    };
    traps.push(hazard);
    if((rule==='fire'||rule==='roof') && primary===rule && s>=6) {
      const other=floors[spots.length];
      traps.push({...hazard,x:other.x+other.w*.7,y:other.y,offset:hazard.offset+83});
    }
  });
  return {
    floors, key, exit:{x:797,y:exitY}, theme, rules, traps, decoy,
    reverse:rules.includes('mirror'), wind:rules.includes('wind'),
    ice:rules.includes('ice'), lava:rules.includes('lava'), quake:rules.includes('quake'),
    phase:seed%200, room, rooms:roomCount(n,s,l)
  };
}
function trapPosition(trap,time) {
  const phase=(time+trap.offset)%trap.period;
  if(trap.kind==='roof'){
    if(phase<43)return {warning:true,y:52};
    if(phase<78)return {y:52+(phase-43)*11,h:39};
  }else if(trap.kind==='fire'){
    if(phase<36)return {warning:true,y:11};
    if(phase<89)return {y:12+(phase-36)*8.8,h:23};
  }else if(trap.kind==='fish'){
    if(phase<31)return {warning:true,y:423};
    if(phase<81)return {y:430-Math.sin((phase-31)*Math.PI/50)*(454-trap.y),h:39};
  }else if(trap.kind==='laser'){
    if(phase<42)return {warning:true,y:32};
    if(phase<67)return {y:34,h:391};
  }
  return null;
}
function lavaHeight(time) {
  return 435-Math.max(0,Math.sin((time+world.phase)/64))*(99+stage*.8);
}
function windAt(time) {
  return Math.sin((time+world.phase)/48)*1.15;
}
function trapHit() {
  if(world.lava && player.x>135 && player.y>lavaHeight(ticks)+3)return 'The lava rose under you.';
  if(world.decoy && Math.abs(player.x-world.decoy.x)<13 && Math.abs(player.y-14-world.decoy.y)<12)return 'That exit was bait.';
  for(const trap of world.traps||[]){
    const hit=trapPosition(trap,ticks);
    if(hit && !hit.warning && Math.abs(player.x-trap.x)<trap.radius+7 && player.y>hit.y && player.y-22<hit.y+hit.h){
      return {roof:'The ceiling came down.',fire:'Caught in the fireball rain.',fish:'The fish got you.',laser:'You crossed a live beam.'}[trap.kind];
    }
  }
  return '';
}

function drawScenery() {
  const [,,sky,horizon,accent,kind]=world.theme;
  const background=ctx.createLinearGradient(0,0,0,460);
  background.addColorStop(0,sky);
  background.addColorStop(1,horizon);
  rect(0,0,864,460,background);
  const light=accent+'44', shadow=sky+'cc';
  for(let i=0;i<24;i++){
    const x=(i*137+world.phase*3)%864,y=(i*73+26)%220;
    rect(x,y,i%3===0?5:2,2,light);
  }
  if(['fish','cliff','quake','wind','ice','fire'].includes(kind)){
    ctx.fillStyle=light;
    ctx.beginPath();ctx.arc(698,109,64,0,Math.PI*2);ctx.fill();
    for(let i=0;i<9;i++){
      const x=i*115-75, h=82+(i*47+world.phase)%135;
      ctx.fillStyle=shadow;
      ctx.beginPath();ctx.moveTo(x,425);ctx.lineTo(x+95,425-h);ctx.lineTo(x+174,425);ctx.fill();
      if(kind==='ice')rect(x+75,434-h,40,6,light);
    }
    if(kind==='fish'||kind==='cliff'){
      rect(0,392,864,52,'#09263888');
      for(let i=0;i<18;i++)rect((i*103+ticks*.8)%880-16,393+i%5*9,38,2,light);
    }
    if(world.wind){
      const speed=windAt(ticks);
      for(let i=0;i<9;i++){
        const x=(i*169+Math.sin((ticks+world.phase)/48)*92+864)%864;
        rect(x,75+i%4*37,48,3,light);
        rect(x+Math.sign(speed)*18,81+i%4*37,23,2,light);
      }
    }
  }else{
    for(let i=0;i<9;i++){
      const x=16+i*108, top=63+(i*37)%70;
      rect(x,top,68,375-top,shadow);
      rect(x,top,68,3,light);
      rect(x+4,top+6,3,345-top,light);
      if(['mirror','decoy','key'].includes(kind)){
        rect(x+13,top+21,42,64,light);
        rect(x+18,top+27,32,51,sky);
        rect(x+24,top+31,4,36,light);
      }else{
        for(let j=0;j<6;j++)rect(x+18,top+19+j*19,38,3,light);
      }
    }
  }
  if(kind==='roof'||kind==='blink'){
    for(let x=0;x<864;x+=62){
      const h=26+(x*11)%58;
      ctx.fillStyle=shadow;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+25,h);ctx.lineTo(x+56,0);ctx.fill();
    }
  }
}
function drawEncounters() {
  if(world.lava){
    const y=lavaHeight(ticks);
    rect(0,y,864,460-y,'#8a2228');
    rect(0,y,864,4,'#ffb84c');
    for(let i=0;i<24;i++)rect((i*113+ticks*2)%864,y+8+(i*9)%29,14+i%4*7,2,'#ff774b');
  }
  if(world.decoy){
    const {x,y}=world.decoy;
    drawDoor(x,y+18,true,true);
  }
  for(const trap of world.traps||[]){
    const at=trapPosition(trap,ticks);
    if(!at || at.y>460)continue;
    const {x,radius,kind}=trap;
    if(at.warning){
      for(let y=64;y<422;y+=18)rect(x-1,y,2,8,'#ffd17780');
      rect(x-radius,kind==='fish'?418:54,radius*2,3,'#ffbc63');
      words('!',x-5,kind==='fish'?412:47,'#ffdc93',19);
    }else if(kind==='roof'){
      rect(x-radius,at.y,radius*2,39,'#aa6b55');
      rect(x-radius,at.y+35,radius*2,4,'#ff9a72');
      for(let i=0;i<5;i++)rect(x-radius+6+i*12,at.y+8,5,12,'#783a45');
    }else if(kind==='fire'){
      rect(x-8,at.y-28,16,35,'#ff634494');
      rect(x-radius,at.y+4,radius*2,15,'#ff734a');
      rect(x-radius+8,at.y,radius*2-16,23,'#ffad4a');
      rect(x-8,at.y+6,16,11,'#ffefb5');
    }else if(kind==='laser'){
      rect(x-radius,at.y,radius*2,at.h,'#ff3f6880');
      rect(x-2,at.y,4,at.h,'#ffb5c6');
    }else{
      rect(x-radius,at.y+8,radius*2,24,'#297d88');
      rect(x-radius+9,at.y,radius*2-18,35,'#53c5be');
      rect(x+6,at.y+12,radius-7,20,'#201e33');
      rect(x+10,at.y+5,6,6,'#fff3b1');
      for(let i=0;i<4;i++)rect(x+8+i*5,at.y+13,3,4,'#fff3df');
      rect(x-radius-11,at.y+10,14,18,'#419caa');
    }
  }
}
function drawDoor(x,y,open,decoy=false) {
  const door=open?'#d8ff45':'#ffc46b';
  rect(x-17,y-38,34,38,'#151b1d');
  rect(x-17,y-38,3,38,door);
  rect(x+14,y-38,3,38,door);
  rect(x-17,y-38,34,3,door);
  rect(x-9,y-29,18,29,open?'#84a92e':'#715530');
  for(let i=0;i<4;i++)rect(x-7+i*4,y-25,1,24,open?'#b8e247':'#9c733a');
  words(decoy?'EXIT':world.room+1<world.rooms?'NEXT':'EXIT',x-14,y-46,door);
}
