// eMAPT Trainer: visual and sound effects (background network, confetti, floating text, beeps).
(function () {
  const FX = {};
  const reduce = () => document.body.classList.contains("no-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Animated background: drifting "network" nodes with links ──
  const canvas = document.getElementById("bg");
  const ctx = canvas.getContext("2d");
  let nodes = [], W = 0, H = 0, mouse = { x: -999, y: -999 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, (W * H) / 16000));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.6 + .6, hue: Math.random() < .5 ? 190 : 260,
    }));
  }
  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of nodes) {
      if (!reduce()) { p.x += p.vx; p.y += p.vy; }
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
        if (d < 15000) {
          ctx.strokeStyle = `hsla(${a.hue},90%,65%,${0.12 * (1 - d / 15000)})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      const glow = md < 140 ? 1 - md / 140 : 0;
      ctx.fillStyle = `hsla(${a.hue},90%,70%,${0.45 + glow * .55})`;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r + glow * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  resize(); tick();

  const layer = () => document.getElementById("fx-layer");

  FX.floatText = function (text, x, y, color = "#a3e635") {
    if (reduce()) return;
    const el = document.createElement("div");
    el.className = "float-txt"; el.textContent = text; el.style.color = color;
    el.style.left = x + "px"; el.style.top = y + "px";
    layer().appendChild(el); setTimeout(() => el.remove(), 1300);
  };

  FX.confetti = function (x = innerWidth / 2, y = innerHeight / 3, count = 80) {
    if (reduce()) return;
    const colors = ["#22d3ee", "#a78bfa", "#f472b6", "#a3e635", "#fbbf24", "#34d399"];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.background = colors[i % colors.length];
      el.style.left = x + "px"; el.style.top = y + "px";
      layer().appendChild(el);
      const ang = Math.random() * Math.PI * 2, v = 6 + Math.random() * 10;
      let vx = Math.cos(ang) * v, vy = Math.sin(ang) * v - 6, px = 0, py = 0, rot = Math.random() * 360, life = 0;
      (function step() {
        life++; vy += .35; vx *= .985; px += vx; py += vy; rot += vx * 2;
        el.style.transform = `translate(${px}px,${py}px) rotate(${rot}deg)`;
        el.style.opacity = String(Math.max(0, 1 - life / 110));
        if (life < 110) requestAnimationFrame(step); else el.remove();
      })();
    }
  };

  // ── Tiny synth beeps (WebAudio): no audio files needed ──
  let actx = null;
  FX.soundOn = true;
  function tone(freq, dur, type = "sine", delay = 0, vol = .06) {
    if (!FX.soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
    } catch (e) { /* audio unavailable */ }
  }
  FX.sfx = {
    right() { tone(660, .12, "triangle"); tone(990, .18, "triangle", .08); },
    wrong() { tone(180, .25, "sawtooth", 0, .04); },
    click() { tone(420, .05, "square", 0, .02); },
    level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, "triangle", i * .1)); },
  };

  FX.countUp = function (el, to, ms = 1200, suffix = "") {
    if (reduce()) { el.textContent = to + suffix; return; }
    const start = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e) + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(start);
  };

  FX.typewriter = function (el, text, speed = 28) {
    if (reduce()) { el.innerHTML = text + '<span class="caret"></span>'; return; }
    let i = 0; el.innerHTML = '<span class="caret"></span>';
    const t = setInterval(() => {
      i++; el.innerHTML = text.slice(0, i) + '<span class="caret"></span>';
      if (i >= text.length || !document.body.contains(el)) clearInterval(t);
    }, speed);
  };

  window.FX = FX;
})();
