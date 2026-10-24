# Examples

Runnable examples of consuming this toolkit. Each one runs with no key and
makes no network call: the gate is pure over recorded answer shapes.

| Example | What it shows |
|---|---|
| [jev-gating/](jev-gating/) | Install the toolkit as a git dependency, route a fan-out answer set, and read the partition output. The walkthrough is [jev-gating/jev-gating.md](jev-gating/jev-gating.md); the script is [jev-gating/gate-fanout.mjs](jev-gating/gate-fanout.mjs). |

## Run it

From a project that has the toolkit installed (the install command is in the
example and in [../docs/quickstart.md](../docs/quickstart.md)):

```bash
node examples/jev-gating/gate-fanout.mjs
```

The outputs in the markdown were captured from real runs on 2026-10-22
against the v0.1.4 tag.