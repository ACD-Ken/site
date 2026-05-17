# HR Agent v2 - Auditable Agentic Workflow

## What changed from v1

v1 is agentic because the n8n AI Agent can call Google Sheets and Gmail tools directly. That is useful for a demo, but the business rules depend heavily on prompt compliance.

v2 keeps the AI Agent for the reasoning step, but moves important side effects into deterministic n8n nodes:

1. The AI Agent evaluates the CV and produces structured scores.
2. A harmless `score_guardrail` tool lets the agent check score math without touching external systems.
3. `Validate AI Evaluation` recalculates score totals, applies the decision threshold, and rejects unreadable OCR output.
4. `Log Candidate Evaluation` always appends the final validated result to Google Sheets.
5. `Shortlist?` enforces the email rule with an IF node.
6. `Notify Recruiter` only runs on the true shortlist branch.

## Why this is better for a capstone

The project is still agentic: it uses an n8n AI Agent, an OpenAI model, a structured parser, and a tool. The improvement is that the agent no longer controls the irreversible actions. The workflow now has a clearer separation of responsibilities:

- AI decides the candidate evaluation.
- Code validates score integrity.
- n8n enforces logging and notification routing.

That makes the system easier to explain, test, audit, and defend during presentation.

## v2 workflow map

```
[Form: Job Application]
        -> [Extract Form Data]
        -> [Prepare PDF for OCR]
        -> [Mistral OCR]
        -> [AI Agent: HR Screening Evaluation]
              <- [OpenAI Chat Model]
              <- [Structured Output Parser]
              <- [Tool: score_guardrail]
        -> [Validate AI Evaluation]
        -> [Log Candidate Evaluation]
        -> [Shortlist?]
              true -> [Notify Recruiter]
              false -> stop after logging
```

## Stronger design message

In v1, the prompt says "always store" and "only email shortlisted candidates." In v2, the workflow guarantees those rules. This is the main production-readiness improvement.
