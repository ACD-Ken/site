# M7 Capstone Test Results - Public Summary

Test date: 22 May 2026  
Environment: local n8n with native credentials

This file is a public-safe summary. It intentionally omits Telegram tokens, chat IDs, private credential IDs, Gmail inbox details, Google Sheet IDs, Supabase keys, and webhook URLs.

## Results

| Test Area | Status | Public-Safe Evidence |
| --- | --- | --- |
| RAG ingestion | Passed | Loaded 4 sample sales knowledge rows, generated OpenAI embeddings, and inserted them into Supabase Vector Store. |
| Telegram lead qualification path | Passed | Synthetic E2E test produced a qualified lead with `lead_score: 85` and `qualified: true`; Gmail alert and Telegram reply nodes completed successfully. |
| Live Telegram trigger | Pending public tunnel | The bot is reachable, but inbound visitor messages need a fresh public n8n webhook or hosted n8n URL before the local trigger can receive them. |
| Customer rapport approval | Partial | Sample intake, AI draft, and JSON parsing succeeded. Human approval reached the Gmail waiting state; final approval and Sheets append still need production approval inbox/sheet configuration. |

## Private Artifacts Kept Out Of GitHub Pages

- Local E2E workflow JSON files with n8n credential references.
- Synthetic Telegram test workflow files containing local chat context.
- Gmail inbox screenshots or approval links.
- Google Sheets IDs, Supabase keys, webhook URLs, and bot tokens.

## Next Live-Demo Steps

1. Configure a fresh public tunnel or hosted n8n webhook for the Telegram trigger.
2. Re-run the live Telegram registration and qualified-lead path from a real Telegram user message.
3. Confirm the Gmail human-approval email delivery path.
4. Replace sanitized Google Sheets IDs with real private sheet references inside n8n only.
