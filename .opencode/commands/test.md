---
description: Run a TDD or bug reproduction workflow with honest verification and no automatic commit.
agent: mandor
subtask: false
---

Follow Mandor's built-in debugging and testing rules. Browser/testing skills are optional references when their extra detail is needed.

Test request: `$ARGUMENTS`

Inspect the working tree and read the actual implementation and test targets. Load memory/rules only when relevant.

For new behavior: write a failing test, verify RED, implement the minimum change, verify GREEN, then refactor. For bugs: first reproduce the bug with a test that fails for the expected reason, implement the root-cause fix, then run relevant regression tests.

Hard-stop only on an unapproved material decision. Follow established project conventions and report checks honestly.

Review according to the selected workflow level and update memory only when project knowledge changed materially. Do not commit, push, merge, tag, release, or deploy without separate explicit approval.
