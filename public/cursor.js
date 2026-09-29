/* Decorative comet trail that follows the real cursor - doesn't replace it,
   just draws a fading glow behind it. Mouse-only, skipped for touch and
   for anyone who has reduced motion turned on. */
(function () {
  "use strict";
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:30;pointer-events:none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const trail = [];
  const LIFE = 450;
  let raf = null;

  function ink() {
    return getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#0b0d12";
  }

  window.addEventListener("pointermove", function (e) {
    trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (trail.length > 24) trail.shift();
    if (!raf) raf = requestAnimationFrame(draw);
  }, { passive: true });

  function draw() {
    const now = performance.now();
    while (trail.length && now - trail[0].t > LIFE) trail.shift();
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const c = ink();
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i], age = (now - p.t) / LIFE, k = (i + 1) / trail.length;
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.globalAlpha = (1 - age) * k * 0.55;
      ctx.shadowColor = c;
      ctx.shadowBlur = 6;
      ctx.arc(p.x, p.y, 1.5 + k * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = trail.length ? requestAnimationFrame(draw) : null;
  }
})();
