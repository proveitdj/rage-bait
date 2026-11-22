'use strict';

// [left edge, height, width, optional surface]. The order is the intended route.
const anthologyRoutes = {
  bridge:{path:[[36,324,124],[193,312,96],[338,316,80],[464,308,82],[589,297,88],[730,295,104]]},
  cellar:{path:[[27,231,109],[148,291,91],[246,352,129],[399,373,121],[561,356,86],[672,307,81],[773,258,74]],
    blocks:[[275,236,317,57]]},
  shaft:{path:[[42,383,107],[171,353,93],[280,307,101],[390,258,104],[506,211,95],[622,160,86],[733,114,108]]},
  switchback:{path:[[31,388,122],[180,382,104],[324,367,101],[461,365,95],[593,351,102],[733,311,104],
    [644,266,90],[530,228,92],[397,192,87],[267,159,87],[137,135,100],[30,107,73]]},
  reef:{path:[[38,298,121],[191,345,79],[302,391,89],[424,372,90],[544,348,87],[654,309,84],[757,269,83]],
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
};

// Preserve a crossing window where multiple independently timed traps overlap a spring jump.
const roomTiming = {
  '199:0': [[1,73],[2,90]],
  '286:0': [[4,87],[7,4]],
};
const longLevels = new Map([[24,6],[44,6],[69,7],[99,7],[133,7],[171,7],[213,7],[259,8],[309,8]]);
function roomCount(n,s,l) {
  if(n<10)return 1;
  return longLevels.get(n) || (s>=5 && l%11===8 ? 4 : s>=2 && l%6===5 ? 3 : s>=1 && l%5===4 ? 2 : 1);
}
function mix(n) {
  let x = Math.imul(n + 1, 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  return (x ^ (x >>> 15)) >>> 0;
}
function levelDangerCount(n) {
  if(n<10)return anthologyIntro[n].traps.length;
  const s=offsets.findLastIndex(offset=>offset<=n);
  return Math.max(roomCount(n,s,n-offsets[s]),2+Math.round(8*Math.sqrt(n/(total-1))));
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
function mapTask(task,floors) {
  const point=([i,label])=>({x:floors[i].x+floors[i].w/2,y:floors[i].y,label});
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
function makeEncounter(s,l,room) {
  const n=offsets[s]+l;
  const seed=mix(n*19+room);
  const rooms=roomCount(n,s,l);
  const levelDangers=levelDangerCount(n);
  const roomDangers=Math.floor(levelDangers*(room+1)/rooms)-Math.floor(levelDangers*room/rooms);
  let scene, path, blocks, zones, task, rules, fixed, signature;
  if(n<10){
    const intro=anthologyIntro[n];
    const {title,setting,art,sky,ink,accent}=intro;
    scene={title,setting,art,sky,ink,accent,seed};
    path=intro.route;blocks=intro.solids;zones=intro.zones;
    task=intro.task;rules=intro.rules||{};fixed=intro.traps;
  }else{
    const [title,setting,art,route,mission,labels,trap]=n<160?anthologyA[n-10]:anthologyB[n-160];
    scene=levelScene(title,setting,art,seed);
    const names=Object.keys(anthologyRoutes);
    const shape=anthologyRoutes[room===0?route:names[(names.indexOf(route)+room*5)%names.length]];
    const mirrored=room===0 ? (route!=='shaft' && route!=='terraces' && (seed>>>4)%4===0) : room%2===0;
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
    task=room===0?makeRoomTask(mission,labels,path.length,seed):null;
    rules={ice:art==='ice',wind:art==='storm',reverse:art==='mirror'&&s>=3};
    signature=trap;
  }
  const floors=path.map(([x,y,w,kind])=>platform(x,y,w,kind||'solid',{
    terrain:zones?.some(z=>z.kind==='water'&&x+w/2>=z.x&&x+w/2<z.end&&y>=z.surface)?'water':'land'
  }));
  const center=p=>({x:p.x+p.w/2,y:p.y});
  const spawn=center(floors[0]),exit=center(floors.at(-1));
  const course={
    scene, floors, spawn, exit, room, rooms, levelDangers,
    task:mapTask(task,floors),
    zones:zones||[],
    solids:(blocks||[]).map(([x,y,w,h])=>({x,y,w,h,kind:'solid',hit:null})),
    terrain:zones?.length?'water':blocks?.length?'tunnel':'land',
    phase:seed%200, ...rules
  };
  course.supports=[...floors,...course.solids];
  configureCampaignTraps(course,roomDangers,s,seed,{fixed,signature});
  for(const [i,phase] of roomTiming[n+':'+room]||[])course.obstacles[i].phase=phase;
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
