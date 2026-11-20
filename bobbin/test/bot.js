// In-page playtester. Loaded with addScriptTag. Uses __bob / __b19 only.
window.__play19 = (function () {
  var TICKS = 0, BUDGET = 140000;
  function act(d, n) {
    if (TICKS > BUDGET) return __bob.info();
    __b19.drive(d || { x: 0 });
    var info = null;
    for (var i = 0; i < n; i++) { info = __b19.tick(1); TICKS++; if (TICKS > BUDGET) break; }
    if (info && info.lives < 40) __b19.lives(99);
    return info || __bob.info();
  }
  function surf(x) { return __b19.surf(x); }
  function edgeDist(x, base) {
    for (var d = 0.35; d <= 3.2; d += 0.15) {
      var s = surf(x + d);
      if (s === null || s > base + 0.45 || __b19.pit(x + d, Math.min(base + 0.7, 0.9))) return d;
    }
    return null;
  }
  function wallDist(x, base) {
    for (var d = 0.4; d <= 2.2; d += 0.15) {
      var s = surf(x + d);
      if (s !== null && s < base - 0.55 && !__b19.pit(x + d, 0.8)) return { d: d, h: base - s };
    }
    return null;
  }
  function obj(name) {
    var list = (__bob.info() && __bob.info().objs) || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }
  function sigOn(name) { var s = (__bob.info() || {}).signals || {}; return !!s[name]; }
  // hold a jump for `hold` ticks once, while running
  function hopToward(tx, hold) {
    var info = __bob.info(), dir = tx > info.x ? 1 : -1, guard = 0, last = info ? info.x : 0, stall = 0;
    while (guard++ < 220) {
      info = __bob.info();
      if (!info || info.finished || info.out) return info;
      if ((dir > 0 && info.x >= tx - 0.3) || (dir < 0 && info.x <= tx + 0.3)) return info;
      var base = surf(info.x); if (base === null) base = 0;
      var e = edgeDist(info.x, base), w = wallDist(info.x, base);
      var jump = false, grab = info.grab === 'hang' || info.cand === 'rope' || info.cand === 'zip';
      if (e !== null && e < (hold > 20 ? 1.15 : 0.85) && info.grounded) jump = true;
      if (w && w.d < 0.9 && info.grounded && w.h < 2.2) jump = true;
      if (info.grab === 'hang') { grab = true; if (info.vx * dir > 1.2 && info.vy > -2) { grab = false; jump = true; } }
      if (info.cand === 'rope' || info.cand === 'zip') grab = true;
      info = act({ x: dir, jump: jump, grab: grab, tap: jump && info.grounded }, jump ? Math.min(hold, 14) : 4);
      if (info.y > 4) act({ x: 0 }, 12);
      if (Math.abs(info.x - last) < 0.15) { if (++stall > 8) return info; } else stall = 0;
      last = info.x;
    }
    return __bob.info();
  }
  function pullLever(x, sig) {
    hopToward(x - 0.2, 10);
    var guard = 0, info;
    while (guard++ < 250) {
      info = act({ x: -1, grab: true }, 3);
      if (!info || info.finished) return info;
      if (!sig || sigOn(sig)) break;
      var lv = __b19.levers().filter(function (l) { return !sig || l.sig === sig; })[0];
      if (lv && lv.on) break;
    }
    return act({ x: 1, grab: false }, 8);
  }
  function flipToggle(x) {
    hopToward(x, 8);
    return act({ x: 0, grab: true, tap: false }, 8);
  }
  function pressButton(x) {
    hopToward(x, 12);
    return act({ x: 0.2 }, 20);
  }
  // generic travel to x, jumping gaps and low walls, swinging ropes it touches
  function travel(tx, limit) {
    limit = limit || 4000;
    var info = __bob.info(), stuckX = info ? info.x : 0, stuckN = 0, hold = 0, guard = 0;
    while (guard++ < limit) {
      info = __bob.info();
      if (!info || info.finished || info.out) return info;
      if (info.x >= tx - 0.45) return info;
      if (guard % 90 === 0) {
        if (info.x < stuckX + 0.8) stuckN++; else stuckN = 0;
        stuckX = info.x;
        if (stuckN >= 3) { act({ x: -1, jump: true, tap: true }, 18); act({ x: 1, jump: true, grab: true, tap: true }, 24); stuckN = 0; }
      }
      var base = surf(info.x); if (base === null) base = info.y + 0.5;
      var e = edgeDist(info.x, base), w = wallDist(info.x, base);
      var jump = hold > 0, grab = false, dir = 1;
      if (hold > 0) hold--;
      if (info.grab === 'hang') {
        grab = true;
        if (info.vx > 1.4 && info.vy > -1.5) { grab = false; jump = true; hold = 0; }
      } else if (info.cand === 'rope' || info.cand === 'zip' || info.cand === 'balloon') grab = true;
      else if (info.cand === 'lever' || info.cand === 'toggle') { grab = true; dir = info.cand === 'lever' ? -1 : 0; }
      if (info.grounded && e !== null && e < 1.05) { jump = true; hold = e > 2.2 ? 28 : 16; }
      if (info.grounded && w && w.d < 0.85 && w.h < 2.4) { jump = true; hold = Math.max(hold, 18); }
      if (w && w.h >= 2.4 && w.d < 2.1) { jump = true; hold = 48; }
      info = act({ x: dir, jump: jump, grab: grab, tap: jump && hold > 12 }, 3);
    }
    return __bob.info();
  }
  function runRoute(r) {
    var t = r.t;
    if (t === 'squeeze') return doSqueeze(r);
    if (t === 'hops' || t === 'pit' || t === 'sprung' || t === 'planks' || t === 'wax' || t === 'parade' || t === 'duck' || t === 'tape' || t === 'velcro') return travel(r.xe - 0.6, 5000);
    if (t === 'lever' || t === 'snip' || t === 'domino' || t === 'marble') { pullLever(r.lx || r.first, r.sig); return travel(r.xe - 0.6, 2500); }
    if (t === 'boxwall' || t === 'tearwall' || t === 'tower') return travel(r.xe - 0.6, 4000);
    if (t === 'boingwall' || t === 'elastic') { travel((r.pad || r.band || r.step) + 0.4, 2000); act({ x: 0.2, jump: true, tap: true }, 40); return travel(r.xe - 0.6, 2500); }
    if (t === 'bagdoor') return doBag(r);
    if (t === 'ropes') return doRopes(r);
    if (t === 'zip') return doZip(r);
    if (t === 'movers') return doRide(r);
    if (t === 'lift' || t === 'potlift') return doLift(r);
    if (t === 'timed') return doTimed(r);
    if (t === 'beltlever') { pullLever(r.lx, r.sig); return travel(r.xe - 0.6, 3000); }
    if (t === 'jelly' || t === 'jellydrop' || t === 'pistons') return travel(r.xe - 0.6, 6000);
    if (t === 'rollpin' || t === 'chain1') return doChain(r);
    if (t === 'toybtn') { pullLever(r.lx, r.sig); return travel(r.xe - 0.6, 4000); }
    if (t === 'balloon') return doBalloon(r);
    if (t === 'pulley') return doPulley(r);
    if (t === 'can') return doCan(r);
    if (t === 'fan') return doFan(r);
    if (t === 'fanpush' || t === 'chain2') { flipToggle(r.tx); return travel(r.xe - 0.6, 5000); }
    if (t === 'magnet') return doMagnet(r);
    if (t === 'tea') { travel(r.p2 - 0.4, 2000); return travel(r.xe - 0.6, 2500); }
    return travel(r.xe - 0.6, 4000);
  }
  function doSqueeze(r) {
    var guard = 0, info;
    while (guard++ < 180) {
      info = __bob.info();
      if (!info || info.finished) return info;
      if (info.x > (r.x2 || r.xe) + 0.4) break;
      act({ x: 1, jump: false, grab: false }, 3);
    }
    return travel(r.xe - 0.5, 800);
  }
  function doBag(r) {
    var guard = 0, info;
    while (guard++ < 400) {
      info = __bob.info();
      if (!info || info.finished) return info;
      if (info.x > r.door + 1.2) return info;
      var bag = obj(r.bag);
      if (sigOn(r.sig) && info.x < r.door) { travel(r.xe - 0.5, 800); return __bob.info(); }
      if (!bag) { travel(r.xe - 0.5, 600); return __bob.info(); }
      if (info.grabName !== r.bag) { hopToward(bag.x, 8); act({ x: bag.x > info.x ? 0.4 : -0.4, grab: true }, 10); }
      else act({ x: bag.x < r.btn + 0.8 ? 1 : 0, grab: true }, 6);
    }
    return __bob.info();
  }
  function doRopes(r) {
    travel(r.edge - 0.4, 2000);
    var anchors = r.anchors || [], i, info;
    for (i = 0; i < anchors.length; i++) {
      var guard = 0;
      while (guard++ < 200) {
        info = __bob.info();
        if (!info || info.x > anchors[i] + 1.2) break;
        var grab = info.grab === 'hang' || info.cand === 'rope' || !info.grounded;
        var release = info.grab === 'hang' && info.x > anchors[i] - 0.2 && info.vx > 0.8;
        act({ x: 1, grab: grab && !release, jump: release || (info.grounded && info.x > (i ? anchors[i - 1] : r.edge) - 0.5), tap: info.grounded }, 3);
      }
    }
    return travel(r.xe - 0.5, 2000);
  }
  function doZip(r) {
    travel(r.tower + 1.2, 2500);
    var guard = 0, info, jumped = false;
    while (guard++ < 300) {
      info = __bob.info();
      if (!info || info.finished) return info;
      if (info.x > r.land - 0.4) { act({ x: 1, grab: false, jump: true, tap: true }, 10); return travel(r.xe - 0.5, 2000); }
      var on = info.grab === 'hang' || info.grabName === 'zip';
      if (!on && !jumped) { act({ x: 0.3, jump: true, tap: true, grab: true }, 25); jumped = true; }
      else act({ x: 1, grab: true }, 4);
    }
    return travel(r.xe - 0.5, 1500);
  }
  function doRide(r) {
    var edge = r.edge || r.xs, land = r.land || (r.xe - 1);
    travel(edge + 0.15, 2200);
    var guard = 0, info, waited = 0;
    while (guard++ < 800) {
      info = __bob.info();
      if (!info || info.finished) return info;
      if (info.x > land - 0.25) return travel(r.xe - 0.4, 1200);
      var on = __bob.info2().on, mvs = __bob.info2().movers, near = null, i;
      if (!on) {
        for (i = 0; i < mvs.length; i++) if (Math.abs(mvs[i].x - info.x) < 2.4 && mvs[i].y > -1.6 && mvs[i].y < 0.8) near = mvs[i];
        if (near && info.grounded) act({ x: near.x >= info.x ? 0.6 : -0.6, jump: Math.abs(near.x - info.x) < 1.5, tap: true }, 4);
        else act({ x: 0 }, 3);
        if (++waited > 70) { act({ x: 0.4, jump: true, tap: true }, 10); waited = 0; }
      } else { waited = 0; act({ x: info.x > land - 2.2 ? 1 : 0, jump: info.x > land - 2.2 && info.grounded, tap: true }, 4); }
    }
    return __bob.info();
  }
  function doLift(r) {
    if (r.pe) doCan({ pe: r.pe, lx: r.lx, sig: r.sig, gate: r.cx, xe: r.cx + 1 });
    travel((r.cx || r.xs) - 0.2, 2000);
    var guard = 0, info, top = r.top || -4;
    while (guard++ < 500) {
      info = __bob.info();
      if (!info) return info;
      if (info.y < top + 1.3 && info.grounded) break;
      act({ x: Math.abs(info.x - (r.cx || info.x)) < 0.8 ? 0 : (info.x < r.cx ? 1 : -1) }, 4);
    }
    return travel(r.xe - 0.5, 2000);
  }
  function doTimed(r) {
    hopToward(r.btn, 10);
    act({ x: 0 }, 30);
    var guard = 0, info;
    while (guard++ < 600) {
      info = __bob.info();
      if (!info || info.finished) return info;
      if (info.x > r.door + 0.9) return travel(r.xe - 0.4, 900);
      if (!sigOn(r.sig)) { hopToward(r.btn, 8); act({ x: 0 }, 24); continue; }
      var base = surf(info.x); if (base === null) base = 0;
      var e = edgeDist(info.x, base), w = wallDist(info.x, base);
      act({ x: 1, jump: !!(info.grounded && ((e !== null && e < 1.4) || (w && w.d < 0.85))), tap: true }, 3);
    }
    return __bob.info();
  }
  function doChain(r) {
    if (r.pe) { doCan(r); }
    return travel(r.xe - 0.5, 4000);
  }
  function doBalloon(r) {
    travel(r.px - 0.2, 2000);
    var guard = 0, info;
    while (guard++ < 400) {
      info = __bob.info();
      if (!info) return info;
      if (info.y < -(r.h || 5) + 1.5) { act({ x: 1, grab: false, jump: true }, 12); break; }
      act({ x: 0.2, grab: true }, 4);
    }
    return travel(r.xe - 0.5, 2000);
  }
  function doPulley(r) {
    travel(r.xb + 0.6, 2000);
    act({ x: 0 }, 15);
    pullLever(r.lx, r.sig);
    var guard = 0, info;
    while (guard++ < 400) {
      info = __bob.info();
      if (!info) return info;
      if (info.y < (r.top || -3) + 1.4 && info.grounded) break;
      act({ x: info.x < r.xb + 0.8 ? 0.3 : -0.3 }, 4);
    }
    return travel(r.xe - 0.5, 2000);
  }
  function doCan(r) {
    hopToward(r.lx, 8);
    var guard = 0;
    while (guard++ < 300) {
      var info = act({ x: -1, grab: true }, 4);
      if (!info || sigOn(r.sig)) break;
    }
    act({ x: 1, grab: false }, 10);
    return travel((r.xe || r.gate + 3) - 0.4, 2000);
  }
  function doFan(r) {
    flipToggle(r.tx || r.xs);
    var guard = 0, info;
    while (guard++ < 400) {
      info = __bob.info();
      if (!info) return info;
      if (info.y < -(r.h || 5) + 1.2) break;
      act({ x: 0.15, jump: info.grounded, tap: info.grounded }, 4);
    }
    return travel(r.xe - 0.5, 2000);
  }
  function doMagnet(r) {
    flipToggle(r.t1);
    var guard = 0, info, tin;
    while (guard++ < 500) {
      info = __bob.info(); tin = obj(r.tin);
      if (!info) return info;
      if (tin && tin.x > r.btn - 0.4) { flipToggle(r.t2 || r.t1); break; }
      act({ x: 0 }, 6);
    }
    return travel(r.xe - 0.5, 2500);
  }
  function doBoss(id) {
    var guard = 0, info;
    while (guard++ < 2500) {
      info = __bob.info();
      var B = __bob.boss();
      if (!info) return { ok: false, reason: 'no info' };
      if (info.finished || (B && B.won)) { act({ x: 0 }, 40); return { ok: !!__bob.info().finished || (B && B.won), id: id }; }
      if (id === 101) bossRobot(B);
      else if (id === 102) bossSew(B);
      else if (id === 103) bossJelly(B);
      else if (id === 104) bossSoldier(B);
      else if (id === 105) bossGnome(B);
      else act({ x: 0 }, 10);
    }
    return { ok: false, id: id, reason: 'boss timeout', x: __bob.info() && __bob.info().x, st: __bob.boss() && __bob.boss().state };
  }
  function bossRobot(B) {
    if (!B || !B.extra) { act({ x: 0 }, 8); return; }
    var ex = B.extra, best = 0, bd = 99, i;
    for (i = 0; i < ex.hatches.length; i++) { var d = Math.abs(B.x - ex.hatches[i]); if (d < bd) { bd = d; best = i; } }
    if (bd < 1.6 && B.state === 'walk') pullLever(ex.leverX[best], null);
    else act({ x: __bob.info().x < ex.leverX[0] - 0.4 ? 1 : 0 }, 6);
  }
  function bossSew(B) {
    var info = __bob.info();
    if (B && B.state === 'tired') {
      if (info.grab) act({ x: 0, grab: false, jump: true, tap: true }, 8);
      else act({ x: info.x < B.x ? 1 : -1, jump: info.grounded, tap: true }, 4);
    } else if (!info.grab) act({ x: 0.4, jump: info.grounded && info.y > -3, grab: true, tap: true }, 6);
    else act({ x: 1, grab: true }, 6);
  }
  function bossJelly(B) {
    var info = __bob.info();
    if (B && (B.state === 'go' || B.state === 'hungry' || B.state === 'open')) {
      if (!sigOn('feed')) pullLever(7.4, 'feed');
      else act({ x: info.x < 12 ? 1 : 0 }, 6);
    } else act({ x: info.x > 8 ? -1 : 0, jump: info.grounded && __b19.pit(info.x + 0.8, 0.8) }, 6);
  }
  function bossSoldier(B) {
    if (B && B.state === 'march' && B.x > 16 && B.dir < 0 && !sigOn('mouse')) pullLever(10.4, 'mouse');
    else act({ x: __bob.info().x > 8 ? -0.4 : 0.4 }, 8);
  }
  function bossGnome(B) {
    var info = __bob.info();
    if (B && (B.state === 'ahh' || B.state === 'choo') && !sigOn('fan')) flipToggle(10.6);
    else if (info.x < 9) act({ x: 1 }, 6);
    else act({ x: 0, jump: info.grounded && info.x > 12 && info.x < 20 }, 6);
  }
  function play(id) {
    TICKS = 0;
    __b19.f('*', window.__playFlags === 0 ? 0 : 1);
    __bob.start(id);
    __b19.lives(99);
    act({ x: 0 }, 8);
    var info = __bob.info();
    if (!info) return { ok: false, id: id, reason: 'no start' };
    if (id > 100) return doBoss(id);
    var route = __bob.route() || [];
    if (route.length) {
      var guardR = 0, fails = {}, seg, idx, k, x0;
      while (guardR++ < route.length * 6 && TICKS < BUDGET) {
        info = __bob.info();
        if (!info || info.finished || info.out) break;
        seg = null; idx = 0;
        for (k = 0; k < route.length; k++) {
          if (info.x < (route[k].xe || 1e9) - 0.8) { seg = route[k]; idx = k; break; }
        }
        if (!seg) break;
        x0 = info.x;
        runRoute(seg);
        info = __bob.info();
        if (!info || info.finished) break;
        if (info.x < (seg.xe || 0) - 1 && info.x < x0 + 2) {
          fails[idx] = (fails[idx] || 0) + 1;
          if (fails[idx] >= 5) break;
        }
      }
      info = __bob.info();
      if (info && !info.finished) travel(9999, 1200);
      for (var fin = 0; fin < 160 && __bob.info() && !__bob.info().finished && TICKS < BUDGET; fin++) act({ x: 0.5, jump: true, tap: true }, 2);
      info = __bob.info();
      return { ok: !!(info && info.finished), id: id, x: info && +info.x.toFixed(1), t: info && +info.t.toFixed(1), deaths: info && info.deaths, state: info && info.state, ticks: TICKS };
    }
    if (!route.length) {
      var ex = null;
      // level 1 and 2: head for a far x and let travel handle the gadgets it can see, then nudge known beats
      if (id === 1) ex = level1();
      else if (id === 2) ex = level2();
      else travel(info.x + 30, 2000);
      info = __bob.info();
      return { ok: !!(info && info.finished), id: id, x: info && +info.x.toFixed(1), t: info && +info.t.toFixed(1), deaths: info && info.deaths, note: ex };
    }
  }
  function level1() {
    travel(16, 1500);
    // rope at 61, approach from the left ledge
    travel(59, 2000);
    var guard = 0, info;
    while (guard++ < 200) {
      info = __bob.info();
      if (!info || info.x > 64) break;
      var grab = info.grab === 'hang' || info.cand === 'rope' || !info.grounded;
      var rel = info.grab === 'hang' && info.vx > 1 && info.x > 60.5;
      act({ x: 1, jump: info.grounded || rel, grab: grab && !rel, tap: info.grounded || rel }, 3);
    }
    pullLever(69.6, 'gate1');
    travel(86, 2000);
    // bag onto the button
    // push the beanbag onto the big button, then leave it there
    var pushed = 0;
    while (pushed++ < 280) {
      info = __bob.info();
      var bag = obj('bag');
      if (!info || !bag) break;
      if (sigOn('door1') && bag.x > 89.15 && bag.x < 91.25 && Math.abs(bag.vx) < 0.4) { act({ x: -1, grab: false }, 16); break; }
      if (bag.x > 91.25) {
        if (info.grabName !== 'bag') act({ x: info.x < bag.x - 0.4 ? 1 : -0.2, grab: true }, 4);
        else act({ x: -1, grab: true }, 4);
        continue;
      }
      if (info.x > bag.x - 0.9) act({ x: -1, grab: false }, 3);
      else act({ x: 0.42, grab: false }, 3);
    }
    if (sigOn('door1')) travel(120, 2500);
    var bag = obj('bag');
    return 'l1 bag ' + (bag ? bag.x.toFixed(1) + ' v' + bag.vx.toFixed(1) : '?') + ' door ' + sigOn('door1');
  }
  function level2() {
    travel(19.6, 2000);
    var guard = 0, info;
    while (guard++ < 50 && !sigOn('post')) act({ x: -1, grab: true }, 3);
    act({ x: 0, grab: false }, 8);
    hopToward(16.5, 8);
    guard = 0;
    while (guard++ < 280) { var ball = obj('ball'); if (ball && ball.x > 29) break; act({ x: 0 }, 4); }
    hopToward(41.5, 12);
    for (var j = 0; j < 36; j++) { info = __bob.info(); act({ x: -1, jump: info.grounded, tap: true }, 4); if (sigOn('door2')) break; }
    guard = 0;
    while (guard++ < 80 && !sigOn('door2')) act({ x: -0.4, jump: __bob.info().grounded, tap: true }, 4);
    guard = 0;
    while (guard++ < 300) {
      info = __bob.info();
      if (!info || sigOn('pad') || info.x > 60) break;
      var crate = obj('crate');
      if (crate && info.grabName !== 'crate') { hopToward(crate.x, 8); act({ x: 0.3, grab: true }, 8); }
      else act({ x: 1, grab: !!crate }, 5);
    }
    travel(68, 2000);
    // heavy ball down the slide: push it
    guard = 0;
    while (guard++ < 300) {
      info = __bob.info();
      if (!info || sigOn('bridge') || info.x > 92) break;
      act({ x: 1, jump: info.grounded && edgeDist(info.x, surf(info.x) || 0) < 1 }, 4);
    }
    travel(110, 2000);
    var ball = obj('ball'), big = obj('bigball');
    return 'l2 ball ' + (ball ? ball.x.toFixed(1) : '?') + ' big ' + (big ? big.x.toFixed(1) : '?') + ' door2 ' + sigOn('door2') + ' pad ' + sigOn('pad') + ' bridge ' + sigOn('bridge');
  }
  return { play: play };
})();
