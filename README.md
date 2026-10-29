<div align="center">

# 📱 eMAPT//TRAINER

**An interactive, animated study app for the INE eMAPT exam (Mobile Application Penetration Tester)**

![Questions](https://img.shields.io/badge/questions-99-22d3ee)
![Domains](https://img.shields.io/badge/exam_domains-8-a78bfa)
![Mock](https://img.shields.io/badge/mock_exam-45_Qs-f472b6)
![Stack](https://img.shields.io/badge/stack-plain_HTML%2FJS-a3e635)

</div>

## ✨ What's inside

| | Page | What it does |
|:-:|---|---|
| 🛰️ | **HQ** | Animated dashboard: readiness ring (weighted by exam domain), skill radar, streak, and your "next mission" |
| 🪐 | **Map** | The 8 exam domains as orbiting planets, sized by exam weight. Click one for its briefing |
| ⚔️ | **Train** | Spaced-repetition quiz: wrong answers return in 10 min, right ones after 1 → 3 → 7 → 16 days. Combos, XP, confetti |
| ⏱️ | **Mock Exam** | 45 questions drawn by real exam weight, a timer, flags, a PASS/FAIL stamp, a per-domain breakdown, and a review of misses |
| 🪝 | **Frida Lab** | A script builder for the 3 Frida moves (spy · force · call) plus the lab-app attack flow |
| 👤 | **Profile** | Level and XP, settings (sound, animations), export/import of progress between devices |

Progress is saved **in your browser only**. Use Profile → Export/Import to move it between your phone and PC.

## 🧱 How it's built

- Plain **HTML + CSS + JavaScript**, with no build step and no framework. GitHub Pages serves the files as they are.
- `js/data.js`: **all questions and domains** (edit this file to add questions).
- `js/app.js`: router, progress store, spaced repetition, and all pages.
- `js/fx.js`: animated background, confetti, sound effects.
- `css/style.css`: the "mobile HUD" theme, responsive down to phone size.

### Add a question
Add an object to `window.QUESTIONS` in [`js/data.js`](js/data.js):
```js
{ id: "s19", d: "static", q: "Question?", o: ["A", "B", "C", "D"], a: 0, e: "Why A is right, explained simply." },
```
`d` is one of `static, dynamic, api, found, threat, re, malware, report`, and `a` is the index of the correct option. Options are shuffled when shown.

## 🚀 Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
