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
const terrainProfiles = [
  {shore:222,bank:428,ridge:620,line:324,roof:269,hills:[307,268,246]},
  {shore:245,bank:452,ridge:622,line:305,roof:262,hills:[315,291,270]},
  {shore:202,bank:423,ridge:638,line:335,roof:266,hills:[284,315,266]},
  {shore:236,bank:457,ridge:632,line:318,roof:275,hills:[297,247,279]},
  {shore:254,bank:420,ridge:599,line:332,roof:279,hills:[326,280,237]},
  {shore:211,bank:443,ridge:643,line:308,roof:261,hills:[315,269,292]},
  {shore:228,bank:442,ridge:614,line:344,roof:273,hills:[310,289,251]},
  {shore:245,bank:434,ridge:637,line:318,roof:278,hills:[273,306,261]},
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
function levelDangerCount(n) {
  const s=offsets.findLastIndex(offset=>offset<=n);
  return Math.max(roomCount(n,s,n-offsets[s]),2+Math.round(8*Math.sqrt(n/(total-1))));
}
function makeEncounter(s,l,room) {
  const n=offsets[s]+l;
  const seed=mix(n*13+room);
  const themeIndex=n>0 && n<=9 && room===0 ? n-1 : (n+Math.floor(n/16)*3+room*5)%encounters.length;
  const theme=n===0 ? ['First Jump','Lowlands','#213246','#554052','#ebae6c','crumble','Space jumps on land and swims in water.'] : encounters[themeIndex];
  const rule=theme[5];
  const profile=terrainProfiles[n===0?0:(seed>>>7)%terrainProfiles.length];
  const {shore,bank,ridge,line,roof,hills}=profile;
  const zones=[
    {kind:'land',x:0,end:shore},
    {kind:'water',x:shore,end:bank,surface:line},
    {kind:'tunnel',x:bank,end:ridge,ceiling:roof},
    {kind:'hill',x:ridge,end:864}
  ];
  const width=80-Math.round(26*n/(total-1))-(room>0?3:0);
  const wiggle=i=>n===0?0:((seed>>>(i*3))&7)-3;
  const midpoint=(a,b)=>Math.round((a+b)/2);
  const locations=[
    [shore-88,326+wiggle(0),width+10,'land'],
    [shore+16,line+34+wiggle(1),width+4,'water'],
    [midpoint(shore,bank)+8,line+55+wiggle(2),width+3,'water'],
    [bank+4,roof+82+wiggle(3),width+8,'tunnel'],
    [midpoint(bank,ridge)+7,roof+66+wiggle(4),width+7,'tunnel'],
    [ridge+4,Math.max(hills[0]+wiggle(5),roof+42),width+5,'hill'],
    [ridge+Math.round((767-ridge)*.58),hills[1]+wiggle(6),width+4,'hill'],
  ];
  const floors=[platform(34,345,102,'solid',{terrain:'land'})];
  const keyAt=rule==='key'||(s>=6 && seed%7===0) ? 1+(seed%2)*4 : -1;
  let key=null;
  locations.forEach(([x,y,w,terrain],i)=>{
    const kind=i===keyAt?'solid':rule==='quake'&&terrain==='hill'?'quake':
      rule==='belt'&&i%3===0?'belt':rule==='spring'&&i===5?'spring':'solid';
    const p=platform(x,y,w,kind,{phase:(seed+i*47)%189,range:6+s*.6,push:i%2===0?1.7:-1.7,terrain});
    floors.push(p);
    if(i===keyAt)key={x:p.x+p.w/2,y:p.y-27,collected:false};
  });
  const exitY=hills[2]+wiggle(7);
  floors.push(platform(769,exitY,74,'solid',{terrain:'hill'}));
  const rooms=roomCount(n,s,l);
  const levelDangers=levelDangerCount(n);
  const roomDangers=Math.floor(levelDangers*(room+1)/rooms)-Math.floor(levelDangers*room/rooms);
  const world={
    floors, key, exit:{x:797,y:exitY}, theme, zones, terrain:zones[(seed>>>8)%zones.length].kind,
    reverse:rule==='mirror', wind:rule==='wind', ice:rule==='ice', quake:rule==='quake',
    phase:seed%200, room, rooms, levelDangers
  };
  configureCampaignTraps(world,roomDangers,s,seed);
  return world;
}
function waterAt(x,y) {
  return world.zones.find(zone=>zone.kind==='water'&&x>=zone.x&&x<zone.end&&y>zone.surface+7);
}
function windAt(time) {
  return Math.sin((time+world.phase)/48)*1.15;
}
function tunnelCeiling(x) {
  return world.zones.find(zone=>zone.kind==='tunnel'&&x+8>zone.x&&x-8<zone.end)?.ceiling;
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
