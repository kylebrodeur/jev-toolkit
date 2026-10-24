# jev-toolkit

Confidence gating and 1Password key resolution for TypeSafe Jev, wired into
your project end to end: SDK install, key, gating, and smoke. This is a
A public member of the AI ECP family: the confidence gating and key wiring kit.
unlock, and the install surface is a git dependency pinned by tag, never a
free or public download. Start with [docs/quickstart.md](docs/quickstart.md)
for the numbered setup path.

## Install

```bash
pnpm add @typesafe-ai/sdk@0.7.0
pnpm add -D github:kylebrodeur/jev-toolkit#v0.1.4
```

Git dependency, pinned by tag. Plain ESM with JSDoc, no build step.

## The first command to run

In your app entrypoint, before any client is constructed:

```js
import { loadKey } from "jev-toolkit/key"

const source = loadKey({ ref: "op://<vault>/Typesafe AI Key/<field>" })
console.log(`key source: ${source}`)
```

Then gate the answers: `verdict(answer)` and `partition(response.answers)`
from `jev-toolkit/gating`. Runnable example:
[examples/jev-gating.md](examples/jev-gating/jev-gating.md).

## What this does not do

`@typesafe-ai/sdk` already exports `choice`, `score` and `noul` builders, reads
`TYPESAFE_API_KEY` from the environment, and gives its client `apiKey`,
`baseURL`, `maxRetries` and `timeout` with the model defaulting through
`TYPESAFE_DEFAULT_MODEL` to `jev-latest`, plus a typed error hierarchy. None of
that is wrapped here.

## Gating

```js
import { verdict, partition } from "jev-toolkit/gating"

verdict(answer) // "act" | "review" | "escalate"
partition(response.answers) // { act: [...ids], review: [...ids], escalate: [...ids] }
```

Defaults: act at 0.85, review at 0.6. Override per call with
`verdict(answer, { act: 0.9 })`.

**Why this exists.** The answer types do not report certainty the same way:

| Type | Field | Certainty |
|---|---|---|
| `choice`, `score` | `confidence` (0 to 1) | read directly |
| `noul` | none: `noul` is the probability of yes | `abs(noul - 0.5) * 2` |
| `box` (Jev 1.14) | `confidence`, but the API may report none | `confidence` or 0 |

A Noul answer has **no** `confidence` field, and a Box answer's `confidence`
can be `null`. Code that reads `answer.confidence` generically gets `undefined`
or `null` for these; for a Noul, a confident no then fails every threshold and
escalates as though the model were unsure. `certainty()` normalizes all four: it
derives a Noul's certainty, reads `confidence` where it exists, and yields 0 for
a Box with none so it escalates instead of throwing. It still throws on an
unrecognized shape rather than returning a misleading zero.

Note also that `score` is an expected value that can land between rubric
levels; rounding it to pick a bucket discards what you would gate on.

## Key

```js
import { loadKey } from "jev-toolkit/key"

loadKey({ ref: "op://Personal/Typesafe AI Key/credential" })
```

Call once before constructing a client. On macOS export
`OP_BIOMETRIC_UNLOCK_ENABLED=true` first, or `op read` blocks for a 60 second
authorization timeout. A key already in `TYPESAFE_API_KEY`
always wins, so CI injects a secret and 1Password is never consulted. The key is
never logged, written, or included in an error; the op CLI's stderr is captured
rather than inherited. A fetched key is cached into `.env` (mode 0600,
gitignored) so later runs skip `op read`.

## Templates

`templates/smoke.template.mjs` verifies a project end to end: key source,
model, one verdict, no key. `templates/env.template` is the CI shape.

## Skill

`skills/jev/` covers wiring only; the global `typesafe-ai` skill owns question
design. Install by symlink:

```bash
ln -s "$PWD/skills/jev" ~/.claude/skills/jev
```

## Skills and commands index

`test/jev-advisor-triage.mjs` routes an advisor decision (act, delegate, or
escalate) with a live Jev call; the guidance is `skills/jev/advisor-triage.md`.
Run it manually from the toolkit dir; it needs a key. The dev script map, the
full error table, and the release procedure are in the runbook.

## Where to read next

Day-to-day tasks: [docs/how-to.md](docs/how-to.md). The operator's reference,
full command surface and every error string with its fix:
[docs/RUNBOOK.md](docs/RUNBOOK.md). Agent rules: [AGENTS.md](AGENTS.md). The
docs map: [llms.txt](llms.txt).

## Family

This repo is a member of the AI Engineering Control Plane (AI ECP)
family: independent, single-purpose repos, each with its own history,
CI, and install surface. Siblings:

- [ecp-toolkit](https://github.com/kylebrodeur/ecp-toolkit) (the `ecp`
  control-plane CLI).
- [repo-guards](https://github.com/kylebrodeur/repo-guards) (the `guv`
  repo-discipline gates).
- [actions-runner](https://github.com/kylebrodeur/actions-runner) (the
  `arun` local agent-pipeline runner).
- [agent-workspace-kit](https://github.com/kylebrodeur/agent-workspace-kit)
  (the manifest-driven role launcher for multi-agent teams).
- [docs-policy-kit](https://github.com/kylebrodeur/docs-policy-kit) (the
  `docpol` documentation policy engine).
- [op-safe](https://github.com/kylebrodeur/op-safe) (the `op://` secrets
  reference resolution).
- [anti-slop-kit](https://github.com/kylebrodeur/anti-slop-kit) (the
  vendored neutral lint policy).
- [omp-rpc-cli](https://github.com/kylebrodeur/omp-rpc-cli) (persistent
  agent sessions over RPC).

## Provenance

| | |
| --- | --- |
| SDK | [`@typesafe-ai/sdk`](https://www.npmjs.com/package/@typesafe-ai/sdk) `0.7.0` (peer, optional): adds `image()`, `box()`, `withAssets` |
| Python | `uv add typesafe-sdk` `0.7.1` |
| API | `POST https://api.typesafe.ai/v1/systemone`; `jev-latest` -> `jev-1.13.0`, `jev-preview` -> `jev-1.14.0` (Box needs 1.14) |
| Docs | https://docs.typesafe.ai/llms.txt |
| Node | >= 20 for gating/key; >= 22 for the SDK's image and Box features |
| Status | Public; consumed as a git dependency. The v0.1.4 tag is healthy; version-sync to the next tag is pending. Checked 2026-10-22. |

## Tests

```bash
pnpm test
```

Gating and key resolution are pure and tested against recorded answer shapes
taken from the SDK's type declarations. The op-CLI failure path is not unit
tested: it shells out to a real `op read` that blocks for a 60s authorization
timeout when the vault is locked, making the result depend on the developer's
1Password session. The smoke template covers it against a real vault.