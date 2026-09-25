---
name: security-and-hardening
description: Reviews a concrete security-sensitive change using reachable attack paths. Use only for actual auth, permission, secret, crypto, injection, upload, deserialization, command execution, payment, or sensitive-data boundaries.
---

# Focused Security Review

Do not run a full security audit merely because code handles network packets, parses input, uses an API, or contains concurrency.

## Trigger

Use this skill only when the active change affects a real attack surface:

- authentication or authorization
- privilege or permission boundaries
- secrets, credentials, or cryptography
- SQL/HTML/shell/template injection sinks
- file upload or path resolution
- deserialization or dynamic execution
- payments or sensitive personal data
- externally reachable operation with meaningful impact

## Evidence Standard

A blocking finding must identify:

1. attacker-controlled source;
2. reachable path to a sensitive sink or broken boundary;
3. required preconditions;
4. concrete impact;
5. smallest viable mitigation.

If any element is missing, mark the item `Unproven risk` and do not force remediation. Do not escalate theoretical undefined behavior, unusual scheduling, hypothetical future callers, or unrelated legacy weaknesses without evidence they affect the requested change.

## Scope Discipline

Inspect only changed security boundaries and their immediate enforcement path. Do not turn the review into architecture redesign, general robustness review, dependency audit, or performance analysis unless the user asks.

## Output

Return:

- `PASS`, `BLOCKED`, or `NOT APPLICABLE`
- each blocking issue as source -> path -> sink -> impact -> minimal mitigation
- at most three non-blocking risks
- checks actually performed

After remediation, verify the original path once. Do not start another broad audit or create new mandatory work outside the approved scope.
