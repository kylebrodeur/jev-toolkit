# Contributing

How to set up, verify, and open a change. Checked 2026-10-22.

## What this repo is

A public library consumed as a git dependency:
`gating.js` (certainty, verdict, partition, actionable), `key.js` (loadKey,
loadEnv), the `templates/`, the `skills/jev/` wiring skill, and the vendored
anti-slop Oxlint plugin under `tools/`. Plain ESM with JSDoc, no build step.

## Set up

Clone, then install. pnpm is the package manager (the `packageManager`
field); Node 20 or newer:

```bash
pnpm install
```

Verification uses vitest and oxlint; both arrive as devDependencies, so no
global install is needed. A 1Password session and the op CLI are needed only
for the manual lanes (`test/jev-advisor-triage.mjs`,
`test/jev-audit-hosted.mjs`), which call the live API and are never run
in CI.

## Verify

From the repo root:

```bash
pnpm test
```

Expected: `Test Files  2 passed (2)` and `Tests  17 passed (17)` (the count
grows with the suite; two files, all green, is the invariant). Exit 0.

```bash
pnpm lint:self
```

Expected: exit 0. Four warnings are expected and correct: the
`anti-slop/no-runtime-typeof` overrides on `gating.js`, whose `typeof`
checks narrow untyped SDK answers and throw on any shape they do not
recognize; the override keeps the findings visible instead of silent.

The pre-commit hook runs `pnpm test`; install it with `pnpm hooks:install`
and confirm a commit exercises it.

Then run the family harness from the system repo:

```bash
cd ~/workspace/ai-ecp-system && uv run python tools/verify-system.py --repo jev-toolkit
```

Expected: every `jev-toolkit:` line reads PASS, exit 0.

## Open a change

1. Branch from the default branch.
2. Make the change, docs included: a surface change updates `README.md`, the
   skill, and the runbook in the same commit.
3. Run the three verification steps above; observed output, not a recall.
4. Commit; a normal iteration commit lands as it is. The hook runs the
   suite.
5. Push to a branch; the change is reviewed before it can land.

## Change rules

- Keep the surface thin: confirm the SDK does not already provide it before
  adding an export; read the SDK's type declarations at the pinned version.
- Plain ESM with JSDoc, no build step, no `prepare` script: a git dependency
  is installed as-is, and `prepare` would run in the consumer.
- The key path is additive: no new log, error string, or file write may carry
  a key value. `SECURITY.md` names the path as in-scope for that reason.
- Every answer shape routes through `certainty()`; a new shape arrives with
  fixtures recorded from the SDK's type declarations.
- Release-worthy changes ride the runbook's release procedure: source notes
  first, version bump, annotated tag, release object.
- Prose rules in any markdown you add or touch: no em or en dashes, none of
  the four banned AI-slop words, no personal identifiers, no emoji.