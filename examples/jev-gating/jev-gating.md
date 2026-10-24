# Example: route a fan-out by confidence

**What this shows:** the toolkit installed as a git dependency, one fan-out
answer set routed by confidence, and the partition output. It needs no key
and makes no network call: the gate is pure over recorded answer shapes.

Every command here is real. The outputs were captured by running this
sequence on 2026-10-22 against the v0.1.4 tag.

## 1. Install the toolkit into a project

From the project root (create it with `pnpm init` first, `"type": "module"`):

```bash
pnpm add -D github:kylebrodeur/jev-toolkit#v0.2.0
```

Expected:

```
devDependencies:
+ jev-toolkit 0.1.4

Done in 3.7s using pnpm v12.15.0
```

The gate alone is enough for this example; the SDK becomes a real dependency
when a consumer wires a client (the full setup is
[../docs/quickstart.md](../docs/quickstart.md)).

## 2. Write the routing script

[`gate-fanout.mjs`](gate-fanout.mjs), from the repo root:

```js
import { partition, verdict, certainty } from "jev-toolkit/gating"

const answers = {
	urgent: { type: "noul", noul: 0.97 },
	topic: { type: "choice", choice: "billing", confidence: 0.72 },
	unclear: { type: "noul", noul: 0.5 },
	region: {
		type: "box",
		box: { top: 0.1, bottom: 0.9, left: 0.1, right: 0.9 },
		confidence: null,
	},
}

console.log(JSON.stringify(partition(answers)))
console.log(`verdict(noul 0.44): ${verdict({ type: "noul", noul: 0.44 })}`)
console.log(`verdict(box, no confidence): ${verdict(answers.region)}`)
console.log(`certainty(coin-flip noul): ${certainty({ type: "noul", noul: 0.5 })}`)
```

Four questions: an assertive yes (Noul 0.97), a moderately confident choice
(0.72), a coin flip (Noul 0.5), and a Jev 1.14 Box whose confidence the API
did not report (`null`).

## 3. Run it

```bash
node examples/jev-gating/gate-fanout.mjs
```

Expected output, captured from the real run:

```
{"act":["urgent"],"review":["topic"],"escalate":["unclear","region"]}
verdict(noul 0.44): escalate
verdict(box, no confidence): escalate
certainty(coin-flip noul): 0
```

## How to read it

- `urgent` (Noul 0.97) is far from the coin flip, so its certainty is 0.94 and
  it lands in `act`. Reading `.confidence` here would have scored it `undefined`
  and escalated an assertive answer.
- `topic` (choice, confidence 0.72) sits between the default thresholds: act at
  0.85, review at 0.6, so it is routed to `review`.
- `unclear` (Noul 0.5) is the coin flip: certainty 0, `escalate`. This is
  maximum uncertainty, not a confident no.
- `region` (box, `confidence: null`) escalates instead of throwing: with no
  certainty to read, the answer defaults to the cautious bucket and the rest of
  the fan-out still routes.

The same four answers in your own code: `partition(response.answers)` after a
`systemOne` call, then act, review, or escalate per bucket. Question design is
owned by the global `typesafe-ai` skill; wiring tasks are in
[../docs/how-to.md](../docs/how-to.md).

## What this example is NOT

Not a key walkthrough: nothing here touches 1Password or the environment.
Not a client setup: `TypeSafeClient` construction, builders, and headers are
the SDK's surface, and the quickstart covers composing them with this gate.