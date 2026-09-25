---
name: using-agent-skills
description: Selects the smallest useful skill for an active task without creating an automatic lifecycle.
---

# Using Skills Efficiently

Skills add focused guidance to the current Mandor context. They are not mandatory stages.

## Selection

1. Start without a skill when the task is straightforward.
2. Load one skill when domain guidance materially improves the result.
3. Add a second only for a distinct concern that is actually present.
4. Stop loading skills once the task can be completed safely.

Common choices:

- unclear product intent: `idea-refine` or `interview-me`
- design/API decision: `api-and-interface-design` or `spec-driven-development`
- implementation: `incremental-implementation`
- bug diagnosis: `debugging-and-error-recovery`
- tests: `test-driven-development`
- explicit review: `code-review-and-quality`
- real security boundary: `security-and-hardening`
- cross-session context: `project-memory`

Do not automatically chain spec -> plan -> implementation -> test -> review -> simplify -> ship. Do not load a skill to satisfy ceremony. Skip any skill instruction that expands beyond the user-approved scope.

Subagents are separate contexts. Use them only for independent research or read-only exploration, never as handoff stages for dependent work.
