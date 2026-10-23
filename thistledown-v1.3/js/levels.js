// Thistledown - area definitions (original content). Coordinates in tiles, y down.
(function(root){
'use strict';
function Area(id,name,w,h){
  var a={id:id,name:name,w:w,h:h,g:[],ents:[],doors:{}};
  for(var y=0;y<h;y++){var r=[];for(var x=0;x<w;x++)r.push('.');a.g.push(r);}
  a.rect=function(x0,y0,x1,y1,c){for(var y=Math.max(0,y0);y<=Math.min(h-1,y1);y++)for(var x=Math.max(0,x0);x<=Math.min(w-1,x1);x++)a.g[y][x]=c;return a;};
  a.ground=function(x0,x1,top,c){return a.rect(x0,top,x1,h-1,c||'#');};
  a.put=function(x,y,c){a.g[y][x]=c;return a;};
  a.e=function(t,x,y,p){var o={t:t,x:x+0.5,y:y+0.5};if(p)for(var k in p)o[k]=p[k];a.ents.push(o);return a;};
  a.orbs=function(list){for(var i=0;i<list.length;i++)a.e('o',list[i][0],list[i][1]);return a;};
  a.door=function(x,y0,y1,grp){for(var y=y0;y<=y1;y++){a.g[y][x]='D';a.doors[y*w+x]=grp;}return a;};
  return a;
}
function done(a){a.rows=a.g.map(function(r){return r.join('');});delete a.g;['rect','ground','put','e','orbs','door'].forEach(function(k){delete a[k];});return a;}
var A=[];

// ---------- 1. Whisperglade ----------
(function(){
var a=Area(0,'Whisperglade',132,24);
a.rect(0,0,0,23,'#');
a.ground(0,14,18);a.e('P',3,17);a.e('S',6,17);
a.e('!',9,17,{text:'Hello, little Pip. The Elder Tree is fading. Run with the stick, jump with the button.'});
a.orbs([[11,16],[12,16],[13,16]]);
a.ground(15,22,17);a.orbs([[17,15],[19,15]]);
a.ground(23,28,15);a.e('c',26,14);
a.orbs([[30,12],[31,12]]);
a.ground(33,44,15);
a.rect(40,0,41,13,'#');
a.e('c',43,14);a.e('!',35,14,{text:'Jump into a wall and hold towards it to cling. Jump again to leap off. Climb between two walls.'});
a.ground(45,60,6);a.orbs([[48,4],[50,4],[52,4],[54,4]]);
a.ground(61,90,10);
a.e('!',63,9,{text:'A mossy crate! Push it onto the stone plate to open the root door.'});
a.e('B',65,9);a.e('_',76,9,{g:1});a.door(77,7,9,1);a.rect(76,0,78,6,'#');
a.e('G',70,4);a.e('H',70,1);
a.e('S',82,9);a.e('A',86,9,{ab:'dj',text:'Twinbloom! Press Jump again in the air to Double Jump.'});
a.e('c',89,9);
a.orbs([[93,6],[95,6],[97,7]]);
a.ground(99,131,10);a.e('c',101,9);
a.rect(103,7,105,7,'=');a.e('E',104,6);
a.e('e',111,9);
a.e('!',107,9,{text:'Thornsprouts spit seeds. Hop over them, or find a way to turn their seeds back.'});
a.orbs([[115,8],[118,8],[121,8],[124,8]]);
a.e('X',129,8);a.e('X',129,9);a.rect(131,0,131,23,'#');
// v1.3 additions (appended so old saves keep their indices)
a.rect(2,0,2,17,'T');a.e('W',1,17,{to:10,sp:{x:4.5,y:12.5},name:'Fernhollow'});
a.e('tr',100,9,{id:0});a.e('tf',126,9,{id:0});
a.e('!',13,17,{text:'Brambles block a little hollow behind you. Something glows inside... maybe one day you can break through.'});
a.reg=0;A.push(done(a));
})();

// ---------- 2. Mirrormere ----------
(function(){
var a=Area(1,'Mirrormere',150,26);
a.rect(0,0,0,25,'#');
a.ground(0,9,16);a.e('x',1,14);a.e('x',1,15);a.e('S',5,15);
a.e('!',7,15,{text:'Clear water! Hold any direction to swim. Press Jump at the surface to leap out.'});
a.ground(10,29,22);a.rect(10,16,29,21,'w');a.rect(19,10,20,18,'#');
a.orbs([[15,20],[17,20],[22,20],[25,19]]);
a.ground(30,31,16);a.ground(32,33,18);a.ground(34,34,20);
a.rect(35,8,35,18,'I');a.rect(35,22,35,25,'#');a.rect(35,19,35,21,'h');
a.ground(36,44,22);a.rect(36,8,44,21,'h');
a.e('v',40,21);a.e('!',38,21,{text:'An old sluice lever. Use it to flood the well, then swim to the top.'});
a.e('o',40,12);a.e('o',40,10);
a.ground(45,64,8);a.e('S',49,7);a.e('A',53,7,{ab:'dash',text:'Quickstep! Press Dash to dart forward. Dash through bramble walls.'});
a.rect(57,0,59,3,'#');a.rect(58,4,58,7,'T');
a.e('c',61,7);
a.rect(67,8,69,8,'C');a.rect(73,7,75,7,'C');a.rect(79,8,81,8,'C');a.rect(85,6,87,6,'C');a.rect(91,7,93,7,'C');
a.orbs([[71,5],[77,4],[83,5],[89,3]]);
a.e('!',63,7,{text:'Moonpetal ledges crumble when you land. Keep moving!'});
a.ground(96,120,8);a.e('c',98,7);a.e('S',100,7);
a.e('!',102,7,{text:'The brambles are waking up... when they come, RUN!'});
a.e('Z',104,7,{dir:'right',speed:5.4,lead:13});
a.rect(112,0,114,4,'#');a.rect(113,5,113,7,'T');
a.ground(126,131,10);
a.rect(133,9,134,9,'C');a.rect(137,8,138,8,'C');
a.ground(140,149,8);a.e('z',142,7);
a.e('H',117,4);a.e('G',117,2);
a.e('X',148,6);a.e('X',148,7);a.rect(149,0,149,25,'#');
a.rect(12,22,16,22,'k');a.rect(12,23,16,24,'w');a.e('W',14,24,{to:11,sp:{x:4.5,y:11.5},name:'Sunken Reliquary'});
a.e('tr',62,7,{id:1});a.e('tf',97,7,{id:1});
a.e('y',118,7);a.e('y',129,9);
a.reg=1;A.push(done(a));
})();

// ---------- 3. Galeroot Heights ----------
(function(){
var a=Area(2,'Galeroot Heights',150,36);
a.rect(0,0,0,35,'#');
a.ground(0,14,33);a.e('x',1,31);a.e('x',1,32);a.e('S',5,32);
a.e('A',9,32,{ab:'glide',text:'Featherleaf! Hold Jump while falling to glide. Warm updrafts lift you high.'});
a.ground(15,22,33);a.rect(16,32,18,32,'U');a.rect(14,8,21,9,'#');
a.orbs([[17,26],[17,20],[17,14]]);
a.ground(23,40,18);a.e('c',25,17);a.e('e',34,17);a.orbs([[28,16],[30,16]]);
a.ground(46,48,30);a.rect(46,29,48,29,'U');
a.orbs([[43,20],[47,22],[51,18]]);
a.ground(55,70,16);a.e('S',58,15);a.e('c',60,15);
a.e('A',62,15,{ab:'bash',text:'Flarebound! Hold Bash near a lantern or a seed, aim, then let go to launch. Seeds fly the other way.'});
a.e('L',66,12);a.e('L',69,8);
a.ground(71,92,6);a.e('c',73,5);a.e('e',84,5);a.orbs([[76,4],[78,4],[80,4]]);
a.e('E',47,15);
a.rect(93,0,120,2,'#');
a.rect(93,33,120,33,'^');a.ground(93,120,34);
a.e('c',90,5);
a.e('L',97,8);a.e('L',103,9);a.e('L',109,8);a.e('L',115,9);
a.orbs([[100,5],[106,5],[112,5]]);
a.e('!',88,5,{text:'No ground ahead. Chain the lanterns: Bash, aim, launch, again!'});
a.ground(121,149,8);a.e('S',124,7);a.e('c',123,7);
a.orbs([[130,6],[133,6],[136,6]]);
a.e('X',148,6);a.e('X',148,7);a.rect(149,0,149,35,'#');
a.rect(130,10,138,12,'.');a.rect(134,8,134,9,'k');a.e('W',137,12,{to:12,sp:{x:4.5,y:19.5},name:'Gale Hollow'});
a.e('tr',91,5,{id:2});a.e('tf',126,7,{id:2});
a.reg=2;A.push(done(a));
})();

// ---------- 4. Prismvale Hollow ----------
(function(){
var B=18;
var a=Area(3,'Prismvale Hollow',160,46);
a.rect(0,0,0,45,'#');
a.ground(0,12,20+B);a.e('x',1,18+B);a.e('x',1,19+B);a.e('S',5,19+B);
a.e('A',9,19+B,{ab:'grapple',text:'Thornvine! Press Grapple near a glowing anchor to swing to it.'});
a.rect(13,0,42,13+B,'#');
a.e('G',18,16+B);a.e('G',25,16+B);a.e('G',32,16+B);a.e('G',39,16+B);
a.orbs([[21,17+B],[28,17+B],[35,17+B]]);
a.ground(43,60,20+B);a.e('c',45,19+B);
a.e('K',47,18+B,{d:0});a.e('N',55,18+B);a.e('R',55,13+B,{g:2});
a.e('!',50,19+B,{text:'A prism! Stand close and press Use to turn it. Guide the light to the crystal eye.'});
a.door(60,15+B,19+B,2);a.rect(59,0,61,14+B,'#');
a.ground(61,85,20+B);a.e('c',63,19+B);
a.e('K',63,17+B,{d:0});a.e('N',72,17+B);a.e('N',72,13+B);a.e('R',80,13+B,{g:3});
a.rect(70,16+B,74,16+B,'=');
a.door(85,14+B,19+B,3);a.rect(84,0,86,13+B,'#');
a.orbs([[66,15+B],[78,15+B]]);
a.ground(86,100,20+B);a.e('S',88,19+B);a.e('c',96,19+B);
a.e('!',92,19+B,{text:'The crystals are cracking! Climb, climb, climb!'});
a.rect(100,7,100,16+B,'I');a.rect(113,9,113,45,'I');a.ground(101,112,20+B);
a.e('Z',104,19+B,{dir:'up',speed:2.0,lead:5});
a.e('G',106,33);a.e('L',106,29);a.e('G',106,25);a.e('L',106,21);a.e('G',106,17);a.e('L',106,13);a.e('G',106,9);
a.ground(114,159,8);a.e('z',117,7);a.e('S',120,7);
a.orbs([[125,6],[128,6],[131,6],[134,6],[137,6]]);
a.e('H',145,3);a.rect(143,5,147,5,'=');
a.e('X',158,6);a.e('X',158,7);a.rect(159,0,159,45,'#');
a.rect(124,10,132,12,'.');a.door(128,8,9,7);a.e('Y',140,1,{g:7});a.e('W',131,12,{to:13,sp:{x:4.5,y:12.5},name:'Prism Vault'});
a.reg=3;A.push(done(a));
})();

// ---------- 5. Heartroot ----------
(function(){
var a=Area(4,'Heartroot',96,30);
a.rect(0,0,0,29,'#');
a.ground(0,24,22);a.e('x',1,20);a.e('x',1,21);a.e('S',5,21);
a.e('!',9,21,{text:'The Elder Tree\'s heart. Grandmoth Ulma sleeps here, dreaming bad dreams. Wake her gently.'});
a.rect(25,22,34,22,'^');a.ground(25,34,23);a.e('L',28,18);a.e('L',32,18);
a.ground(35,90,22);a.e('c',37,21);a.e('S',39,21);

a.e('L',52,15);a.e('L',72,15);
a.e('O',62,13,{ax0:44,ax1:84});
a.e('!',41,21,{text:'Bash the falling dream-seeds back at Grandmoth Ulma.'});
a.rect(95,0,95,29,'#');
a.e('J',86,21);
a.reg=4;a.final=true;A.push(done(a));
})();


// ---------- v1.3: boss arenas ----------
function arena(name,reg,kind,story,opt){
  opt=opt||{};var fl=opt.fl||15,h=fl+3;var a=Area(0,name,40,h);
  a.rect(0,0,0,h-1,'#');a.rect(39,0,39,h-1,'#');a.ground(0,39,fl);
  a.e('x',1,fl-2);a.e('x',1,fl-1);a.e('S',4,fl-1);a.e('!',6,fl-1,{text:story});
  a.door(37,fl-4,fl-1,9);a.rect(37,0,37,fl-5,'#');a.e('X',38,fl-2);a.e('X',38,fl-1);
  a.e('O',22,opt.by||fl-2,{kind:kind,ax0:8,ax1:36,fl:fl});
  if(opt.extra)opt.extra(a,fl);
  a.reg=reg;a.boss=kind;return done(a);
}
var AR1=arena('Tumble\'s Burrow',0,'mole','Tumble the old mole dug these tunnels for a hundred years. Now the dark frightens him and he charges at every shadow. When he gets dizzy, hop on his head to calm him.');
var AR2=arena('Mira\'s Weir',1,'heron','Mira the mist heron lost her chicks in the fog and swoops at every small shape. Jump over her swoops. When she stops to rest, Dash into her to snap her out of it.');
var AR3=arena('Gale\'s Roost',2,'owl','Gale the old owl hoards storm-seeds to keep the cold away. Bash the falling seeds back to him. Watch the leaves: they show which way the wind will blow.',{fl:19,by:8,extra:function(a,fl){a.e('L',14,12);a.e('L',30,12);a.rect(16,15,19,15,'=');a.rect(25,15,28,15,'=');}});
var AR4=arena('Glim\'s Grotto',3,'crab','Glim the glass crab cracked her shell long ago and hides from everyone behind sharp spikes. When her back glows open, land on it gently. Swing from the anchors to get high.',{extra:function(a){a.e('G',13,6);a.e('G',22,5);a.e('G',31,6);}});

var LW=(function(){
var a=Area(0,'Lanternwood',112,26);
a.rect(0,0,0,25,'#');a.rect(111,0,111,25,'#');
a.ground(0,30,20);a.e('x',1,18);a.e('x',1,19);a.e('S',5,19);
a.e('!',8,19,{text:'Lanternwood. The lanterns here sleep until a light wakes them.'});
a.e('A',11,19,{ab:'arrow',text:'Lightbow! Press Arrow (R / J, or RB) to shoot a light arrow. Aim with the stick, even diagonally. Arrows wake far switches and shatter cracked crystal.'});
a.e('!',16,19,{text:'A sleeping switch, high up. Stand under it and shoot straight up.'});
a.e('Y',22,9,{g:4});a.door(30,15,19,4);a.rect(29,0,31,14,'#');
a.orbs([[18,17],[24,16],[26,16]]);
a.ground(31,52,20);a.e('c',33,19);a.e('e',40,19);a.orbs([[36,17],[44,17]]);
a.rect(48,12,48,19,'k');a.rect(47,0,49,11,'#');
a.e('!',45,19,{text:'Cracked crystal. One light arrow will shatter it.'});
a.ground(53,56,20);a.e('Q',54,19);a.e('S',56,19);
a.e('!',53,18,{text:'A moon dial. Press Use to call the night. Moonblooms only open in the dark.'});
a.ground(57,82,23);a.rect(57,22,82,22,'^');
[60,65,70,75,80].forEach(function(x){a.rect(x,19,x+1,19,'n');});
a.rect(65,15,67,15,'n');a.rect(69,12,71,12,'n');a.rect(64,9,66,9,'n');a.rect(69,6,76,6,'#');
a.e('W',74,5,{to:14,sp:{x:4.5,y:12.5},name:'Moonwell Grotto'});a.orbs([[70,4],[72,4]]);
a.ground(83,111,20);a.e('c',85,19);
a.rect(90,13,94,13,'#');a.e('Y',92,12,{g:5});
a.e('!',87,19,{text:'The switch sits above a ledge. You will need to shoot at an angle.'});
a.door(100,15,19,5);a.rect(99,0,101,14,'#');
a.orbs([[95,17],[97,17],[104,17],[106,17]]);a.e('E',96,10);
a.e('X',110,18);a.e('X',110,19);
a.reg=4;a.night=true;return done(a);
})();

function cave(name,reg,h,build){var a=Area(0,name,40,h);a.rect(0,0,39,1,'#');a.rect(0,0,0,h-1,'#');a.rect(39,0,39,h-1,'#');build(a);a.reg=reg;a.secret=true;return done(a);}
var C0=cave('Fernhollow',0,16,function(a){a.ground(0,39,13);a.e('W',3,12,{to:0,sp:{x:1.5,y:17.5},name:'Whisperglade'});
  a.rect(10,12,26,12,'^');a.rect(13,9,14,9,'=');a.rect(18,9,19,9,'=');a.rect(23,9,24,9,'=');a.orbs([[13,7],[18,7],[23,7]]);
  a.e('p',32,12,{id:0});a.e('H',29,12);a.e('W',36,12,{to:4,sp:{x:5.5,y:32.5},req:'glide',name:'Galeroot Heights',text:'A long root tunnel full of wind. You need Featherleaf to ride it.'});});
var C1=cave('Sunken Reliquary',1,16,function(a){a.ground(0,39,14);a.rect(1,2,38,13,'w');a.e('W',3,12,{to:2,sp:{x:5.5,y:15.5},name:'Mirrormere'});
  a.rect(12,2,12,8,'#');a.rect(20,7,20,13,'#');a.rect(28,2,28,8,'#');a.orbs([[8,10],[16,4],[24,11],[32,4]]);a.e('p',35,5,{id:1});a.e('E',35,11);});
var C2=cave('Gale Hollow',2,24,function(a){a.ground(0,39,21);a.e('W',3,20,{to:4,sp:{x:132.5,y:7.5},name:'Galeroot Heights'});
  a.rect(6,20,8,20,'U');a.rect(10,20,38,20,'^');a.rect(20,8,36,8,'#');a.orbs([[7,15],[7,11],[24,6],[28,6]]);a.e('p',33,7,{id:2});});
var C3=cave('Prism Vault',3,16,function(a){a.ground(0,39,13);a.e('W',3,12,{to:6,sp:{x:118.5,y:7.5},name:'Prismvale Hollow'});
  a.rect(8,12,32,12,'^');a.e('G',12,6);a.e('G',18,6);a.e('G',24,6);a.e('G',30,6);a.orbs([[15,8],[21,8],[27,8]]);a.e('p',35,12,{id:3});
  a.e('W',37,12,{to:8,sp:{x:5.5,y:19.5},req:'arrow',name:'Lanternwood',text:'A crystal passage, sealed by light. You need the Lightbow.'});});
var C4=cave('Moonwell Grotto',4,16,function(a){a.ground(0,39,13);a.e('W',3,12,{to:8,sp:{x:72.5,y:5.5},name:'Lanternwood'});a.e('Q',7,12);
  a.rect(11,10,13,10,'n');a.rect(16,7,18,7,'n');a.rect(21,4,23,4,'n');a.rect(26,4,32,4,'#');a.orbs([[12,8],[17,5],[22,2]]);a.e('p',30,3,{id:4});a.e('H',34,12);
  a.e('!',9,12,{text:'Moonblooms again. Night opens the way up.'});a.night=true;});
var ORDER=[A[0],AR1,A[1],AR2,A[2],AR3,A[3],AR4,LW,A[4],C0,C1,C2,C3,C4];
ORDER.forEach(function(a,i){a.id=i;});
root.TD_AREAS=ORDER;root.TD_OLDMAP=[0,2,4,6,9];
})(typeof window!=='undefined'?window:globalThis);
