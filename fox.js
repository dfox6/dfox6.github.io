// A fox drawn by spinning circles (a Fourier series).
// The outline below is one closed line; the code takes its discrete Fourier
// transform, then adds up the terms as circles rotating at different speeds.
// The pen on the end of the last circle traces the fox. Click to redraw.
(function () {
  const canvas = document.getElementById('fox');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Fox head, front view, in a 200 x 200 box (y points down).
  const OUTLINE = [
    [100,182],[93,179],[91,173],[96,170],[100,171],                         // nose
    [94,140],[86,106],[78,98],[66,97],[72,105],[86,106],[94,140],[100,171],   // left eye
    [106,140],[114,106],[122,98],[134,97],[128,105],[114,106],[106,140],[100,171], // right eye
    [104,170],[109,173],[107,179],[100,182],                                // nose
    [90,175],[80,163],[68,153],[52,147],[28,141],[44,133],[22,123],[40,117],[27,105], // left cheek
    [40,92],[42,74],[34,52],[26,26],[22,6],[42,16],[62,32],[75,46],          // left ear
    [86,52],[100,55],[114,52],                                              // forehead
    [125,46],[138,32],[158,16],[178,6],[174,26],[166,52],[158,74],[160,92],  // right ear
    [173,105],[160,117],[178,123],[156,133],[172,141],[148,147],[132,153],[120,163],[110,175] // right cheek
  ];

  const N = 320;          // samples along the outline = number of circles
  const DRAW_SECONDS = 14; // time for one full trip around the fox

  // Resample the outline into N evenly spaced points, centered on the origin.
  function resample(pts, n) {
    const closed = pts.concat([pts[0]]);
    const seg = [];
    let total = 0;
    for (let i = 0; i < closed.length - 1; i++) {
      const d = Math.hypot(closed[i + 1][0] - closed[i][0], closed[i + 1][1] - closed[i][1]);
      seg.push(d);
      total += d;
    }
    const out = [];
    let i = 0, acc = 0;
    for (let k = 0; k < n; k++) {
      const target = (k / n) * total;
      while (acc + seg[i] < target) { acc += seg[i]; i++; }
      const t = seg[i] ? (target - acc) / seg[i] : 0;
      out.push([
        closed[i][0] + t * (closed[i + 1][0] - closed[i][0]) - 100,
        closed[i][1] + t * (closed[i + 1][1] - closed[i][1]) - 94
      ]);
    }
    return out;
  }

  // Discrete Fourier transform: one rotating circle per frequency.
  function dft(z) {
    const n = z.length, terms = [];
    for (let k = 0; k < n; k++) {
      const freq = k <= n / 2 ? k : k - n;
      let re = 0, im = 0;
      for (let j = 0; j < n; j++) {
        const a = (2 * Math.PI * freq * j) / n;
        re += z[j][0] * Math.cos(a) + z[j][1] * Math.sin(a);
        im += z[j][1] * Math.cos(a) - z[j][0] * Math.sin(a);
      }
      re /= n; im /= n;
      terms.push({ freq, r: Math.hypot(re, im), phase: Math.atan2(im, re) });
    }
    return terms.sort((a, b) => b.r - a.r);
  }

  const points = resample(OUTLINE, N);
  const terms = dft(points);

  let size = 0, scale = 1, colors = {};
  let startTime = 0, pausedAt = 0, raf = 0, running = false, visible = true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dark = window.matchMedia('(prefers-color-scheme: dark)');

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    colors = {
      circle: s.getPropertyValue('--circle').trim(),
      arm: s.getPropertyValue('--arm').trim(),
      ink: s.getPropertyValue('--fox').trim()
    };
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    size = canvas.clientWidth;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = size / 205;
  }

  function frame(progress, showCircles) {
    const c = size / 2;
    const t = progress * 2 * Math.PI;
    ctx.clearRect(0, 0, size, size);

    // The traced fox so far (the samples are exactly where the series lands).
    const upto = Math.min(N, Math.floor(progress * N));
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= upto && i < N; i++) {
      const x = c + points[i][0] * scale, y = c + points[i][1] * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }

    // Walk the chain of circles to find where the pen is right now.
    let x = c, y = c;
    const chain = [];
    for (const term of terms) {
      const r = term.r * scale;
      const a = term.freq * t + term.phase;
      const nx = x + r * Math.cos(a), ny = y + r * Math.sin(a);
      chain.push([x, y, r, nx, ny]);
      x = nx; y = ny;
    }
    if (progress >= 1) ctx.closePath(); else ctx.lineTo(x, y);
    ctx.stroke();

    if (!showCircles) return;

    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.circle;
    ctx.beginPath();
    for (const [cx, cy, r] of chain) {
      if (r < 0.8) break; // the rest are too small to see
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    }
    ctx.stroke();

    ctx.strokeStyle = colors.arm;
    ctx.beginPath();
    ctx.moveTo(chain[0][0], chain[0][1]);
    for (const [, , r, nx, ny] of chain) {
      if (r < 0.8) break;
      ctx.lineTo(nx, ny);
    }
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  function tick(now) {
    if (!startTime) startTime = now;
    const elapsed = (now - startTime) / 1000;
    const loops = elapsed / DRAW_SECONDS;
    // First trip draws the fox; after that the circles keep tracing over it.
    if (loops < 1) frame(loops, true);
    else drawPenOnly(loops % 1);
    raf = requestAnimationFrame(tick);
  }

  // After the first trip: full fox stays, circles keep spinning on top.
  function drawPenOnly(progress) {
    const c = size / 2, t = progress * 2 * Math.PI;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = c + points[i][0] * scale, py = c + points[i][1] * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    let x = c, y = c;
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.circle;
    ctx.beginPath();
    const arm = [[x, y]];
    for (const term of terms) {
      const r = term.r * scale;
      const a = term.freq * t + term.phase;
      if (r >= 0.8) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 2 * Math.PI); }
      x += r * Math.cos(a); y += r * Math.sin(a);
      if (r >= 0.8) arm.push([x, y]);
    }
    ctx.stroke();
    arm.push([x, y]);
    ctx.strokeStyle = colors.arm;
    ctx.beginPath();
    arm.forEach(([ax, ay], i) => (i ? ctx.lineTo(ax, ay) : ctx.moveTo(ax, ay)));
    ctx.stroke();
    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  function play() {
    if (running || !visible) return;
    running = true;
    // Pick up where it left off after scrolling away and back.
    if (startTime && pausedAt) startTime += performance.now() - pausedAt;
    pausedAt = 0;
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    if (running) pausedAt = performance.now();
    running = false;
    cancelAnimationFrame(raf);
  }
  function restart() {
    pause();
    startTime = 0;
    pausedAt = 0;
    if (reduceMotion.matches) { frame(1, false); return; }
    play();
  }

  canvas.addEventListener('click', restart);
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); restart(); }
  });

  // Only animate while the fox is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (reduceMotion.matches) return;
      if (visible) play(); else pause();
    }).observe(canvas);
  }

  window.addEventListener('resize', () => { resize(); if (!running) frame(1, false); });
  if (dark.addEventListener) dark.addEventListener('change', () => { readColors(); if (!running) frame(1, false); });

  readColors();
  resize();
  if (reduceMotion.matches) frame(1, false);
  else play();
})();
