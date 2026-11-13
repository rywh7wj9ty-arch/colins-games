// Fixed-step solver. The page must be holding the animation loop (__b19.hold(1))
// so every input is applied for an exact number of 1/120 s steps.
// BOT.run() finishes the level that is already running.
window.BOT = (function () {
  var BUDGET = 90000, T = 0, LOG = [];
  function say(s) { LOG.push(s); }
  function info() { return __bob.info(); }
  function I2() { return __bob.info2(); }
  function sig(n) { var s = (info() || {}).signals || {}; return !!s[n]; }
  function obj(name) {
    var list = (info() || {}).objs || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }
  function step(n, d) {
    d = d || {};
    var last = null;
    for (var i = 0; i < n; i++) {
      if (T++ > BUDGET) return info();
      __b19.drive({ x: d.x || 0, jump: !!d.jump, grab: !!d.grab, tap: !!(d.tap && i === 0) });
      last = __b19.tick(1);
      if (last && last.finished) return last;
    }
    return last || info();
  }
  function grace() { var g = 0; while ((__b19.grace() || 0) > 0.02 && g++ < 200) step(1, { x: 0 }); }
  function surf(x) { return __b19.surf(x); }
  function gapAt(x, base) {
    // A floor is landable even when it is lower, and even when a pit sensor
    // overlaps it (the cotton-reel posts stand inside the pit). Only empty
    // air is a gap.
    var start = null, d, s;
    for (d = 0.2; d <= 9; d += 0.2) {
      s = surf(x + d);
      if (s === null && start === null) start = d;
      if (s !== null && start !== null) return { at: start, w: +(d - start).toFixed(2) };
    }
    return start === null ? null : { at: start, w: 99 };
  }
  function holdFor(w) {
    var on = !!(__b19.flags() || {}).hop;
    if (w < 1.55) return on ? 2 : 8;
    if (w < 2.15) return on ? 8 : 16;
    if (w < 2.9) return on ? 16 : 30;
    if (w < 3.7) return on ? 30 : 46;
    return on ? 42 : 58;
  }
  function wallAt(x, base) {
    var d, s;
    for (d = 0.35; d <= 2.2; d += 0.15) {
      s = surf(x + d);
      if (s !== null && s < base - 0.55 && !__b19.pit(x + d, 0.9)) return { d: d, h: base - s };
    }
    return null;
  }
  // Run to tx. One tap starts a jump; holding jump (no second tap) sets the height.
  // Wide pits are left for the rope / zip / bridge handler, so we stop at the lip.
  function goTo(tx, opt) {
    opt = opt || {};
    var dir = tx >= ((info() || {}).x || 0) ? 1 : -1;
    if (opt.dir) dir = opt.dir;
    var guard = 0, stall = 0, last = (info() || {}).x || 0, i, base, gap, wall, grab;
    while (guard++ < (opt.max || 3500)) {
      i = info();
      if (!i || i.finished) return i;
      if (dir > 0 && i.x >= tx - 0.3) return i;
      if (dir < 0 && i.x <= tx + 0.3) return i;
      if (dir < 0 && surf(i.x - 0.55) === null) { i.blocked = true; return i; }
      if ((__b19.grace() || 0) > 0.02) { step(1, { x: 0 }); continue; }
      if (Math.abs(i.x - last) < 0.03) { if (++stall > 45) { i.blocked = true; return i; } }
      else { stall = 0; last = i.x; }
      base = surf(i.x); if (base === null) base = 0;
      gap = dir > 0 ? gapAt(i.x, base) : null;
      wall = dir > 0 ? wallAt(i.x, base) : null;
      grab = i.grab === 'hang' || i.cand === 'rope' || i.cand === 'zip';
      if (i.grab === 'hang') {
        var release = (i.vx || 0) * dir > 1.1 && i.vy > -1.4;
        step(2, { x: dir, grab: !release, jump: release, tap: release });
        continue;
      }
      if (gap && gap.w > 4.8 && gap.at < 0.55) {
        step(2, { x: gap.at < 0.35 ? -dir : 0 });
        i.blocked = true;
        return i;
      }
      if (i.grounded && gap && gap.w <= 4.8 && gap.at < 0.42) {
        if ((i.vx || 0) * dir < 5.1 && gap.at > 0.22 && surf(i.x - dir * 1.4) !== null) { step(10, { x: -dir }); continue; }
        var h = opt.holdJump ? 10 : holdFor(gap.w);
        step(1, { x: dir, jump: true, grab: grab, tap: true });
        if (h) step(h, { x: dir, jump: true, grab: grab });
        step(4, { x: dir, grab: grab });
        continue;
      }
      if (i.grounded && wall && wall.d < 0.85 && wall.h >= 0.7 && wall.h <= 1.7) {
        step(1, { x: dir, jump: true, tap: true });
        step(wall.h > 1.2 ? 22 : 12, { x: dir, jump: true });
        continue;
      }
      if (opt.holdJump && i.grounded) { step(2, { x: dir, jump: true, tap: true }); continue; }
      step(3, { x: dir, grab: grab });
    }
    return info();
  }
  // Cross a row of platforms whose centres are in spots. The hold is learned per
  // platform, so the same script lands with the soft hop and the v1.8 hop.
  function hopOnce(tx, holdN) {
    var peak = (info() || {}).x || 0, deaths0 = (info() || {}).deaths || 0, guard = 0, i, base, gap;
    function died(q) { return q && q.deaths > deaths0; }
    while (guard++ < 450) {
      i = info();
      if (!i || i.finished) return { i: i, peak: peak };
      if (died(i)) return { i: i, peak: peak, died: true };
      if (i.x >= tx - 0.45 && i.grounded && i.y < 1.2) return { i: i, peak: Math.max(peak, i.x), ok: true };
      peak = Math.max(peak, i.x);
      if ((__b19.grace() || 0) > 0.02) { step(1, { x: 0 }); continue; }
      base = surf(i.x); if (base === null) base = 0;
      gap = i.grounded ? gapAt(i.x, base) : null;
      if (i.grounded && gap && gap.at < 0.42 && (gap.w < 8 || tx - i.x < 4.6)) {
        var h = holdN;
        if ((i.vx || 0) < 5.0 && surf(i.x - 1.3) !== null) { step(12, { x: -1 }); continue; }
        if ((i.vx || 0) < 3.4) h = Math.min(56, h + 10);
        step(1, { x: 1, jump: true, tap: true });
        if (h > 0) step(h, { x: 1, jump: true });
        var a = 0;
        while (a++ < 170) {
          i = step(1, { x: 1 });
          if (!i || i.finished) return { i: i, peak: peak };
          peak = Math.max(peak, i.x);
          if (died(i)) return { i: i, peak: peak, died: true };
          if (i.grounded && a > 6) return { i: i, peak: peak };
        }
        return { i: info(), peak: peak };
      }
      step(2, { x: 1 });
    }
    return { i: info(), peak: peak };
  }
  function doSpots(spots, xe) {
    if (!spots || !spots.length) return goTo((xe || 0) - 0.4);
    var holds = [], k;
    for (k = 0; k < spots.length; k++) holds.push(__b19.flags().hop ? 4 : 8);
    var tries = 0, i, idx, res, tx;
    while (tries++ < spots.length * 12) {
      i = info();
      if (!i || i.finished) return i;
      grace();
      i = info();
      idx = -1;
      for (k = 0; k < spots.length; k++) if (i.x < spots[k][0] - 0.45) { idx = k; break; }
      if (idx < 0) break;
      tx = spots[idx][0];
      res = hopOnce(tx, holds[idx]);
      if (!res.i || res.i.finished) return res.i;
      grace();
      i = info();
      if (i.x >= tx - 0.55) continue;
      if (res.peak > tx + 0.2) { holds[idx] = Math.max(0, holds[idx] - 3); say('over ' + idx + ' h' + holds[idx]); }
      else { holds[idx] = Math.min(56, holds[idx] + 4); say('under ' + idx + ' h' + holds[idx]); }
    }
    return goTo((xe || spots[spots.length - 1][0]) - 0.3, { max: 2000 });
  }
  function pull(x, sigName) {
    goTo(x + 0.45);
    var g = 0, i;
    while (g++ < 90) {
      i = step(2, { x: -0.45, grab: true });
      if (!i || i.finished) return i;
      if (!sigName || sig(sigName)) break;
      var ls = __b19.levers(), k;
      for (k = 0; k < ls.length; k++) if ((!sigName || ls[k].sig === sigName) && ls[k].on) { g = 999; break; }
    }
    step(6, { x: 0.4, grab: false });
    return info();
  }
  function toggleAt(x) {
    goTo(x - 0.2);
    // a fresh grab flips the switch; don't hold it or it flips back
    step(2, { x: 0.2, grab: false });
    step(6, { x: 0, grab: true });
    step(8, { x: 0.3, grab: false });
    return info();
  }
  function pass(r) { return goTo((r.xe || r.x2 || 0) - 0.4, { max: 5000 }); }

  function doRopes(r) {
    var anchors = r.anchors || [], land = r.land || (r.xe - 2), a = 0, g = 0, i, cool = 0, relX = -1, hung = 0;
    goTo((r.edge || r.xs) - 1.5, { max: 2500 });
    while (g++ < 1600) {
      i = info();
      if (!i || i.finished) return i;
      if (i.grounded && i.y < -1 && i.x > land - 0.3 && i.x < land + 8) return pass(r);
      if ((__b19.grace() || 0) > 0.02) { step(1, { x: 0 }); cool = 0; hung = 0; continue; }
      var canGrab = a < anchors.length && (relX < 0 || i.x > relX + 2.6);
      if (i.grab === 'hang') hung++; else if (cool <= 0) hung = 0;
      // jump while grab is still held: that is the swing boost. Let go at the
      // front of the swing, where the ribbon has slowed, so the boost reaches the next one.
      var go = i.grab === 'hang' && a < anchors.length && hung > 8 && i.x > anchors[a] - 0.8 && i.vx > 0.6 && i.vx < 2.6 && i.vy > -2;
      if (cool > 0) { cool--; step(1, { x: 1, grab: false, jump: true }); continue; }
      if (go) { relX = anchors[a]; step(1, { x: 1, jump: true, tap: true, grab: true }); a++; hung = 0; if (a < anchors.length) cool = 14; continue; }
      if (i.grab === 'hang') { step(2, { x: 1, grab: true }); continue; }
      if (i.grounded && i.y < -1.5 && i.x < (r.edge || 0) + 0.5) {
        if (i.x < r.edge - 0.45) step(2, { x: 1 });
        else { step(1, { x: 1, jump: true, tap: true, grab: true }); step(46, { x: 1, jump: true, grab: true }); }
        continue;
      }
      step(2, { x: 1, grab: canGrab, jump: a >= anchors.length });
    }
    return info();
  }
  function doZip(r) {
    var stand = (r.tower || r.x1) + 1.15, tries = 0, g, i, riding;
    while (tries++ < 5) {
      i = info();
      if (i && i.x < stand - 0.4) goTo(stand, { max: 2000 });
      i = info();
      if (!i || i.finished) return i;
      if (i.grabName !== 'zip') {
        if (i.grounded && i.x < (r.x1 || stand) + 0.4) {
          step(1, { x: 1, jump: true, tap: true, grab: true });
          step(40, { x: 1, jump: true, grab: true });
        } else step(6, { x: 1, grab: true });
      }
      riding = false; g = 0;
      while (g++ < 600) {
        i = info();
        if (!i || i.finished) return i;
        if (i.grabName === 'zip') riding = true;
        if (i.x > (r.land || r.x2) - 1.4) { step(8, { x: 1, grab: false, jump: true, tap: true }); return pass(r); }
        if (riding && i.grab !== 'hang') { if (i.grounded && i.x > (r.land || 0) - 3) return pass(r); break; }
        if (!riding && i.grounded && i.y > -1.5) break;
        step(3, { x: 1, grab: true });
      }
    }
    return info();
  }
  function doPlanks(r) {
    goTo((r.x1 || r.xs) - 0.5, { max: 2000 });
    var g = 0, i;
    while (g++ < 500) {
      i = info();
      if (!i || i.finished) return i;
      if (i.x > (r.x2 || 0) + 0.7) return pass(r);
      if ((__b19.grace() || 0) > 0.02) { step(1, { x: 0 }); continue; }
      step(3, { x: 0.65 });
    }
    return info();
  }
  function doBoing(r) {
    goTo((r.pad || r.band || r.xs) - 0.2, { max: 2500 });
    var g = 0, i, top = -(r.h || 4);
    while (g++ < 400) {
      i = info();
      if (!i || i.finished) return i;
      if (i.grounded && i.y < top + 1.35 && i.x > (r.wall || 0) - 0.2) break;
      if (i.grounded && i.x > (r.wall || 0) + (r.h ? 2.4 : 2) && g > 8) break;
      if ((__b19.grace() || 0) > 0.02) { step(1, { x: 0 }); continue; }
      // jump held as the pad (or band) launches, so the boost is the tall one
      step(2, { x: i.x < (r.wall || 0) + 1.5 ? 1 : 0.3, jump: true });
    }
    return pass(r);
  }
  function moverBy(mvs, name) { var k; for (k = 0; k < mvs.length; k++) if (mvs[k].name === name) return mvs[k]; return null; }
  function doRide(r) {
    var edge = r.edge || r.xs, land = r.land || (r.xe - 1), stops = r.stops || [], names = r.names || [];
    var g = 0, i, mvs, on, cur, nxt, si, k, best, bd, d;
    if (((info() || {}).x || 0) > land - 0.2) return pass(r);
    goTo(edge - 0.35, { max: 2500 });
    while (g++ < 1800) {
      i = info();
      if (!i || i.finished) return i;
      if (i.x > land + 0.15) return pass(r);
      if ((__b19.grace() || 0) > 0.02) { step(1, { x: 0 }); continue; }
      mvs = (I2().movers) || []; on = I2().on; cur = moverBy(mvs, on);
      si = 0;
      if (cur) for (k = 0; k < names.length; k++) if (names[k] === cur.name) si = k;
      if (on && cur && stops[si]) {
        var right = stops[si][1], last = si >= names.length - 1;
        nxt = last ? null : moverBy(mvs, names[si + 1]);
        var behind = cur.x - i.x;
        if (last && cur.x > right - 0.7 && behind < 0.5) step(2, { x: 1 });
        else if (!last && nxt && nxt.y < cur.y - 0.35 && cur.x > right - 1.2 && Math.abs(nxt.x - i.x) < 2.4 && behind < 0.7) {
          if (i.grounded) { step(1, { x: 1, jump: true, tap: true }); step(18, { x: 1, jump: true }); }
          else step(2, { x: 1 });
        } else if (!last && nxt && cur.x > right - 0.45 && nxt.x < stops[si + 1][0] + 1.3 && behind < 0.55 && behind > -0.8) step(2, { x: 1 });
        else step(2, { x: behind > 0.25 ? 1 : behind < -0.3 ? -0.45 : (cur.dir < 0 ? -0.15 : 0.2) });
      } else if (i.x > land - 1) step(3, { x: 1 });
      else {
        best = null; bd = 99;
        for (k = 0; k < names.length; k++) {
          var m = moverBy(mvs, names[k]);
          if (!m || !stops[k] || m.x > stops[k][0] + 1.35 || m.y < -0.45) continue;
          d = Math.abs(m.x - i.x);
          if (d < bd) { bd = d; best = m; }
        }
        if (best && best.x < i.x + 2.6) step(2, { x: i.x < best.x - 0.2 ? 0.8 : 0.2 });
        else step(2, { x: i.x > edge + 0.15 ? -0.2 : 0.2 });
      }
    }
    return info();
  }
  function doLift(r) {
    if (r.pe) doCan(r);
    var cx = r.cx || r.xs, top = r.top || -4, name = r.name, g = 0, i, mvs, mv, k, on;
    i = info();
    if (i && i.grounded && i.y < top + 1.2 && i.x > (r.wall || cx)) return pass(r);
    if (i && i.x > cx + 0.3) { step(1, { x: -1, jump: true, tap: true }); step(28, { x: -1, jump: true }); }
    goTo(cx - 2.05, { max: 2200 });
    while (g++ < 1400) {
      i = info();
      if (!i || i.finished) return i;
      if (i.grounded && i.y < top + 1.2 && i.x > (r.wall || cx) - 0.1) break;
      if ((__b19.grace() || 0) > 0.02) { step(1, { x: 0 }); continue; }
      mvs = (I2().movers) || []; mv = null;
      for (k = 0; k < mvs.length; k++) if (mvs[k].name === name) mv = mvs[k];
      on = I2().on === name;
      if (on) step(2, { x: i.y < top + 1.35 ? 1 : (Math.abs(i.x - cx) < 0.3 ? 0 : (i.x < cx ? 0.3 : -0.3)) });
      else if (mv && mv.y > -0.22 && i.x < cx + 0.25) step(2, { x: i.x < cx - 0.15 ? 0.9 : 0.1 });
      else if (i.x > cx - 1.7) step(2, { x: -0.45 });
      else step(2, { x: 0.2 });
    }
    return pass(r);
  }
  function doTimed(r) {
    var g = 0, i;
    while (g++ < 4) {
      goTo((r.btn || r.xs) - 0.1, { max: 1500 });
      step(6, { x: 0 });
      if (!sig(r.sig)) step(16, { x: 0 });
      goTo((r.door || r.xe) + 0.8, { max: 900 });
      i = info();
      if (!i || i.finished || i.x > (r.door || 0) + 0.6) return pass(r);
    }
    return info();
  }
  function doBox(r) {
    var name = r.box || 'box', wall = r.wall || ((r.xs || 0) + 9), h = r.h || 2.6, g = 0, i, box;
    while (g++ < 450) {
      i = info(); box = obj(name);
      if (!i || !box || i.finished) break;
      if (box.x > wall - 1.45) break;
      if (i.x > box.x - 0.5) step(3, { x: -1 });
      else step(3, { x: 1 });
    }
    box = obj(name);
    var back = 0;
    while (box && back++ < 40 && (info() || {}).x > box.x - 1.1) step(2, { x: -1 });
    step(1, { x: 1, jump: true, tap: true });
    step(12, { x: 1, jump: true });
    step(4, { x: 0 });
    step(1, { x: 1, jump: true, tap: true });
    step(__b19.flags().hop ? 30 : 42, { x: 1, jump: true });
    step(8, { x: 1 });
    return pass(r);
  }
  function doPistons(r) {
    var names = r.names || [], land = r.land || (r.xe - 1), edge = r.edge || r.xs;
    var g = 0, i, si = 0, mv, nxt, on, prev = {};
    function mvOf(n) { return moverBy((I2() || {}).movers || [], n); }
    while (g++ < 2400 && si <= names.length) {
      i = info();
      if (!i || i.finished) return i;
      if (i.x > land - 0.4) return pass(r);
      mv = si < names.length ? mvOf(names[si]) : null;
      nxt = si + 1 < names.length ? mvOf(names[si + 1]) : null;
      on = (I2() || {}).on;
      if (on && names.indexOf(on) >= 0) si = names.indexOf(on);
      mv = si < names.length ? mvOf(names[si]) : null;
      nxt = si + 1 < names.length ? mvOf(names[si + 1]) : null;
      if (on === names[si] && mv) {
        var last = si === names.length - 1;
        var ny = nxt ? nxt.y : 0, was = nxt ? (prev[names[si + 1]] != null ? prev[names[si + 1]] : ny) : 0;
        if (nxt) prev[names[si + 1]] = ny;
        var up = nxt && ny < -1.45;
        var ready = last || (nxt && ny <= was + 0.002 && ny < (up ? -1.35 : -1.0));
        if (ready && i.grounded && i.y < -0.9) {
          var soft = !!((__b19.flags() || {}).hop);
          step(1, { x: 1, jump: true, tap: true });
          step(last ? (soft ? 10 : 14) : (up ? (soft ? 34 : 44) : (soft ? 22 : 32)), { x: 1, jump: true });
        } else { var dx = mv.x - i.x; step(2, { x: Math.abs(dx) < 0.35 ? 0 : (dx > 0 ? 0.25 : -0.25) }); }
      } else if (i.grounded && mv && mv.y < -1 && i.x > edge - 0.5) {
        var board = !!((__b19.flags() || {}).hop);
        step(1, { x: 1, jump: true, tap: true });
        step(board ? 8 : 12, { x: 1, jump: true });
        var k = 0;
        while (k++ < 40 && info() && !info().grounded) step(1, { x: 0.2 });
      } else if (!i.grounded) step(2, { x: 1 });
      else {
        var near = null, nk;
        for (nk = 0; nk < names.length; nk++) { var pm = mvOf(names[nk]); if (pm && Math.abs(i.x - pm.x) < 1.05) { near = pm; break; } }
        if (near) { var nd = near.x - i.x; step(2, { x: Math.abs(nd) < 0.3 ? 0 : (nd > 0 ? 0.3 : -0.3) }); }
        else step(2, { x: (mv && mv.y < -1) ? 1 : (i.x > edge - 0.95 ? -0.3 : 1) });
      }
    }
    return info();
  }
  function doJelly(r) {
    var edge = r.edge || r.xs, land = r.land || (r.xe - 2), g = 0, i;
    goTo(edge - 0.9, { max: 2000 });
    while (g++ < 30) { i = step(2, { x: 1 }); if (i && i.x > edge - 0.32) break; }
    step(1, { x: 1, jump: true, tap: true });
    step(6, { x: 1, jump: true });
    g = 0;
    while (g++ < 800) {
      i = step(2, { x: 1, jump: true });
      if (!i || i.finished) return i;
      if (i.grounded && i.x > land + 0.2 && i.y < -0.5) return pass(r);
      if ((__b19.grace() || 0) > 0.05) { step(8, { x: 0 }); return info(); }
    }
    return info();
  }
  function doJellyDrop(r) {
    var steps = r.steps || [], g = 0, i, k;
    for (k = 0; k < steps.length; k++) goTo(steps[k] - 0.15, { max: 1400 });
    // run off the top still holding jump; the fall onto the jelly is the bounce
    while (g++ < 450) {
      i = step(2, { x: 1, jump: true });
      if (!i || i.finished) return i;
      if (i.grounded && i.x > (r.wall || 0) - 0.2 && i.y < -(r.h || 4) + 1.4) break;
      if ((__b19.grace() || 0) > 0.05) break;
    }
    return pass(r);
  }
  function doRoll(r) {
    goTo((r.step || r.xs) + 0.8, { max: 2200 });
    step(1, { x: 1, jump: true, tap: true });
    step(40, { x: 1, jump: true });
    step(24, { x: 0 });
    if (((info() || {}).y || 0) > -2.4) {
      goTo((r.step || r.xs) + 0.8, { max: 600 });
      step(1, { x: 1, jump: true, tap: true });
      step(40, { x: 1, jump: true });
      step(24, { x: 0 });
    }
    var g = 0, ball, i;
    while (g++ < 400 && !sig(r.sig)) {
      ball = obj(r.ball); i = info();
      if (!i || !ball) break;
      step(1, { x: i.x > ball.x - 0.5 ? -0.5 : 0.7 });
    }
    var w = 0;
    while (w++ < 180 && !sig(r.sig)) step(2, { x: 0 });
    step(1, { x: 1, jump: true, tap: true });
    step(16, { x: 1, jump: true });
    step(260, { x: 1 });
    step(30, { x: 0 });
    return pass(r);
  }
  function doDomino(r) {
    goTo((r.first || r.xs) - 1.2, { max: 2000 });
    step(14, { x: 1 });
    step(12, { x: -1 });
    var g = 0;
    while (g++ < 400 && !sig(r.sig)) step(2, { x: 0 });
    return pass(r);
  }
  function doSqueeze(r) {
    goTo((r.x1 || r.xs) - 0.4);
    var g = 0, i;
    while (g++ < 250) {
      i = info();
      if (!i || i.finished) return i;
      if (i.x > (r.x2 || 0) + 0.5) break;
      step(3, { x: 1 });
    }
    return pass(r);
  }
  function doBag(r) {
    var g = 0, i, bag, lo = r.btn + 0.45, hi = r.btn + 1.7;
    while (g++ < 400) {
      i = info(); bag = obj(r.bag);
      if (!i || !bag || i.finished) break;
      if (sig(r.sig) && bag.x > lo && bag.x < hi && Math.abs(bag.vx) < 0.45 && i.x < bag.x - 0.7) break;
      if (bag.x > hi) {
        if (i.grabName !== r.bag) step(3, { x: i.x < bag.x - 0.3 ? 1 : -0.3, grab: true });
        else step(3, { x: -1, grab: true });
        continue;
      }
      if (i.x > bag.x - 0.95) step(3, { x: -1 });
      else step(3, { x: 0.4 });
    }
    step(10, { x: -1 });
    return pass(r);
  }
  function doBalloon(r) {
    var top = -(r.h || 5), g = 0, i;
    goTo((r.px || r.xs) - 0.1, { max: 2000 });
    step(1, { x: 0.3, grab: true, jump: true, tap: true });
    while (g++ < 700) {
      i = info();
      if (!i || i.finished) return i;
      if (i.grabName !== r.name && g < 50) { step(2, { x: 0.2, grab: true, jump: !!i.grounded, tap: !!i.grounded }); continue; }
      if (i.y < top + 0.35 && i.x > (r.wall || 0) + 0.3) { step(12, { x: 0.15, grab: false }); break; }
      step(2, { x: i.x < (r.wall || 0) + 1.4 ? 0.4 : 0.05, grab: true });
    }
    g = 0;
    while (g++ < 60) { i = step(2, { x: 0.2 }); if (i && i.grounded) break; }
    return pass(r);
  }
  function doPulley(r) {
    var top = r.top || -3, home = (r.xb || 0) + 1.15, g = 0, i;
    var soft = !!((__b19.flags() || {}).hop);
    goTo((r.xa || home) - 0.55, { max: 2000 });
    step(1, { x: 1, jump: true, tap: true });
    step(soft ? 22 : 28, { x: 1, jump: true });
    step(24, { x: 1 });
    goTo(home, { max: 800 });
    while (g++ < 70 && !sig(r.sig)) step(1, { x: -0.3, grab: true });
    step(3, { x: 0.4, grab: false });
    goTo(home, { max: 400 });
    g = 0;
    while (g++ < 1200) {
      i = info();
      if (!i || i.finished) return i;
      if (i.grounded && i.y < top + 1.4 && i.x > (r.xb || 0) + 0.3) break;
      var dx = home - i.x;
      step(2, { x: Math.abs(dx) < 0.15 ? 0 : (dx > 0 ? 0.4 : -0.4) });
    }
    return pass(r);
  }
  function doCan(r) {
    var lx = r.lx || 0, n = 0, g;
    goTo((r.pe || lx) - 2.2, { max: 2000 });
    step(1, { x: 1, jump: true, tap: true });
    step(18, { x: 1, jump: true });
    step(12, { x: 1 });
    goTo(lx + 0.35, { max: 800 });
    while (n++ < 14 && !sig(r.sig)) {
      g = 0;
      while (g++ < 55 && !sig(r.sig)) step(1, { x: -0.65, grab: true });
      step(4, { x: 0.4, grab: false });
      if (((info() || {}).x || 0) < lx - 0.1) goTo(lx + 0.3, { max: 300 });
    }
    if (r.gate) goTo((r.xe || r.gate + 3) - 0.5, { max: 900 });
    return info();
  }
  function doFan(r) {
    toggleAt(r.tx || r.xs);
    var g = 0, i, h = r.h || 5;
    while (g++ < 450) {
      i = info();
      if (!i || i.finished) return i;
      if (i.y < -h + 1.3 && i.grounded) break;
      step(3, { x: 0.15, jump: !!i.grounded, tap: !!i.grounded });
    }
    return pass(r);
  }
  function doMagnet(r) {
    toggleAt(r.t1);
    var g = 0, tin;
    while (g++ < 600) {
      tin = obj(r.tin);
      if (tin && tin.x > (r.btn || 0) - 0.3) { toggleAt(r.t2 || r.t1); break; }
      step(4, { x: 0 });
    }
    return pass(r);
  }
  function doVelcro(r) {
    var wall = r.wall || r.xs, top = -(r.h || 4), g = 0, i;
    goTo(wall - 1.05, { max: 2000 });
    step(1, { x: 1, jump: true, tap: true });
    step(10, { x: 1, jump: true });
    while (g++ < 600) {
      i = info();
      if (!i || i.finished) return i;
      if (i.grounded && i.y < top + 1.05 && i.x > wall - 0.2) break;
      step(1, { x: 1, jump: true, tap: g % 18 === 0 });
      if ((__b19.grace() || 0) > 0.05) break;
    }
    return pass(r);
  }
  function doTape(r) {
    goTo((r.x1 || r.xs) - 0.3);
    var g = 0, i;
    while (g++ < 350) {
      i = info();
      if (!i || i.finished) return i;
      if (i.x > (r.x2 || 0) + 0.4) break;
      // jump into the tape, then creep right; jump releases
      var on = i.y < -2.2 && !i.grounded;
      step(3, { x: on ? 1 : 0.4, jump: !on && !!i.grounded, tap: !on && !!i.grounded });
    }
    return pass(r);
  }
  function runSeg(r) {
    var t = r.t;
    say(t + ' @' + ((info() || {}).x || 0).toFixed(1));
    if (t === 'hops' || t === 'sprung') return doSpots(r.spots, r.xe);
    if (t === 'squeeze') return doSqueeze(r);
    if (t === 'ropes') return doRopes(r);
    if (t === 'zip') return doZip(r);
    if (t === 'movers') return doRide(r);
    if (t === 'lift' || t === 'potlift') return doLift(r);
    if (t === 'timed') return doTimed(r);
    if (t === 'bagdoor') return doBag(r);
    if (t === 'balloon') return doBalloon(r);
    if (t === 'pulley') return doPulley(r);
    if (t === 'can') return doCan(r);
    if (t === 'fan') return doFan(r);
    if (t === 'fanpush' || t === 'chain2') { toggleAt(r.tx); return pass(r); }
    if (t === 'magnet') return doMagnet(r);
    if (t === 'velcro') return doVelcro(r);
    if (t === 'tape') return doTape(r);
    if (t === 'lever' || t === 'snip' || t === 'marble') {
      pull(r.lx, r.sig);
      var w = 0;
      while (w++ < 160 && ((info() || {}).x || 0) < (r.gate || r.xe || 0) - 0.8) step(2, { x: 1 });
      return pass(r);
    }
    if (t === 'domino') return doDomino(r);
    if (t === 'toybtn') { pull(r.lx, r.sig); var w = 0; while (w++ < 400 && !sig(r.bsig)) step(4, { x: 0 }); return pass(r); }
    if (t === 'beltlever') { pull(r.lx, r.sig); return pass(r); }
    if (t === 'jelly') return doJelly(r);
    if (t === 'jellydrop') return doJellyDrop(r);
    if (t === 'pistons') return doPistons(r);
    if (t === 'boingwall' || t === 'elastic') return doBoing(r);
    if (t === 'planks') return doPlanks(r);
    if (t === 'tea') { goTo(r.p2 - 0.5); step(40, { x: 0.3 }); return pass(r); }
    if (t === 'duck') return pass(r);
    if (t === 'boxwall') return doBox(r);
    if (t === 'rollpin') return doRoll(r);
    if (t === 'chain1') {
      doCan(r);
      var cw = 0;
      while (cw++ < 500 && !sig(r.bsig)) step(4, { x: 0 });
      if (r.end) goTo(r.end, { max: 900 });
      return pass(r);
    }
    if (t === 'tearwall' || t === 'tower') return pass(r);
    return pass(r);
  }

  function level1() {
    say('L1');
    // push the card box up to the wall, then the rest of the ground is open up to the rope pit
    goTo(24, { max: 2500 });
    var g = 0, box;
    while (g++ < 250) {
      box = obj('box');
      var i = info();
      if (!i || !box || box.x > 32.45) break;
      if (i.x > box.x - 0.7) step(3, { x: -1 });
      else step(3, { x: 1 });
    }
    box = obj('box');
    var back = 0;
    while (box && back++ < 40 && (info() || {}).x > box.x - 1.1) step(2, { x: -1 });
    step(1, { x: 1, jump: true, tap: true });
    step(12, { x: 1, jump: true });
    step(4, { x: 0 });
    step(1, { x: 1, jump: true, tap: true });
    step(30, { x: 1, jump: true });
    step(10, { x: 1 });
    // the sponge is the step up onto the deck; pull it out of the cubby first
    goTo(44.4, { max: 2500 });
    var n = 0, sp;
    while (n++ < 120) { var q = info(); if (!q || q.grabName === 'sponge') break; step(2, { x: 0.5, grab: true }); }
    while (n++ < 400) { sp = obj('sponge'); if (!sp || sp.x < 44.3) break; step(2, { x: -1, grab: true }); }
    sp = obj('sponge');
    if (sp) goTo(sp.x - 1.4, { max: 600 });
    step(10, { x: 0 });
    step(1, { x: 1, jump: true, tap: true });
    step(__b19.flags().hop ? 8 : 14, { x: 1, jump: true });
    step(10, { x: 1 });
    step(1, { x: 1, jump: true, tap: true });
    step(__b19.flags().hop ? 36 : 46, { x: 1, jump: true });
    step(10, { x: 1 });
    doRopes({ edge: 58, anchors: [61], xe: 70 });
    pull(69.6, 'gate1');
    goTo(86, { max: 2500 });
    doBag({ bag: 'bag', btn: 88.9, sig: 'door1', door: 96, xe: 112 });
    return info();
  }
  function level2() {
    say('L2');
    // the sprung platforms over the first pit are not in the floor map, so hop their centres
    doSpots([[6.6, 0], [9.6, 0], [12.6, 0], [15.1, -1.3]], 16);
    goTo(21.1, { max: 1200 });
    var g = 0;
    while (g++ < 80 && !sig('post')) step(2, { x: -0.6, grab: true });
    step(4, { x: -1, grab: false });
    goTo(16.3, { max: 600 });
    g = 0;
    while (g++ < 400) { var ball = obj('ball'); if (ball && ball.x > 29.5) break; step(3, { x: (info() || {}).x > 16.8 ? -0.3 : 0 }); }
    // up the steps, across the tower, and a full jump left onto the ruler
    goTo(39.4, { max: 2000 });
    step(10, { x: -1 });
    g = 0;
    var lip = (__b19.flags() || {}).hop ? 39.15 : 38.7;
    while (g++ < 50) { var q = step(1, { x: -1 }); if (q && q.x < lip) break; }
    step(1, { x: -1, jump: true, tap: true });
    step(2, { x: -1, jump: true });
    step(16, { x: -0.3 });
    g = 0;
    while (g++ < 250 && !sig('door2')) step(2, { x: 0 });
    // heavy crate onto the heavy button
    g = 0;
    while (g++ < 400 && !sig('pad')) {
      var crate = obj('crate'), i = info();
      if (!i) break;
      if (!crate) { step(3, { x: 1 }); continue; }
      if (i.x > crate.x - 0.4) step(2, { x: -1 });
      else step(2, { x: 1 });
    }
    // the pad powers the spring; ride it up to the slide and roll the heavy ball
    goTo(58.2, { max: 1500 });
    step(1, { x: 1, jump: true });
    step(30, { x: 1, jump: true });
    g = 0;
    while (g++ < 500 && !sig('bridge')) {
      var big = obj('bigball'), i2 = info();
      if (!i2) break;
      if (big && i2.y > -2) { step(3, { x: 1, jump: !!i2.grounded, tap: true }); continue; }
      if (big && i2.x > big.x - 0.35) step(2, { x: -1 });
      else step(2, { x: 1 });
    }
    goTo(102, { max: 2500 });
    return info();
  }

  function boss101() {
    var g = 0, B, i, best, bd, k, d;
    while (g++ < 2500) {
      i = info(); B = __bob.boss();
      if (!i || (B && B.won) || (i && i.finished)) return i;
      if (!B || !B.extra) { step(4, { x: 0 }); continue; }
      best = 0; bd = 99;
      for (k = 0; k < B.extra.hatches.length; k++) { d = Math.abs(B.x - B.extra.hatches[k]); if (d < bd) { bd = d; best = k; } }
      if (B.state === 'walk' && bd < 1.35) pull(B.extra.leverX[best], null);
      else {
        // dodge tossed spanners by stepping along the lever bank
        var tx = B.state === 'toss' || B.state === 'wind' ? (i.x < 6 ? 8 : 4.2) : B.extra.leverX[best];
        step(4, { x: Math.abs(i.x - tx) < 0.4 ? 0 : (i.x < tx ? 1 : -1), jump: B.state === 'toss' && i.grounded, tap: true });
      }
    }
    return info();
  }
  function boss102() {
    var g = 0, B, i;
    // climb the pink tower and take the zip
    goTo(6.2, { max: 1500 });
    while (g++ < 2000) {
      i = info(); B = __bob.boss();
      if (!i || (B && B.won) || i.finished) return i;
      if (B && B.state === 'tired') {
        if (i.grab) step(4, { x: i.x < B.x ? 1 : -0.2, grab: false, jump: true, tap: true });
        else step(3, { x: i.x < B.x - 0.2 ? 1 : (i.x > B.x + 0.4 ? -1 : 0), jump: i.grounded && i.y > -2, tap: true });
      } else if (i.grab !== 'hang') {
        if (i.y > -2) goTo(6.2, { max: 600 });
        step(3, { x: 0.5, jump: !!i.grounded, grab: true, tap: !!i.grounded });
      } else step(3, { x: 1, grab: true });
    }
    return info();
  }
  function boss103() {
    var g = 0, B, i;
    goTo(6.5, { max: 2000 });
    while (g++ < 2200) {
      i = info(); B = __bob.boss();
      if (!i || (B && B.won) || i.finished) return i;
      if (B && (B.state === 'go' || B.state === 'hungry' || B.state === 'open')) {
        if (!sig('feed')) pull(7.4, 'feed');
        else step(4, { x: i.x < 10 ? 1 : 0 });
      } else {
        // stay on the left shelf, out of the jelly
        step(4, { x: i.x > 8 ? -0.6 : (i.x < 5 ? 0.4 : 0), jump: i.grounded && i.y > -1.5, tap: true });
      }
    }
    return info();
  }
  function boss104() {
    var g = 0, B, i;
    while (g++ < 2000) {
      i = info(); B = __bob.boss();
      if (!i || (B && B.won) || i.finished) return i;
      if (B && B.state === 'march' && B.dir < 0 && B.x > 14 && !sig('mouse')) pull(10.4, 'mouse');
      else step(5, { x: i.x > 7 ? -0.5 : 0.4, jump: B && B.state === 'aim' && i.grounded, tap: true });
    }
    return info();
  }
  function boss105() {
    var g = 0, B, i;
    goTo(9.5, { max: 1500 });
    while (g++ < 2000) {
      i = info(); B = __bob.boss();
      if (!i || (B && B.won) || i.finished) return i;
      if (B && (B.state === 'ahh' || B.state === 'choo') && !sig('fan')) toggleAt(10.6);
      else step(4, { x: i.x < 8 ? 1 : (i.x > 11 ? -0.4 : 0), jump: B && B.state === 'choo' && i.grounded && i.x > 12, tap: true });
    }
    return info();
  }

  function run() {
    T = 0; LOG = [];
    __b19.lives(99);
    grace();
    var i = info();
    if (!i) return { finished: false, err: 'no level', log: LOG };
    var id = i.lvl;
    if (id > 100) {
      if (id === 101) boss101();
      else if (id === 102) boss102();
      else if (id === 103) boss103();
      else if (id === 104) boss104();
      else if (id === 105) boss105();
    } else if (id === 1) level1();
    else if (id === 2) level2();
    else {
      var route = __bob.route() || [], k, seg, attempt, done;
      for (k = 0; k < route.length && T < BUDGET; k++) {
        seg = route[k];
        done = false;
        for (attempt = 0; attempt < 3 && !done && T < BUDGET; attempt++) {
          __b19.lives(99);
          __b19.cpAt((seg.xs || 0) + 1.4);
          step(6, { x: 0 });
          if (attempt) say('retry ' + seg.t + Math.round(seg.xs || 0));
          runSeg(seg);
          grace();
          i = info();
          done = !!(i && (i.finished || (i.y < -0.2 && i.x > (seg.xe || 0) - 1.7)));
        }
        if (!done) { say('give up ' + seg.t + Math.round(seg.xs || 0) + ' x' + ((info() || {}).x || 0).toFixed(1)); break; }
      }
      i = info();
      if (i && !i.finished) {
        var ex = __b19.exit();
        if (ex) goTo(ex.x + 0.2, { max: 4000 });
      }
    }
    // let the finish animation register
    var n = 0;
    while (n++ < 280 && info() && !info().finished && T < BUDGET) step(2, { x: 0.6, jump: true, tap: true });
    i = info() || {};
    var B = __bob.boss();
    return { finished: !!(i.finished || (B && B.won)), t: i.t, got: i.got, total: i.total, x: i.x, deaths: i.deaths, lives: i.lives, ticks: T, log: LOG.slice(-18) };
  }
  function one(k) {
    var route = __bob.route() || [], seg = route[k];
    if (!seg) return { err: 'no seg' };
    T = 0; LOG = [];
    __b19.lives(99);
    __b19.cpAt((seg.xs || 0) + 1.4);
    step(8, { x: 0 });
    runSeg(seg);
    var i = info() || {};
    return { t: seg.t, xe: seg.xe, x: i.x, y: i.y, g: i.grounded, ok: !!(i.finished || (i.y < -0.2 && i.x > (seg.xe || 0) - 1.7)), log: LOG.slice(-4) };
  }
  return { run: run, one: one, log: function () { return LOG; } };
})();
