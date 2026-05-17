# HR Agent v4 - Autonomous Triage Workflow

## What changed from v3

v3 uses two agents: one evaluates the CV and one audits whether the evaluation is supported by OCR evidence.

v4 keeps that controlled multi-agent pattern and adds a third agent:

1. `AI Agent: HR Screening Evaluation` scores the candidate against the role.
2. `AI Agent: Evidence Audit Review` checks whether the score and evidence are justified.
3. `Validate AI Evaluation` recalculates scores and enforces the audit gate.
4. `AI Agent: Triage Planner` recommends the recruiter route and next action.
5. `Validate Triage Route` makes the final deterministic route decision.
6. `Log Candidate Evaluation` always records the candidate.
7. Recruiter-only Gmail nodes run only for safe alert routes.

## Why this is more automated agentic

v4 demonstrates autonomous triage rather than only autonomous scoring.

- Evaluator agent: judges role fit.
- Auditor agent: challenges the evaluation against evidence.
- Triage planner agent: recommends the next recruiter action.
- Deterministic workflow: enforces final route, logging, and email safety.

This shows a stronger capstone pattern: agentic reasoning proposes actions, while n8n controls side effects.

## v4 workflow map

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
        -> [AI Agent: Triage Planner]
              <- [OpenAI Chat Model: Triage Planner]
              <- [Structured Triage Parser]
        -> [Validate Triage Route]
        -> [Log Candidate Evaluation]
        -> [Auto Shortlist Alert?]
              true -> [Notify Recruiter - Shortlist]
              false -> [Review Needed Alert?]
                         true -> [Notify Recruiter - Review Needed]
                         false -> stop after logging
```

## Route policy

`Validate Triage Route` chooses one final route:

- `auto_shortlist_alert`: shortlisted, audit passed, and confidence is high.
- `review_needed_alert`: strong candidate, but audit warning or lower confidence requires human review.
- `log_only`: moderate, reject, or low-priority cases.
- `blocked`: failed audit, unreadable OCR, invalid triage output, or unsafe route.

No v4 route sends candidate-facing email automatically.
