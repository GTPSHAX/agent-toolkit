---
name: code-review-and-quality
description: Performs a focused evidence-based review of a defined change. Use for explicit review requests or Normal/Full changes where independent scrutiny materially reduces risk.
---

# Focused Code Review

Review the requested diff against its requirement and actual reachable behavior. The goal is a correct decision, not a long report.

## Scope

Read the task, changed files, and directly relevant callers/tests. Do not audit the entire repository. Existing problems outside the changed behavior are out of scope unless the change makes them reachable or materially worse.

## Blocking Standard

A finding blocks only when all are true:

1. It violates an explicit requirement, established contract, or causes a concrete defect.
2. The failure path is reachable under realistic project usage.
3. The impact is material for the reviewed change.
4. The exact location and smallest reasonable correction are identifiable.

If reachability or impact is uncertain, label it `Unproven risk`, not a blocking defect. Do not invent concurrency, security, performance, or portability requirements absent from the project.

Style preferences, cosmetic comments, optional abstractions, speculative future needs, and unrelated legacy issues are non-blocking. Do not demand code be rewritten to match personal taste.

## Review Order

1. Does the change solve the stated task?
2. Does it introduce a concrete regression in the changed path?
3. Do relevant tests/checks support the claim?
4. Does it violate an explicit project rule?
5. Is there a simpler correction required for correctness, not merely preference?

Security and performance are checked only where the diff touches those behaviors.

## Output

Keep the report short:

- `PASS` or `CHANGES REQUIRED`
- blocking findings with file/location, trigger, impact, and minimal fix
- at most three non-blocking notes with clear value
- verification actually performed

Do not manufacture a positive observation, fill empty categories, or produce a six-axis checklist when there are no findings.

After a fix, recheck only the original blocking finding and directly affected code. Do not open a new general review cycle. Maximum one remediation pass unless the user explicitly requests deeper review.
