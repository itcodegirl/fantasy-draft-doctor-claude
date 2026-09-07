# Phase 3 work-in-progress — NOT WIRED IN

These files are deliberately outside `src/` so Chrome cannot load them and nothing
imports them by accident. They carry known, uncorrected defects:

- `engine.js` — survival probability is unconditioned (needs conditioning on the player
  being available now); the upside/dispersion metric conflates ADP disagreement with
  scoring variance and must be removed; baselines are recomputed per call instead of
  computed once and held fixed.
- `recommend.js` — falls back to `rank` when `adp` is null and feeds it into ADP math;
  rank and ADP are different measurements. Emits numeric survival percentages and a
  joint tier-extinction figure that assume independence between picks.

Do not move these into `src/` until those are fixed and validated.
