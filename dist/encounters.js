'use strict';

// [left edge, height, width, optional surface]. The order is the intended route.
const anthologyRoutes = {
  bridge:{path:[[36,324,124],[193,312,96],[338,316,80],[464,308,82],[589,297,88],[730,295,104]]},
  cellar:{path:[[27,231,109],[148,291,91],[246,352,129],[399,373,121],[561,356,86],[672,307,81],[773,258,74]],
    blocks:[[275,236,317,57]]},
  shaft:{path:[[42,383,107],[171,353,93],[280,307,101],[390,258,104],[506,211,95],[622,160,86],[733,114,108]]},
  switchback:{path:[[31,388,122],[180,382,104],[324,367,101],[461,365,95],[593,351,102],[733,311,104],
    [644,266,90],[530,228,92],[397,192,87],[267,159,87],[137,135,100],[30,107,73]]},
  reef:{path:[[38,298,121],[191,290,79],[302,391,89],[424,372,90],[544,348,87],[654,309,84],[757,269,83]],
    water:[151,741,296]},
  columns:{path:[[36,366,111],[167,322,58],[278,274,56],[387,223,59],[502,257,57],[602,211,67],[734,171,105]]},
  zigzag:{path:[[27,310,110],[158,253,83],[274,303,77],[387,248,79],[503,284,79],[619,223,78],[741,270,90]]},
  courtyard:{path:[[31,365,128],[175,336,105],[297,322,143],[454,343,115],[581,292,100],[714,266,113]]},
  terraces:{path:[[39,367,119],[179,322,96],[305,270,105],[431,217,103],[552,167,111],[684,213,68],[774,164,73]]},
  underpass:{path:[[25,384,110],[161,378,105],[287,365,100],[401,371,91],[512,366,92],[619,370,76],[706,333,71],[789,294,64]],
    blocks:[[179,241,485,73]]},
  twinpits:{path:[[34,306,140],[195,357,76],[294,304,109],[429,294,96],[545,350,72],[646,302,89],[757,270,83]]},
  islands:{path:[[34,325,103],[170,309,75],[280,338,79],[395,272,91],[520,303,79],[641,249,83],[758,222,88]]},
  canopy:{path:[[43,370,112],[177,331,100],[299,279,87],[410,229,90,'spring'],[537,145,94],[664,190,91],[777,138,77]]},
  spillway:{path:[[40,196,104],[164,242,100],[293,303,105],[420,367,98],[546,371,82],[656,332,83],[766,283,77]],
    water:[284,650,309]},
  ramparts:{path:[[25,388,102],[163,349,81],[280,295,73],[394,239,87],[509,292,84],[629,250,96],[760,194,83]]},
  basin:{path:[[32,264,126],[176,313,81],[277,365,124],[417,384,121],[552,365,86],[661,311,89],[772,264,73]],
    water:[241,655,330]},
  dropoff:{path:[[35,213,130],[190,200,104],[313,215,105],[368,355,153],[545,379,91],[655,333,96],[773,293,73]]},
};

const landformRoutes = {
  bridge:['ground','dock','ledge','dock','ledge','ground'],
  cellar:['cliff','ledge','ground','ground','hill','hill','ledge'],
  shaft:['ground','hill','hill','cliff','ledge','cliff','cliff'],
  switchback:['ground','ground','hill','hill','hill','hill','ledge','ledge','ledge','ledge','ledge','cliff'],
  reef:['dock','boat','ground','ground','ledge','dock','cliff'],
  columns:['ground','cliff','cliff','cliff','ledge','cliff','cliff'],
  zigzag:['ground','cliff','ground','ledge','hill','cliff','ground'],
  courtyard:['ground','ground','hill','ground','hill','ground'],
  terraces:['ground','hill','hill','hill','cliff','ledge','cliff'],
  underpass:['ground','ground','ground','ground','ground','ground','hill','ground'],
  twinpits:['cliff','ground','cliff','hill','ground','hill','ground'],
  islands:['ground','ledge','ground','cliff','ground','cliff','ground'],
  canopy:['ground','hill','ledge','ledge','ledge','ledge','cliff'],
  spillway:['cliff','hill','boat','ground','ground','dock','cliff'],
  ramparts:['ground','hill','cliff','cliff','ledge','hill','cliff'],
  basin:['cliff','hill','ground','ground','ground','dock','cliff'],
  dropoff:['cliff','cliff','cliff','ground','ground','hill','ground']
};
function landformOptions(form,floor,floors,seed,i) {
  const options=typeof form==='string'?{form}:form;
  if(!options)return;
  Object.assign(floor,options);
  if(options.form==='boat'){
    floor.range=options.range??(10+seed%7);
    floor.period=options.period??(160+seed%37);
    floor.phase=(seed+i*23)%floor.period;
    floor.x=boatPosition(floor,0);
  }else if(floor.bottom===undefined && ['ground','hill','cliff'].includes(floor.form)){
    const below=floors.find(other=>other.y>floor.y+12 && other.x<floor.x+floor.w && other.x+other.w>floor.x);
    if(below)floor.bottom=Math.max(floor.y+12,Math.min(floor.y+65,below.y-8));
  }
}

const openingLedgeCounts = [6,12,18,15,27,21,32,24,35,40];
function chapter(n) {
  return n<160?anthologyA[n-10]:anthologyB[n-160];
}
function openingShape(n,seed) {
  const [, ,art,route]=chapter(n);
  return art==='cliff'&&seed%3===0?'dropoff':route;
}
function levelPlan(n) {
  const first=n<10?anthologyIntro[n].route:anthologyRoutes[openingShape(n,mix(n*19))].path;
  const start=first.length-1;
  const totalLedges=openingLedgeCounts[n]??40;
  const remaining=totalLedges-start;
  if(!remaining)return [start];
  const sections=Math.ceil(remaining/8);
  const small=Math.floor(remaining/sections);
  const extra=remaining%sections;
  const offset=mix(n+51)%sections;
  return [start,...Array.from({length:sections},(_,i)=>small+Number((i+offset)%sections<extra))];
}
function roomCount(n) {
  return levelPlan(n).length;
}
function mix(n) {
  let x = Math.imul(n + 1, 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  return (x ^ (x >>> 15)) >>> 0;
}
function surpriseForLevel(n) {
  if(n<10)return {1:'giantSaw',2:'lightning',5:'giantSaw',8:'lightning',9:'giantSaw'}[n]||null;
  const draw=mix(n*257+174)%10;
  return draw<4?'giantSaw':draw<8?'lightning':null;
}
function baseDangerCount(n) {
  const rooms=roomCount(n);
  const authored=n<10?anthologyIntro[n].traps.length+1+Number(Boolean(surpriseForLevel(n))):0;
  return Math.min(10,Math.max(authored+rooms-1,rooms+1,2+Math.round(8*Math.sqrt(n/(total-1)))));
}
function extraDangerCount(n,s,room) {
  return 2+Number(n>=4)+Number(n>=8)+Number(s>=7&&room%2===1);
}
function levelDangerCount(n) {
  const stage=offsets.findLastIndex(offset=>offset<=n);
  return baseDangerCount(n)+levelPlan(n).reduce((count,_,room)=>count+extraDangerCount(n,stage,room),0);
}
function prepareExtraCliff(course,rank,seed) {
  const markers=[...course.task?.items||[],course.task?.target].filter(Boolean);
  const banks=course.retrySpikes?.banks||[];
  const surprise=course.surprise?.candidates||[];
  const candidates=course.floors.slice(1,-1).filter(floor =>
    (!banks.length || banks.filter(bank=>bank.floor!==floor).length>=2) &&
    (!surprise.length || surprise.some(anchor=>anchor.floor!==floor)) &&
    floor.kind==='solid' && floor.form!=='boat' && floor.w>=48 &&
    !course.floors.some(other=>other.kind==='cliff'&&Math.abs(other.routeIndex-floor.routeIndex)<=1) &&
    !markers.some(marker=>Math.abs(marker.y-floor.y)<35 &&
      marker.x>=floor.x-14 && marker.x<=floor.x+floor.w+14));
  if(!candidates.length)return null;
  const cliffs=candidates.filter(floor=>['cliff','hill','ground'].includes(floor.form));
  const pool=cliffs.length?cliffs:candidates;
  const floor=pool[seed%pool.length];
  floor.kind='cliff';
  landformOptions('cliff',floor,course.floors,seed,floor.routeIndex);
  floor.grace=26-Math.floor(rank*.9);
  floor.recovery=94+rank*4;
  return {kind:'cliff',floor,extra:true};
}
function sectionDangerCount(levelDangers,rooms,room,opening) {
  const first=Math.min(opening,levelDangers-rooms+1);
  if(room===0)return first;
  const remaining=levelDangers-first;
  return Math.floor(remaining*room/(rooms-1))-Math.floor(remaining*(room-1)/(rooms-1));
}
function spendHazard(course,force=false) {
  const direct=trap=>trap.floor && !['blink','cliff','crumble'].includes(trap.kind);
  let replaced=course.obstacles.findLastIndex(trap=>trap.kind==='spikes');
  if(replaced===-1)replaced=course.obstacles.findLastIndex(direct);
  if(replaced===-1 && force)replaced=course.obstacles.findLastIndex(trap=>trap.floor);
  if(replaced===-1)return false;
  const [trap]=course.obstacles.splice(replaced,1);
  if(!direct(trap))trap.floor.kind='solid';
  return true;
}
function sceneColor(h,s,l) {
  const saturation=s/100, light=l/100;
  const amplitude=saturation*Math.min(light,1-light);
  return '#'+[0,8,4].map(offset=>{
    const k=(offset+h/30)%12;
    const value=light-amplitude*Math.max(-1,Math.min(k-3,9-k,1));
    return Math.round(255*value).toString(16).padStart(2,'0');
  }).join('');
}
function levelScene(title,setting,art,seed) {
  const hue=seed%360;
  const range=(hue+35+((seed>>>25)%52))%360;
  return {
    title,setting,art,seed,
    sky:sceneColor(hue,46+seed%17,16+((seed>>>10)%13)),
    ink:sceneColor(range,20+((seed>>>15)%26),20+((seed>>>20)%12)),
    accent:sceneColor((hue+56)%360,67,72)
  };
}
function boatPosition(floor,time) {
  return floor.baseX+Math.sin((time+floor.phase)/floor.period*(Math.PI*2))*floor.range;
}
function mapTask(task,floors) {
  const point=([i,label])=>{
    const floor=floors[i];
    return {get x(){return floor.x+floor.w/2;},y:floor.y,label};
  };
  return task ? {kind:task.kind,title:task.title,items:task.items.map(point),target:task.target&&point(task.target)} : null;
}
function makeRoomTask(kind,labels,length,seed) {
  if(!kind)return null;
  const last=length-2;
  if(kind==='deliver')return {
    kind,title:'Deliver '+labels[0]+' to '+labels[1],
    items:[[1+seed%2,labels[0]]],target:[last,labels[1]]
  };
  const lead={sequence:'In order',collect:'Collect',switch:'Switch on',visit:'Reach'};
  return {
    kind,title:lead[kind]+' '+labels.join(' · '),
    items:labels.map((label,i)=>[labels.length===1?Math.ceil(last/2):1+Math.round(i*(last-1)/(labels.length-1)),label])
  };
}
function makeEncounter(s,l,room,attempt=0) {
  const n=offsets[s]+l;
  const seed=mix(n*19+room);
  const plan=levelPlan(n);
  const rooms=plan.length;
  const levelLedges=plan.reduce((total,count)=>total+count,0);
  const baseDangers=baseDangerCount(n);
  const levelDangers=levelDangerCount(n);
  const surpriseKind=surpriseForLevel(n);
  const surpriseRoom=n<10?0:1+mix(n*37)%(rooms-1);
  const wantsSurprise=surpriseKind && room===surpriseRoom;
  const intro=n<10?anthologyIntro[n]:null;
  const opening=intro?intro.traps.length+1+Number(Boolean(surpriseKind)):3;
  const roomDangers=sectionDangerCount(baseDangers,rooms,room,opening);
  const rank=room===0?s:Math.min(9,s+Math.floor(l*2/counts[s])+Math.floor(room/2));
  let scene, path, blocks, zones, task, rules, fixed, signature, signatureFloor, forms;
  if(intro){
    const {title,setting,art,sky,ink,accent}=intro;
    scene={title,setting,art,sky,ink,accent,seed};
  }else{
    const [title,setting,art]=chapter(n);
    scene=levelScene(title,setting,art,seed);
  }
  if(room>0){
    ({path,forms,blocks,zones,signature,signatureFloor}=enduranceRoute(plan[room],seed,rank));
    rules={ice:scene.art==='ice'&&room%2===0,wind:scene.art==='storm'&&room%2===1};
  }else if(intro){
    path=intro.route;blocks=intro.solids;zones=intro.zones;
    task=intro.task;rules=intro.rules||{};forms=intro.forms;
    const keep=roomDangers-1-Number(Boolean(wantsSurprise));
    fixed=intro.traps.length<=keep?intro.traps:intro.traps.filter((item,i)=>i===0||i>=intro.traps.length-keep+1);
  }else{
    const [, ,art,route,mission,labels,trap]=chapter(n);
    const shapeName=openingShape(n,seed);
    const shape=anthologyRoutes[shapeName];
    forms=landformRoutes[shapeName];
    const mirrored=route!=='shaft'&&route!=='terraces'&&(seed>>>4)%4===0;
    function left(x,w){return mirrored?864-x-w:x;}
    path=shape.path.map(([x,y,w,kind],i)=>{
      const width=w-(i>0&&i<shape.path.length-1?Math.round(s*.85)+((seed>>>(i*3))&3):0);
      const delta=((seed>>>(i*3+1))&7)-3;
      return [left(x,width),y+delta,width,kind];
    });
    blocks=(shape.blocks||[]).map(([x,y,w,h])=>[left(x,w),y,w,h]);
    if(shape.water){
      const [x,end,surface]=shape.water;
      zones=[{kind:'water',x:left(x,end-x),end:left(x,end-x)+end-x,surface}];
    }
    task=makeRoomTask(mission,labels,path.length,seed);
    rules={ice:art==='ice',wind:art==='storm',reverse:art==='mirror'&&s>=3};
    signature=shapeName==='dropoff'?'cliff':trap;
    if(shapeName==='dropoff')signatureFloor=2;
  }
  const floors=path.map(([x,y,w,kind],routeIndex)=>platform(x,y,w,kind||'solid',{
    routeIndex,terrain:zones?.some(z=>z.kind==='water'&&x+w/2>=z.x&&x+w/2<z.end&&y>=z.surface)?'water':'land'
  }));
  floors.forEach((floor,i)=>landformOptions(forms?.[i],floor,floors,seed,i));
  const center=p=>({x:p.x+p.w/2,y:p.y});
  const spawn=center(floors[0]),exit=center(floors.at(-1));
  const course={
    scene, floors, spawn, exit, room, rooms, levelDangers, levelLedges,
    ledgeOffset:plan.slice(0,room).reduce((total,count)=>total+count,0),
    task:mapTask(task,floors),
    zones:zones||[],
    solids:(blocks||[]).map(([x,y,w,h])=>({x,y,w,h,kind:'solid',hit:null})),
    terrain:zones?.length?'water':blocks?.length?'tunnel':'land',
    phase:seed%200, ...rules
  };
  course.supports=[...floors,...course.solids];
  configureCampaignTraps(course,fixed?.length??roomDangers,rank,seed,{fixed,signature,signatureFloor});
  if(wantsSurprise){
    configureSurprise(course,n,room,attempt,seed,surpriseKind);
    if(course.surprise && (fixed || spendHazard(course,true)))course.obstacles.push({kind:surpriseKind});
    else course.surprise=null;
  }
  if(room===0 || !wantsSurprise && (room+seed)%3!==0){
    configureRetrySpikes(course,attempt,seed);
    if(course.retrySpikes.banks.length && (fixed || spendHazard(course,room===0))){
      course.obstacles.push({kind:'retrySpikes'});
    }else course.retrySpikes.banks.length=0;
  }
  const extraCount=extraDangerCount(n,s,room);
  const wantsCliff=extraCount>=3 && ((seed>>>8)%3!==0 || extraCount===5);
  const extraCliff=wantsCliff?prepareExtraCliff(course,rank,seed):null;
  if(extraCliff){
    course.obstacles.push(extraCliff);
    if(course.retrySpikes?.banks.length){
      const spikes=course.retrySpikes;
      spikes.banks=spikes.banks.filter(bank=>bank.floor!==extraCliff.floor);
      spikes.index%=spikes.banks.length;
    }
    if(course.surprise){
      const hazard=course.surprise;
      hazard.candidates=hazard.candidates.filter(anchor=>anchor.floor!==extraCliff.floor);
      hazard.first%=hazard.candidates.length;
    }
  }
  configureExtraHazards(course,extraCount-Number(Boolean(extraCliff)),rank,n,room,attempt,seed);
  // The final low tunnel on this course needs a gap between the two saws.
  if(n===259 && room===5 && course.obstacles[0]?.kind==='saw')course.obstacles[0].phase=12;
  return course;
}
function waterAt(x,y) {
  return world.zones.find(zone=>zone.kind==='water'&&x>=zone.x&&x<zone.end&&y>zone.surface+7);
}
function windAt(time) {
  return Math.sin((time+world.phase)/48)*1.15;
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
