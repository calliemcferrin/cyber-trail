'use strict';
/**
 * Slow "digital rain" background — columns of falling green binary (0/1) and
 * hexadecimal (0-9 A-F) characters, deliberately SLOW and subtle so it never
 * competes with the readable UI text in front of it.
 *
 * Renders to a full-screen <canvas> fixed behind the app. Respects
 * prefers-reduced-motion (renders a single static frame instead of animating).
 */
(function () {
  var canvas = document.getElementById('matrix');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // Character set: binary + hexadecimal.
  var CHARS = '0101ABCDEF0123456789'.split('');
  var FONT_SIZE = 16;
  var columns = [];           // one "drop" head position (in rows) per column
  var speeds = [];            // per-column fall speed (rows per frame) — slow
  var lastDrawnWidth = 0;
  var lastDrawnHeight = 0;

  function sizeToWindow() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = Math.ceil(w / FONT_SIZE);
    columns = [];
    speeds = [];
    for (var i = 0; i < cols; i++) {
      // start each column at a random height so they don't fall in lockstep
      columns[i] = Math.floor((Math.random() * h) / FONT_SIZE) * -1;
      // SLOW: advance only a fraction of a row per frame (0.10–0.30)
      speeds[i] = 0.10 + Math.random() * 0.20;
    }
    lastDrawnWidth = w;
    lastDrawnHeight = h;
  }

  function randChar() {
    return CHARS[(Math.random() * CHARS.length) | 0];
  }

  function drawFrame() {
    var w = lastDrawnWidth;
    var h = lastDrawnHeight;
    // Translucent black overlay creates the fading trail behind each drop.
    ctx.fillStyle = 'rgba(5, 6, 10, 0.08)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = FONT_SIZE + 'px ui-monospace, "Courier New", monospace';
    for (var i = 0; i < columns.length; i++) {
      var x = i * FONT_SIZE;
      var y = columns[i] * FONT_SIZE;
      if (y > 0) {
        // Head character: brighter green; trail chars are dimmer.
        ctx.fillStyle = 'rgba(140, 255, 170, 0.55)';
        ctx.fillText(randChar(), x, y);
        // a dimmer char a row behind, for a little depth
        ctx.fillStyle = 'rgba(91, 255, 122, 0.18)';
        ctx.fillText(randChar(), x, y - FONT_SIZE);
      }
      columns[i] += speeds[i];
      // When a drop goes off the bottom, respawn it at the top (randomly),
      // so the field stays sparse and ever-changing.
      if (y > h && Math.random() > 0.985) {
        columns[i] = 0;
        speeds[i] = 0.10 + Math.random() * 0.20;
      }
    }
  }

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loop() {
    drawFrame();
    requestAnimationFrame(loop);
  }

  function start() {
    sizeToWindow();
    // Paint an initial solid black so the first fade steps look right.
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, lastDrawnWidth, lastDrawnHeight);
    if (reduceMotion) {
      // One static, faint frame — no animation.
      for (var k = 0; k < 40; k++) drawFrame();
      return;
    }
    requestAnimationFrame(loop);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeToWindow, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
