---
description: Simplify an approved code scope without changing behavior or making automatic commits.
agent: mandor
subtask: false
---

Follow Mandor's built-in scope, implementation, and review rules. Use a specialist skill only if extra domain detail is needed.

Scope: `$ARGUMENTS`

Inspect the working tree and read the actual target files plus relevant tests. Load memory/rules only when needed. Preserve unrelated user changes.

1. Establish the exact behavior, callers, edge cases, and existing tests.
2. Identify simplifications only inside the approved scope.
3. Hard-stop before deletion, public-contract change, architectural change, or another material decision not explicitly approved.
4. Apply one behavior-preserving change at a time.
5. Run relevant tests/build when available and authorized.
6. Check affected public API documentation only when public API changed.
7. Report verification evidence honestly and review the final diff at the depth required by the selected workflow.
8. Update project memory directly only if project knowledge changed materially.

Do not commit, push, merge, tag, release, or deploy without separate explicit user approval.
