# AGENTS.md

Rules for an agent working in `jev-toolkit`. This is a public member
library that a consumer installs as a git dependency: the deliverables are two
JavaScript modules, the templates, the skill, and the docs that hold the
standard.

## What this repo is

Confidence gating and 1Password key wiring for TypeSafe Jev. Two modules:

- `gating.js`: `certainty` normalizes any answer to a 0-to-1 certainty;
  `verdict` routes one answer; `partition` buckets a whole fan-out response;
  `actionable` is the boolean form of the verdict.
- `key.js`: `loadKey` fills `TYPESAFE_API_KEY` from `process.env`, a cached
  `.env`, or 1Password, in that order, and caches a fetched key into
  `.env` (mode 0600, gitignored) for the next run.

The SDK (`@typesafe-ai/sdk`) owns everything else: builders, the client,
retries, errors, defaults. Do not wrap any of it; the changelog records the
decision.

## Access

- This repo is PUBLIC and generic. Its content is a free install. Never render a
  gate, a purchase step, or anything about the paid product
  as if they were free, and never add public release surfaces.
- Upstream is SOURCE. Do not push, retag, or re-release from a consumer work
  window. `pnpm add -D github:kylebrodeur/jev-toolkit#v0.2.0` is the install
  surface; the tag, not the default branch, is what callers pin.
- Consumers of this repo consume the public tags. They never receive private
  paths. Do not write a private path into prose.

## Rules

1. Keep the surface thin. Before adding an export, read the SDK's type
   declarations in `node_modules/@typesafe-ai/sdk` at the version
   `pnpm-lock.yaml` pins, and confirm the SDK does not already provide it.
   Wrapping the SDK is churn with no payoff.
2. Plain ESM with JSDoc, no build step. A git dependency is installed as-is:
   no bundler, no transpilation, and no `prepare` script.
3. Never log, echo, or error-string a key value. `loadKey` captures the op
   CLI's stderr for this reason. The `.env` cache is mode 0600 and gitignored;
   it must stay out of version control and out of shared logs.
4. Every answer shape (`choice`, `score`, `noul`, `box`) routes through
   `certainty()`. Adding a fifth shape means updating `gating.js`, `README.md`,
   the skill, and the docs in one commit, with test fixtures recorded from the
   SDK's type declarations.
5. Prose gates: no em or en dashes, none of the four banned AI-slop words
   (the list lives in the family harness, not in this sentence), no personal
   identifiers, and no emoji. Fix the prose, never the check.
6. The CI runs commands package.json declares, each observed to pass locally
   first. A step that has never been run is a guess. Never wire a step that
   fails.
7. Verify with the family harness (see Next doc); require every `jev-toolkit:`
   line to read PASS, and run the repo's own suite with `pnpm test`.
8. Confirm your changes are complete before you claim to be finished. If a
   gate fails, finish the work; do not stop or hand back.

## Boundary

Not a CLI, not a service: there is no `bin`, no `server`, nothing that listens.
Not a question-design guide; the global `typesafe-ai` skill owns what to ask
and `skills/jev/` owns only wiring. Not a public repo: no npm publish, no
public release surfaces, no FUNDING.yml.

## Next doc

Start with [`docs/quickstart.md`](docs/quickstart.md) for the numbered setup
path. The full command surface, every error string and its fix, and the
recovery procedures are in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).