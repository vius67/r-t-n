/* Comet-trail cursor that replaces the native pointer. Mouse-only, skipped
   for touch and for anyone who has reduced motion turned on - in both of
   those cases the native cursor is left alone entirely. */
(function () {
  "use strict";
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.documentElement.classList.add("comet-on");

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
  let pos = null;

  function ink() {
    return getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#0b0d12";
  }

  window.addEventListener("pointermove", function (e) {
    pos = { x: e.clientX, y: e.clientY };
    trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (trail.length > 24) trail.shift();
  }, { passive: true });

  window.addEventListener("pointerleave", function () { pos = null; });

  function draw() {
    const now = performance.now();
    while (trail.length && now - trail[0].t > LIFE) trail.shift();
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const c = ink();
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i], age = (now - p.t) / LIFE, k = (i + 1) / trail.length;
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.globalAlpha = (1 - age) * k * 0.5;
      ctx.shadowColor = c;
      ctx.shadowBlur = 6;
      ctx.arc(p.x, p.y, 1.5 + k * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (pos) {
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.globalAlpha = 1;
      ctx.shadowColor = c;
      ctx.shadowBlur = 8;
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
