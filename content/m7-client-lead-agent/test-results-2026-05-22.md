# M7 Capstone Test Results - Public Summary

Test date: 22 May 2026  
Environment: local n8n with native credentials and temporary public tunnel

This file is a public-safe summary. It intentionally omits Telegram tokens, chat IDs, private credential IDs, Gmail inbox details, Supabase keys, and webhook URLs.

## Results

| Test Area | Status | Public-Safe Evidence |
| --- | --- | --- |
| RAG ingestion | Passed | Loaded 13 public-safe sales knowledge rows, including the expanded 10-service catalog, generated OpenAI embeddings, and inserted them into Supabase Vector Store. |
| Telegram lead qualification path | Passed | Synthetic E2E test produced a qualified lead with `lead_score: 85` and `qualified: true`; Gmail alert and Telegram reply nodes completed successfully. |
| Live webhook trigger | Passed | Both production webhook entry points were published, activated, and verified through the live tunnel with successful workflow-start responses. |

## Private Artifacts Kept Out Of GitHub Pages

- Local E2E workflow JSON files with n8n credential references.
- Synthetic Telegram test workflow files containing local chat context.
- Gmail inbox screenshots or alert details.
- Supabase keys, webhook URLs, and bot tokens.

## Live-Demo Operating Notes

1. Keep the temporary public tunnel online while demonstrating the website-to-n8n webhook path.
2. Re-run the live Telegram registration and qualified-lead path from a real Telegram user message during review if needed.
3. Keep Gmail sales-alert details private; publish only sanitized evidence summaries.
4. Keep sanitized workflow JSON files public, and keep real credentials configured only inside n8n.
