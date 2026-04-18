# dex2dot0/skills

Open-source agent skills for the [skills.sh](https://skills.sh) ecosystem.

## Skills

### low-token-copy

Directs agents to use direct filesystem operations (`mv`, `cp`, `git mv`, `Move-Item`, `Copy-Item`) for file copies, moves, and renames instead of read-then-write patterns — saving tokens on bulk reorgs and large-file moves.

Install:

```bash
npx skills add dex2dot0/skills@low-token-copy
```

See [`skills/low-token-copy/SKILL.md`](skills/low-token-copy/SKILL.md).

## Layout

```
skills/
  <skill-name>/
    SKILL.md
```

Each skill is a directory whose name matches the `name` field in its `SKILL.md` frontmatter.
