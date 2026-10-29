<div align="center">

# 🚇 eMAPT Line

**A transit-map game for the INE eMAPT exam (Mobile Application Penetration Tester).**
Ride from your first `adb` command to **eMAPT Central**.

![Lines](https://img.shields.io/badge/lines-8_exam_domains-1f5fbf)
![Playable](https://img.shields.io/badge/playable-Lines_1–2-1f8a4c)
![Questions](https://img.shields.io/badge/question_bank-99-e0a100)
![Stack](https://img.shields.io/badge/stack-plain_HTML%2FJS-5b5a56)

</div>

## How it works

| | |
|---|---|
| 🗺️ **Network map** | 8 coloured lines, one for each exam domain, in learning order: Foundations → Threat Modeling → Static → RE → Dynamic → API → Malware → Reporting → **eMAPT Central** |
| 🚉 **Station** | A short **briefing** (a beginner lesson, sometimes with a diagram), then a **challenge**, then a **ticket stamp** |
| 🧩 **6 challenge types** | Terminal (type the real command) · Spot the bug (tap the bad line) · Fill the hook (Frida) · Match · Order the steps · Multiple-choice question |
| 🚆 **The train** | Stations open in order. Clear one and the train moves along the map |
| 🎫 **Travel Pass** | All your stamps. "On time" means no wrong tries. Export/import moves your progress between devices |

**Step 1 (now):** the map, the engine, and **Line 1 Foundations + Line 2 Threat Modeling** (10 stations).
**Step 2 (next):** Lines 3–8, a timed "Rush Hour" exam for each line, and eMAPT Central (the full 45-question mock).

Progress is saved **in your browser only**.

## Files

- `js/metro.js`: **the map and all station content** (briefings and challenges). The task formats are documented at the top of the file.
- `js/data.js`: the **question bank** (99 multiple-choice questions). Stations use these with `{ type: "mcq", id: "f2" }`.
- `js/app.js`: router, progress, map drawing, train animation, and the 6 challenge engines.
- `css/style.css`: the light, printed-transit-map style.

### Add a question
Add an object to `window.QUESTIONS` in [`js/data.js`](js/data.js):
```js
{ id: "s19", d: "static", q: "Question?", o: ["A", "B", "C", "D"], a: 0, e: "Why A is right, explained simply." },
```
`d` is one of `static, dynamic, api, found, threat, re, malware, report`. `a` is the index of the correct option. Options are shuffled when shown.

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
