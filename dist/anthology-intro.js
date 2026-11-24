'use strict';

const anthologyIntro = [
  {
    title:'An Apple for the Tree',
    setting:'The Runaway Orchard',
    art:'orchard', sky:'#403344', ink:'#293833', accent:'#ed9b65',
    route:[[24,354,116],[166,344,105],[298,326,95],[420,359,82],[534,326,113],[675,304,57],[757,270,90]],
    forms:['ground','hill','ledge','ground','hill','hill','ground'],
    task:{kind:'deliver',title:'Carry the apple to the tree.',items:[[1,'Apple']],target:[4,'Apple tree']},
    traps:[[2,'crumble'],[5,'spikes']]
  },
  {
    title:'Mind Your Head',
    setting:'The Clockwork Laundry',
    art:'machine', sky:'#413331', ink:'#352a2a', accent:'#e5a85e',
    route:[[24,313,109],[132,398,170],[302,398,156],[458,398,194],[660,346,68],[756,291,87]],
    forms:['ground','ground','ground','ground','cliff','ground'],
    solids:[[163,289,433,65]],
    traps:[[2,'saw'],[3,'spikes']]
  },
  {
    title:'Return to Sender',
    setting:'The Rooftop Post Office',
    art:'city', sky:'#433353', ink:'#2b283e', accent:'#f88fab',
    route:[[26,384,112],[174,372,104],[311,351,83],[435,323,83],[563,270,95],[452,207,104],[322,169,100],[190,144,94],[40,124,104]],
    forms:['ground','ground','ground','ground','cliff','ledge','ledge','ledge','ledge'],
    task:{kind:'deliver',title:'Bring the letter to the rooftop mailbox.',items:[[2,'Letter']],target:[7,'Mailbox']},
    traps:[[3,'spikes'],[5,'blink'],[6,'saw']]
  },
  {
    title:'Bottom Buttons',
    setting:'The Brass Dunes',
    art:'desert', sky:'#583c2e', ink:'#482b26', accent:'#ffcb6b',
    route:[[20,265,134],[170,320,63],[253,267,107],[300,365,146],[472,286,121],[618,226,61],[705,263,137]],
    forms:['hill','ground',{form:'cliff',bottom:334},'ground','hill','cliff','ground'],
    task:{kind:'switch',title:'Press both pit plates. The cracked ledge drops you into the second pit.',items:[[1,'First pressure plate'],[3,'Second pressure plate']]},
    traps:[[2,'cliff'],[4,'decoy'],[5,'fire']]
  },
  {
    title:'Tide, Tide, Away',
    setting:'The Sunken Pearl Market',
    art:'water', sky:'#17384b', ink:'#183341', accent:'#7be7d0',
    route:[[16,286,115],[160,301,91],[273,365,97],[393,300,97],[512,346,87],[635,285,94],[747,248,103]],
    forms:['dock',{form:'boat',range:16,period:150},'ledge',{form:'boat',range:21,period:184},'ledge','dock','hill'],
    zones:[{kind:'water',x:131,end:735,surface:300}],
    task:{kind:'collect',title:'Cross in the boats and dive for both pearls.',items:[[2,'Pink pearl'],[4,'Black pearl']]},
    traps:[[1,'fish'],[4,'mine'],[5,'laser']]
  },
  {
    title:'The Last Bell',
    setting:'The Backward Belfry',
    art:'clock', sky:'#3d354b', ink:'#292734', accent:'#f5c582',
    route:[[728,362,115],[590,327,101],[480,267,79],[356,307,74],[240,235,75],[130,198,71],[19,151,91]],
    forms:['ground','hill','ledge','ground','cliff','ledge','ledge'],
    task:{kind:'sequence',title:'Ring the low bell, the middle bell, then the high bell.',items:[[1,'Low bell'],[3,'Middle bell'],[5,'High bell']]},
    traps:[[2,'blink'],[4,'boulder'],[5,'decoy']]
  },
  {
    title:'A Fuse Too Far',
    setting:'The Fuseworks',
    art:'rail', sky:'#3a293c', ink:'#2c2631', accent:'#f7a178',
    route:[[30,246,106],[176,251,65],[268,299,80],[365,352,75],[460,353,98],[576,307,69],[673,256,59],[769,208,79]],
    forms:['ground','ledge','ground','ground','ground','ground','cliff','ledge'],
    solids:[[380,248,156,54]],
    task:{kind:'sequence',title:'Touch the red fuse, the blue fuse, then the main switch.',items:[[2,'Red fuse'],[5,'Blue fuse'],[6,'Main switch']]},
    traps:[[1,'crumble'],[3,'crusher'],[4,'laser'],[5,'spikes']]
  },
  {
    title:'Orbit Has a Basement',
    setting:'The Hollow Moon',
    art:'space', sky:'#242743', ink:'#242338', accent:'#bcaffc',
    route:[[29,135,114],[176,235,79],[296,326,65],[403,388,62],[508,333,53],[609,278,54],[707,225,54],[790,175,61]],
    forms:['cliff','cliff','ground','ground','ledge','hill','ledge','cliff'],
    traps:[[1,'saw'],[2,'fire'],[4,'blink'],[6,'crumble']]
  },
  {
    title:'Black Ice Insurance',
    setting:'The Frozen Toll Road',
    art:'ice', sky:'#26445a', ink:'#222f46', accent:'#bbebff',
    route:[[29,307,136],[207,305,59],[325,276,62],[436,344,59],[553,300,57],[664,306,58],[777,273,76]],
    forms:['ground','hill',{form:'cliff',bottom:337},'ground','hill','hill','ground'],
    task:{kind:'visit',title:'Activate both roadside beacons before leaving.',items:[[1,'West beacon'],[4,'East beacon']]},
    traps:[[2,'cliff'],[3,'saw'],[5,'laser'],[5,'spikes']],
    rules:{ice:true}
  },
  {
    title:'Vent Before Exit',
    setting:'The Kettle Volcano',
    art:'volcano', sky:'#511d34', ink:'#3e202b', accent:'#ff8866',
    route:[[28,237,113],[175,171,68],[292,241,73],[410,332,69],[515,385,73],[616,320,65],[703,259,59],[785,198,65]],
    forms:['cliff',{form:'cliff',bottom:237},'cliff','ground','ground','hill','hill','cliff'],
    task:{kind:'switch',title:'Open the two relief valves before climbing out.',items:[[3,'Intake valve'],[5,'Outflow valve']]},
    traps:[[1,'cliff'],[2,'fire'],[3,'crusher'],[4,'lava'],[6,'boulder']]
  }
];
