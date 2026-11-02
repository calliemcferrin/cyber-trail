'use strict';
/**
 * Slow, dense "digital rain" background — columns of falling green binary (0/1)
 * and hexadecimal (0-9 A-F) characters.
 *
 * Tuned so a character takes ~90 SECONDS to travel top→bottom (time-based, so
 * it's the same on any frame rate / screen size), with a dense field of
 * columns. Deliberately low-contrast so it never competes with the UI text.
 *
 * Respects prefers-reduced-motion (one static frame, no animation).
 */
(function () {
  var canvas = document.getElementById('matrix');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var CHARS = '01010101ABCDEF23456789'.split(''); // weighted toward binary
  var FONT_SIZE = 16;
  var FALL_SECONDS = 90; // time for a character to cross the screen top→bottom

  var W = 0, H = 0;
  var cols = 0, rows = 0;
  var velocity = 0;        // px per second (derived from FALL_SECONDS)
  var colOffset = [];      // current vertical pixel offset per column
  var colChars = [];       // array of characters per column (the stream)
  var colHeadRow = [];     // which row index is the current "head" (brightest)

  function rand(n) { return (Math.random() * n) | 0; }
  function randChar() { return CHARS[rand(CHARS.length)]; }

  function sizeToWindow() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(W / FONT_SIZE);
    rows = Math.ceil(H / FONT_SIZE) + 2;
    velocity = H / FALL_SECONDS; // px/sec → ~90s to fall the full height

    colOffset = [];
    colChars = [];
    colHeadRow = [];
    for (var c = 0; c < cols; c++) {
      colOffset[c] = rand(FONT_SIZE);               // sub-row phase
      colChars[c] = [];
      for (var r = 0; r < rows + 2; r++) colChars[c][r] = randChar();
      colHeadRow[c] = rand(rows);                   // head somewhere in the column
    }
  }

  function render(scrollRows) {
    // Clear fully each frame (crisp characters, no smear) on near-black.
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    ctx.font = FONT_SIZE + 'px ui-monospace, "Courier New", monospace';
    ctx.textBaseline = 'top';

    for (var c = 0; c < cols; c++) {
      var x = c * FONT_SIZE;
      // whole-pixel vertical scroll for this column
      var shift = colOffset[c];
      for (var r = 0; r < rows + 1; r++) {
        var ch = colChars[c][r];
        var y = r * FONT_SIZE + (shift % FONT_SIZE) - FONT_SIZE;
        // distance (in rows) from this column's head → brightness falloff
        var dist = Math.abs(r - colHeadRow[c]);
        var alpha;
        if (dist === 0) alpha = 0.9;        // bright head
        else if (dist <= 2) alpha = 0.4;    // near trail
        else if (dist <= 5) alpha = 0.18;   // mid trail
        else alpha = 0.08;                  // faint body (dense field)
        ctx.fillStyle = dist === 0
          ? 'rgba(170, 255, 195, ' + alpha + ')'
          : 'rgba(91, 255, 122, ' + alpha + ')';
        ctx.fillText(ch, x, y);
      }
    }
  }

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var lastTs = 0;
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    var dt = (ts - lastTs) / 1000; // seconds since last frame
    lastTs = ts;

    // Advance every column by velocity*dt pixels. When a column has scrolled a
    // full row, shift its character array down one and advance the head so the
    // bright point moves down at the same 90s pace.
    for (var c = 0; c < cols; c++) {
      colOffset[c] += velocity * dt;
      while (colOffset[c] >= FONT_SIZE) {
        colOffset[c] -= FONT_SIZE;
        // shift stream down by one, new random char enters at top
        colChars[c].pop();
        colChars[c].unshift(randChar());
        colHeadRow[c] += 1;
        if (colHeadRow[c] > rows) colHeadRow[c] = 0; // wrap head to top
      }
    }
    render();
    requestAnimationFrame(loop);
  }

  function start() {
    sizeToWindow();
    if (reduceMotion) {
      render();
      return;
    }
    requestAnimationFrame(loop);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { lastTs = 0; sizeToWindow(); }, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
