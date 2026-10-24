# Quickstart: jev-toolkit

The numbered path from nothing to a gated, key-resolved Jev call: install the
SDK and this toolkit into a real project, wire the key, gate the answers, and
prove the wiring with a smoke run. Checked 2026-10-22 against the v0.1.4 tag.

## Prerequisites

- Node 20 or newer for gating and keys. Node 22+ for the SDK's image and Box
  features (Jev 1.14). `node --version` should print v20 or higher.
- pnpm. This repo's hooks and lockfile are pnpm (the `packageManager` field).
- 1Password with the op CLI signed in (`op --version`), only if the key comes
  from a vault rather than the environment.

## The access note

This is a public module. If the `pnpm add` step below fails
with a Git authentication error, access is not provisioned yet: the unlock
ships with the purchase or the tier, and access is provisioned to your account
at that point. No free install or public fallback exists.

## 1. Create or open your project

```bash
mkdir my-jev-project && cd my-jev-project
pnpm init
```

## 2. Install the SDK and the toolkit

```bash
pnpm add @typesafe-ai/sdk@0.7.0
pnpm add -D github:kylebrodeur/jev-toolkit#v0.2.0
```

Pin the SDK to an exact version: a bare range has been seen resolving stale
cached metadata below a declared peer range without warning. Pin the toolkit
by tag; plain ESM, no build step.

Expected (versions and hashes vary; the two `+` lines are the assertion):

```
Packages: +2
+ @typesafe-ai/sdk 0.7.0
+ jev-toolkit github:kylebrodeur/jev-toolkit#v0.2.0
```

## 3. Add .env.example and ignore the real .env

The env template carries the two variables the SDK reads. Commit the example,
never the real file:

```bash
cp node_modules/jev-toolkit/templates/env.template .env.example
printf '.env\n' >> .gitignore
```

## 4. Wire the key once, at process start

In your entrypoint, before any client is constructed:

```js
import { loadKey } from "jev-toolkit/key"

const source = loadKey({ ref: "op://<vault>/Typesafe AI Key/<field>" })
console.log(`key source: ${source}`)
```

On macOS, export `OP_BIOMETRIC_UNLOCK_ENABLED=true` first, or `op read` blocks
for a 60 second authorization timeout. Resolution order: `process.env`, then
`.env` (next to `key.js`, gitignored), then 1Password. An existing value
always wins, so CI can inject `TYPESAFE_API_KEY` and 1Password is never
consulted.

## 5. Gate the answers

Route responses through `verdict()` or `partition()`, never through
`answer.confidence` directly:

```js
import { verdict, partition } from "jev-toolkit/gating"

const response = await client.systemOne({ state, questions })
console.log(JSON.stringify(partition(response.answers)))
console.log(`noul: ${response.answers.is_urgent.noul.toFixed(3)} -> ${verdict(response.answers.is_urgent)}`)
```

Defaults: act at 0.85, review at 0.6. Override with
`verdict(answer, { act: 0.9 })`.

## 6. Smoke test the wiring

```bash
cp node_modules/jev-toolkit/templates/smoke.template.mjs scripts/jev-smoke.mjs
```

Set the real `op://` reference in the copy, then:

```bash
export OP_BIOMETRIC_UNLOCK_ENABLED=true
node scripts/jev-smoke.mjs
```

Expected (the verdict line varies; a good run prints key source, model,
verdict, and never the key):

```
key source: 1password
model: jev-1.13.0
noul: 0.950 -> act
```

The model reads `jev-1.14.0` once `jev-latest` moves off 1.13. Setup is not
done until this passes. A `confidence: null` box or a coin-flip noul is
expected on synthetic inputs; the runbook carries the routing table.

## Where to go next

Day-to-day tasks: [how-to.md](how-to.md). Full command surface and every error
string with its fix: [RUNBOOK.md](RUNBOOK.md).

## What this setup is NOT

No client wrapper, no question builders, no bundler, no `prepare` script: the
SDK already owns those, and the design docs record why. Nothing here writes a
key to a log, and nothing here is a free or public surface.