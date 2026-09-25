# Definition of Done

This file is the shared project-wide completion gate. Apply it proportionally to the workflow level selected by Mandor. Task-specific acceptance criteria remain authoritative.

## Workflow-aware gates

- **Quick:** scope, actual target files, correctness, smallest relevant verification, working-tree preservation, and authority are required. Self-review is sufficient. Documentation and memory apply only when affected.
- **Normal:** applicable gates below use targeted verification and focused self-review.
- **Full:** all relevant gates below apply. Security review is required only for a changed attack surface.

`Not applicable` is valid only with a concrete reason. Do not perform a check merely to fill a template.

## Required gates

1. **Scope** - The result stays within the user-approved requirement and decisions. No unrelated cleanup, dependency, contract, destructive action, or external operation was added.
2. **Actual files** - Every edited or reviewed target file was read directly. Any conflict between memory and actual files was reported, and actual files were used as evidence of current state.
3. **Correctness** - Relevant acceptance criteria and error paths were checked. Behavior changes have tests when testing is applicable.
4. **Structure** - Namespace/class-first was followed where supported, without empty wrapper classes. Any material deviation has explicit user approval.
5. **Documentation** - Public APIs created or changed satisfy the language-appropriate documentation contract. C-like Doxygen targets pass the inventory, tag, signature, and accuracy checks.
6. **Verification** - Relevant tests, build, lint, type checks, runtime checks, and Doxygen were run when available and authorized. Each result is labeled `verified directly`, `verified from provided evidence`, or `not verified`; unavailable checks are not invented.
7. **Review** - No proven, reachable, material blocking defect remains. Hypothetical and out-of-scope risks do not block completion.
8. **Working tree** - User changes were preserved. No broad staging, destructive reset, or unrelated file absorption occurred.
9. **Authority** - No commit, push, merge, tag, release, deploy, migration, or external-service change occurred without explicit approval for that exact operation.
10. **Memory** - Material project knowledge is synchronized once through `project-memory` when needed. Cosmetic/local changes require no memory transaction. There is no persisted todo.

## Incomplete verification

A task may be reported as partially complete when a check cannot run, but the report must name the missing check, why it was not run, and the resulting risk. Do not convert `not verified` into a pass.
