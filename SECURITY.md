# Security policy

## Supported

This is a public library consumed as a git dependency: two ESM
modules (`gating.js`, `key.js`), the templates, and the vendored lint plugin.
There is no network listener and no installable package; fixes land on the
default branch, and consumers pick them up by pinning the next tag.

## Reporting

Report a vulnerability privately: open a GitHub security advisory on this
repository ("Report a vulnerability" under the Security tab). Do not open a
public issue for an unpatched vulnerability. The repo is public, so the
advisory is visible only to people with access.

## Scope

In scope:

- `key.js`: anything in the key path, including what `loadKey` writes to the
  local `.env` cache (mode 0600, gitignored), what it captures from the op
  CLI's stderr, and what it puts in error strings. A key value reaching a
  log, an error, or a file other than the cache is a reportable defect.
- The resolve order in `loadKey` (`process.env`, then `.env`, then 1Password):
  a path where an untrusted `.env` wins over an operator's injected
  environment variable would be a decision-routing defect.
- `gating.js`: a route that fails open (an answer shape that silently gates
  as "act" without evidence) is a correctness defect with security
  relevance, because routing decisions ride on it.
- `templates/`: a template that invites a key into a committed file.

Out of scope: the 1Password op CLI, the `@typesafe-ai/sdk` client (including
its retries and error hierarchy), vitest, oxlint, and the family harness;
report those to their own projects.

## What to include

The affected file and the path the input takes, the sequence that triggers
the defect, and the expected versus actual behavior. A recorded answer shape
that gates wrongly, or a repro that shows a key value escaping, is ideal.

## Response

Acknowledgement within 7 days; a fix or an explicit disposition within 30.
A fix ships as the next annotated tag with the GitHub release object; the
release notes record what changed without embedding any secret material.