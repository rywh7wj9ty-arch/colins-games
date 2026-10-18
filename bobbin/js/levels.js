/* Level layouts. Units are metres, y grows downward, floor surface at y=0. */
var LEVELS=[
{ id:1, name:'The Workshop', blurb:'Learn to waddle, hop, push, pull, swing and boing.', w:114, theme:'workshop',
  build:function(b){
    b.spawn(2.5,-0.6);
    b.cp(2.5,0);
    // floor
    b.ground(0,17,'grass'); b.ground(20,58,'grass'); b.ground(82,114,'grass');
    b.pit(17,0.7,3,6); b.pit(58,0.7,6,6);
    b.sign(4.6,0,'{MOVE} to waddle about');
    b.prize(7,-1.1); b.prize(8.6,-1.3);
    // hop steps
    b.sign(9.4,0,'Tap {JUMP} to hop.\nHold it to hop higher!');
    b.block(11,-1,1.5,1,{topCol:'yellow',tape:0.5}); b.block(12.5,-1.8,1.5,1.8,{topCol:'yellow',tape:0.3});
    b.prize(11.75,-2.1); b.prize(13.25,-2.9);
    b.cp(15.4,0);
    b.prize(18.5,-2.4);
    // push the box
    b.sign(22.3,0,'Walk into the box\nto push it');
    b.box('box',26,-0.6,1.2,1.2,{kind:'card',density:0.5,zone:[20,-10,13,10]});
    b.block(33,-2.6,2,2.6,{topCol:'orange',tape:0.6});
    b.prize(34,-3.6);
    // pull the sponge out of its cubby
    b.cp(37,0);
    b.sign(39.2,0,'Fuzzy things can be grabbed!\nHold {GRAB}, then walk away to pull');
    b.prize(41,-1); b.prize(42.6,-1);
    b.block(46,-2.6,12,1.1,{topCol:'green',tape:0.15}); b.block(47.6,-1.5,10.4,1.5,{});
    b.box('sponge',46.8,-0.68,1.3,1.3,{kind:'sponge',density:0.4,grab:true,zone:[35,-10,23,10]});
    b.prize(52,-3.7);
    // rope swing
    b.cp(55,-2.6);
    b.sign(56.4,-2.6,'Jump at the string to swing.\nTap {JUMP} to let go!');
    b.rope(61,-10.6,10,0.56);
    b.prize(61,-3.4);
    b.block(64,-2.6,14,6.6,{topCol:'blue',tape:0.4});
    b.cp(65.6,-2.6);
    // lever + gate
    b.sign(67.4,-2.6,'Grab the lever\nand pull it back');
    b.lever('gate1',69.6,-2.6,{start:0.55});
    b.gate('gate1',71.5,-5.7,0.6,3.1,{dy:-3.2,mode:'latch'});
    b.block(71.4,-14,0.8,8.3,{mat:'wood'});
    b.prize(68.2,-3.8);
    // boing!
    b.sign(74.2,-2.6,'Sponges are bouncy.\nBoing!');
    b.boing(75.4,-2.6,1.7,{});
    b.prize(76.25,-5.6); b.prize(76.25,-7.4);
    b.block(78,-6.6,4,10.6,{topCol:'pink',tape:0.5});
    b.prize(80,-7.6);
    // button holds the door open
    b.cp(84,0);
    b.sign(85.4,0,'Big buttons open doors.\nKeep something on them!');
    b.box('bag',87.2,-0.56,1.1,1.1,{kind:'bag',density:1.0,grab:true,zone:[82,-10,14,10]});
    b.button('door1',88.9,0,2.4,{minMass:0.6});
    b.gate('door1',96,-3.2,0.7,3.2,{dy:-3.1,mode:'hold'});
    b.block(95.9,-14,0.9,10.8,{mat:'wood'});
    b.prize(92.5,-1.2);
    // the comfy exit
    b.sign(101,0,'Hop into the\ncomfy exit!');
    b.prize(104,-1.3); b.prize(105.6,-2.3); b.prize(107.2,-3.3);
    b.exit(109.5,-1.7);
  }
},
{ id:2, name:'The Rube Goldberg Room', blurb:'Levers, a ruler see-saw, a flying ball, springs and a drawbridge.', w:104, theme:'machine',
  build:function(b){
    b.spawn(2.2,-0.6);
    b.cp(2.2,0);
    b.ground(0,5,'mint'); b.ground(14,77.5,'mint'); b.ground(79.5,83,'mint'); b.ground(90,104,'mint');
    b.block(77.5,1.1,2,3,{mat:'card'});
    b.pit(5,0.8,9,6); b.pit(83,0.8,7,6);
    b.sign(3.1,0,'Welcome to the Rube Goldberg Room!\nSpringy platforms wobble');
    b.spring(5.6,-0.3,2); b.spring(8.6,-0.3,2); b.spring(11.6,-0.3,2);
    b.prize(6.6,-1.6); b.prize(9.6,-1.9); b.prize(12.6,-1.6);
    // puzzle 1: lever -> ball -> ruler see-saw -> basket -> door
    b.block(14.2,-1.3,1.8,1.3,{topCol:'yellow'});
    b.block(16,-2.5,8,2.5,{topCol:'yellow',tape:0.3});
    b.poly([[24,-2.5],[29.2,-1.3],[29.2,0],[24,0]],{topCol:'yellow'});
    b.cp(17.4,-2.5);
    b.sign(18.4,-2.5,'Pull the lever to\nlet the ball roll');
    b.lever('post',20.2,-2.5,{start:0.55});
    b.ball('ball',22.4,-3.0,0.5,{density:0.5,grab:true});
    b.gate('post',23.55,-3.6,0.3,1.1,{dy:1.15,mode:'latch',thin:true});
    b.prize(17.2,-3.6); b.prize(26.6,-3.4);
    b.seesaw('ruler',33.1,-1.3,3.7,2.9,{limit:0.3});
    b.basket('door2',32.6,-6.8,1.7,0.95);
    // the tower with a tunnel
    b.block(37.2,-4.8,3.2,3.5,{topCol:'purple',tape:0.5});
    b.block(40.4,-3.2,0.7,0.4,{mat:'wood'}); b.block(42.2,-1.55,0.9,0.4,{mat:'wood'});
    b.sign(39.4,-4.8,'Hop down onto the ruler to\nfling the ball into the basket!');
    b.prize(38.8,-0.65); b.prize(37.6,-6.4); b.prize(41.7,-3.6);
    b.gate('door2',44.8,-3.0,0.8,3.0,{dy:-3.1,mode:'latch'});
    b.block(44.7,-14,1,11,{mat:'wood'});
    // puzzle 2: heavy crate -> heavy button -> boing pad -> heavy ball -> slide -> pocket -> drawbridge
    b.cp(47,0);
    b.sign(48.4,0,'Heavy button!\nIt needs something heavy');
    b.box('crate',51,-0.66,1.3,1.3,{kind:'sponge',density:1.1,grab:true,heavy:true,zone:[45.6,-10,15.4,10]});
    b.button('pad',54.2,0,2.3,{minMass:1.4,heavy:true});
    b.boing(59.0,0,1.6,{sig:'pad'});
    b.prize(48,-1.2); b.prize(51,-2.6); b.prize(59.8,-3.4); b.prize(59.8,-5.6);
    b.block(61,-4,7,4,{topCol:'orange',tape:0.4});
    b.poly([[68,-4],[77.5,0],[68,0]],{topCol:'orange'});
    b.cp(63,-4);
    b.sign(64.6,-4,'Roll the heavy ball\ndown the slide');
    b.ball('bigball',66.2,-4.56,0.55,{density:3.0,grab:true,heavy:true});
    b.prize(66.4,-5.6); b.prize(72.4,-3.4);
    b.button('bridge',77.6,1.1,1.8,{minMass:2.0,heavy:true,pocket:true});
    b.sign(81.6,0,'A heavy ball in the\npocket lowers the bridge');
    b.bridge('bridge',83,0,7.2);
    b.prize(86.5,-1.4);
    b.cp(91.4,0);
    b.sign(93,0,'Hop into the\ncomfy exit!');
    b.prize(95,-1.3); b.prize(96.6,-2.3); b.prize(98.2,-3.3);
    b.exit(100.5,-1.7);
  }
}];
