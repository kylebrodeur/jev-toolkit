# RUNBOOK: jev-toolkit

The operator's reference: the full command surface, every error string and
its fix, and the recovery procedures. Checked 2026-10-22 against the v0.1.4
tag.

## Command surface (complete)

In this repo (development):

```bash
pnpm install        # link the workspace; first run populates node_modules
pnpm test           # vitest run; the full suite
pnpm test:watch     # vitest in watch mode
pnpm lint:self      # oxlint with the vendored anti-slop plugin at error
pnpm hooks:install  # husky; the pre-commit hook (runs pnpm test)
node test/jev-advisor-triage.mjs <input.json>   # triage lane; needs a key
node test/jev-audit-hosted.mjs            # audit lane; needs a key
node scripts/jev-smoke.mjs                      # consumer smoke, after copying
```

`node test/jev-advisor-triage.mjs` resolves the key like any consumer
(process.env, then .env, then 1Password) and calls the live API, so both
`test/` audit and triage lanes are manual, not CI.

In a consumer project (after the install from
[quickstart.md](quickstart.md)):

```bash
cp node_modules/jev-toolkit/templates/env.template .env.example
cp node_modules/jev-toolkit/templates/smoke.template.mjs scripts/jev-smoke.mjs
node scripts/jev-smoke.mjs
```

There is no CLI: `jev-toolkit` exports functions (`certainty`, `verdict`,
`partition`, `actionable`, `loadKey`, `loadEnv`), it does not execute as a
binary. `npx jev-toolkit` is not a thing.

## Error strings and their fixes

Every thrown error from this toolkit, with the exact fix:

| Error | Seen when | Fix |
|---|---|---|
| `certainty() expects an answer object` | `certainty(null)` or a non-object reached the gate. | Guard the response before gating; one null answer must not break a fan-out. |
| `certainty() could not read an answer of type ...; expected choice, score, noul or box` | An unrecognized shape, usually a new SDK answer type. | Route the shape: extend `gating.js`, add a fixture to `test/gating.test.js`, and record the SDK version it came from. Do not return a guessed zero. |
| `TYPESAFE_API_KEY is not set (checked process.env and .env) and no op:// reference was given. Either export TYPESAFE_API_KEY, add it to .env, or pass { ref: "op://<vault>/<item>/<field>" }` | No source yielded a key. | Export the variable, put it in `.env`, or pass `{ ref }`. In CI, inject it as a secret; the environment always wins. |
| `Could not read op://... from 1Password. Check that the op CLI is installed, that you are signed in, and that the item and field names are exact.` | `op read` failed: CLI missing, no session, wrong item or field. | Run `op --version`; run `op signin`; compare the reference with the item in the vault. An `op://` path cannot contain parentheses. The op CLI's own stderr is captured, not forwarded: nothing secret reaches your log. |
| `op://... resolved to an empty value. Check the field name on that item.` | The reference resolved but the field is empty. | Fix the field name on the item; re-run. |

Environment mistakes, which fail without a throw:

| Symptom | Cause | Fix |
|---|---|---|
| The call hangs for about 60 seconds on macOS, then fails. | `op read` is waiting for an interactive authorization that never comes. | `export OP_BIOMETRIC_UNLOCK_ENABLED=true` before the run. |
| A key lands in a shared log or an env dump. | The value was printed, or `.env` was shipped. | Never print it; keep `.env` gitignored (mode 0600). Run `trufflehog` before committing if unsure. |
| A peer warning about `@typesafe-ai/sdk` at install. | The peer is optional and the SDK is absent; fine for a gating-only consumer. | Install the SDK if you wire a client; it is a real dependency for `key.js` consumers. |

## CI error strings (this repo)

| Error | Meaning | Fix |
|---|---|---|
| `No tests found` from vitest | The glob `test/*.test.js` matches nothing, or CI started in the wrong directory. | Run `pnpm test` locally first; keep the suite in `test/`. |
| `(node:...) MaxListenersExceededWarning` from a CI vitest step | `node --test` was wired somewhere; this repo's runner is vitest. | Use `pnpm test`; do not swap the runner in CI. |
| An `ERR_ACCESS_DENIED` on a key test step | A test step tried to touch the live `.env` cache or 1Password. | The suite never reads or writes the real `.env` (each call passes a nonexistent `envPath`); run `pnpm test`, not a script that shells to `op read`. |

## Recovery procedures

### A consumer pulled a tag and the wiring broke

Pin the previous tag: `pnpm add -D github:kylebrodeur/jev-toolkit#v0.1.5`.
The changelog records every surface change. If the break is a new answer
shape reaching `certainty()`, record the shape first (the error names the
type), then upgrade and fix together per the how-to.

### A key leaked

1. Rotate the credential in 1Password (the item behind the `op://`
   reference).
2. Overwrite the local cache: delete `.env`, then re-run once so the next
   key is recached.
3. Audit where the value went: `git log -p -- .env` if it was ever
   committed, plus the log destinations it could have reached, and treat
   every hit as exposed.
4. Record the incident; the SECURITY.md contact is the reporting channel.

### The 1Password session is broken

`op signin`, then re-run. The 60-second hang on macOS is the biometric
prompt disabled; `export OP_BIOMETRIC_UNLOCK_ENABLED=true` and re-run. The
`.env` cache means a healthy vault is needed only on the first run.

### CI is red on a suite that passes locally

The two known cases: the missing environment variable (a no-source test
expects the throw, not a missing key: the tests never touch 1Password), and
a runner mismatch (`pnpm test` is the command; `node --test` finds zero
tests here). Run the same command, from the same directory, as the first
diagnosis step.

### A new answer type appears in the SDK

`certainty()` throws by design on an unrecognized shape. Record the shape
from a real response, extend `gating.js`, add fixtures from the SDK's type
declarations, update the README, the skill, and this runbook in the same
commit, and release per the release procedure.

## Release procedure

The repo is consumed as a git dependency, so a release is: docs and version
sync, an annotated tag, and the GitHub release object. Nothing is published
to npm; this is a public repo.

1. In this private system repo, write the source notes FIRST:
   `docs/release/kits/<slug>/RELEASE-NOTES-<tag>.md`. The GitHub body is
   generated from them, never inline.
2. Run the health pass: `pnpm test`, `pnpm lint:self`, the pre-commit path
   (`pnpm hooks:install` once, then a commit exercises the hook), and the
   family harness:
   `python3 tools/verify-system.py --repo jev-toolkit`, run from the
   private family system repo against this checkout. The harness is
   maintainer-only; the commands above are the ones CI runs.
   Require every `jev-toolkit:` line to read PASS.
3. Bump `package.json` `version` to the tag, no leading `v`, and commit with
   the lockfile if dependencies changed.
4. Tag annotated: `git tag -a vX.Y.Z -m "vX.Y.Z -- <one line>"`, push main
   and the tag.
5. Immediately cut the release:
   `gh release create vX.Y.Z --notes-file <the source notes file>`. The
   release notes are the copy a buyer receives; the private prose rules
   (no private paths, no identifiers, no banned words) apply to that body.
6. Update the catalog row in the private system repo when the release lands.

The unlock for a buyer is provisioned by access grant; the notes in the
release object are the record of what changed, not a public announcement.

## Boundary

No daemon, no server, no `bin`. Not a question-design guide (the global
`typesafe-ai` skill), not an SDK wrapper (the SDK owns builders, client,
retries, errors), not a public surface (no npm publish, no FUNDING.yml).
The op-CLI failure path is deliberately not unit tested: it depends on the
developer's 1Password session; the smoke script covers it against a real
vault.