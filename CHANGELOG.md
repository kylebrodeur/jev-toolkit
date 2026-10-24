# Changelog

## Unreleased

<details>
<summary>Onboarding snapshot (2026-10-22): what arrived with the AI ECP doc-standard adoption</summary>

Added to bring the repo up to the member documentation standard:
`AGENTS.md`, `docs/quickstart.md`, `docs/how-to.md`, `docs/RUNBOOK.md`,
`SECURITY.md`, `CONTRIBUTING.md`, `llms.txt`, `.github/workflows/ci.yml`,
`examples/jev-gating/` (runnable, no key), and `LICENSE` (Apache-2.0,
the family standard for new work; the `package.json` `license` field still
reads MIT and changes with the next release). `README.md` gained the
access note, the first command to run, a family
section, and links to every doc.

CI runs the commands package.json declares: `pnpm test` (vitest, the
runner; the platform runner finds no tests here) and `pnpm lint:self`
(oxlint, exit 0 with four recorded warnings). Release procedure,
error table, and recovery procedures live in `docs/RUNBOOK.md`.

The repo is public and publishes no npm package: no FUNDING.yml needed here,
no public release surfaces; install is
`pnpm add -D github:kylebrodeur/jev-toolkit#<tag>`. The family harness
(`verify-system.py --repo jev-toolkit`) reads PASS on every check as of
2026-10-22.
</details>

## v0.1.4

- Gating recognizes the Jev 1.14 `box` answer type. A box carries `confidence`
  like choice and score and routes the same way; when the API reports none
  (`confidence: null`), `certainty()` yields 0 so the answer escalates instead
  of throwing and breaking a fan-out `partition()`.
- Docs and the `jev` skill updated for Jev 1.14: the `jev-preview` /
  `jev-1.14.0` models, the danger-zone image and long-context headers (passed
  through the SDK's `defaultHeaders` or per-call `headers`), and a reminder to
  pin the versioned model ID once confidence thresholds are tuned, since
  aliases move.
- devDependency bumped to `@typesafe-ai/sdk` 0.7.0, which adds `image()`,
  `box()` and `withAssets`. Those features need Node 22; gating and key stay on
  Node 20.
- `loadKey` now caches a fetched key into a gitignored `.env` (mode 0600) and
  `loadEnv` rehydrates it, so repeat runs skip `op read`. Resolution order is
  `process.env` -> `.env` -> 1Password, and an existing value always wins.
- Adds the `advisor-jev-triage` skill (`skills/jev/advisor-triage.md`) for
  act/delegate/escalate routing, with the triage and audit scripts
  under `test/` (dev-only; not shipped in the package `files`).
- Dev tooling: wires the vendored anti-slop Oxlint plugin (15 rules at error),
  with `no-runtime-typeof` relaxed to a warning for `gating.js`, whose `typeof`
  checks narrow untyped SDK answers by design. Dev-only; not in package `files`.

## v0.1.3

- Verified end to end against the live API: key from 1Password, real Jev
  response, gating verdict. The response confirmed that a noul answer carries
  no confidence field, which is the whole premise of gating.js.
- Documents that macOS needs OP_BIOMETRIC_UNLOCK_ENABLED=true for op read to
  unlock non-interactively.

## v0.1.2

- Version field caught up with the tag: v0.1.1 shipped with package.json
  still reading 0.1.0, so a consumer installing the tag saw the wrong version.

## v0.1.0

- First release. `gating.js` (`certainty`, `verdict`, `partition`, `actionable`)
  and `key.js` (`loadKey`), templates, and the `jev` wiring skill.
- Deliberately excludes client and question-builder wrappers: the SDK already
  provides builders, env-based key resolution, retries, timeouts, model
  defaults and typed errors.