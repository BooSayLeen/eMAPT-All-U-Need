# Instructions for Claude in this repo

This is **eMAPT//TRAINER**, the public static study website for the eMAPT exam, served by GitHub Pages from `main` (root).
**Project memory:** `DOCUMENTATION.md.enc` (encrypted). The owner gives you the password in chat. Decrypt it and read it fully before doing anything:
```bash
DOC_PASS='<password>' openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -a -in DOCUMENTATION.md.enc -out DOCUMENTATION.md -pass env:DOC_PASS
```
At the end of a session, update `DOCUMENTATION.md`, re-encrypt it (same command with `-salt` and without `-d`, input/output swapped),
commit **only** the `.enc` file (the plain file is git-ignored), and copy the plain file to the private repo `BooSayLeen/eMAPT-Prep`. Never write the password in any file.

- The owner is new to GitHub. Do all the git work, commit and push directly to `main`, and explain things simply.
- No build step: plain HTML/CSS/JS. Keep it that way unless the owner agrees otherwise.
- Questions live only in `js/data.js` (format in README). Keep ids unique, give 4 options each, and write beginner-friendly explanations.
- Before pushing UI changes: serve locally (`python3 -m http.server`) and check desktop and phone widths in Playwright, with no console errors.
- After each session, update the documentation (above) and `eMAPT-Prep/PROGRESS.md`.

## Phase plan
- **Phase 1 (done):** HQ dashboard, orbit map, spaced-repetition training, 45-Q mock exam, Frida builder, profile/export.
- **Phase 2 (next):** flashcards, interactive labs (step-by-step with hints), searchable cheatsheet, more questions (target 150+).
