# sample-module fixture

A small TypeScript module used by `tests/compare-approaches.mjs` to measure the real-file row of the `low-token-copy` benchmark.

**This is fixture data, not production code.** It is not shipped by `npx skills add`.

## Contents

- `src/lib/helpers/` — three helper files (strings, dates, arrays) and a barrel `index.ts`.
- `src/app.ts` — a consumer that imports from the helpers via several import paths (default, named, namespace).

## Why this layout

The benchmark simulates moving a directory and updating consumer references. The fixture is sized so that:

- The helpers have realistic content (~70–90 lines each) — large enough that the Read-then-Write anti-pattern has measurable cost.
- The consumer has multiple distinct import paths — so the reference-update step exercises `StrReplace replace_all`.

If you change file sizes here, the "Sandbox (real files)" row of the benchmark will move accordingly. Re-run with `--write` after edits.
