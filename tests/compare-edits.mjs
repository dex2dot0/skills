#!/usr/bin/env node
// Compare token cost of in-file edits using:
//   Approach A — Read + Write (full-file rewrite, common agent default)
//   Approach B — StrReplace patches scoped to the actual change (low-token-edit skill)
//
// Deterministic: uses the standard ~4 chars/token heuristic and a fixed
// per-tool-call envelope. No model calls, no randomness.
//
// Usage:
//   node tests/compare-edits.mjs            # print table
//   node tests/compare-edits.mjs --write    # also update README.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const CHARS_PER_TOKEN = 4;
const TOOL_ENVELOPE = 20;

// Realistic-B overhead factor: real agents add slip cost on top of optimal
// (occasional pre-Reads, post-edit verification reads, failed StrReplace + retry).
// Empirically observed in this repo's own session at ~25-40% of optimal.
const REALISTIC_OVERHEAD = 0.30;
// Per-failed-StrReplace retry cost: roughly the patch size again, since the
// agent re-issues with adjusted old_string.
const STRREPLACE_RETRY_RATE = 0.15;

// Scenarios model in-file edits on a file of `file` tokens, where `changes`
// is an array of { old, new } token counts for each StrReplace patch needed.
// `changes: null` represents a "total rewrite" where Write is unavoidable
// (no stable anchors remain to patch against).
const scenarios = [
  {
    name: "Typo fix (1 char) in 500-token file",
    file: 500,
    changes: [{ old: 20, new: 20 }],
    note: "~0.1% change",
  },
  {
    name: "Paragraph rewrite in 1,000-token file",
    file: 1000,
    changes: [{ old: 80, new: 100 }],
    note: "~10% change",
  },
  {
    name: "Add 200-token section to 1,500-token doc",
    file: 1500,
    changes: [{ old: 40, new: 240 }],
    note: "~15% new content",
  },
  {
    name: "Rename term across 2,000-token file (replace_all)",
    file: 2000,
    changes: [{ old: 15, new: 15 }],
    note: "1 call, 8+ hits",
  },
  {
    name: "Multi-change: 4 edits in 2,000-token file",
    file: 2000,
    changes: [
      { old: 30, new: 30 },
      { old: 50, new: 60 },
      { old: 40, new: 45 },
      { old: 80, new: 90 },
    ],
    note: "~15% change",
  },
  {
    name: "Major restructure (~60%) in 2,000-token file",
    file: 2000,
    changes: [
      { old: 200, new: 250 },
      { old: 150, new: 200 },
      { old: 180, new: 220 },
      { old: 220, new: 280 },
      { old: 160, new: 200 },
    ],
    note: "5 patches, patches ≈ file",
  },
  {
    name: "Total rewrite (~95%) of 2,000-token file",
    file: 2000,
    changes: null,
    note: "Write is honest",
  },
  // Unfavorable scenarios for B: cases where the savings narrow or invert.
  {
    name: "Edge: many tiny scattered edits (10×) requiring context",
    file: 1500,
    // Each StrReplace needs ~150 tokens of context for unique anchor
    changes: Array.from({ length: 10 }, () => ({ old: 150, new: 160 })),
    note: "Anchors balloon patch size",
  },
  {
    name: "Edge: 1 small edit in a tiny 200-token file",
    file: 200,
    changes: [{ old: 30, new: 30 }],
    note: "Small file = small absolute savings",
  },
];

// ---------- Cost models ----------

function approachA(s) {
  // Read the whole file + Write the whole file.
  const inTok = s.file;
  const outTok = s.file;
  const calls = 2;
  const overhead = calls * TOOL_ENVELOPE;
  return { in: inTok, out: outTok, overhead, calls, total: inTok + outTok + overhead };
}

function approachB(s) {
  // Skill default: no pre-Read; one StrReplace per change, costing old+new tokens.
  // When changes is null, patch isn't viable → fall back to Write.
  if (!s.changes) {
    const outTok = s.file;
    const calls = 1;
    return { in: 0, out: outTok, overhead: calls * TOOL_ENVELOPE, calls, total: outTok + calls * TOOL_ENVELOPE, fellBack: true };
  }
  const outTok = s.changes.reduce((sum, c) => sum + c.old + c.new, 0);
  const calls = s.changes.length;
  const overhead = calls * TOOL_ENVELOPE;
  return { in: 0, out: outTok, overhead, calls, total: outTok + overhead };
}

// Realistic-B: optimal-B + slip overhead + StrReplace retry cost.
function approachBRealistic(s) {
  const optimal = approachB(s);
  if (optimal.fellBack) return optimal; // Write fallback has no slips to add
  const baseOverhead = Math.round(optimal.total * REALISTIC_OVERHEAD);
  // Failed-and-retried StrReplaces add ~one extra patch worth of cost each.
  const expectedRetries = (s.changes.length * STRREPLACE_RETRY_RATE);
  const avgPatchCost = optimal.out / Math.max(1, s.changes.length);
  const retryCost = Math.round(expectedRetries * avgPatchCost);
  const totalOverhead = baseOverhead + retryCost;
  const extraCalls = Math.max(0, Math.round(expectedRetries));
  return {
    in: optimal.in + Math.round(totalOverhead * 0.3),
    out: optimal.out + Math.round(totalOverhead * 0.7),
    overhead: optimal.overhead,
    total: optimal.total + totalOverhead,
    calls: optimal.calls + extraCalls,
  };
}

const pct = (a, b) => ((1 - b / a) * 100).toFixed(1);

// ---------- Run ----------

const rows = scenarios.map((s) => {
  const a = approachA(s);
  const b = approachB(s);
  const br = approachBRealistic(s);
  return {
    name: s.name,
    note: s.note,
    file: s.file,
    aTotal: a.total, aCalls: a.calls, aOut: a.out,
    bTotal: b.total, bCalls: b.calls, bOut: b.out, fellBack: b.fellBack === true,
    brTotal: br.total, brCalls: br.calls,
    saved: a.total - b.total,
    savedPct: pct(a.total, b.total),
    savedRealisticPct: pct(a.total, br.total),
    outSavedPct: pct(a.out, b.out),
  };
});

// ---------- Output ----------

const fmt = (n) => n.toLocaleString("en-US");

function printTable() {
  const header = `\nLow-Token-Edit: Approach Comparison`;
  console.log(header);
  console.log("=".repeat(header.length - 1));
  console.log(`(Heuristic: ${CHARS_PER_TOKEN} chars/token, ${TOOL_ENVELOPE} tokens tool envelope.)\n`);

  const cols = [
    ["Scenario", 54],
    ["A", 9],
    ["B opt", 9],
    ["B real", 9],
    ["Saved opt", 11],
    ["Saved real", 12],
    ["A calls", 9],
    ["B calls", 9],
  ];
  console.log(cols.map(([n, w]) => String(n).padEnd(w)).join(""));
  console.log(cols.map(([, w]) => "-".repeat(w - 1) + " ").join(""));
  for (const r of rows) {
    console.log(
      [
        r.name.padEnd(54),
        fmt(r.aTotal).padEnd(9),
        (fmt(r.bTotal) + (r.fellBack ? "*" : "")).padEnd(9),
        fmt(r.brTotal).padEnd(9),
        `${r.savedPct}%`.padEnd(11),
        `${r.savedRealisticPct}%`.padEnd(12),
        String(r.aCalls).padEnd(9),
        String(r.bCalls).padEnd(9),
      ].join(""),
    );
  }
  console.log(`\n* B falls back to Write (no patch viable). B opt = optimal skill execution. B real = +${Math.round(REALISTIC_OVERHEAD * 100)}% slip overhead + ${Math.round(STRREPLACE_RETRY_RATE * 100)}% StrReplace retry rate.\n`);
}

function buildMarkdown() {
  const lines = [
    `<!-- BENCHMARK-EDIT:START -->`,
    `<!-- Generated by tests/compare-edits.mjs. Do not edit by hand. -->`,
    ``,
    `Heuristic: ~${CHARS_PER_TOKEN} chars/token (±20–25% vs real tokenizers), ${TOOL_ENVELOPE} tokens per tool-call envelope.`,
    `**B opt** = optimal skill execution. **B real** = +${Math.round(REALISTIC_OVERHEAD * 100)}% slip overhead + ${Math.round(STRREPLACE_RETRY_RATE * 100)}% StrReplace retry rate (the empirically observed cost of imperfect agents).`,
    `\`*\` = Approach B fell back to Write because the change was near-total and patches were not viable.`,
    `See the methodology section above for what this model does and does not measure.`,
    ``,
    `| Scenario | A (Read+Write) | B opt | B real | Saved opt % | Saved real % | A calls | B calls |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|`,
    ...rows.map(
      (r) =>
        `| ${r.name} | ${fmt(r.aTotal)} | ${fmt(r.bTotal)}${r.fellBack ? "*" : ""} | ${fmt(r.brTotal)} | ${r.savedPct}% | ${r.savedRealisticPct}% | ${r.aCalls} | ${r.bCalls} |`,
    ),
    ``,
    `<!-- BENCHMARK-EDIT:END -->`,
  ];
  return lines.join("\n");
}

function writeReadme() {
  const readmePath = path.join(repoRoot, "README.md");
  const original = fs.readFileSync(readmePath, "utf8");
  const block = buildMarkdown();
  const startTag = "<!-- BENCHMARK-EDIT:START -->";
  const endTag = "<!-- BENCHMARK-EDIT:END -->";
  if (!original.includes(startTag) || !original.includes(endTag)) {
    console.error(`README.md is missing ${startTag} / ${endTag} markers; not writing.`);
    process.exit(1);
  }
  const before = original.slice(0, original.indexOf(startTag));
  const after = original.slice(original.indexOf(endTag) + endTag.length);
  fs.writeFileSync(readmePath, before + block + after);
  console.log(`Updated README.md between BENCHMARK-EDIT markers.`);
}

printTable();
if (process.argv.includes("--write")) writeReadme();
