#!/usr/bin/env node
// Compare token cost of moving + updating references using:
//   Approach A — Read + Write + Delete (anti-pattern)
//   Approach B — git mv + Grep + StrReplace (low-token-copy skill)
//
// Deterministic: uses the standard ~4 chars/token heuristic and a fixed
// per-tool-call envelope. No model calls, no randomness.
//
// Usage:
//   node tests/compare-approaches.mjs            # print table
//   node tests/compare-approaches.mjs --write    # also update README.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const CHARS_PER_TOKEN = 4;
const TOOL_ENVELOPE = 20;
const STRREPLACE_OUT = 40;
const SHELL_OUT = 30;
const DELETE_OUT = 5;
const GREP_PER_HIT = 30;

const tokens = (s) => Math.ceil(s.length / CHARS_PER_TOKEN);

function scanDir(absDir) {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) out.push(...scanDir(full));
    else if (entry.isFile()) {
      const content = fs.readFileSync(full, "utf8");
      out.push({ path: path.relative(repoRoot, full), tokens: tokens(content) });
    }
  }
  return out;
}

function fileFromPath(relPath) {
  const abs = path.join(repoRoot, relPath);
  const content = fs.readFileSync(abs, "utf8");
  return { path: relPath, tokens: tokens(content) };
}

function synth(prefix, count, lineLen) {
  // Approx 30 chars per line of code → tokens per file = ceil(lineLen*30/4)
  const t = Math.ceil((lineLen * 30) / CHARS_PER_TOKEN);
  return Array.from({ length: count }, (_, i) => ({ path: `${prefix}${i}.ts`, tokens: t }));
}

// ---------- Cost models ----------

function approachA(moveFiles, consumerFiles) {
  let inTok = 0, outTok = 0, calls = 0;
  for (const f of moveFiles) {
    inTok += f.tokens;             calls++; // Read
    outTok += f.tokens;            calls++; // Write at new path
    outTok += DELETE_OUT;          calls++; // Delete original
  }
  for (const c of consumerFiles) {
    inTok += c.tokens;             calls++; // Read whole consumer
    outTok += STRREPLACE_OUT;      calls++; // StrReplace (or Write)
  }
  const overhead = calls * TOOL_ENVELOPE;
  return { in: inTok, out: outTok, overhead, total: inTok + outTok + overhead, calls };
}

function approachB(moveFiles, consumerFiles) {
  let inTok = 0, outTok = 0, calls = 0;

  // 1 shell call: `git mv old-dir new-dir` regardless of file count
  outTok += SHELL_OUT;             calls++;

  // 1 grep call to discover consumer files
  outTok += SHELL_OUT;             calls++;
  inTok += consumerFiles.length * GREP_PER_HIT; // grep returns paths only

  // StrReplace per consumer file (no pre-Read)
  for (const _ of consumerFiles) {
    outTok += STRREPLACE_OUT;      calls++;
  }

  const overhead = calls * TOOL_ENVELOPE;
  return { in: inTok, out: outTok, overhead, total: inTok + outTok + overhead, calls };
}

const pct = (a, b) => ((1 - b / a) * 100).toFixed(1);

// ---------- Scenarios ----------

const FIXTURE = path.join("tests", "fixtures", "sample-module");
const sandboxMove = scanDir(path.join(repoRoot, FIXTURE, "src", "lib", "helpers"));
const sandboxConsumer = fs.existsSync(path.join(repoRoot, FIXTURE, "src", "app.ts"))
  ? [fileFromPath(`${FIXTURE.replace(/\\/g, "/")}/src/app.ts`)]
  : [];

const scenarios = [
  {
    name: "Sandbox (real files: 3 helpers + 1 consumer)",
    move: sandboxMove,
    consumer: sandboxConsumer,
  },
  {
    name: "Tiny: 1 file × 50 lines, 1 consumer",
    move: synth("m", 1, 50),
    consumer: synth("c", 1, 30),
  },
  {
    name: "Small module: 5 files × 100 lines, 3 consumers",
    move: synth("m", 5, 100),
    consumer: synth("c", 3, 60),
  },
  {
    name: "Medium reorg: 10 files × 200 lines, 5 consumers",
    move: synth("m", 10, 200),
    consumer: synth("c", 5, 80),
  },
  {
    name: "Large reorg: 20 files × 500 lines, 12 consumers",
    move: synth("m", 20, 500),
    consumer: synth("c", 12, 100),
  },
];

const rows = scenarios
  .filter((s) => s.move.length > 0)
  .map((s) => {
    const a = approachA(s.move, s.consumer);
    const b = approachB(s.move, s.consumer);
    return {
      name: s.name,
      aTotal: a.total, aCalls: a.calls, aOut: a.out,
      bTotal: b.total, bCalls: b.calls, bOut: b.out,
      saved: a.total - b.total,
      savedPct: pct(a.total, b.total),
      outSavedPct: pct(a.out, b.out),
    };
  });

// ---------- Output ----------

const fmt = (n) => n.toLocaleString("en-US");

function printTable() {
  const header = `\nLow-Token-Copy: Approach Comparison`;
  const note = `(Heuristic: ${CHARS_PER_TOKEN} chars/token, ${TOOL_ENVELOPE} tokens tool envelope.)\n`;
  console.log(header);
  console.log("=".repeat(header.length - 1));
  console.log(note);
  const cols = [
    ["Scenario", 48],
    ["A tokens", 12],
    ["B tokens", 12],
    ["Saved", 12],
    ["Saved %", 9],
    ["Out %", 9],
    ["A calls", 9],
    ["B calls", 9],
  ];
  console.log(cols.map(([n, w]) => String(n).padEnd(w)).join(""));
  console.log(cols.map(([, w]) => "-".repeat(w - 1) + " ").join(""));
  for (const r of rows) {
    console.log(
      [
        r.name.padEnd(48),
        fmt(r.aTotal).padEnd(12),
        fmt(r.bTotal).padEnd(12),
        fmt(r.saved).padEnd(12),
        `${r.savedPct}%`.padEnd(9),
        `${r.outSavedPct}%`.padEnd(9),
        String(r.aCalls).padEnd(9),
        String(r.bCalls).padEnd(9),
      ].join(""),
    );
  }
  console.log();
}

function buildMarkdown() {
  const lines = [
    `<!-- BENCHMARK-COPY:START -->`,
    `<!-- Generated by tests/compare-approaches.mjs. Do not edit by hand. -->`,
    ``,
    `Heuristic: ~${CHARS_PER_TOKEN} chars/token, ${TOOL_ENVELOPE} tokens per tool-call envelope.`,
    `"Out %" is savings on **output** tokens specifically (the expensive direction).`,
    ``,
    `| Scenario | Approach A (Read+Write+Delete) | Approach B (git mv + Grep + StrReplace) | Saved | Saved % | Output % | A calls | B calls |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|`,
    ...rows.map(
      (r) =>
        `| ${r.name} | ${fmt(r.aTotal)} | ${fmt(r.bTotal)} | ${fmt(r.saved)} | ${r.savedPct}% | ${r.outSavedPct}% | ${r.aCalls} | ${r.bCalls} |`,
    ),
    ``,
    `<!-- BENCHMARK-COPY:END -->`,
  ];
  return lines.join("\n");
}

function writeReadme() {
  const readmePath = path.join(repoRoot, "README.md");
  const original = fs.readFileSync(readmePath, "utf8");
  const block = buildMarkdown();
  const startTag = "<!-- BENCHMARK-COPY:START -->";
  const endTag = "<!-- BENCHMARK-COPY:END -->";
  let updated;
  if (original.includes(startTag) && original.includes(endTag)) {
    const before = original.slice(0, original.indexOf(startTag));
    const after = original.slice(original.indexOf(endTag) + endTag.length);
    updated = before + block + after;
  } else {
    updated = original.trimEnd() + "\n\n## Benchmark\n\n" + block + "\n";
  }
  fs.writeFileSync(readmePath, updated);
  console.log(`Updated ${path.relative(repoRoot, readmePath)} between BENCHMARK markers.`);
}

printTable();
if (process.argv.includes("--write")) writeReadme();
