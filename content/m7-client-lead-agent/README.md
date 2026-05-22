# M7 Client Communication and Lead Qualification Capstone

Public-safe website artifacts for the SCTP Agentic AI Specialist capstone project.

## Files

- `customer-rapport-assistant.json`: sanitized webhook-based n8n workflow for investment client response drafting, Gmail approval, and Sheets logging.
- `telegram-lead-qualification-bot.json`: sanitized webhook-based n8n workflow for lead capture, RAG answers, scoring, and sales alert routing.
- `rag-knowledge-ingestion.json`: sanitized webhook-based n8n workflow for loading the sample knowledge base into Supabase Vector Store.
- `sample-sales-kb.csv`: demo knowledge base rows for the RAG workflow.
- `supabase-vector-store.sql`: vector table and match function for the Supabase store.
- `demo-flow.svg`: public architecture visual for the portfolio page.
- `test-results-2026-05-22.md`: public-safe summary of local n8n E2E testing.

## Sanitization Rules

These files must not contain API keys, Telegram bot tokens, OAuth tokens, private sheet IDs, private webhook URLs, or n8n instance metadata. Real credentials are configured only in n8n native credentials.

Local E2E workflow exports with credential references, Telegram chat context, Gmail approval links, Google Sheet IDs, or webhook URLs must remain outside this public folder.
