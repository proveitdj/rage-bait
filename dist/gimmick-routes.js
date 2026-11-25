'use strict';

function memoryRoute(length) {
  const upperPath = [
    [217,235,93],[399,355,36],[538,294,83],[691,244,123],
    [570,193,109],[429,148,104],[283,108,102],[133,74,108]
  ];
  return {
    path:[[48,254,126],...upperPath.slice(0,length)],
    forms:['ground',{form:'cliff',bottom:314},'ledge','ledge','cliff','ledge','ledge','ledge','cliff'].slice(0,length+1),
    signature:'cliff', signatureFloor:1,
    puzzle:{type:'memory',cliff:1,hidden:2}
  };
}

const switchedPaths = {
  4:[[508,354,104],[683,318,132],[524,263,105],[369,213,96],[207,169,117]],
  5:[[380,377,111],[538,343,96],[694,306,130],[532,252,106],[376,207,90],[209,158,116]],
  6:[[206,373,121],[385,335,99],[555,359,101],[716,315,113],[559,259,103],[386,214,104],[213,165,114]],
  7:[[39,382,113],[184,337,96],[351,365,103],[521,331,98],[707,305,121],[550,251,107],[384,204,105],[217,158,109]],
  8:[[40,380,109],[179,328,87],[334,361,106],[486,312,100],[640,348,98],[754,299,86],[591,248,106],[423,204,101],[248,155,110]]
};
const switchDoorIndices = {4:1,5:2,6:3,7:4,8:5};

function switchedRoute(length) {
  const path=switchedPaths[length];
  const decoy=switchDoorIndices[length];
  return {
    path, forms:path.map((_,i)=>i<decoy?(i%2===0?'ground':'hill'):i===decoy?'cliff':'ledge'),
    signature:'spikes', signatureFloor:Math.max(1,decoy-1),
    puzzle:{type:'switch',decoy}
  };
}

function sizeRoute(length) {
  const extraPassages=Math.max(0,length-6);
  const passage=[[272,364,159]];
  if(extraPassages===1)passage.splice(0,1,[272,364,79],[351,364,80]);
  if(extraPassages===2)passage.splice(0,1,[272,364,50],[322,364,58],[380,364,51]);
  const tail=length===4 ? [[599,340,205]] :
    length===5 ? [[589,344,93],[730,298,113]] :
      [[589,344,76],[702,300,55],[789,258,59]];
  const path=[[28,364,117],[160,364,112],...passage,[421,364,113],...tail];
  return {
    path, forms:path.map((_,i)=>i<path.length-tail.length?'ground':i===path.length-1?'cliff':'ledge'),
    blocks:[[246,0,173,348],[444,203,83,30],[548,0,27,435]],
    puzzle:{type:'size',pads:[[1,.58],[3+extraPassages,1.45]],button:{x:454,y:233,w:60},gate:2}
  };
}

function gimmickRoute(type,length,seed) {
  const builders={memory:memoryRoute,switch:switchedRoute,size:sizeRoute};
  const route=builders[type]?.(length);
  if(!route)return null;
  const mirror=(seed>>>5)%3===1;
  const left=(x,w)=>mirror?864-x-w:x;
  return {
    ...route,
    path:route.path.map(([x,y,w,kind])=>[left(x,w),y,w,kind]),
    blocks:route.blocks?.map(([x,y,w,h])=>[left(x,w),y,w,h]),
    puzzle:route.puzzle.button?{
      ...route.puzzle,button:{...route.puzzle.button,x:left(route.puzzle.button.x,route.puzzle.button.w)}
    }:route.puzzle
  };
}
