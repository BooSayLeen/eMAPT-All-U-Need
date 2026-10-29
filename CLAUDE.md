# Instructions for Claude in this repo

This is **eMAPT//TRAINER**, the public static study website for the eMAPT exam, served by GitHub Pages from `main` (root).
The owner's private notes and progress log live in `BooSayLeen/eMAPT-Prep` (read its `PROGRESS.md` for context).

- The owner is new to GitHub. Do all the git work, commit and push directly to `main`, and explain things simply.
- No build step: plain HTML/CSS/JS. Keep it that way unless the owner agrees otherwise.
- Questions live only in `js/data.js` (format in README). Keep ids unique, give 4 options each, and write beginner-friendly explanations.
- Before pushing UI changes: serve locally (`python3 -m http.server`) and check desktop and phone widths in Playwright, with no console errors.
- After each session, add a dated entry to the session log in `eMAPT-Prep/PROGRESS.md`.

## Phase plan
- **Phase 1 (done):** HQ dashboard, orbit map, spaced-repetition training, 45-Q mock exam, Frida builder, profile/export.
- **Phase 2 (next):** flashcards, interactive labs (step-by-step with hints), searchable cheatsheet, more questions (target 150+).
