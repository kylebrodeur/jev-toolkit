# How-to: jev-toolkit

Day-to-day tasks, grouped by task. Setup lives in
[quickstart.md](quickstart.md); the full command surface and every error
string live in [RUNBOOK.md](RUNBOOK.md). Checked 2026-10-22.

## Route a fan-out response by confidence

```js
import { partition } from "jev-toolkit/gating"

const buckets = partition(response.answers)
for (const id of buckets.act) await act(id)
for (const id of buckets.review) await humanReview(id)
for (const id of buckets.escalate) await escalate(id)
```

One pass, per-bucket question id lists. Thresholds default to act 0.85 and
review 0.6.

## Tune thresholds for one call, or per partition

```js
import { verdict } from "jev-toolkit/gating"

const strict = verdict(answer, { act: 0.9, review: 0.75 })
```

Tune on recorded answers, not on a hunch: the model recalibrates between
versions, and a threshold tuned on one model ID is a guess on the next. Pin
the versioned model ID (see below) when thresholds matter.

## Stop the confident-no escalation bug

Symptom: answers that said no assertively keep landing in `escalate`. Cause:
reading `answer.confidence` on a Noul yields `undefined`, which fails every
threshold. Fix: route through `certainty()` or `verdict()`:

```js
import { verdict } from "jev-toolkit/gating"

const route = verdict(answer)
```

`certainty()` derives the Noul's certainty from `abs(noul - 0.5) * 2`, reads
`confidence` where it exists, and yields `0` for a confidence-less Box so it
escalates instead of throwing. Do not round a `score` answer's `score` to
pick a bucket; it is an expected value between rubric levels, and rounding
discards what you gate on.

## Keep thresholds stable across model versions

`jev-latest` and `jev-preview` are aliases that move (`jev-latest` went to
`jev-1.14.0` within a week of release), and a new version recalibrates
confidence. Pin the versioned ID in the client and upgrade deliberately:

```js
const client = new TypeSafeClient({
	defaultHeaders: { "TypeSafe-Danger-Zone-Images": "true" },
})
```

Each response's `model` field records which version answered; log it beside
the verdict so threshold drift is visible in the decision log.

## Upgrade the toolkit dependency

```bash
pnpm add -D github:kylebrodeur/jev-toolkit#<tag>
```

The full tag list is on the repo's release feed. Cut the release you are
consuming per the runbook's release procedure; a tag without a release
object is "tag pushed, release NOT cut".

## Add a new question to an existing fan-out

Add the builder to the `questions` map; the answer lands in `response.answers`
and `partition()` picks it up with no routing changes. Design the question
itself with the global `typesafe-ai` skill; this toolkit handles the wiring
only.

## Handle images and Box questions (Jev 1.14)

Image and Box questions need `jev-preview` or `jev-1.14.0` and a danger-zone
header, passed through the SDK (not this toolkit):

```js
const client = new TypeSafeClient({
	defaultHeaders: { "TypeSafe-Danger-Zone-Images": "true" },
})
```

Add `TypeSafe-Danger-Zone-Long-Context: true` for the 262k limit. A box
answer routes through `verdict()` like any other; the API may report
`confidence: null`, which escalates instead of throwing mid fan-out.

## Keep a key out of logs and env dumps

- A key already in `TYPESAFE_API_KEY` always wins, so CI injects a secret and
  1Password is never consulted.
- `loadKey` captures the op CLI's stderr and never logs the key value.
- The cached `.env` is mode 0600 and gitignored; run `trufflehog` before
  committing if unsure, and add `.env` to any log-redaction list.

## What this is NOT

Not question design: the global `typesafe-ai` skill owns what to ask, and
this document does not restate it. Not a client wrapper: builders, retries,
timeouts, and typed errors come from the SDK. Not a free module: it unlocks
with the purchase or the tier, and nothing here is a public surface.