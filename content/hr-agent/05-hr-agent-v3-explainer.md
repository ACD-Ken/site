# HR Agent v3 - Multi-Agent Evidence Audit Workflow

## What changed from v2

v2 is an auditable agentic workflow: one AI Agent evaluates the CV, then deterministic n8n nodes validate, log, and route the result.

v3 makes the workflow more agentic by adding a second AI Agent:

1. `AI Agent: HR Screening Evaluation` scores the candidate against the role.
2. `AI Agent: Evidence Audit Review` reviews whether the first agent's scores, decision, and evidence are actually supported by the OCR text.
3. `Validate AI Evaluation` recalculates the score, merges the audit, and decides whether email is allowed.
4. `Log Candidate Evaluation` always records the result.
5. `Email Allowed?` only lets the Gmail node run when the candidate is shortlisted and the audit status is `Pass`.

## Why this is more agentic

v3 demonstrates a controlled multi-agent pattern:

- Evaluator agent: makes the hiring assessment.
- Auditor agent: critiques the assessment against source evidence.
- Deterministic workflow: controls side effects such as Sheets logging and recruiter email.

This is stronger than simply giving one agent more tools because it adds independent review without sacrificing auditability.

## v3 workflow map

```text
[Form: Job Application]
        -> [Extract Form Data]
        -> [Prepare PDF for OCR]
        -> [Mistral OCR]
        -> [AI Agent: HR Screening Evaluation]
              <- [OpenAI Chat Model: Evaluator]
              <- [Structured Output Parser]
              <- [Tool: score_guardrail]
        -> [AI Agent: Evidence Audit Review]
              <- [OpenAI Chat Model: Auditor]
              <- [Structured Audit Parser]
        -> [Validate AI Evaluation]
        -> [Log Candidate Evaluation]
        -> [Email Allowed?]
              true -> [Notify Recruiter]
              false -> stop after logging
```

## Email policy

Recruiter email is allowed only when:

- `decision` is `Shortlist`
- `audit_status` is `Pass`

If the audit returns `Warn` or `Fail`, the candidate is still logged to Google Sheets, but the workflow blocks automatic recruiter notification.
