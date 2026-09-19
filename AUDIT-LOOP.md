# Craps CS / UX / UI / appearance loop

Live: https://craps-companion-nine.vercel.app  
Repo: `C:\Users\2D\Projects\Project-4-Craps\web` (GitHub `2D-Ramon/craps-companion`)

Paste the prompt at the bottom into a new Grok turn. Do not stop until every score is 10, or a score is blocked on a human decision (final wordmark, legal, original photography). Never inflate a 10.

## Current scores (cycle 3, 2026-09-19)

| Area | Cycle 2 | After cycle 3 |
|------|------:|------------------|
| CX (customer experience) | 8.0 | **8.3** |
| UX | 8.0 | **8.4** |
| UI | 8.0 | **8.3** |
| Appearance | 8.0 | **8.0** |

### Cycle 1 shipped

- Buy-in how-to, sticky Start, dice-first live, empty states, pit chrome

### Cycle 2 shipped

- Live **Coach** toggle (default off): one line of what’s on the table right now
- Light haptic on dice / total tap
- Strategy builder chips grouped Place / Buy / Lay
- Create-a-strategy above templates; yours listed first
- History cards: pit chrome + last-12 roll strip

### Cycle 3 shipped

- Coach “Next:” skips seven-out / wrong-phase rules
- Preview come-out / point / if-when in collapsible sections

### Still open (next cycle)

- Come bets in the plan still not auto-settled live
- Preview still long even collapsed
- Practice vs live still two looks (**partially by design**)
- No original wordmark (**blocked**: human brand)
- No photography (**blocked**)
- Android `<select>` contrast still weak on some devices

---

## Loop prompt (copy everything below)

You are continuing the Craps companion (`C:\Users\2D\Projects\Project-4-Craps\web`, live https://craps-companion-nine.vercel.app). Follow `ship-live`: the turn is not done until the production URL serves the change.

Loop until **CX, UX, UI, and Appearance** are each **10/10**, or a gap is blocked on a human (final wordmark, attorney, original art).

Each cycle:

1. Audit the **live site** and the code. Exercise: buy-in, create-strategy (speak/stop/add instruction/preview), start session, tap dice, undo, history replay, stats, rules, practice (portrait), 404, mobile width (~390px).
2. Score CX, UX, UI, Appearance out of 10 with one-sentence evidence. A 10 means a first-time player at River Spirit could buy in, pick a system, step away, tap a roll, and not hit leftover demo copy, a dead end, or a template look.
3. Name the **largest gap in the lowest-scoring area**. Write a short plan (3–7 concrete changes).
4. Apply those changes. Do not fake success. Do not stop at localhost.
5. Verify on the **live** URL after push. Check the changed screens plus one other page that shares the component.
6. Update `AUDIT-LOOP.md` scores and “still open”. Commit and push so Vercel deploys.
7. If any score is under 10 and not blocked, **immediately start the next cycle** in the same turn. Repeat.

Constraints: tracker/coach only (no real-money casino). Live screen stays a 3-second glance. English. Keep gold/felt, not generic SaaS dark mode.

Start the next cycle now.
