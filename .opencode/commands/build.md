---
description: Implement approved tasks incrementally with tests and verification; commits always require separate explicit approval.
agent: mandor
subtask: false
---

Follow Mandor's built-in implementation and verification workflow. Skills are optional references, not prerequisites.

Arguments: `$ARGUMENTS`

Choose `Quick`, `Normal`, or `Full`. Load only relevant context, inspect `git status --short`, and read every target file. Preserve unrelated local changes.

Modes:

- Empty arguments: implement the next approved pending task, verify it, then stop.
- `auto` or `all`: implement the clearly requested scope continuously. Stop only for a new material decision or required authority.

For each task:

1. Read acceptance criteria and approved decisions.
2. Hard-stop on any unapproved important decision; do not infer requirements or expand scope.
3. Implement the smallest complete slice following established project conventions.
4. Use tests proportionally; do not require TDD for trivial or configuration-only changes.
5. Run relevant tests and build only when the tools/commands are available and authorized.
6. Report each verification as `verified directly`, `verified from provided evidence`, or `not verified`.
7. Self-review according to the selected workflow and update memory once only when the change is material.

Do not commit, push, merge, tag, release, or deploy without explicit approval for that operation.
