'use strict';

const enduranceShapes = {
  3: [
    {
      path:[[90,332,138],[294,289,93],[467,233,89],[647,180,117]],
      forms:['ground','hill','cliff','cliff'], signature:'boulder', signatureFloor:2
    },
    {
      path:[[113,213,125],[275,194,94],[395,352,123],[597,298,146]],
      forms:['cliff',{form:'cliff',bottom:271},'ground','hill'], signature:'cliff', signatureFloor:1
    },
    {
      path:[[82,259,141],[296,307,89],[464,358,113],[637,309,135]],
      forms:['dock',{form:'boat',range:12,period:169},'ground','dock'],
      zones:[{kind:'water',x:224,end:643,surface:305}], signature:'fish', signatureFloor:1
    }
  ],
  4: [
    {
      path:[[26,328,132],[174,388,153],[341,390,147],[504,381,143],[675,319,142]],
      forms:['ground','ground','ground','ground','hill'], blocks:[[204,262,366,77]],
      signature:'crusher', signatureFloor:2
    },
    {
      path:[[32,271,139],[204,328,112],[349,277,96],[482,367,124],[664,305,148]],
      forms:['ground','ground','cliff','ground','hill'], signature:'spikes', signatureFloor:2
    },
    {
      path:[[52,389,121],[219,341,87],[359,280,86],[511,235,81],[666,182,132]],
      forms:['hill','cliff','ledge','cliff','cliff'], signature:'fire', signatureFloor:3
    }
  ],
  5: [
    {
      path:[[26,370,124],[174,336,76],[290,286,70],[403,241,76],[526,263,92],[683,201,136]],
      forms:['ground','ledge','cliff','ledge','hill','cliff'], signature:'saw', signatureFloor:3
    },
    {
      path:[[27,242,132],[182,297,108],[318,361,110],[456,398,99],[586,332,89],[719,272,119]],
      forms:['cliff','hill','ground','ground','hill','cliff'], signature:'lava', signatureFloor:3
    },
    {
      path:[[31,381,121],[193,360,100],[357,328,108],[526,299,134],[459,241,88],[284,190,122]],
      forms:['ground','ground','hill','cliff','ledge','ledge'], signature:'decoy', signatureFloor:2
    }
  ],
  6: [
    {
      path:[[28,268,136],[175,310,83],[287,380,103],[410,311,88],[527,359,88],[641,316,71],[748,265,99]],
      forms:['dock',{form:'boat',range:13,period:164},'ground',{form:'boat',range:15,period:181},'ground','dock','cliff'],
      zones:[{kind:'water',x:163,end:735,surface:308}], signature:'mine', signatureFloor:2
    },
    {
      path:[[27,335,130],[182,301,99],[305,338,91],[425,285,102],[559,231,79],[666,263,74],[771,202,74]],
      forms:['ground','hill','ground','hill','cliff','ledge','cliff'], signature:'laser', signatureFloor:4
    },
    {
      path:[[28,382,128],[177,345,108],[302,305,83],[408,273,83,'spring'],[533,169,94],[667,218,81],[775,160,76]],
      forms:['ground','hill','cliff','ledge','ledge','hill','cliff'], signature:'blink', signatureFloor:2
    }
  ],
  7: [
    {
      path:[[23,341,126],[165,383,115],[294,381,102],[411,387,101],[528,381,96],[638,370,69],[721,328,63],[798,280,48]],
      forms:['ground','ground','ground','ground','ground','ground','hill','cliff'],
      blocks:[[194,268,388,62]], signature:'saw', signatureFloor:3
    },
    {
      path:[[25,220,130],[177,188,93],[295,257,84],[406,318,77],[508,385,80],[617,323,67],[710,265,57],[799,204,50]],
      forms:['cliff','ledge','cliff','ground','ground','hill','ledge','cliff'], signature:'lava', signatureFloor:4
    },
    {
      path:[[27,393,103],[155,363,78],[254,306,89],[364,341,84],[475,285,83],[591,225,76],[697,276,65],[797,222,53]],
      forms:['ground','cliff','ledge','ground','hill','cliff','ledge','cliff'], signature:'crumble', signatureFloor:5
    }
  ],
  8: [
    {
      path:[[25,393,113],[155,370,58],[233,332,51],[317,299,53],[402,260,54],[489,228,57],[582,189,58],[674,155,61],[773,115,74]],
      forms:['ground','hill','cliff','ledge','ledge','cliff','ledge','cliff','cliff'], signature:'laser', signatureFloor:4
    },
    {
      path:[[26,180,111],[158,222,60],[243,286,63],[330,339,59],[414,394,61],[505,342,62],[596,280,60],[687,313,61],[775,256,69]],
      forms:['cliff','ledge','cliff','ground','ground','hill','cliff','ground','hill'], signature:'fire', signatureFloor:5
    },
    {
      path:[[26,406,111],[156,383,82],[252,360,85],[352,340,86],[455,302,96],[552,260,82],[470,211,83],[373,177,82],[266,134,88]],
      forms:['ground','ground','hill','hill','hill','cliff','ledge','ledge','cliff'], signature:'boulder', signatureFloor:3
    }
  ]
};

function enduranceRoute(length, seed, rank) {
  const options = enduranceShapes[length];
  const ordinal = seed >>> 0;
  const chosen = options[ordinal % options.length];
  const mirror = (ordinal >>> 10) % 3 === 1;
  const narrowing = Math.floor(Math.min(9,Math.max(0,rank)) * .67);
  const shift = (ordinal >>> 19) % 13 - 6;
  const left = (x,w) => mirror ? 864-x-w : x;
  const path = chosen.path.map(([x,y,w,kind],i) => {
    const width = i > 0 && i < length ? w - narrowing : w;
    return [left(x,width),y+shift,width,kind];
  });
  return {
    path,
    forms:chosen.forms,
    blocks:chosen.blocks?.map(([x,y,w,h])=>[left(x,w),y+shift,w,h]),
    zones:chosen.zones?.map(zone=>({
      ...zone, x:left(zone.x,zone.end-zone.x),
      end:left(zone.x,zone.end-zone.x)+zone.end-zone.x,
      surface:zone.surface+shift
    })),
    signature:chosen.signature,
    signatureFloor:chosen.signatureFloor
  };
}
