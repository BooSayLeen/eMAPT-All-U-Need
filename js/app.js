// eMAPT Trainer: app logic (router, progress store, spaced repetition, views).
(function () {
  "use strict";
  const DOMAINS = window.DOMAINS, QUESTIONS = window.QUESTIONS, FX = window.FX;
  const D = Object.fromEntries(DOMAINS.map((d) => [d.key, d]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const view = $("#view");

  // ───────────── Store (localStorage, safely wrapped) ─────────────
  const KEY = "emapt-trainer-v1";
  const fresh = () => ({ xp: 0, cards: {}, streak: { count: 0, last: "" }, exams: [], settings: { sound: true, motion: true }, answered: 0, correct: 0 });
  let S = fresh();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  function applySettings() {
    FX.soundOn = !!S.settings.sound;
    document.body.classList.toggle("no-motion", !S.settings.motion);
  }
  applySettings();

  // ───────────── Leveling ─────────────
  const TITLES = ["Script Kiddie", "APK Explorer", "Manifest Reader", "Smali Whisperer", "Frida Hooker",
    "Pinning Breaker", "IPC Hunter", "API Breaker", "Mobile Pentester", "eMAPT Ready", "MAS Legend"];
  const levelFor = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
  const xpFor = (lvl) => 60 * (lvl - 1) * (lvl - 1);
  const title = (lvl) => TITLES[Math.min(TITLES.length - 1, lvl - 1)];

  function addXP(n, x, y) {
    const before = levelFor(S.xp);
    S.xp += n; save();
    if (x != null) FX.floatText("+" + n + " XP", x, y, "#a3e635");
    const after = levelFor(S.xp);
    renderHud();
    if (after > before) levelUp(after);
  }
  function levelUp(lvl) {
    FX.sfx.level(); FX.confetti(innerWidth / 2, innerHeight / 2, 140);
    const el = document.createElement("div");
    el.className = "levelup";
    el.innerHTML = `<div class="box"><div class="eyebrow">Level up</div><div class="lv grad">LV ${lvl}</div>
      <h2>${esc(title(lvl))}</h2><p class="muted">Tap anywhere to continue</p></div>`;
    el.onclick = () => el.remove();
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
  function renderHud() {
    const lvl = levelFor(S.xp), a = xpFor(lvl), b = xpFor(lvl + 1);
    $("#hud-xp").innerHTML = `<span class="lvl">LV ${lvl}</span> · ${esc(title(lvl))}
      <div class="bar"><i style="width:${Math.round(((S.xp - a) / (b - a)) * 100)}%"></i></div>`;
  }

  function touchStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (S.streak.last === today) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.streak.count = S.streak.last === y ? S.streak.count + 1 : 1;
    S.streak.last = today; save();
  }

  // ───────────── Spaced repetition (Leitner boxes 0–5) ─────────────
  const INTERVAL = [0, 6e4 * 10, 864e5, 864e5 * 3, 864e5 * 7, 864e5 * 16];
  const card = (id) => S.cards[id] || { box: 0, due: 0, right: 0, wrong: 0 };
  function grade(id, ok) {
    const c = card(id);
    if (ok) { c.box = Math.min(5, c.box + 1); c.right++; } else { c.box = 1; c.wrong++; }
    c.due = Date.now() + INTERVAL[c.box];
    S.cards[id] = c; S.answered++; if (ok) S.correct++;
    touchStreak(); save();
  }
  const mastery = (dk) => {
    const qs = QUESTIONS.filter((q) => q.d === dk);
    return qs.reduce((s, q) => s + card(q.id).box / 5, 0) / qs.length;
  };
  const readiness = () => DOMAINS.reduce((s, d) => s + d.weight * mastery(d.key), 0);
  const mastered = () => QUESTIONS.filter((q) => card(q.id).box >= 4).length;
  const weakest = () => DOMAINS.slice().sort((a, b) => b.weight * (1 - mastery(b.key)) - a.weight * (1 - mastery(a.key)))[0];

  // ───────────── Small UI helpers ─────────────
  function ring(pct, label, color = "var(--cyan)", size = 120, stroke = 10) {
    const r = 50 - stroke / 2, C = 2 * Math.PI * r;
    return `<div class="ring" style="--size:${size}px;--rc:${color}">
      <svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="val" cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C}" data-target="${C * (1 - pct / 100)}"/></svg>
      <div class="center"><div><b data-count="${Math.round(pct)}">0</b><small>${label}</small></div></div></div>`;
  }
  function animateRings(root = view) {
    requestAnimationFrame(() => setTimeout(() => {
      $$(".ring .val", root).forEach((c) => (c.style.strokeDashoffset = c.dataset.target));
      $$("[data-count]", root).forEach((el) => FX.countUp(el, +el.dataset.count, 1400, el.dataset.suffix ?? "%"));
      $$("[data-w]", root).forEach((el) => (el.style.width = el.dataset.w));
    }, 60));
  }
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }
  const domTag = (dk) => `<span class="tag" style="--c:${D[dk].color}">${D[dk].icon} ${esc(D[dk].name)}</span>`;

  function radar() {
    const cx = 210, cy = 190, R = 140, n = DOMAINS.length;
    const pt = (i, k) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]; };
    let grid = "";
    [0.25, 0.5, 0.75, 1].forEach((k) => {
      grid += `<polygon points="${DOMAINS.map((_, i) => pt(i, k).join(",")).join(" ")}" fill="none" stroke="rgba(120,160,255,.15)"/>`;
    });
    DOMAINS.forEach((_, i) => { const [x, y] = pt(i, 1); grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(120,160,255,.12)"/>`; });
    const target = DOMAINS.map((_, i) => pt(i, 0.7).join(",")).join(" ");
    const mine = DOMAINS.map((d, i) => pt(i, Math.max(0.04, mastery(d.key))).join(",")).join(" ");
    const labels = DOMAINS.map((d, i) => {
      const [x, y] = pt(i, 1.17);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${d.icon} ${esc(d.short)}</text>`;
    }).join("");
    const dots = DOMAINS.map((d, i) => { const [x, y] = pt(i, Math.max(0.04, mastery(d.key))); return `<circle cx="${x}" cy="${y}" r="4" fill="${d.color}"/>`; }).join("");
    return `<svg viewBox="0 0 420 380" role="img" aria-label="Mastery radar by domain">
      <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".55"/><stop offset="1" stop-color="#a78bfa" stop-opacity=".55"/></linearGradient>
      <linearGradient id="sw" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity="0"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".25"/></linearGradient></defs>
      ${grid}
      <path class="sweep" d="M${cx},${cy} L${cx + R},${cy} A${R},${R} 0 0,0 ${cx + R * Math.cos(-0.5)},${cy + R * Math.sin(-0.5)} Z" fill="url(#sw)"/>
      <polygon points="${target}" fill="none" stroke="#fbbf24" stroke-dasharray="4 4" opacity=".7"/>
      <g class="poly"><polygon points="${mine}" fill="url(#rg)" stroke="#22d3ee" stroke-width="2"/>${dots}</g>
      ${labels}</svg>`;
  }

  // ───────────── Views ─────────────
  const routes = {};
  let cleanup = null;
  function go() {
    if (cleanup) { cleanup(); cleanup = null; }
    const [path, qs] = location.hash.replace(/^#\/?/, "").split("?");
    const name = path || "hq";
    const params = new URLSearchParams(qs || "");
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === name));
    view.classList.remove("view-enter"); void view.offsetWidth; view.classList.add("view-enter");
    (routes[name] || routes.hq)(params);
    scrollTo({ top: 0 });
    renderHud();
  }
  addEventListener("hashchange", go);

  // ── HQ ──
  routes.hq = function () {
    const rd = readiness(), w = weakest(), lvl = levelFor(S.xp);
    const best = S.exams.length ? Math.max(...S.exams.map((e) => e.score)) : null;
    const layers = DOMAINS.map((d) => `<div class="layer" style="--c:${d.color}"><div class="lh"><span>${d.icon} ${esc(d.short)}</span><span>${Math.round(mastery(d.key) * 100)}%</span></div>
      <div class="lb"><i data-w="${Math.max(3, mastery(d.key) * 100)}%"></i></div></div>`).join("");
    view.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow">Mission control · LV ${lvl} ${esc(title(lvl))}</div>
        <h1>Break the app.<br><span class="grad">Pass the eMAPT.</span></h1>
        <p class="terminal-line" id="tw"></p>
        <p class="muted">${QUESTIONS.length} questions across 8 exam domains, spaced repetition that brings back what you miss,
          a timed 45-question mock exam, and a Frida script builder. Your progress stays in this browser.</p>
        <div class="row" style="margin-top:18px">
          <a class="btn" href="#/train">⚔️ Start training</a>
          <a class="btn violet" href="#/exam">⏱️ Mock exam</a>
          <a class="btn ghost" href="#/map">🪐 Explore the map</a>
        </div>
      </div>
      <div class="phone" aria-label="Domain mastery shown on a phone"><div class="screen"><div class="scan"></div>${layers}
        <div class="verdict">${rd >= 70 ? "✅ EXAM READY" : "▶ SCANNING SKILLS…"}</div></div></div>
    </section>

    <div class="grid g4" style="margin-top:28px">
      <div class="card hover stat">${ring(rd, "ready", rd >= 70 ? "#34d399" : "#22d3ee", 96, 10)}<div><div class="lbl">Exam readiness</div><div class="muted" style="font-size:12px">weighted by domain · target 70%</div></div></div>
      <div class="card hover stat"><span class="flame">🔥</span><div><div class="big" data-count="${S.streak.count}" data-suffix="">0</div><div class="lbl">day streak</div></div></div>
      <div class="card hover stat"><span style="font-size:34px">🏆</span><div><div class="big" data-count="${mastered()}" data-suffix="">0</div><div class="lbl">mastered / ${QUESTIONS.length}</div></div></div>
      <div class="card hover stat"><span style="font-size:34px">🎯</span><div><div class="big">${best == null ? "-" : best + "%"}</div><div class="lbl">best mock exam</div></div></div>
    </div>

    <div class="grid g2" style="margin-top:18px">
      <div class="card radar"><div class="eyebrow">Skill radar</div><p class="muted" style="margin:4px 0 0;font-size:13px">Filled = your mastery · dashed = the 70% pass line</p>${radar()}</div>
      <div class="grid" style="align-content:start">
        <div class="card hover mission" style="--c:${w.color}">
          <div class="mi">${w.icon}</div>
          <div style="flex:1"><div class="eyebrow">Next mission</div><h3>${esc(w.name)}</h3>
            <p class="muted" style="margin:0 0 12px">Biggest point gain available: worth ${w.weight}% of the exam, you're at ${Math.round(mastery(w.key) * 100)}%.</p>
            <a class="btn" href="#/train?d=${w.key}">Train ${esc(w.short)} →</a></div>
        </div>
        <div class="card dom-bars"><div class="eyebrow" style="margin-bottom:6px">Exam weight vs your mastery</div>
          ${DOMAINS.map((d) => `<div class="db" style="--c:${d.color}"><span title="${esc(d.name)}">${d.icon}</span>
            <div class="track" title="${esc(d.name)}: ${d.weight}% of exam"><i data-w="${mastery(d.key) * 100}%"></i></div>
            <span class="pct">${d.weight}%</span></div>`).join("")}
        </div>
      </div>
    </div>`;
    const lines = S.answered === 0
      ? "> agent connected. first target: answer 10 questions."
      : `> ${S.answered} answers logged · accuracy ${Math.round((S.correct / S.answered) * 100)}% · keep hooking.`;
    FX.typewriter($("#tw"), lines);
    animateRings();
  };

  // ── MAP ──
  routes.map = function (p) {
    const sel = p.get("d") || "static";
    const n = DOMAINS.length;
    const planets = DOMAINS.map((d, i) => {
      const a = (360 / n) * i, rad = 41; // % of container
      const size = 46 + d.weight * 2.2;
      return `<div class="planet" style="transform:rotate(${a}deg) translate(0,-${rad}%) rotate(-${a}deg);
          left:50%;top:50%">
        <div class="pl-inner"><button style="--c:${d.color};--s:${size}px" data-d="${d.key}" class="${d.key === sel ? "sel" : ""}"
          aria-label="${esc(d.name)}, ${d.weight}% of the exam">${d.icon}</button>
          <div class="pl-label" style="--s:${size}px">${esc(d.short)} · ${d.weight}%</div></div></div>`;
    }).join("");
    view.innerHTML = `
      <div class="eyebrow">The exam universe</div>
      <h1>8 domains. <span class="grad">One orbit.</span></h1>
      <p class="muted">Planet size = weight in the exam. Hover to pause the orbit, click a planet to open its briefing.</p>
      <div class="orbit-wrap" style="margin-top:20px">
        <div class="orbit"><div class="ring-line"></div><div class="ring-line r2"></div>
          <div class="core"><div><b>APK</b>12h · 45 Qs<br>pass 70%</div></div>
          <div class="spin">${planets}</div></div>
        <div class="card dom-panel" id="dp"></div>
      </div>`;
    // keep planets on the ring: convert % translate to px based on container size
    const orbit = $(".orbit");
    function place() {
      const R = orbit.clientWidth * 0.41, k = Math.min(1, orbit.clientWidth / 560);
      $$(".planet", orbit).forEach((pl, i) => {
        pl.querySelectorAll("[style*='--s']").forEach((el) => el.style.setProperty("--s", (46 + DOMAINS[i].weight * 2.2) * k + "px"));
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        pl.style.transform = `translate(${Math.cos(a) * R}px, ${Math.sin(a) * R}px)`;
      });
    }
    place(); addEventListener("resize", place);
    cleanup = () => removeEventListener("resize", place);
    function panel(dk) {
      const d = D[dk], m = mastery(dk), qn = QUESTIONS.filter((q) => q.d === dk).length;
      $("#dp").style.setProperty("--c", d.color);
      $("#dp").innerHTML = `<div class="row" style="justify-content:space-between"><span style="font-size:42px">${d.icon}</span>${ring(m * 100, "mastery", d.color, 90, 9)}</div>
        <h2 style="margin-top:8px">${esc(d.name)}</h2>
        <div class="row"><span class="tag" style="--c:${d.color}">${d.weight}% of exam</span><span class="tag" style="--c:#94a3b8">${qn} questions</span></div>
        <ul>${d.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <a class="btn" href="#/train?d=${dk}">⚔️ Train this domain</a>`;
      $$(".planet button").forEach((b) => b.classList.toggle("sel", b.dataset.d === dk));
      animateRings($("#dp"));
    }
    $$(".planet button").forEach((b) => (b.onclick = () => { FX.sfx.click(); panel(b.dataset.d); }));
    panel(sel);
  };

  // ── TRAIN ──
  routes.train = function (p) {
    const pre = p.get("d");
    let chosen = new Set(pre ? [pre] : DOMAINS.map((d) => d.key)), count = 10, mode = "smart";
    function setup() {
      const due = QUESTIONS.filter((q) => chosen.has(q.d) && card(q.id).box > 0 && card(q.id).due <= Date.now()).length;
      view.innerHTML = `<div class="eyebrow">Training grounds</div><h1>Pick your <span class="grad">targets</span></h1>
        <p class="muted">Smart mode serves questions you got wrong and that are due first, then new ones. Wrong answers come back in 10 minutes, right ones after 1 → 3 → 7 → 16 days.</p>
        <div class="card" style="margin-top:20px">
          <h3>Domains</h3><div class="row" id="chips">${DOMAINS.map((d) => `<span class="chip ${chosen.has(d.key) ? "on" : ""}" style="--c:${d.color}" data-d="${d.key}" role="button" tabindex="0">${d.icon} ${esc(d.short)}</span>`).join("")}</div>
          <h3 style="margin-top:20px">Mode</h3><div class="row" id="modes">
            <span class="chip ${mode === "smart" ? "on" : ""}" data-m="smart" role="button" tabindex="0">🧠 Smart (${due} due)</span>
            <span class="chip ${mode === "random" ? "on" : ""}" data-m="random" role="button" tabindex="0">🎲 Random</span></div>
          <h3 style="margin-top:20px">Length</h3><div class="row" id="lens">${[5, 10, 20].map((n) => `<span class="chip ${count === n ? "on" : ""}" data-n="${n}" role="button" tabindex="0">${n} questions</span>`).join("")}</div>
          <div class="row" style="margin-top:24px"><button class="btn" id="go" ${chosen.size ? "" : "disabled"}>⚔️ Begin run</button>
            <span class="muted" style="font-size:13px">Keys: <span class="kbd">1-4</span> answer · <span class="kbd">Enter</span> next</span></div>
        </div>`;
      const act = (el, fn) => { el.onclick = fn; el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } }; };
      $$("#chips .chip").forEach((c) => act(c, () => { const k = c.dataset.d; chosen.has(k) ? chosen.delete(k) : chosen.add(k); setup(); }));
      $$("#modes .chip").forEach((c) => act(c, () => { mode = c.dataset.m; setup(); }));
      $$("#lens .chip").forEach((c) => act(c, () => { count = +c.dataset.n; setup(); }));
      $("#go").onclick = start;
    }
    function pick() {
      const pool = QUESTIONS.filter((q) => chosen.has(q.d));
      if (mode === "random") return shuffle(pool).slice(0, count);
      const now = Date.now();
      const due = shuffle(pool.filter((q) => card(q.id).box > 0 && card(q.id).due <= now)).sort((a, b) => card(a.id).box - card(b.id).box);
      const fresh = shuffle(pool.filter((q) => card(q.id).box === 0));
      const later = shuffle(pool.filter((q) => card(q.id).box > 0 && card(q.id).due > now)).sort((a, b) => card(a.id).due - card(b.id).due);
      return [...due, ...fresh, ...later].slice(0, count);
    }
    let run, idx, combo, score, keyHandler;
    function start() { run = pick(); idx = 0; combo = 0; score = 0; ask(); }
    function ask() {
      const q = run[idx];
      const order = shuffle([0, 1, 2, 3]);
      view.innerHTML = `<div class="quiz-top"><span class="mono muted">${idx + 1} / ${run.length}</span>
          <div class="progress"><i style="width:${(idx / run.length) * 100}%"></i></div>
          <span class="combo" id="combo">${combo >= 2 ? "🔥 x" + combo : ""}</span></div>
        <div class="card qcard"><div class="row" style="justify-content:space-between">${domTag(q.d)}<span class="muted mono" style="font-size:12px">box ${card(q.id).box}/5</span></div>
          <div class="q">${esc(q.q)}</div>
          <div class="opts">${order.map((oi, k) => `<button class="opt" data-i="${oi}"><span class="k">${k + 1}</span><span>${esc(q.o[oi])}</span></button>`).join("")}</div>
          <div id="after"></div></div>`;
      let done = false;
      function answer(btn) {
        if (done) return; done = true;
        const ok = +btn.dataset.i === q.a;
        $$(".opt").forEach((b) => { b.disabled = true; if (+b.dataset.i === q.a) b.classList.add("right"); });
        const r = btn.getBoundingClientRect();
        grade(q.id, ok);
        if (ok) {
          combo++; score++; FX.sfx.right();
          addXP(10 + (combo >= 3 ? 5 : 0), r.left + r.width / 2 - 40, r.top);
          if (combo > 0 && combo % 5 === 0) { FX.confetti(r.left + r.width / 2, r.top, 70); toast(`🔥 ${combo} in a row!`); }
        } else {
          btn.classList.add("wrong"); combo = 0; FX.sfx.wrong(); addXP(2);
        }
        const cEl = $("#combo"); cEl.textContent = combo >= 2 ? "🔥 x" + combo : ""; cEl.classList.remove("pop"); void cEl.offsetWidth; cEl.classList.add("pop");
        $("#after").innerHTML = `<div class="explain"><b>${ok ? "✅ Correct." : "❌ Not quite."}</b> ${esc(q.e)}</div>
          <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn" id="next">${idx + 1 < run.length ? "Next →" : "Finish run"}</button></div>`;
        $("#next").onclick = next; $("#next").focus({ preventScroll: true });
      }
      $$(".opt").forEach((b) => (b.onclick = () => answer(b)));
      if (keyHandler) removeEventListener("keydown", keyHandler);
      keyHandler = (e) => {
        if (/^[1-4]$/.test(e.key) && !done) answer($$(".opt")[+e.key - 1]);
        else if (e.key === "Enter" && done && document.activeElement !== $("#next")) next();
      };
      addEventListener("keydown", keyHandler);
      cleanup = () => removeEventListener("keydown", keyHandler);
    }
    function next() { idx++; idx < run.length ? ask() : finish(); }
    function finish() {
      removeEventListener("keydown", keyHandler);
      const pct = Math.round((score / run.length) * 100);
      view.innerHTML = `<div class="card" style="text-align:center;padding:40px">
        <div class="eyebrow">Run complete</div><h1>${pct >= 80 ? "Flawless hook. 🪝" : pct >= 60 ? "Solid run." : "Every miss is a lesson."}</h1>
        <div style="display:flex;justify-content:center;margin:24px 0">${ring(pct, "accuracy", pct >= 70 ? "#34d399" : "#f472b6", 160, 10)}</div>
        <p class="muted">${score} / ${run.length} correct. Missed questions are scheduled to come back soon.</p>
        <div class="row" style="justify-content:center;margin-top:16px"><button class="btn" id="again">⚔️ Another run</button><a class="btn ghost" href="#/">🛰️ Back to HQ</a></div></div>`;
      animateRings();
      if (pct >= 80) setTimeout(() => FX.confetti(innerWidth / 2, innerHeight / 3, 120), 600);
      $("#again").onclick = setup;
    }
    setup();
  };

  // ── EXAM ──
  routes.exam = function () {
    let minutes = 90;
    function intro() {
      view.innerHTML = `<div class="eyebrow">Mock exam</div><h1>The <span class="grad">45-question</span> gauntlet</h1>
        <div class="grid g2" style="margin-top:20px">
          <div class="card"><h3>Rules of engagement</h3>
            <ul class="muted"><li>45 questions drawn by real exam weight (Static 9 · Dynamic 9 · API 7 · …)</li>
            <li>No explanations until you submit, just like the real thing</li>
            <li>Flag questions and jump with the grid</li><li><b style="color:var(--green)">70%</b> to pass</li></ul></div>
          <div class="card"><h3>Timer</h3><p class="muted">The real exam gives 12 h for theory + 2 labs. Practise the theory part under pressure:</p>
            <div class="row" id="tm">${[45, 90, 120].map((m) => `<span class="chip ${m === minutes ? "on" : ""}" data-m="${m}" role="button" tabindex="0">${m} min</span>`).join("")}</div>
            <button class="btn violet" id="start" style="margin-top:20px">⏱️ Start exam</button></div></div>
        ${S.exams.length ? `<div class="card" style="margin-top:18px"><h3>Past attempts</h3>${histTable()}</div>` : ""}`;
      $$("#tm .chip").forEach((c) => (c.onclick = () => { minutes = +c.dataset.m; intro(); }));
      $("#start").onclick = begin;
    }
    let qs, ans, flags, cur, end, timer;
    function begin() {
      qs = [];
      DOMAINS.forEach((d) => { qs.push(...shuffle(QUESTIONS.filter((q) => q.d === d.key)).slice(0, d.mock)); });
      qs = shuffle(qs).map((q) => ({ q, order: shuffle([0, 1, 2, 3]) }));
      ans = Array(qs.length).fill(null); flags = Array(qs.length).fill(false); cur = 0;
      end = Date.now() + minutes * 60e3;
      timer = setInterval(tickT, 1000);
      cleanup = () => clearInterval(timer);
      draw();
    }
    function tickT() {
      const left = Math.max(0, end - Date.now()), el = $("#timer");
      if (!el) return;
      const m = Math.floor(left / 60e3), s = Math.floor((left % 60e3) / 1000);
      el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      el.classList.toggle("low", left < 5 * 60e3);
      if (left <= 0) { toast("⏰ Time's up! Submitting…"); submit(); }
    }
    function draw() {
      const { q, order } = qs[cur];
      view.innerHTML = `<div class="exam-layout">
        <div class="card qcard"><div class="row" style="justify-content:space-between"><span class="mono muted">Question ${cur + 1} of ${qs.length}</span>
            <button class="chip ${flags[cur] ? "on" : ""}" id="flag" style="--c:var(--amber)">🚩 ${flags[cur] ? "Flagged" : "Flag"}</button></div>
          <div class="q">${esc(q.q)}</div>
          <div class="opts">${order.map((oi, k) => `<button class="opt ${ans[cur] === oi ? "picked" : ""}" data-i="${oi}"><span class="k">${"ABCD"[k]}</span><span>${esc(q.o[oi])}</span></button>`).join("")}</div>
          <div class="row" style="justify-content:space-between;margin-top:20px">
            <button class="btn ghost" id="prev" ${cur === 0 ? "disabled" : ""}>← Prev</button>
            <button class="btn ghost" id="nxt" ${cur === qs.length - 1 ? "disabled" : ""}>Next →</button></div></div>
        <div class="card"><div class="timer" id="timer">--:--</div><p class="muted" style="text-align:center;font-size:13px;margin:4px 0 14px">${ans.filter((a) => a !== null).length} / ${qs.length} answered</p>
          <div class="navgrid">${qs.map((_, i) => `<button class="${ans[i] !== null ? "ans" : ""} ${flags[i] ? "flag" : ""} ${i === cur ? "cur" : ""}" data-j="${i}" aria-label="Question ${i + 1}">${i + 1}</button>`).join("")}</div>
          <button class="btn violet" id="submit" style="width:100%;justify-content:center;margin-top:18px">Submit exam</button></div></div>`;
      tickT();
      $$(".opt").forEach((b) => (b.onclick = () => { ans[cur] = +b.dataset.i; FX.sfx.click(); if (cur < qs.length - 1) { cur++; } draw(); }));
      $("#flag").onclick = () => { flags[cur] = !flags[cur]; draw(); };
      $("#prev").onclick = () => { cur--; draw(); };
      $("#nxt").onclick = () => { cur++; draw(); };
      $$(".navgrid button").forEach((b) => (b.onclick = () => { cur = +b.dataset.j; draw(); }));
      $("#submit").onclick = () => {
        const open = ans.filter((a) => a === null).length;
        if (!open || confirm(`${open} question(s) unanswered. Submit anyway?`)) submit();
      };
    }
    function submit() {
      clearInterval(timer);
      const by = {};
      DOMAINS.forEach((d) => (by[d.key] = { r: 0, t: 0 }));
      let right = 0;
      qs.forEach(({ q }, i) => { const ok = ans[i] === q.a; by[q.d].t++; if (ok) { by[q.d].r++; right++; } grade(q.id, ok); });
      const score = Math.round((right / qs.length) * 100), pass = score >= 70;
      S.exams.push({ date: new Date().toISOString(), score, minutes, by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round((v.r / v.t) * 100)])) });
      save(); addXP(right * 4);
      const wrong = qs.map((x, i) => ({ ...x, i })).filter(({ q, i }) => ans[i] !== q.a);
      view.innerHTML = `<div class="card" style="text-align:center;padding:40px">
          <div class="eyebrow">Exam result</div>
          <div style="display:flex;justify-content:center;align-items:center;gap:30px;flex-wrap:wrap;margin:20px 0">
            ${ring(score, `${right}/${qs.length}`, pass ? "#34d399" : "#f87171", 180, 10)}
            <div class="stamp ${pass ? "pass" : "fail"}">${pass ? "PASS" : "FAIL"}</div></div>
          <p class="muted">${pass ? "You'd clear the 70% bar. Now do it again under a shorter timer." : "Below 70%. The bars below show exactly where the points went."}</p></div>
        <div class="card dom-bars" style="margin-top:18px"><h3>By domain</h3>
          ${DOMAINS.map((d) => { const v = by[d.key], pc = Math.round((v.r / v.t) * 100);
            return `<div class="db" style="--c:${pc >= 70 ? d.color : "#f87171"}"><span>${d.icon}</span><div class="track" title="${esc(d.name)}"><i data-w="${pc}%"></i></div><span class="pct">${v.r}/${v.t}</span></div>`; }).join("")}</div>
        <div class="card" style="margin-top:18px"><h3>Review your misses (${wrong.length})</h3>
          ${wrong.map(({ q, i }) => `<div class="review-item">${domTag(q.d)}<p><b>${esc(q.q)}</b></p>
            ${ans[i] !== null ? `<div class="bad">Your answer: ${esc(q.o[ans[i]])}</div>` : `<div class="bad">Not answered</div>`}
            <div class="ok">✔ ${esc(q.o[q.a])}</div><p class="muted" style="margin:6px 0 0">${esc(q.e)}</p></div>`).join("") || `<p class="muted">Nothing to review. Perfect score! 🏆</p>`}
          <div class="row" style="margin-top:16px"><button class="btn" id="retry">⏱️ New exam</button><a class="btn ghost" href="#/">🛰️ HQ</a></div></div>`;
      animateRings();
      if (pass) { FX.sfx.level(); setTimeout(() => FX.confetti(innerWidth / 2, innerHeight / 3, 180), 1100); } else FX.sfx.wrong();
      $("#retry").onclick = intro;
    }
    intro();
  };

  function histTable() {
    return `<table class="hist"><tr><th>Date</th><th>Score</th><th>Timer</th><th>Result</th></tr>
      ${S.exams.slice().reverse().map((e) => `<tr><td>${new Date(e.date).toLocaleString()}</td><td class="mono">${e.score}%</td><td>${e.minutes} min</td>
        <td>${e.score >= 70 ? '<span style="color:var(--green)">PASS</span>' : '<span style="color:var(--red)">FAIL</span>'}</td></tr>`).join("")}</table>`;
  }

  // ── FRIDA LAB ──
  routes.frida = function () {
    let move = "spy";
    const MOVES = {
      spy: { icon: "👁️", c: "#22d3ee", t: "SPY", d: "Print arguments and the return value. Use it for keys, PINs, plaintext and tokens." },
      force: { icon: "🔨", c: "#f472b6", t: "FORCE", d: "Replace the return value. Use it for isRooted() → false or checkPin() → true." },
      call: { icon: "📞", c: "#a3e635", t: "CALL", d: "Run a method yourself. Use it for getFlag() or decrypt(secret)." },
    };
    const FLOW = [
      ["#22d3ee", "Recon", "Pull the APK (adb shell pm path, adb pull). List processes with <code>frida-ps -Uai</code>. Note the package name."],
      ["#a78bfa", "Static first", "<code>apktool d</code> + <code>jadx-gui</code>. Read the manifest (exported, debuggable). Search: isRooted, exit, Cipher, equals, flag, http."],
      ["#f472b6", "Find the blocker", "Root check? Pinning? A PIN compare? An exported component? Note the exact class + method + argument types."],
      ["#a3e635", "Hook it", "Spawn with <code>frida -U -f pkg -l hook.js</code>. Pick a move: SPY, FORCE or CALL. Use the builder on the right."],
      ["#fbbf24", "Plan B (stuck > 30 min)", "Objection (<code>android root disable</code>), a smali patch (<code>if-eqz → if-nez</code>, then rebuild, zipalign, sign), or re-implement the crypto offline."],
      ["#34d399", "Capture the flag", "Write down the flag + the one-line method. Move on and don't gold-plate."],
    ];
    view.innerHTML = `<div class="eyebrow">Frida Lab</div><h1>Three moves. <span class="grad">Every lab.</span></h1>
      <p class="muted">Almost every eMAPT lab flag falls to one of three Frida moves. Pick one, fill in the target, and copy the script.</p>
      <div class="moves" style="margin-top:20px">${Object.entries(MOVES).map(([k, m]) => `<button class="card hover move ${k === move ? "on" : ""}" data-k="${k}" style="--c:${m.c}">
        <span class="mi">${m.icon}</span><h3 style="margin-top:8px;color:${m.c}">${m.t}</h3><p class="muted" style="margin:0;font-size:14px">${m.d}</p></button>`).join("")}</div>
      <div class="grid g2" style="margin-top:18px">
        <div class="card"><h3>🧪 Script builder</h3><div class="form">
          <label>Package (for the command)<input id="pkg" value="com.example.app"></label>
          <label>Class (fully qualified)<input id="cls" value="com.example.app.Security"></label>
          <label>Method (use $init for a constructor)<input id="mth" value="isRooted"></label>
          <label>Argument types, comma-separated (blank = no overload)<input id="args" placeholder="java.lang.String, int"></label>
          <label id="retL">Forced return value<input id="ret" value="false"></label>
          <label id="callL">Call arguments (JS)<input id="cargs" placeholder='"1234"'></label>
        </div></div>
        <div class="card"><div class="row" style="justify-content:space-between"><h3>📜 hook.js</h3><button class="btn ghost" id="copy">📋 Copy</button></div>
          <pre class="code" id="out"></pre><p class="muted mono" style="font-size:12px" id="cmd"></p></div>
      </div>
      <div class="section-title"><h2>🎯 The lab-app attack flow</h2><span class="muted">tap a step</span></div>
      <div class="steps">${FLOW.map(([c, t, b], i) => `<button class="step" style="--c:${c}"><span class="n">${i + 1}</span><span><b>${t}</b><span class="body">${b}</span></span></button>`).join("")}</div>`;
    const v = (id) => $("#" + id).value.trim();
    function hl(code) {
      return esc(code)
        .replace(/(\/\/.*)/g, '<span class="cm">$1</span>')
        .replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="str">$1</span>')
        .replace(/\b(function|var|return|const|this)\b/g, '<span class="kw">$1</span>')
        .replace(/\b(Java\.perform|Java\.use|console\.log|implementation|overload|\$new|\$init)\b/g, '<span class="fn">$1</span>')
        .replace(/\b(true|false|\d+)\b/g, '<span class="num">$1</span>');
    }
    function build() {
      const cls = v("cls") || "com.example.app.Target", mth = v("mth") || "method";
      const types = v("args") ? v("args").split(",").map((s) => s.trim()).filter(Boolean) : [];
      const params = types.map((_, i) => "a" + i).join(", ");
      const ov = types.length ? `.overload(${types.map((t) => `"${t}"`).join(", ")})` : "";
      const short = cls.split(".").pop();
      let body;
      if (move === "spy") body =
`  ${short}.${mth}${ov}.implementation = function (${params}) {
    console.log("[SPY] ${mth} called"${types.map((_, i) => ` + " a${i}=" + a${i}`).join("")});
    var ret = this.${mth}(${params});
    console.log("[SPY] ${mth} returned: " + ret);
    return ret;
  };`;
      else if (move === "force") body =
`  ${short}.${mth}${ov}.implementation = function (${params}) {
    console.log("[FORCE] ${mth} -> ${v("ret") || "true"}");
    return ${v("ret") || "true"};
  };`;
      else body =
`  // CALL: static methods can be called on the class directly;
  // instance methods need an object: $new(...) or Java.choose(...)
  var obj = ${short}.$new();
  var result = obj.${mth}(${v("cargs")});
  console.log("[CALL] ${mth}(${v("cargs").replace(/"/g, "'")}) = " + result);`;
      const code = `// ${MOVES[move].t} · generated by eMAPT Trainer
Java.perform(function () {
  var ${short} = Java.use("${cls}");
${body}
});`;
      $("#out").innerHTML = hl(code); $("#out").dataset.raw = code;
      $("#cmd").textContent = `$ frida -U -f ${v("pkg") || "com.example.app"} -l hook.js`;
      $("#retL").style.display = move === "force" ? "" : "none";
      $("#callL").style.display = move === "call" ? "" : "none";
    }
    $$(".move").forEach((b) => (b.onclick = () => {
      move = b.dataset.k; FX.sfx.click();
      $$(".move").forEach((x) => x.classList.toggle("on", x === b));
      if (move === "force" && v("mth") === "getFlag") $("#mth").value = "isRooted";
      if (move === "call" && v("mth") === "isRooted") $("#mth").value = "getFlag";
      build();
    }));
    $$(".form input").forEach((i) => (i.oninput = build));
    $("#copy").onclick = async () => {
      try { await navigator.clipboard.writeText($("#out").dataset.raw); toast("📋 Script copied"); } catch (e) { toast("Copy failed: select the text manually"); }
    };
    $$(".step").forEach((s) => (s.onclick = () => { s.classList.toggle("open"); FX.sfx.click(); }));
    build();
  };

  // ── PROFILE ──
  routes.profile = function () {
    const lvl = levelFor(S.xp);
    view.innerHTML = `<div class="eyebrow">Agent profile</div><h1>LV ${lvl} · <span class="grad">${esc(title(lvl))}</span></h1>
      <div class="grid g3" style="margin-top:20px">
        <div class="card stat"><span style="font-size:34px">⚡</span><div><div class="big" data-count="${S.xp}" data-suffix="">0</div><div class="lbl">total XP</div></div></div>
        <div class="card stat"><span style="font-size:34px">✍️</span><div><div class="big" data-count="${S.answered}" data-suffix="">0</div><div class="lbl">answers</div></div></div>
        <div class="card stat"><span style="font-size:34px">🎯</span><div><div class="big" data-count="${S.answered ? Math.round((S.correct / S.answered) * 100) : 0}">0</div><div class="lbl">accuracy</div></div></div></div>
      <div class="grid g2" style="margin-top:18px">
        <div class="card"><h3>Settings</h3>
          <label class="switch"><span>🔊 Sound effects</span><input type="checkbox" id="snd" ${S.settings.sound ? "checked" : ""}></label>
          <label class="switch"><span>✨ Animations</span><input type="checkbox" id="mot" ${S.settings.motion ? "checked" : ""}></label>
          <h3 style="margin-top:20px">Move progress between devices</h3>
          <p class="muted" style="font-size:14px">Progress lives in this browser. Export it on one device and import it on another.</p>
          <div class="row"><button class="btn ghost" id="exp">⬇️ Export</button><label class="btn ghost" style="cursor:pointer">⬆️ Import<input type="file" id="imp" accept="application/json" hidden></label>
            <button class="btn danger" id="rst">Reset</button></div></div>
        <div class="card"><h3>Mock exam history</h3>${S.exams.length ? histTable() : '<p class="muted">No exams yet. <a href="#/exam">Take your first one →</a></p>'}</div></div>`;
    animateRings();
    $("#snd").onchange = (e) => { S.settings.sound = e.target.checked; save(); applySettings(); };
    $("#mot").onchange = (e) => { S.settings.motion = e.target.checked; save(); applySettings(); };
    $("#exp").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
      a.download = `emapt-progress-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $("#imp").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (typeof data !== "object" || data === null || !("cards" in data)) throw new Error("bad file");
        S = Object.assign(fresh(), data); save(); applySettings(); toast("✅ Progress imported"); go();
      } catch (err) { toast("❌ That file isn't an eMAPT Trainer export"); }
    };
    $("#rst").onclick = () => { if (confirm("Erase all progress in this browser?")) { S = fresh(); save(); applySettings(); toast("Progress reset"); go(); } };
  };

  go();
})();
