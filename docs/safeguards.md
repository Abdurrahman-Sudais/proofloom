# Review safeguards

How Proofloom keeps people in charge of print decisions, and where each safeguard lives in the prototype (`src/app/`).

| Safeguard | Implementation |
|---|---|
| A person confirms the reference | Extracted specification fields start as *not confirmed*. `runComparison` refuses to run until a reviewer confirms them. Confirmed fields cannot be edited; a change requires a new specification version. |
| Exact checks are deterministic | `engine.mjs` (`checkField`) converts quantity units, compares codes, validates GS1 check digits, and checks required wording and list items. Severity is set by rules and by the specification's *critical* flag, never by AI. |
| AI is labelled, evidence-bound and gated | AI findings carry an “AI-suggested” badge everywhere, start as “Suggested · needs decision”, and block the print decision until a reviewer confirms or dismisses them. Dismissal needs a reason of at least 10 characters. Production adds the evidence-quote validation in `backend/lambdas/suggest_discrepancies`. |
| Fixes are verified, not asserted | A finding becomes “Verified fixed” only when the re-check on a newer artwork version no longer detects it (`reconcile`). Reviewers cannot mark a finding fixed by hand. |
| Waivers are explicit | “Accept as-is” needs a written reason and is audited. With the *critical findings must be fixed* policy on, a waived critical finding still blocks the decision. |
| Decisions are tied to a version | A decision records the exact artwork version. Uploading a new version, re-running the comparison, requesting corrections or reopening a finding revokes a pending first approval. A closed review cannot take new versions. |
| Two-person approval | When the policy is on, a second, different reviewer must confirm (`recordDecision`). |
| Least privilege | The studio sees only correction requests and can reply and upload. Administrators see aggregates, roles, policy and the audit log, not review contents. Every action checks the role (`guard`) and throws `PermissionError` otherwise. |
| Audit trail | Every state change writes an audit entry. The admin can export it as CSV. |
| No compliance claims | The UI, website, FAQ and reports state that Proofloom assists review and does not certify regulatory compliance. |
| Fictional data | Every person, product and barcode in the prototype is invented. The top bar and sidebar say so. |

## Language guidelines (UI copy, reports, prompts)

- Describe differences, not blame: “Quantity differs: 450 ml in the specification, 500 ml on the artwork.”
- Never say artwork is “compliant”, “approved by Proofloom” or “error-free”.
- AI text says “suggested”, “may differ” and “a reviewer should decide”, never “is wrong”.
- Every recorded decision names the person and the version.

## Test plan

- **Rules:** shared fixtures (`backend/tests/fixtures/cases.json`) run in both `tests/engine.test.mjs` and `backend/tests/test_lambdas.py`.
- **Workflow:** `tests/workflow.test.mjs` covers permissions per role, the spec gate, verified fixes on re-upload, waiver policy, revocation of a pending approval, two-person approval and the AI cap.
- **UI:** `tests/prototype.test.mjs` drives the prototype in jsdom across all three roles, including persistence and reset.
- **AI:** malformed output fails closed, invented quotes are dropped, and identifying keys are rejected (`test_lambdas.py`). Before launch, add red-team prompts with injection strings embedded in artwork text.
- **Still to do with real users:** a keyboard-only and screen-reader pass, plus a pilot measuring the confirmation and dismissal rate of suggestions and the time from first finding to verified fix.
