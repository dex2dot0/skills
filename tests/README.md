# tests/

Test harness and benchmark fixtures for skills in this repo.

**Nothing in this directory is shipped to users by `npx skills add`.** Skills CLI installers fetch only `skills/<skill-name>/`; everything outside that subtree is repo infrastructure.

## Layout

```
tests/
  compare-approaches.mjs   # token-cost benchmark for low-token-copy
  fixtures/
    sample-module/         # fixture used by the benchmark
```

## Running

```bash
node tests/compare-approaches.mjs            # print results
node tests/compare-approaches.mjs --write    # also update README.md
```

Zero dependencies. Requires Node 18+.

## Adding a new skill benchmark

1. Add the fixture under `tests/fixtures/<descriptive-name>/`.
2. Add a scenario (real or synthetic) inside the relevant `compare-*.mjs` script.
3. Re-run with `--write` so the README table reflects the new numbers.
