---
name: low-token-copy
description: Use direct filesystem ops (mv, cp, git mv, Move-Item, Copy-Item) for file copies, moves, and renames instead of read-then-write patterns, then update references. Use when copying, moving, renaming, relocating, or duplicating files or directories.
---

# Low Token Copy

Copy or move files with a real filesystem operation. Do not read a file into context just to re-emit it at a new path — that wastes tokens proportional to file size.

## Rule

1. Use a dedicated copy/move tool if the environment exposes one.
2. Otherwise use the OS-appropriate shell command below.
3. Only fall back to read + write when the destination must differ from the source in ways that genuinely require partial-content edits — and even then, copy first, then edit at the new path.

For tracked files, prefer `git mv` so rename history is preserved.

## Shell Examples

Pick the command that matches the current OS. Do not write a helper script just to perform a copy or move.

```powershell
# Windows PowerShell
Move-Item "old/path.ts" "new/path.ts"
Copy-Item "source/path.ts" "dest/path.ts"
Copy-Item -Recurse "source/dir" "dest/dir"
New-Item -ItemType Directory -Force -Path "new/directory"
```

```bash
# macOS / Linux / POSIX
mv "old/path.ts" "new/path.ts"
cp "source/path.ts" "dest/path.ts"
cp -R "source/dir" "dest/dir"
mkdir -p "new/directory"

# Tracked files
git mv "old/path.ts" "new/path.ts"
```

## Required Follow-Up

After the filesystem operation:

1. Update imports, exports, and barrel files that referenced the old path.
2. Update tests, mocks, fixtures, and snapshots.
3. Update docs, configs, and build manifests that hardcode paths.
4. Delete obsolete originals only after confirming no remaining references.
5. Run targeted verification (typecheck, lint, or test) for the affected area.
