# jev-toolkit design

Date: 2026-09-21
Status: implemented in v0.1.0

## Problem

TypeSafe's Jev needs the same treatment shadcn-linter gave the design-system
linter: decide the reusable conventions once, apply them per project. The
question was what is actually reusable, given the SDK.

## What the SDK already covers

Read from `@typesafe-ai/sdk@0.6.0` type declarations, not assumed:

- `choice`, `score`, `noul` question builders, with answer types inferred.
- `TYPESAFE_API_KEY` resolved from the environment by the client itself.
- Client options `apiKey`, `baseURL`, `maxRetries`, `timeout`; default model
  falling back through `TYPESAFE_DEFAULT_MODEL` to `jev-latest`.
- A typed error hierarchy: `RateLimitError`, `APITimeoutError`,
  `AuthenticationError`, `APIConnectionError` and others.

This deleted two of the four modules originally sketched. A `client.js` would
wrap retries and key handling that already exist; a `questions.js` would wrap
builders that already exist. Wrapping a v0.6 SDK is churn with no payoff.

## What is left, and why

**`gating.js`.** The answer types do not report certainty uniformly.
`ChoiceResponse` and `ScoreResponse` carry `confidence`. `NoulResponse` carries
only `noul`, the probability of yes. Code that reads `answer.confidence`
generically gets `undefined` for every Noul, which compares false against every
threshold, so a confident no is escalated as if the model were uncertain.
`certainty()` normalises all three -- reading `confidence` where it exists and
deriving `abs(noul - 0.5) * 2` where it does not -- and throws on an
unrecognised shape rather than returning a misleading zero. `verdict()` routes
one answer; `partition()` buckets a fan-out response in one pass.

`ScoreResponse.score` is an expected value that may fall between rubric levels.
The docs are explicit about this; rounding it to pick a bucket discards the
information worth gating on. Noted in the skill and README rather than encoded,
because the right handling is application-specific.

**`key.js`.** The SDK reads the environment; the keys live in 1Password.
`loadKey` fills the variable from an `op://` reference. An existing environment
value always wins, so CI injects a secret and 1Password is never consulted. The
key is never logged, written or placed in an error message, and the op CLI's
stderr is captured rather than inherited.

## Skill boundary

The `typesafe-ai` skill is already installed globally and owns question design,
primitives, confidence theory and doc navigation. `skills/jev/` owns wiring
only: install, key, gating convention, smoke check, and one pointer at the
other skill. Two overlapping skills would be worse than one.

Python is covered procedurally in the skill (`uv add typesafe-sdk`). No Python
library in v1.

## Carried forward from shadcn-linter

Each of these was a bug found there, now a rule here: no `prepare` script, since
it runs in the consumer on a git-dependency install; every import declared as a
peer, because pnpm's hidden hoist masks omissions locally; `*.template.*`
naming, since config files in a `templates/` directory get auto-discovered as
live configs; and install from the git tag into a clean project before claiming
anything works.

The SDK peer is optional, so a project consuming only `gating` -- pure functions
over recorded data -- does not have to install the SDK.

## Testing

Gating and key resolution are pure and tested against answer shapes copied from
the SDK's type declarations. The op-CLI failure path is deliberately not unit
tested: it shells out to a real `op read` that blocks for a 60s authorization
timeout when the vault is locked, making pass or fail depend on the developer's
1Password session rather than on this code. The smoke template covers it against
a real vault.

## Verified end to end

The live smoke call succeeded on 2026-09-21 against
`op://Personal/Typesafe AI Key/credential`: `key source: 1password`,
`model: jev-1.13.0`, `noul: 0.950 -> act`. The 1Password branch of `loadKey`,
the SDK composition, and gating over a real response are all exercised.

The response confirms the premise of `gating.js` empirically. The API returned
`{"type":"noul","noul":0.95}` with **no `confidence` field**, exactly the
asymmetry the module exists to absorb. Code reading `answer.confidence`
generically would have scored this 0.95-certain answer as undefined and
escalated it.

macOS needs `OP_BIOMETRIC_UNLOCK_ENABLED=true` for `op read` to unlock
non-interactively; without it the CLI blocks for a 60 second timeout.
