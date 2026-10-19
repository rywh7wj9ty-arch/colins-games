/* Worlds and levels 3-20 (built from COURSE segments) */
var WORLDS=[
  {id:0,name:'The Workshop',theme:'workshop',col:'#ffad5c',blurb:'Learn the ropes.'},
  {id:1,name:'Sewing Basket',theme:'sewing',col:'#ff7fae',blurb:'Spools, ribbons and zip-lines.'},
  {id:2,name:'Paper Kitchen',theme:'kitchen',col:'#4aa8ff',blurb:'Conveyors, jelly and cupcake pistons.'},
  {id:3,name:'Toy Attic',theme:'attic',col:'#9f82ff',blurb:'Wind-up toys, pulleys, trains and balloons.'},
  {id:4,name:'Garden Shed',theme:'shed',col:'#3cc893',blurb:'Watering cans, pot lifts, fans and magnets.'},
  {id:5,name:'Grand Finale',theme:'finale',col:'#f5a623',blurb:'Everything at once!'}];
(function(){
function L(id,world,name,blurb,intro,segs){var d={id:id,world:world,name:name,blurb:blurb,theme:WORLDS[world].theme,intro:intro,segs:segs,w:200};
  d.build=function(b){COURSE.build(b,d)};LEVELS.push(d)}
/* ---- World 1: Sewing Basket ---- */
L(3,1,'Spool Shuffle','New: moving spools and pincushion bounces.','Welcome to the Sewing Basket!\nThe spools here like to move',[
  {s:'hops',n:3,gap:1.6,rise:0.8},{s:'movers',n:1,span:4.5,speed:1.4},{s:'pit',w:2.8},{s:'boingwall',h:4.2,look:'pin'},
  {s:'movers',n:1,span:6,speed:1.8},{s:'hops',n:4,gap:1.9,rise:1.0},{s:'movers',n:2,span:4.5,speed:1.6}]);
L(4,1,'Ribbon Swings','New: swing from ribbon to ribbon.','Ribbons hang from the lid.\nSwing across the big gaps!',[
  {s:'hops',n:3,gap:1.8,rise:0.9},{s:'ropes',n:1},{s:'movers',n:1,span:5,speed:1.7},{s:'ropes',n:2,sp:4.6},{s:'boxwall',h:2.6},
  {s:'lift',h:3.6},{s:'ropes',n:2,sp:4.8}]);
L(5,1,'Zip-Line Lane','New: zip-lines on string.','Hold {GRAB} to hang on.\nLet go to drop off',[
  {s:'hops',n:4,gap:1.9,rise:1.0},{s:'zip',len:10,drop:1.2,speed:5},{s:'movers',n:2,span:5,speed:1.8},{s:'levergate'},
  {s:'zip',len:16,drop:2,speed:6},{s:'ropes',n:2,sp:4.8},{s:'lift',h:4.4,speed:1.6},{s:'zip',len:20,drop:2.2,speed:6.5},{s:'hops',n:5,gap:2.2,rise:1.1}]);
L(6,1,'Pincushion Peak','New: timer buttons. Everything from the basket.','Timer buttons hold doors\nopen for a few seconds',[
  {s:'hops',n:4,gap:2.1,rise:1.1},{s:'timed',n:2,slack:2.2},{s:'movers',n:2,span:5,speed:1.9,up:true},{s:'zip',len:14,drop:1.8,speed:6},
  {s:'timed',n:3,slack:1.9},{s:'ropes',n:3,sp:4.8},{s:'lift',h:4.8,speed:1.8},{s:'boingwall',h:4.6,look:'pin'},{s:'timed',n:4,slack:1.7},{s:'movers',n:2,span:4.5,speed:2.0,up:true}]);
})();
(function(){
function L(id,world,name,blurb,intro,segs){var d={id:id,world:world,name:name,blurb:blurb,theme:WORLDS[world].theme,intro:intro,segs:segs,w:200};
  d.build=function(b){COURSE.build(b,d)};LEVELS.push(d)}
/* ---- World 2: Paper Kitchen ---- */
L(7,2,'Conveyor Café','New: conveyor belts. Flip them with levers.','Welcome to the Paper Kitchen!\nEverything here is on the move',[
  {s:'hops',n:4,gap:2.0,rise:1.0},{s:'belts',n:3,speed:2.0},{s:'beltlever',len:10},{s:'movers',n:2,span:5,speed:1.9},
  {s:'belts',n:4,speed:2.4,back:true},{s:'zip',len:14,drop:1.8,speed:6},{s:'beltlever',len:13,speed:9},{s:'levergate'},{s:'belts',n:4,speed:2.4},{s:'timed',n:3,slack:1.9},{s:'ropes',n:2,sp:4.8},{s:'belts',n:5,speed:2.6,back:true}]);
L(8,2,'Jelly Wobble','New: jelly bounces. Hold jump to go higher.','Jelly is wobbly and bouncy.\nHold {JUMP} as you land!',[
  {s:'jelly',n:2},{s:'belts',n:3,speed:2.4,back:true},{s:'jelly',n:3,sp:3.8},{s:'jellydrop',h:4.0},{s:'ropes',n:2,sp:4.8},
  {s:'jelly',n:4,sp:3.8,top:-1.8},{s:'beltlever',len:12},{s:'lift',h:4.6,speed:1.8},{s:'jellydrop',h:4.2}]);
L(9,2,'Cupcake Pistons','New: cupcake pistons pumping up and down.','Cupcake pistons! Hop on\nwhen they pop up',[
  {s:'pistons',n:3},{s:'jelly',n:3,sp:3.8},{s:'pistons',n:4,speed:1.7},{s:'zip',len:16,drop:2,speed:6.5},
  {s:'pistons',n:5,speed:1.8,stair:true},{s:'jellydrop',h:4.2},{s:'beltlever',len:12,speed:9},{s:'pistons',n:5,speed:1.9,wait:0.65},{s:'boingwall',h:4.6}]);
L(10,2,'Rolling Pin Bakery','New: roll the dough ball into the bowl. Kitchen combos.','Roll dough into the bowl\nto lower the bridges',[
  {s:'rollpin'},{s:'pistons',n:4,speed:1.8},{s:'rollpin',belt:3.2},{s:'jelly',n:4,sp:3.8,top:-1.8},{s:'beltlever',len:12,speed:9},
  {s:'jellydrop',h:4.2},{s:'rollpin',belt:4.2},{s:'timed',n:3,slack:1.8},{s:'pistons',n:5,speed:1.9,stair:true},{s:'zip',len:18,drop:2.2,speed:6.5},{s:'belts',n:5,speed:2.8,back:true}]);
})();
(function(){
function L(id,world,name,blurb,intro,segs){var d={id:id,world:world,name:name,blurb:blurb,theme:WORLDS[world].theme,intro:intro,segs:segs,w:200};
  d.build=function(b){COURSE.build(b,d)};LEVELS.push(d)}
/* ---- World 3: Toy Attic ---- */
L(11,3,'Wind-Up Workshop','New: wind-up toys that press buttons for you.','Welcome to the Toy Attic!\nThe toys here have a mind of their own',[
  {s:'toybtn',tl:5},{s:'hops',n:4,gap:2.1,rise:1.1},{s:'belts',n:3,speed:2.4,back:true},{s:'toybtn',tl:7,look:'car'},{s:'pistons',n:3,speed:1.7},
  {s:'jelly',n:3,sp:3.8},{s:'toybtn',tl:9,speed:2.0},{s:'zip',len:16,drop:2,speed:6.5},{s:'beltlever',len:12,speed:9},{s:'toybtn',tl:8,look:'car'},{s:'timed',n:3,slack:1.8},{s:'ropes',n:2,sp:4.8},{s:'movers',n:2,span:5,speed:2.0,up:true}]);
L(12,3,'Choo-Choo Crossing','New: toy trains that go when you climb aboard.','All aboard! Trains carry you\nover the widest gaps',[
  {s:'train',len:12},{s:'hops',n:4,gap:2.1,rise:1.1},{s:'train',len:16,speed:3.6},{s:'toybtn',tl:7},{s:'jellydrop',h:4.2},{s:'train',len:18,speed:4},
  {s:'pistons',n:4,speed:1.8},{s:'timed',n:3,slack:1.8},{s:'train',len:22,speed:4.4},{s:'jelly',n:4,sp:3.8,top:-1.8},{s:'movers',n:2,span:5,speed:2.0,up:true},{s:'zip',len:16,drop:2,speed:6.5},{s:'boingwall',h:4.6}]);
L(13,3,'Pulley Parlour','New: pulleys. A heavy ball lifts you up.','Pulleys! A heavy weight on\none pan lifts the other',[
  {s:'pulley',d:3.0},{s:'train',len:14,speed:3.8},{s:'toybtn',tl:8,look:'car'},{s:'pulley',d:3.4},{s:'jelly',n:4,sp:3.8,top:-1.8},
  {s:'ropes',n:3,sp:4.8},{s:'pulley',d:3.8},{s:'beltlever',len:12,speed:9},{s:'train',len:20,speed:4.2},{s:'pistons',n:5,speed:1.9,stair:true},{s:'timed',n:3,slack:1.8}]);
L(14,3,'Balloon Belfry','New: balloons that float you up. Attic combos.','Grab a balloon and float\nup to the rafters!',[
  {s:'balloon',h:5},{s:'train',len:16,speed:4},{s:'balloon',h:6},{s:'toybtn',tl:8},{s:'pulley',d:3.6},{s:'balloon',h:6.5},{s:'jellydrop',h:4.2},
  {s:'zip',len:18,drop:2.2,speed:6.5},{s:'pistons',n:5,speed:1.9,stair:true},{s:'balloon',h:7},{s:'train',len:22,speed:4.4},{s:'ropes',n:3,sp:4.8},{s:'timed',n:4,slack:1.7}]);
})();
(function(){
function L(id,world,name,blurb,intro,segs){var d={id:id,world:world,name:name,blurb:blurb,theme:WORLDS[world].theme,intro:intro,segs:segs,w:200};
  d.build=function(b){COURSE.build(b,d)};LEVELS.push(d)}
/* ---- World 4: Garden Shed ---- */
L(15,4,'Watering Can Way','New: watering cans fill planters that open doors.','Welcome to the Garden Shed!\nThirsty planters open doors',[
  {s:'can'},{s:'hops',n:5,gap:2.1,rise:1.1},{s:'boingwall',h:4.2},{s:'train',len:16,speed:4},{s:'can'},{s:'jelly',n:4,sp:3.8,top:-1.8},{s:'toybtn',tl:8},
  {s:'pulley',d:3.4},{s:'can'},{s:'zip',len:18,drop:2.2,speed:6.5},{s:'balloon',h:6},{s:'pistons',n:4,speed:1.8},{s:'beltlever',len:12,speed:9},{s:'ropes',n:3,sp:4.8},{s:'boingwall',h:4.6},{s:'timed',n:3,slack:1.8}]);
L(16,4,'Flowerpot Lifts','New: flowerpot lifts that wake up when watered.','Water the planters to\nwake the flowerpot lifts',[
  {s:'potlift',h:4.2},{s:'train',len:18,speed:4.2},{s:'potlift',h:5},{s:'beltlever',len:12,speed:9},{s:'balloon',h:6.5},{s:'potlift',h:5.5},
  {s:'jellydrop',h:4.2},{s:'toybtn',tl:8,look:'car'},{s:'pulley',d:3.6},{s:'ropes',n:3,sp:4.8},{s:'hops',n:5,gap:2.2,rise:1.1},{s:'pistons',n:5,speed:1.9,stair:true},{s:'timed',n:3,slack:1.8}]);
L(17,4,'Breezy Greenhouse','New: fans and switches. Ride the breeze.','Flip a switch to start\na fan. Breezes lift you!',[
  {s:'fan',h:4.5},{s:'fanpush'},{s:'hops',n:4,gap:2.1,rise:1.1},{s:'fan',h:5.5},{s:'potlift',h:5},{s:'train',len:20,speed:4.4},{s:'fanpush'},
  {s:'balloon',h:6.5},{s:'fan',h:6.5},{s:'toybtn',tl:9,look:'car'},{s:'jelly',n:4,sp:3.8,top:-1.8},{s:'pulley',d:3.6},{s:'zip',len:18,drop:2.2,speed:6.5},{s:'ropes',n:3,sp:4.8},{s:'timed',n:4,slack:1.7}]);
L(18,4,'Magnet Potting Bench','New: magnet cranes and tins. Shed combos.','Magnets pick up tins.\nSwitch them off to drop',[
  {s:'magnet'},{s:'fan',h:5.5},{s:'potlift',h:5},{s:'magnet',speed:1.8},{s:'train',len:20,speed:4.4},{s:'toybtn',tl:9},{s:'fanpush'},{s:'jellydrop',h:4.2},
  {s:'magnet',speed:2.0},{s:'balloon',h:7},{s:'pulley',d:3.8},{s:'pistons',n:5,speed:1.9,stair:true},{s:'beltlever',len:12,speed:9},{s:'ropes',n:3,sp:4.8},{s:'timed',n:4,slack:1.7}]);
})();
