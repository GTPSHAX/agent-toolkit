---
description: Produce a pre-launch GO or NO-GO assessment from code and security review without deploying.
agent: mandor
subtask: false
---

Follow Mandor's built-in completion, review, security, and authority rules. Specialist skills are optional.

Ship assessment scope: `$ARGUMENTS`

This command assesses readiness only. It never commits, pushes, merges, tags, releases, deploys, runs migrations, or changes external services without separate explicit approval.

Load relevant context, inspect the actual change, and preserve unrelated working-tree changes.

Mandor performs the assessment in the current context. Apply security review only when the release changes a real security-sensitive boundary.

Synthesize:

1. Focused code quality review against release requirements.
2. Security findings only for reachable attack paths.
3. Test/build evidence actually available.
4. Performance, accessibility, infrastructure, and documentation only to the extent directly verified or supported by provided evidence.
5. A rollback plan.

Return `GO` when no proven blocking defect remains. Unproven or out-of-scope risks are notes, not automatic blockers. A GO/NO-GO assessment is not permission to ship.
