---
name: jev
description: Wires TypeSafe Jev into a project using the jev-toolkit library -- SDK install, 1Password key resolution, confidence gating, and a smoke check. Use when adding TypeSafe or Jev to a project, setting up a System One client, or routing model answers by confidence.
---

# jev-toolkit wiring

This skill covers **wiring only**. The globally installed `typesafe-ai` skill
owns question design, the three primitives, confidence theory and doc
navigation -- read it for anything about what to ask. Do not restate it here.

Library: `~/workspace/__Tools/jev-toolkit`, consumed as a public git
dependency.

## What the SDK already does

Do not wrap these. `@typesafe-ai/sdk` exports `choice`, `score` and `noul`
builders, resolves `TYPESAFE_API_KEY` from the environment, and its client
takes `apiKey`, `baseURL`, `maxRetries` and `timeout`, defaulting the model
through `TYPESAFE_DEFAULT_MODEL` to `jev-latest`. It exports a typed error
hierarchy (`RateLimitError`, `APITimeoutError`, `AuthenticationError` and
others), and as of 0.7.0 the `image()`, `box()` and `withAssets` helpers for
multimodal requests. Do not wrap any of these; the toolkit adds only what is
missing.

## Set up a project

1. **Install.** Node 20 or newer (Node 22+ for image and Box).
   `pnpm add @typesafe-ai/sdk@0.7.0` and
   `pnpm add -D github:kylebrodeur/jev-toolkit#v<latest tag>`.
   Pin the SDK to an exact version: a bare range has been seen resolving stale
   cached metadata below a declared peer range without any warning.
   For Python, `uv add typesafe-sdk` (0.7.1 on PyPI, verified) -- never bare pip.
2. **Wire the key.** Call `loadKey({ ref })` once at process start, before any
   client is constructed. Kyle's reference is verified as
   `op://Personal/Typesafe AI Key/credential`. An `op://` path cannot contain
   parentheses. On macOS, export `OP_BIOMETRIC_UNLOCK_ENABLED=true` so `op read`
   unlocks without an interactive session -- without it the CLI blocks for a
   60 second authorization timeout and the call looks hung. Resolution order is
   `process.env` -> `.env` (next to `key.js`, gitignored) -> 1Password; a
   successful 1Password read is cached into `.env` so later runs skip `op read`
   entirely. A key already in `process.env` or `.env` always wins, so CI can
   inject a secret and 1Password is never consulted. Copy
   `templates/env.template` to `.env.example`; never commit the real `.env`.
3. **Gate the answers.** Use `verdict(answer)` or `partition(answers)` from
   `jev-toolkit/gating` rather than reading `answer.confidence` directly.
4. **Smoke test.** Copy `templates/smoke.template.mjs` into the project, set the
   real `op://` reference, and run it. It prints the key source, the model and
   one verdict, and never the key. Setup is not done until this passes. A good
   run looks like:
   `key source: 1password` / `model: jev-1.13.0` / `noul: 0.950 -> act`
   (the model reads `jev-1.14.0` once `jev-latest` moves off 1.13).

## The asymmetry that causes silent bugs

`choice` and `score` answers carry a `confidence` field. `noul` answers do
**not** -- they carry `noul`, the probability of yes. A `box` answer (Jev 1.14)
carries `confidence`, but the API may report none (`confidence: null`). Code that
reads `answer.confidence` generically gets `undefined` for every Noul, which
compares false against every threshold, so confident no-answers get escalated as
if the model were uncertain -- and a null-confidence Box would throw. Always
route through `certainty()` or `verdict()`; they handle all four and escalate a
confidence-less Box instead of crashing.

A `score` answer's `score` is an expected value that can fall between rubric
levels. Rounding it to pick a bucket discards the information worth gating on.

## Jev 1.14 wiring

- **Images and Box are behind danger-zone headers.** Send
  `TypeSafe-Danger-Zone-Images: true` for any request with an image or a Box
  question, and `TypeSafe-Danger-Zone-Long-Context: true` for the 262k limit.
  Pass them through the client `defaultHeaders`, or per call with the `headers`
  option -- not through this toolkit. Box questions need `jev-preview` or
  `jev-1.14.0`; images work on both 1.13 and 1.14.
- **Pin the model ID when thresholds matter.** `jev-latest` and `jev-preview`
  are aliases that move (`jev-latest` -> `jev-1.14.0` within a week of release),
  and a new version recalibrates confidence. If you have tuned act/review
  thresholds, send the versioned ID (`jev-1.13.0` / `jev-1.14.0`) and upgrade
  deliberately. Each response's `model` field records which version answered.
- Question design for images and Box -- where a reference goes, pairing a Box
  with a presence Noul -- belongs to the global `typesafe-ai` skill. This skill
  stays wiring-only.

## Constraints

- pnpm for Node, uv for Python, explicitly.
- Never log or echo a key. `loadKey` captures the op CLI's stderr for the
  same reason. It does write the resolved key to `.env` (mode 0600,
  gitignored) so repeated runs do not re-invoke `op read` -- that file must
  stay out of version control and out of shared logs. Run `trufflehog` before
  committing if unsure; see `docs/eng/secret-scanning.md` in consumers that
  have it wired.
- Plain ESM with JSDoc, no build step: a git dependency is installed as-is.
- No emoji.
