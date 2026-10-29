// eMAPT Line: router, progress store, network map, stations and the 6 challenge engines.
(() => {
  "use strict";

  const M = window.METRO;
  const Q = {};
  (window.QUESTIONS || []).forEach((q) => (Q[q.id] = q));

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const view = $("#view");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const shuffledIdx = (n) => {
    const base = [...Array(n).keys()];
    let s = shuffle(base);
    while (n > 1 && s.every((v, i) => v === i)) s = shuffle(base);
    return s;
  };

  // ───────────── Geometry: lines, stations and the route the train follows ─────────────
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const polyLen = (pts) => pts.slice(1).reduce((L, p, i) => L + dist(pts[i], p), 0);
  function pointOn(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], s = dist(a, b);
      if (d <= s || i === pts.length - 1) {
        const t = s ? Math.max(0, Math.min(d / s, 1)) : 0;
        return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      }
      d -= s;
    }
    return { x: pts[0][0], y: pts[0][1], ang: 0 };
  }

  const ROUTE = [];
  const ORDER = [];
  let off = 0;
  M.lines.forEach((line) => {
    line.len = polyLen(line.pts);
    line.off = off;
    line.pts.forEach((p, i) => { if (i || !ROUTE.length) ROUTE.push(p); });
    const k = line.stations.length;
    line.stations.forEach((st, i) => {
      st.line = line;
      st.i = i;
      st.idx = ORDER.length;
      st.at = off + (line.len * (i + 1)) / k;
      st.pos = pointOn(line.pts, (line.len * (i + 1)) / k);
      st.playable = !!(st.brief && st.tasks);
      ORDER.push(st);
    });
    line.playable = line.stations.some((s) => s.playable);
    off += line.len;
  });
  const BYID = Object.fromEntries(ORDER.map((s) => [s.id, s]));

  // ───────────── Progress (browser only) ─────────────
  const KEY = "emapt-line-v1";
  const fresh = () => ({ cleared: {}, seen: -1 });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s.cleared === "object") return Object.assign(fresh(), s);
    } catch (e) { /* storage blocked or empty */ }
    return fresh();
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  }
  const isCleared = (st) => !!S.cleared[st.id];
  function trainIdx() {
    let t = -1;
    for (const st of ORDER) { if (isCleared(st)) t = st.idx; else break; }
    return t;
  }
  const nextStation = () => ORDER[trainIdx() + 1] || null;
  const isOpen = (st) => st.playable && (isCleared(st) || st.idx === trainIdx() + 1);
  const statusOf = (st) => (isCleared(st) ? "cleared" : !st.playable ? "soon" : isOpen(st) ? "next" : "locked");
  const clearedCount = () => ORDER.filter(isCleared).length;
  const lateMin = (rec) => rec.miss * 2;
  const resultText = (rec) => (rec.miss ? `Late +${lateMin(rec)} min` : "On time");

  function hud() {
    $("#hud").innerHTML = `<b>${clearedCount()}</b><span>/ ${ORDER.length}</span><span class="w">stations</span>`;
  }

  // ───────────── Small shared pieces ─────────────
  const badge = (L, cls = "") => `<span class="lbadge ${cls}" style="--c:${L.color};--ci:${L.ink}">L${L.n}</span>`;

  let stampN = 0;
  function stampSVG(st, rec, cls = "") {
    const L = st.line, id = "arc" + ++stampN;
    const words = st.name.toUpperCase().split(" ");
    const lines = words.length > 2 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : words;
    const longest = Math.max(...lines.map((l) => l.length));
    const fs = Math.min(18, 118 / (longest * 0.62));
    const y0 = lines.length === 1 ? 104 : 95;
    const rot = ([...st.id].reduce((h, c) => h + c.charCodeAt(0), 0) % 15) - 7;
    const date = new Date(rec.t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
    return `<svg class="stamp ${cls}" viewBox="0 0 200 200" style="--c:${L.color}" role="img" aria-label="Stamp: ${esc(st.name)}, ${resultText(rec)}">
  <g transform="rotate(${rot} 100 100)" filter="url(#ink)" fill="${L.color}" stroke="${L.color}">
    <circle cx="100" cy="100" r="92" fill="none" stroke-width="6"/>
    <circle cx="100" cy="100" r="81" fill="none" stroke-width="2"/>
    <path id="${id}t" d="M34,100 A66,66 0 0,1 166,100" fill="none" stroke="none"/>
    <path id="${id}b" d="M24,100 A76,76 0 0,0 176,100" fill="none" stroke="none"/>
    <text class="st-arc" stroke="none"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">EMAPT LINE</textPath></text>
    <text class="st-arc" stroke="none"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">L${L.n} · ${esc(L.name.toUpperCase())}</textPath></text>
    <text class="st-date" x="100" y="70" text-anchor="middle" stroke="none">${date}</text>
    ${lines.map((l, i) => `<text class="st-name" x="100" y="${y0 + i * (fs + 2)}" font-size="${fs.toFixed(1)}" text-anchor="middle" stroke="none">${esc(l)}</text>`).join("")}
    <line x1="58" y1="121" x2="142" y2="121" stroke-width="2"/>
    <text class="st-res" x="100" y="138" text-anchor="middle" stroke="none">${rec.miss ? `LATE +${lateMin(rec)} MIN` : "ON TIME"}</text>
  </g></svg>`;
  }

  const DIAGRAMS = {
    sandbox: `<svg class="diag" viewBox="0 0 560 220" role="img" aria-label="Two apps, each with its own Linux user and folder, separated by a wall. They can only talk through exported components.">
  <defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="hl"/></pattern>
  <marker id="arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="mk"/></marker></defs>
  <path d="M120,62 C190,24 370,24 440,62" class="flow acc" marker-end="url(#arw)"/>
  <text x="280" y="18" class="dt s">IPC through exported components: allowed</text>
  <rect x="10" y="62" width="200" height="124" rx="10" class="box"/>
  <text x="110" y="90" class="dt b">App A</text><text x="110" y="110" class="dt s mono">user u0_a61</text>
  <rect x="26" y="126" width="168" height="40" rx="6" class="box2"/><text x="110" y="151" class="dt s mono">/data/data/com.a/</text>
  <rect x="350" y="62" width="200" height="124" rx="10" class="box"/>
  <text x="450" y="90" class="dt b">App B</text><text x="450" y="110" class="dt s mono">user u0_a62</text>
  <rect x="366" y="126" width="168" height="40" rx="6" class="box2"/><text x="450" y="151" class="dt s mono">/data/data/com.b/</text>
  <rect x="262" y="56" width="36" height="136" fill="url(#hatch)" class="wall"/>
  <path d="M196,146 L252,146" class="flow" marker-end="url(#arw)"/>
  <path d="M216,139 l14,14 m0,-14 l-14,14" class="cross"/>
  <text x="280" y="212" class="dt s">Linux file permissions + SELinux: direct reads blocked</text>
</svg>`,
    components: `<svg class="diag" viewBox="0 0 560 230" role="img" aria-label="Another app or adb sends Intents to the four exported components of the target app.">
  <defs><marker id="arw2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="mk"/></marker></defs>
  <rect x="10" y="80" width="140" height="70" rx="10" class="box2"/>
  <text x="80" y="110" class="dt b">Other app</text><text x="80" y="130" class="dt s">or you, with adb</text>
  <rect x="250" y="10" width="300" height="210" rx="12" class="box"/>
  <text x="400" y="34" class="dt s">Target app (exported components)</text>
  ${["Activity · a screen", "Service · background", "Receiver · events", "Provider · content://"].map((t, i) =>
    `<rect x="290" y="${48 + i * 42}" width="220" height="32" rx="6" class="box2"/><text x="400" y="${69 + i * 42}" class="dt s">${t}</text>
     <path d="M150,115 C200,115 230,${64 + i * 42} 286,${64 + i * 42}" class="flow acc" marker-end="url(#arw2)"/>`).join("")}
  <text x="200" y="100" class="dt s b2">Intent</text>
</svg>`,
    trust: `<svg class="diag" viewBox="0 0 560 210" role="img" aria-label="The phone is controlled by the attacker; the server is controlled by you. The trust boundary is between them.">
  <defs><marker id="arw3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="mk"/></marker></defs>
  <rect x="10" y="20" width="220" height="170" rx="12" class="box2"/>
  <text x="120" y="46" class="dt b">Phone</text><text x="120" y="66" class="dt s">the attacker controls this</text>
  ${["jadx reads the code", "apktool changes it", "Frida hooks it live"].map((t, i) => `<text x="120" y="${100 + i * 26}" class="dt s mono">${t}</text>`).join("")}
  <line x1="280" y1="8" x2="280" y2="202" class="boundary acc"/>
  <text x="280" y="206" class="dt s b2" dy="-2">trust boundary</text>
  <rect x="330" y="20" width="220" height="170" rx="12" class="box"/>
  <text x="440" y="46" class="dt b">Server</text><text x="440" y="66" class="dt s">you control this</text>
  ${["Who is this user?", "May they do this?", "Is the input valid?"].map((t, i) => `<text x="440" y="${100 + i * 26}" class="dt s">${t}</text>`).join("")}
  <path d="M232,170 L326,170" class="flow" marker-end="url(#arw3)"/>
  <text x="280" y="160" class="dt s">requests can be forged</text>
</svg>`,
  };
  const withDiagrams = (html) => html.replace(/\{\{diagram:(\w+)\}\}/g, (_, n) => `<figure class="diagwrap">${DIAGRAMS[n] || ""}</figure>`);

  // ───────────── Network map ─────────────
  // Station labels: try each side of the track and keep the first spot that hits no other label,
  // station, line badge or the key. Computed once, because the map never changes shape.
  const CENTER = [600, 380];
  const LABELS = (() => {
    const boxes = [[680, 545, 1060, 625]];
    M.lines.forEach((L) => boxes.push([L.badge[0] - 24, L.badge[1] - 16, L.badge[0] + 24, L.badge[1] + 16]));
    ORDER.forEach((s) => boxes.push([s.pos.x - 12, s.pos.y - 12, s.pos.x + 12, s.pos.y + 12]));
    const p0 = M.start.pt;
    boxes.push([p0[0] - 30, p0[1] - 18, p0[0] + 30, p0[1] + 18]);
    const routeLen = polyLen(ROUTE);
    for (let d = 0; d <= routeLen; d += 8) {
      const p = pointOn(ROUTE, d);
      boxes.push([p.x - 6, p.y - 6, p.x + 6, p.y + 6]);
    }
    const hits = (b, self) => b[0] < 4 || b[2] > 1196 || b[1] < 4 || b[3] > 756 ||
      boxes.some((o, k) => k !== self && b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const out = {};
    ORDER.forEach((st) => {
      const { x, y } = st.pos, w = st.name.length * (st.junction || st.central ? 7.8 : 7.1), h = 16;
      const self = boxes.findIndex((o) => o[0] === x - 12 && o[1] === y - 12);
      const dx = Math.cos(st.pos.ang), dy = Math.sin(st.pos.ang);
      let n = Math.abs(dy) < 0.2 ? [0, st.idx % 2 ? 1 : -1] : [-dy, dx];
      if (Math.abs(dy) >= 0.2 && n[0] * (CENTER[0] - x) + n[1] * (CENTER[1] - y) < 0) n = [-n[0], -n[1]];
      const cands = st.central ? [[0, 1], [0, -1]] : [n, [-n[0], -n[1]], [0, -1], [0, 1], [1, 0], [-1, 0]];
      const r = st.central ? 42 : st.junction ? 26 : 22;
      const place = ([nx, ny]) => {
        const a = nx > 0.3 ? "start" : nx < -0.3 ? "end" : "middle";
        const lx = x + nx * r, ly = y + ny * r;
        const x0 = a === "start" ? lx : a === "end" ? lx - w : lx - w / 2;
        return { x: lx, y: ly, a, box: [x0 - 2, ly - h / 2, x0 + w + 2, ly + h / 2] };
      };
      const pick = cands.map(place).find((c) => !hits(c.box, self)) || place(cands[0]);
      boxes.push(pick.box);
      out[st.id] = pick;
    });
    return out;
  })();
  const labelFor = (st) => LABELS[st.id];

  function mapSVG() {
    const t = trainIdx();
    let s = `<svg class="map" viewBox="0 0 1200 760" role="img" aria-labelledby="map-t map-d">
<title id="map-t">eMAPT Line network map</title><desc id="map-d">Eight lines, one for each exam domain, from Platform 0 to eMAPT Central. ${clearedCount()} of ${ORDER.length} stations cleared.</desc>`;
    // legend
    s += `<g class="legend" transform="translate(690 560)">
  <text class="lg-h" x="0" y="0">KEY</text>
  <circle cx="10" cy="24" r="7" class="lg-st"/><text x="28" y="28">Station</text>
  <circle cx="10" cy="50" r="10" class="lg-jn"/><text x="28" y="54">Interchange</text>
  <line x1="150" y1="24" x2="200" y2="24" class="lg-soon"/><text x="210" y="28">Opens in Step 2</text>
  <g transform="translate(174 50)">${trainShape()}</g><text x="210" y="54">You are here</text>
</g>`;
    M.lines.forEach((L) => {
      s += `<polyline class="track${L.playable ? "" : " soon"}" points="${L.pts.map((p) => p.join(",")).join(" ")}" style="stroke:${L.color}"/>`;
    });
    M.lines.forEach((L) => {
      s += `<a href="#/line/${L.key}" class="mbadge" aria-label="Line ${L.n}: ${esc(L.name)}"><rect x="${L.badge[0] - 22}" y="${L.badge[1] - 14}" width="44" height="28" rx="14" fill="${L.color}"/><text x="${L.badge[0]}" y="${L.badge[1] + 6}" fill="${L.ink}">L${L.n}</text></a>`;
    });
    const p0 = M.start.pt;
    s += `<line x1="${p0[0]}" y1="${p0[1] - 16}" x2="${p0[0]}" y2="${p0[1] + 16}" class="terminus"/><text class="st-label b" x="${p0[0]}" y="${p0[1] + 32}" text-anchor="middle">${M.start.name}</text>`;
    ORDER.forEach((st) => {
      const st8 = statusOf(st), lab = labelFor(st), { x, y } = st.pos;
      const href = st8 === "cleared" || st8 === "next" ? `#/s/${st.id}` : st.playable ? "" : `#/line/${st.line.key}`;
      let mark;
      if (st.central) mark = `<circle cx="${x}" cy="${y}" r="24" class="central"/><circle cx="${x}" cy="${y}" r="13" class="central-in"/>`;
      else mark = `<circle cx="${x}" cy="${y}" r="${st.junction ? 11 : 8}" class="dot" style="--c:${st.line.color}"/>`;
      const pulse = st8 === "next" ? `<circle cx="${x}" cy="${y}" r="16" class="pulse" style="stroke:${st.line.color}"/>` : "";
      const label = `<text class="st-label${st.junction || st.central ? " b" : ""}" x="${lab.x.toFixed(1)}" y="${lab.y.toFixed(1)}" text-anchor="${lab.a}">${esc(st.name)}</text>`;
      const inner = `<title>${esc(st.name)}: ${esc(st.topic)}</title>${pulse}<circle cx="${x}" cy="${y}" r="20" class="hit"/>${mark}${label}`;
      s += href
        ? `<a href="${href}" class="st ${st8}${st.junction ? " jn" : ""}">${inner}</a>`
        : `<g class="st ${st8}${st.junction ? " jn" : ""}">${inner}</g>`;
    });
    const p = t >= 0 ? pointOn(ROUTE, ORDER[t].at) : pointOn(ROUTE, 0);
    s += `<g class="train" id="train" transform="translate(${p.x} ${p.y}) rotate(${(p.ang * 180) / Math.PI})">${trainShape()}</g>`;
    return s + "</svg>";
  }
  function trainShape() {
    return `<g class="train-body"><rect x="-22" y="-9" width="44" height="18" rx="9"/><rect x="-14" y="-4" width="7" height="8" rx="1.5" class="win"/><rect x="-4" y="-4" width="7" height="8" rx="1.5" class="win"/><rect x="6" y="-4" width="7" height="8" rx="1.5" class="win"/><circle cx="17" cy="0" r="2.4" class="lamp"/></g>`;
  }

  function animateTrain() {
    const g = $("#train"), t = trainIdx();
    if (!g) return;
    if (S.seen > t) { S.seen = t; save(); }
    if (S.seen === t) return;
    const from = S.seen >= 0 ? ORDER[S.seen].at : 0, to = ORDER[t].at;
    S.seen = t;
    save();
    const place = (d) => {
      const p = pointOn(ROUTE, d);
      g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((p.ang * 180) / Math.PI).toFixed(1)})`);
    };
    if (reduced) return place(to);
    place(from);
    const dur = Math.max(1100, Math.min(3200, (to - from) * 7)), t0 = performance.now();
    const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      place(from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
      else g.classList.add("arrived");
    };
    setTimeout(() => requestAnimationFrame(step), 350);
  }

  function board(nx) {
    const now = new Date(), clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    let rows, btn;
    if (!nx) {
      rows = `<div class="b-row main"><span class="b-dest">All lines complete</span></div><div class="b-row"><span>Next: the full mock exam</span><span class="b-stat">Step 2</span></div>`;
      btn = `<a class="btn" href="#/pass">Open your Travel Pass</a>`;
    } else if (!nx.playable) {
      const L = nx.line;
      rows = `<div class="b-row main"><span class="b-dest">${esc(L.name)} line</span>${badge(L)}</div>
        <div class="b-row"><span>Lines 1–2 cleared. Well done.</span><span class="b-stat">Opens in Step 2</span></div>`;
      btn = `<a class="btn" href="#/pass">See your stamps</a>`;
    } else {
      const L = nx.line;
      rows = `<div class="b-row main"><span class="b-dest">${esc(nx.name)}</span>${badge(L)}</div>
        <div class="b-row"><span>${esc(nx.topic)}</span><span class="b-stat">Boarding</span></div>`;
      btn = `<a class="btn" href="#/s/${nx.id}">${trainIdx() < 0 ? "Board the first train" : "Board this train"} →</a>`;
    }
    return `<div class="board" role="group" aria-label="Next departure">
      <div class="b-head"><span>Next departure</span><span class="b-clock">${clock}</span></div>${rows}</div>${btn}`;
  }

  function pageMap() {
    const nx = nextStation();
    view.innerHTML = `
<section class="intro">
  <div class="intro-txt">
    <p class="kicker">Network map</p>
    <h1>From your first <code>adb</code> command to <em>eMAPT Central</em>.</h1>
    <p class="lede">Eight lines, one for each exam domain. Every station has a short briefing and a hands-on challenge. Clear it to get your ticket stamped, and the train moves on.</p>
  </div>
  <div class="depart">${board(nx)}</div>
</section>
<figure class="mapframe">${mapSVG()}</figure>
<section class="lines" aria-label="Lines">
  <h2 class="h-sec">Lines</h2>
  ${M.lines.map((L) => {
    const done = L.stations.filter(isCleared).length;
    return `<a class="linerow${L.playable ? "" : " soon"}" href="#/line/${L.key}">
      ${badge(L)}<span class="lr-name">${esc(L.name)}<small>${L.weight}% of the exam</small></span>
      <span class="lr-dots" style="--c:${L.color}">${L.stations.map((s) => `<i class="${isCleared(s) ? "on" : ""}"></i>`).join("")}</span>
      <span class="lr-stat">${L.playable ? `${done}/${L.stations.length}` : "Step 2"}</span></a>`;
  }).join("")}
</section>`;
    animateTrain();
  }

  // ───────────── Line page (strip map) ─────────────
  function pageLine(key) {
    const L = M.lines.find((l) => l.key === key);
    if (!L) return pageMap();
    const nextL = M.lines[L.n];
    const done = L.stations.filter(isCleared).length;
    view.innerHTML = `
<a class="back" href="#/">← Network map</a>
<header class="linehead" style="--c:${L.color}">
  ${badge(L, "big")}
  <div><p class="kicker">Line ${L.n} · ${L.weight}% of the exam</p><h1>${esc(L.name)}</h1><p class="lede">${esc(L.blurb)}</p>
  <p class="meta">${L.playable ? `${done} of ${L.stations.length} stations stamped` : "This line opens in Step 2. You can preview its stations below."}</p></div>
</header>
<ol class="strip" style="--c:${L.color}">
  ${L.stations.map((st) => {
    const s8 = statusOf(st), rec = S.cleared[st.id];
    const stat = s8 === "cleared" ? `<span class="tag ok">${resultText(rec)}</span>` : s8 === "next" ? `<span class="tag go">Next stop</span>` : s8 === "locked" ? `<span class="tag">Locked</span>` : `<span class="tag">Step 2</span>`;
    const body = `<span class="dot${st.junction || st.central ? " jn" : ""}"></span><span class="s-name">${esc(st.name)}<small>${esc(st.topic)}</small></span>${stat}`;
    return `<li class="stop ${s8}">${s8 === "cleared" || s8 === "next" ? `<a href="#/s/${st.id}">${body}</a>` : `<div>${body}</div>`}</li>`;
  }).join("")}
</ol>
${nextL ? `<a class="change" href="#/line/${nextL.key}">Change here for ${badge(nextL)} <b>${esc(nextL.name)}</b> →</a>` : ""}`;
  }

  // ───────────── Station: briefing → challenge → stamp ─────────────
  let run = null;
  const TYPE = { mcq: "Question", term: "Terminal", spot: "Spot the bug", hook: "Fill the hook", match: "Match", order: "Order the steps" };

  function pageStation(id) {
    const st = BYID[id];
    if (!st) return pageMap();
    const L = st.line;
    if (!st.playable || !isOpen(st)) {
      const nx = nextStation();
      view.innerHTML = `<a class="back" href="#/line/${L.key}">← ${esc(L.name)} line</a>
<div class="card closed"><p class="kicker">${st.playable ? "Locked" : "Under construction"}</p><h1>${esc(st.name)}</h1>
<p>${st.playable ? `Stations open in order. Your train is due at <b>${esc(nx.name)}</b> first.` : "This station opens in Step 2."}</p>
${nx && nx.playable ? `<a class="btn" href="#/s/${nx.id}">Go to ${esc(nx.name)} →</a>` : `<a class="btn" href="#/">Back to the map</a>`}</div>`;
      return;
    }
    run = { st, phase: "brief", ti: 0, miss: 0 };
    renderStation();
  }

  function renderStation() {
    const { st, phase } = run, L = st.line;
    const steps = ["Briefing", "Challenge", "Stamp"], cur = { brief: 0, task: 1, stamp: 2 }[phase];
    view.innerHTML = `
<a class="back" href="#/line/${L.key}">← ${esc(L.name)} line</a>
<header class="sign" style="--c:${L.color};--ci:${L.ink}">
  <div class="sign-bar">${badge(L)}<span>${esc(L.name)}</span><span class="sign-no">Stop ${st.i + 1} of ${L.stations.length}</span></div>
  <h1 class="sign-name">${esc(st.name)}</h1>
  <p class="sign-topic">${esc(st.topic)}</p>
</header>
<ol class="steps" style="--c:${L.color}" aria-label="Progress">${steps.map((n, i) => `<li class="${i < cur ? "done" : i === cur ? "cur" : ""}"${i === cur ? ' aria-current="step"' : ""}><i></i>${n}</li>`).join("")}</ol>
<section id="stage" class="stage" style="--c:${L.color};--ci:${L.ink}"></section>`;
    const stage = $("#stage");
    if (phase === "brief") {
      stage.innerHTML = `<article class="card brief">${withDiagrams(st.brief)}</article>
<div class="actions"><button class="btn" id="go">Start the challenge →</button><span class="muted">${st.tasks.length} tasks</span></div>`;
      $("#go").onclick = () => { run.phase = "task"; run.ti = 0; renderStation(); scrollToStage(); };
    } else if (phase === "task") {
      const t = st.tasks[run.ti];
      stage.innerHTML = `<div class="taskhead"><span class="tasktype">${TYPE[t.type]}</span><span class="muted">Task ${run.ti + 1} of ${st.tasks.length}</span></div>
<article class="card task" id="task"></article><div id="fb" aria-live="polite"></div>`;
      ENGINES[t.type](t, $("#task"), taskDone);
    } else {
      const prev = S.cleared[st.id];
      const rec = { t: Date.now(), miss: run.miss };
      if (!prev || rec.miss < prev.miss) S.cleared[st.id] = rec;
      save();
      hud();
      const nx = nextStation();
      stage.innerHTML = `
<div class="ticket" style="--c:${L.color}">
  <div class="tk-main">
    <p class="kicker">eMAPT Line · single journey</p>
    <h2>${esc(st.name)}</h2>
    <dl>
      <div><dt>Line</dt><dd>L${L.n} ${esc(L.name)}</dd></div>
      <div><dt>Tasks</dt><dd>${st.tasks.length}</dd></div>
      <div><dt>Wrong tries</dt><dd>${rec.miss}</dd></div>
      <div><dt>Arrival</dt><dd>${resultText(rec)}</dd></div>
    </dl>
    ${prev && prev.miss <= rec.miss ? `<p class="muted small">Your best ride here is still ${resultText(prev).toLowerCase()}.</p>` : ""}
  </div>
  <div class="tk-stub">${stampSVG(st, rec, "land")}</div>
</div>
<div class="actions">
  <a class="btn" href="#/">${nx && nx.playable ? `Ride on to ${esc(nx.name)} →` : "Back to the map →"}</a>
  <button class="btn ghost" id="again">Ride this station again</button>
</div>`;
      $("#again").onclick = () => { run = { st, phase: "brief", ti: 0, miss: 0 }; renderStation(); };
    }
  }
  const scrollToStage = () => { const s = $(".steps"); if (s) s.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); };

  function taskDone(miss, e, reveal) {
    run.miss += miss;
    const last = run.ti === run.st.tasks.length - 1;
    const head = reveal ? "Not this time" : miss ? `Solved, after ${miss} wrong ${miss > 1 ? "tries" : "try"}` : "Correct, first try";
    $("#fb").innerHTML = `<div class="fb ${miss ? "late" : "ok"}">
  <p class="fb-head">${head}${miss ? ` <span>+${miss * 2} min</span>` : ""}</p>
  ${reveal ? `<p>${reveal}</p>` : ""}<p>${e}</p>
  <button class="btn" id="next">${last ? "Get your ticket stamped →" : "Next task →"}</button></div>`;
    const b = $("#next");
    b.onclick = () => {
      if (last) run.phase = "stamp"; else run.ti++;
      renderStation();
      scrollToStage();
    };
    b.focus({ preventScroll: true });
    $("#fb").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }

  const shake = (el) => { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };

  // ───────────── The 6 challenge engines ─────────────
  const ENGINES = {
    mcq(t, el, done) {
      const q = Q[t.id];
      const ord = shuffle(q.o.map((_, i) => i));
      el.innerHTML = `<p class="q">${esc(q.q)}</p><div class="opts">${ord.map((oi, k) =>
        `<button class="opt" data-i="${oi}"><span class="key">${"ABCD"[k]}</span><span>${esc(q.o[oi])}</span></button>`).join("")}</div>`;
      $$(".opt", el).forEach((b) => (b.onclick = () => {
        const ok = +b.dataset.i === q.a;
        $$(".opt", el).forEach((x) => { x.disabled = true; if (+x.dataset.i === q.a) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        done(ok ? 0 : 1, esc(q.e), ok ? null : `The answer is <b>${esc(q.o[q.a])}</b>.`);
      }));
    },

    term(t, el, done) {
      let tries = 0;
      el.innerHTML = `<p class="q">${t.prompt}</p>
<div class="term"><div class="term-bar"><i></i><i></i><i></i><span>student@lab: ~</span></div>
<div class="term-out" id="tout"></div>
<form class="term-line" autocomplete="off"><label class="ps" for="tin">$</label><input id="tin" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type a command and press Enter"><button class="btn sm" type="submit">Run</button></form></div>
<p class="hint" hidden></p>`;
      const out = $("#tout", el), inp = $("#tin", el), form = $("form", el), hint = $(".hint", el);
      const print = (txt, cls) => { const d = document.createElement("div"); d.className = cls; d.innerHTML = txt; out.appendChild(d); out.scrollTop = out.scrollHeight; };
      const KNOWN = ["adb", "ls", "apktool", "dumpsys", "pm", "su", "cat", "frida", "jadx", "jadx-gui", "objection", "am", "content"];
      form.onsubmit = (e) => {
        e.preventDefault();
        const raw = inp.value, cmd = raw.trim().replace(/\s+/g, " ");
        if (!cmd) return;
        inp.value = "";
        print(`<span class="ps">$</span> ${esc(raw.trim())}`, "cmd");
        if (t.accept.some((r) => r.test(cmd))) {
          print(esc(t.out), "out");
          inp.disabled = true;
          $("button", form).disabled = true;
          return done(tries, t.e);
        }
        tries++;
        const w = cmd.split(" ")[0];
        print(KNOWN.includes(w) ? "That command runs, but it does not do what this task asks. Check the arguments." : `bash: ${esc(w)}: command not found`, "err");
        if (tries >= 2) { hint.hidden = false; hint.innerHTML = `<b>Hint:</b> ${t.hint}`; }
        if (tries >= 4) hint.innerHTML += `<br><b>Answer:</b> <code>${esc(t.solution)}</code>`;
        shake($(".term", el));
      };
      inp.focus({ preventScroll: true });
    },

    spot(t, el, done) {
      const bugs = Object.keys(t.bugs).map(Number), found = new Set();
      let miss = 0;
      el.innerHTML = `<p class="q">${t.prompt}</p>
<div class="code"><div class="code-bar"><span>${esc(t.file)}</span><span class="found">0 / ${bugs.length} found</span></div>
<ol class="codelines">${t.lines.map((l, i) => `<li><button class="ln" data-i="${i}"><code>${esc(l)}</code></button></li>`).join("")}</ol></div>
<div class="linenote" aria-live="polite"></div>`;
      const note = $(".linenote", el);
      $$(".ln", el).forEach((b) => (b.onclick = () => {
        const i = +b.dataset.i;
        if (found.has(i) || b.classList.contains("fine")) return;
        if (t.bugs[i]) {
          found.add(i);
          b.classList.add("bug");
          note.className = "linenote bad";
          note.innerHTML = `<b>Line ${i + 1}:</b> ${t.bugs[i]}`;
          $(".found", el).textContent = `${found.size} / ${bugs.length} found`;
          if (found.size === bugs.length) {
            $$(".ln", el).forEach((x) => (x.disabled = true));
            done(miss, `${bugs.map((n) => `<b>Line ${n + 1}:</b> ${t.bugs[n]}`).join("<br>")}<br>${t.e}`);
          }
        } else {
          miss++;
          b.classList.add("fine");
          shake(b);
          note.className = "linenote";
          note.innerHTML = `<b>Line ${i + 1} is fine.</b> ${t.notes && t.notes[i] ? t.notes[i] : ""}`;
        }
      }));
    },

    hook(t, el, done) {
      let miss = 0;
      const code = esc(t.code).replace(/\{(\d)\}/g, (_, n) => {
        const b = t.blanks[n];
        return `<select class="blank" data-n="${n}" aria-label="Blank ${+n + 1}"><option value="">choose…</option>${shuffle(b.o.map((_, i) => i)).map((i) => `<option value="${i}">${esc(b.o[i])}</option>`).join("")}</select>`;
      });
      el.innerHTML = `<p class="q">${t.prompt}</p>
<div class="code"><div class="code-bar"><span>hook.js</span><span>frida -U -f com.els.safenote -l hook.js</span></div><pre class="hookcode">${code}</pre></div>
<div class="actions"><button class="btn" id="runhook">Run the hook ▸</button><span class="muted small" id="hmsg"></span></div>
<div class="term-out solo" hidden></div>`;
      const sels = $$(".blank", el), msg = $("#hmsg", el), out = $(".term-out", el);
      sels.forEach((s) => (s.onchange = () => s.classList.remove("wrong")));
      $("#runhook", el).onclick = () => {
        if (sels.some((s) => s.value === "")) { msg.textContent = "Fill every blank first."; return; }
        const bad = sels.filter((s) => +s.value !== t.blanks[s.dataset.n].a);
        out.hidden = false;
        if (bad.length) {
          miss++;
          bad.forEach((s) => s.classList.add("wrong"));
          msg.textContent = `${bad.length} blank${bad.length > 1 ? "s are" : " is"} wrong. Try again.`;
          out.innerHTML = `<div class="err">Error: the hook did not change the method. Check the red blank${bad.length > 1 ? "s" : ""}.</div>`;
          shake($(".code", el));
          return;
        }
        sels.forEach((s) => { s.disabled = true; s.classList.add("right"); });
        $("#runhook", el).disabled = true;
        msg.textContent = "";
        out.innerHTML = `<div class="out">${esc(t.out)}</div>`;
        done(miss, t.e);
      };
    },

    match(t, el, done) {
      const L = shuffledIdx(t.pairs.length), R = shuffledIdx(t.pairs.length);
      el.innerHTML = `<p class="q">${t.prompt}</p>
<div class="match"><div class="col">${L.map((i) => `<button class="chip" data-s="l" data-i="${i}">${esc(t.pairs[i][0])}</button>`).join("")}</div>
<div class="col">${R.map((i) => `<button class="chip" data-s="r" data-i="${i}">${esc(t.pairs[i][1])}</button>`).join("")}</div></div>
<p class="muted small">Tap an item, then tap its partner in the other column.</p>`;
      let sel = null, miss = 0, n = 0;
      $$(".chip", el).forEach((c) => (c.onclick = () => {
        if (c.classList.contains("done")) return;
        if (!sel || sel.dataset.s === c.dataset.s) {
          if (sel) sel.classList.remove("sel");
          sel = sel === c ? null : c;
          if (sel) sel.classList.add("sel");
          return;
        }
        if (sel.dataset.i === c.dataset.i) {
          n++;
          [sel, c].forEach((x) => { x.classList.remove("sel"); x.classList.add("done"); x.disabled = true; x.dataset.n = n; });
          sel = null;
          if (n === t.pairs.length) done(miss, t.e);
        } else {
          miss++;
          shake(c); shake(sel);
          sel.classList.remove("sel");
          sel = null;
        }
      }));
    },

    order(t, el, done) {
      const idx = shuffledIdx(t.steps.length);
      let next = 0, miss = 0;
      el.innerHTML = `<p class="q">${t.prompt}</p><ol class="seq"></ol>
<div class="pool">${idx.map((i) => `<button class="chip" data-i="${i}">${esc(t.steps[i])}</button>`).join("")}</div>
<p class="muted small">Tap the steps in order, starting with the first one.</p>`;
      const seq = $(".seq", el);
      $$(".pool .chip", el).forEach((c) => (c.onclick = () => {
        if (+c.dataset.i !== next) { miss++; shake(c); return; }
        const li = document.createElement("li");
        li.textContent = t.steps[next];
        seq.appendChild(li);
        c.remove();
        if (++next === t.steps.length) done(miss, t.e);
      }));
    },
  };

  // ───────────── Travel Pass ─────────────
  function pagePass() {
    const n = clearedCount(), recs = Object.values(S.cleared), onTime = recs.filter((r) => !r.miss).length;
    view.innerHTML = `
<header class="passhead"><p class="kicker">Travel Pass</p><h1>Your stamps</h1>
<div class="stats"><div><b>${n}</b><span>stations stamped</span></div><div><b>${n ? Math.round((onTime / n) * 100) : 0}%</b><span>on time</span></div><div><b>${ORDER.filter((s) => s.playable).length}</b><span>stations open now</span></div></div></header>
${M.lines.map((L) => `<section class="passline" style="--c:${L.color}">
  <h2>${badge(L)} ${esc(L.name)} ${L.playable ? "" : '<span class="tag">Step 2</span>'}</h2>
  <div class="stamps">${L.stations.map((st) => S.cleared[st.id]
    ? `<a class="slot" href="#/s/${st.id}">${stampSVG(st, S.cleared[st.id])}<span>${esc(st.name)}</span></a>`
    : `<div class="slot empty"><i></i><span>${esc(st.name)}</span></div>`).join("")}</div>
</section>`).join("")}
<section class="card tools"><h2>Move your progress</h2>
<p class="muted">Progress is saved in this browser only. To continue on another device, export it here and import the file there.</p>
<div class="actions"><button class="btn" id="exp">Export progress</button><label class="btn ghost" for="imp">Import progress</label><input type="file" id="imp" accept="application/json,.json" hidden><button class="btn ghost danger" id="rst">Reset everything</button></div>
<p class="muted small" id="pmsg" aria-live="polite"></p></section>`;
    const msg = $("#pmsg");
    $("#exp").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }));
      a.download = "emapt-line-progress.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $("#imp").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then((txt) => {
        const d = JSON.parse(txt), cl = {};
        Object.entries(d.cleared || {}).forEach(([k, v]) => { if (BYID[k] && v && typeof v.miss === "number") cl[k] = { t: +v.t || Date.now(), miss: v.miss }; });
        S = Object.assign(fresh(), { cleared: cl });
        save(); hud(); pagePass();
        $("#pmsg").textContent = `Imported ${Object.keys(cl).length} stamps.`;
      }).catch(() => (msg.textContent = "That file could not be read."));
    };
    $("#rst").onclick = () => {
      if (!confirm("Erase all stamps and move the train back to Platform 0?")) return;
      S = fresh(); save(); hud(); pagePass();
    };
  }

  // ───────────── Router ─────────────
  function route() {
    const [p, a] = location.hash.replace(/^#\/?/, "").split("/");
    $$(".nav a").forEach((l) => l.classList.toggle("on", l.dataset.r === (p === "pass" ? "pass" : "map")));
    if (p === "line") pageLine(a);
    else if (p === "s") pageStation(a);
    else if (p === "pass") pagePass();
    else pageMap();
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
    hud();
  }
  addEventListener("hashchange", route);
  route();
})();
