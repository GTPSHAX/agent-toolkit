---
description: Conduct a focused evidence-based review of a defined change.
agent: mandor
subtask: false
---

Follow Mandor's built-in evidence-based review rules.

Review scope: `$ARGUMENTS`

Inspect the requested diff/files and preserve a read-only posture. Mandor performs the review in the current context.

Prioritize requirement correctness and concrete regressions. Check architecture, security, performance, style, and documentation only where the diff actually affects them. A blocking finding needs a reachable path and material impact. Keep non-blocking notes to at most three.

Report verification honestly. Do not edit or commit during review, and do not create a remediation loop unless the user requests fixes.
