---
description: Produce a user-reviewed implementation plan with acceptance criteria, dependencies, and decision gates.
agent: mandor
subtask: false
---

Follow Mandor's built-in design and scope rules. A planning skill is optional.

Planning request: `$ARGUMENTS`

Load relevant context and read only the necessary codebase sections. Planning is read-only unless the user asks to save the plan.

1. Identify requirements, dependency graph, existing boundaries, and memory gaps.
2. Follow existing project structure; do not introduce abstractions without a concrete need.
3. List only unresolved decisions that materially change the implementation.
4. Slice work only as far as needed to make execution clear; include acceptance criteria, dependencies, likely files, and verification.
5. Present the plan for user review.
6. Save `tasks/plan.md` only when the user explicitly asks for a persisted plan. Do not create a todo file.

Do not implement code, commit, push, merge, tag, release, or deploy.
