# Craps CS / UX / UI / appearance loop

Live: https://craps-companion-nine.vercel.app  
Repo: `C:\Users\2D\Projects\Project-4-Craps\web` (GitHub `2D-Ramon/craps-companion`)

Paste the prompt at the bottom into a new Grok turn. Do not stop until every score is 10, or a score is blocked on a human decision (final wordmark, legal, original photography). Never inflate a 10.

## Current scores (cycle 1, 2026-09-19)

| Area | Before | After this cycle |
|------|------:|------------------|
| CX (customer experience) | 5.5 | **7.0** |
| UX | 6.0 | **7.5** |
| UI | 6.0 | **7.5** |
| Appearance | 6.5 | **7.5** |

### Cycle 1 shipped

- Buy-in: 3-step how-to; strategy chosen *before* Start; sticky Start names the strategy
- Live: dice pad immediately after bank/puck (rail glance then tap)
- Real dice faces on the pad
- Rules: “How this app works at the rail” above discipline
- History/stats empty states with a path back to Table; 404 “off the felt”
- Skip-to-content, focus rings, pit-card / pit-input / pit-btn, nav active underline
- Header no longer shows a developer version number

### Still open (next cycle)

- Strategy builder is still dense (many +Place/+Buy/+Lay chips wrap on a phone)
- Come bets are in the plan but not auto-settled live
- No in-session “what to bet next” coach line (product said toggle, default off)
- History list is plain cards, no roll-strip thumbnail
- Practice vs live still look like two products (black stadium vs felt)
- No original wordmark; “CRAPS” letter-spacing is a placeholder brand
- No haptics on dice tap besides goal hit
- Dark-on-dark selects still imperfect on some Androids

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
