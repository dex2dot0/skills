---
name: low-token-edit
description: Performs in-file edits via targeted patches (StrReplace or equivalent) instead of full-file Write, including for markdown, docs, configs, and structured text. Use when editing, updating, restructuring, adding sections, or modifying files where changes touch a portion of the content.
---

# Low Token Edit

A patch costs tokens proportional to the change. A full Write costs tokens proportional to the whole file. For most edits the change is much smaller than the file, so prefer patches.

This skill names `StrReplace` and `Write` for clarity; substitute whatever your harness calls its targeted-patch tool and its full-file-write tool.

## Edit Rule

1. Use `StrReplace` (or your harness's equivalent patch tool) by default.
2. Use `Write` only when the change touches more than ~50% of the file.
3. Multiple `StrReplace` calls beat one `Write` below the 50% threshold.
4. `replace_all: true` collapses N identical renames into one call.

## Safety: Patches are Fail-Loud, Writes are Silent

The most common reason agents reach for `Write` is a sense that it is "safer" because they read the file first. The opposite is true:

| Tool | Behavior if file changed since last read |
|---|---|
| `StrReplace` | **Fails loudly** — `old_string` not found, no changes applied. |
| `Write` | **Silently overwrites** — concurrent changes are gone, no warning. |

Reading before `Write` does not protect you. There is a TOCTOU window between Read and Write; user typing, a linter, a git checkout, or another tool can land between them and you will clobber it. `StrReplace`'s `old_string` match is verified at write time and is the actual safety mechanism.

**If "don't lose user changes" is the concern, use `StrReplace`, not Read+Write.**

## When to Read First

Reading is for *constructing an accurate patch*, not for safety.

**Skip Read when:**
- You just edited the file this turn — your last tool result is current.
- The `old_string` is distinctive (full import line, YAML key, unique heading, code-fenced block).
- You will accept a clean failure and retry — one failed `StrReplace` (~50 tokens) is cheaper than always pre-Reading (hundreds to thousands).

**Read when:**
- First touch of the file this session and you do not know the target text.
- Many turns since your last edit, especially after a long user pause.
- You need surrounding context to make `old_string` unique.

**Cheaper middle ground:** to confirm a target exists or count occurrences, use `rg -c "the target" path/to/file` — ~20 tokens vs the full file body.

## Edit Patterns

| Change | Approach |
|---|---|
| Single targeted change | One `StrReplace` with the smallest unique substring around the change. |
| Multiple unrelated changes in one file | N `StrReplace` calls, batched in one tool turn. |
| Rename or terminology change throughout file | One `StrReplace` with `replace_all: true`. |
| Add a new section | One `StrReplace`; `old_string` = anchor heading/line, `new_string` = anchor + new content. |
| Delete a section | One `StrReplace` with `new_string` empty. |
| Reorder sections | Two `StrReplace` calls: delete from old location, insert at new. Not a `Write`. |
| Rewrite >50% of file | `Write` is honest — the rewrite is the actual change. |

## Anti-Patterns

- Reading then `Write`-ing an entire file to change one section.
- Reaching for `Write` because the change "feels structural" — measure the diff, not the vibe.
- Re-reading after a successful `StrReplace` to "see the new state." Trust the report.
- Tidying formatting with a full `Write` after a successful patch.
- Defaulting to `Write` for markdown, YAML, JSON, or prose because they have no compiler to punish a rewrite — the token cost is identical to rewriting code of the same size.

## Common Slip Patterns

Concrete tool sequences to recognize and stop.

### Slip 1 — Rewrite for a small change

```text
Read README.md            ← 1,200 input tokens
Write README.md (full)    ← 1,200 output tokens
```

Actual change: two heading renames + one new bullet. Honest patch is three `StrReplace` calls, ~150 output tokens total. **Count the diff, not the file.**

### Slip 2 — "Read to feel safe" before Write

```text
Read config.yaml          ← "to make sure I don't clobber"
Write config.yaml (full)
```

The Read does not protect you. `Write` clobbers regardless of what `Read` returned. **If clobbering is the concern, use `StrReplace`.**

### Slip 3 — Restructure framed as rewrite

```text
Read SKILL.md
Write SKILL.md (full body, sections reordered + tightened)
```

Most "restructures" are a small set of operations: rename a section, move a paragraph, tighten one example. Each is a `StrReplace`. List the operations first; only Write if the count exceeds your threshold *and* most content is genuinely new.

## Required Follow-Up

1. If the edit changed a public symbol, link path, or anchor, `rg` for references and patch them with `StrReplace replace_all` — do not Read each one.
2. If the file is part of a build, run targeted typecheck/lint for the affected file.
3. Skip post-edit verification reads unless something looked wrong. `StrReplace` reports replacement counts; trust it.
