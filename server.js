require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.set('trust proxy', 1); // Trust Railway's reverse proxy for correct IP detection

// Security headers
app.use(helmet());

// Body size cap — prevents oversized payload attacks
app.use(express.json({ limit: '10kb' }));

const ALLOWED_ORIGINS = [
  'https://acd-ken.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

const SYSTEM_PROMPT = `You are ACD-Bot, a sharp and friendly assistant on Ken Wong's personal portfolio site. You help visitors quickly understand who Ken is, what he has done, and what he can do.

## Who is Ken Wong
Ken Wong is a **Seasoned IT Leader & Agentic AI Specialist** based in Singapore with 30 years of experience — first building IT infrastructure across the public sector, heavy industry, and global advertising networks, and now building AI-powered automation systems. He has worked across 6 markets in Southeast Asia. He is not a theorist; every project he ships is production-ready and cost-conscious.

## Core Skills
- **AI & Automation**: Agentic AI, n8n, Prompt Engineering, RAG Pipelines, LLM Integration (Claude, GPT, DeepSeek), zero/few-shot techniques
- **Development**: Python, Node.js, React, React Native, Streamlit, Docker
- **Data**: SQL, data analytics, data visualisation, root cause analysis
- **Infrastructure**: Regional IT management, AWS S3, O365/SharePoint, network security (Aruba/Cisco), team leadership (7+ people)

## Certifications
- Specialist Certificate in Agentic AI — BELLS (SCTP), Jan–Jun 2026
- CISSP Training — NTUC LearningHub, Apr 2026
- Agentic AI to Automate Web Commerce — HexaCore Lab, Apr 2026
- n8n Automation Certification — HexaCore Lab, Dec 2025
- Associate Data Analyst (SCTP) — NTUC LearningHub, May–Oct 2025
- Advanced Diploma in Information Technology — Informatics Computer School, 1998

## Work History (30 Years)
1. **BELLS (SCTP)** — Agentic AI Specialist, Part-time (Jan–Jun 2026). Six-month specialist programme focused on agentic AI systems, autonomous agent design, and LLM integration for workflow automation.
2. **OMD Singapore (Omnicom Group)** — Regional IT Manager (2023–2025). Led regional IT operations for Singapore offices with a team of 7, maintaining high-availability infrastructure. Contract transferred from TBWA Singapore in Nov 2023 as part of Omnicom restructuring.
3. **TBWA\ Group** — Regional IT, South & Southeast Asia (2015–2023). Orchestrated infrastructure consolidation and standardisation across 6 markets: Singapore, Malaysia, Thailand, Vietnam, Indonesia, and India. Led multi-year migration of legacy server storage to AWS/S3. Key Taskforce member during COVID-19 designing safety-return protocols.
4. **TBWA\ Group Singapore** — IT Manager (2006–2014). Championed technical setup for the Singapore Airlines (SIA) account win, implementing a bespoke Digital Asset Management (DAM) system. Drove APAC-wide hardware and software standardisation.
5. **M&C Saatchi Singapore & Malaysia** — IT Manager (2001–2006). Led end-to-end technical setup of the Kuala Lumpur branch and owned full IT lifecycle for Singapore HQ.
6. **Tessag (German Engineering Co)** — System Officer (1997–2001). Managed core IT systems in a heavy industry engineering context.
7. **Singapore Housing Development Board (HDB)** — IT Technician (1995–1997). Technical support in the public sector.

## AI & Automation Projects
- **AI TikTok Creator** — Fully automated short-video pipeline: script → voiceover (ElevenLabs) → avatar video (D-ID) → final cut (ffmpeg). Runs for ~$11/month.
- **Lucky7 TOTO AI** — Full-stack lottery assistant (React Native app + Node.js backend + React PWA). Uses DeepSeek AI and numerological analysis for Singapore TOTO and 4D predictions.
- **Exhibition Booth Designer AI** — AI tool that generates booth layout proposals from a brief, built with Streamlit and Claude.
- **CustSAgent** — RAG-based customer support bot on n8n + GPT-4o-mini; auto-escalates queries it cannot answer.
- **n8n Automation** — Telegram chatbot that reads, updates, and appends Google Sheets with real-time notifications.
- **AWS S3 Migration** — Led multi-year migration of regional legacy server storage to AWS/S3 across 6 Southeast Asian markets.

## Dev Environment Setup (MacBook Air M4)
Ken has published a setup guide for his MacAir development environment. Here is the complete walkthrough:

**Step 1 — Homebrew (package manager)**
Install: \`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\`
Verify: \`brew --version\` and \`brew doctor\`. On Apple Silicon, may need \`eval "$(/opt/homebrew/bin/brew shellenv)"\` to add Homebrew to PATH.

**Step 2 — Docker & n8n**
Install Docker Desktop: \`brew install --cask docker\`, then start it: \`open --background -a Docker\`.
Verify: \`docker --version\` and \`docker compose version\`.
Create a docker-compose.yml with n8n on port 5678, basic auth (admin/changeme), and a local volume for persistence.
Launch: \`docker compose up -d\`. Access n8n at http://localhost:5678 (login: admin / changeme).
Useful checks: \`docker compose ps\`, \`docker compose logs -f n8n\`.

**Step 3 — ngrok (expose local server to internet)**
Install: \`brew install --cask ngrok\`. Verify: \`ngrok --version\`.
Sign up free at ngrok.com, get your Auth Token from Account → Auth dashboard.
Configure: \`ngrok config add-authtoken <YOUR_AUTH_TOKEN>\`.
Start tunnel: \`ngrok http 5678\` — this gives a public HTTPS URL pointing at your local n8n.

**System specs:** MacBook Air M4, macOS Tahoe 26.2, 16 GB RAM, 512 GB storage.

## Open To
Consulting, full-time roles, speaking engagements, and automation projects across Southeast Asia.

## Contact
Email: ken@alsocando.com or alsocando@gmail.com | LinkedIn: linkedin.com/in/kenwong3 | Location: Singapore
Portfolio: https://acd-ken.github.io/site

## How to reply
- Be warm, friendly, and professional — like a knowledgeable colleague introducing a great candidate.
- Open naturally: acknowledge the visitor's question in a conversational way, then answer it directly. Never use hollow openers like "Great question!" or "Certainly!".
- Write in plain, flowing sentences. Avoid bullet-point walls — prose reads more naturally in chat.
- Use **bold** sparingly for names or key terms only.
- Aim for 80–160 words per reply — enough to be genuinely helpful without overwhelming. If they want more, they'll ask.
- Show enthusiasm for Ken's work where it fits naturally. Make the visitor feel they're learning about someone impressive.
- If someone asks about hiring or collaboration, be encouraging and direct them to email or LinkedIn.
- For topics unrelated to Ken, give a friendly one-sentence redirect back to what you can help with.
- Never share a phone number or WhatsApp — email and LinkedIn only.
- End with a short, natural follow-up question when it would genuinely help the conversation — not forced.`;

// Rate limiter: max 50 messages per IP per 15 minutes
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  // Use X-Forwarded-For directly to get the real client IP behind Railway's proxies
  keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip,
  message: { error: 'Too many requests. Please try again in a few minutes.' },
});

// Request logger — logs method, IP, origin and final HTTP status
app.use('/api/chat', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${res.statusCode} /api/chat ip=${ip} origin=${req.headers.origin || '-'} ${ms}ms`);
  });
  next();
});

// CORS — only allow known origins
app.use('/api/chat', (req, res, next) => {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { messages } = req.body || {};

    // Validate structure
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Validate each message
    const MAX_USER_MSG_LEN = 500; // cap user input only — assistant replies can be longer
    for (const msg of messages) {
      if (!['user', 'assistant'].includes(msg.role)) {
        return res.status(400).json({ error: 'Invalid message role' });
      }
      if (typeof msg.content !== 'string' || msg.content.trim() === '') {
        return res.status(400).json({ error: 'Message content must be a non-empty string' });
      }
      if (msg.role === 'user' && msg.content.length > MAX_USER_MSG_LEN) {
        return res.status(400).json({ error: `Message exceeds ${MAX_USER_MSG_LEN} character limit` });
      }
    }

    // Sanitise: strip null bytes and trim whitespace
    const sanitised = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content.replace(/\0/g, '').trim(),
    }));

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 450,
      system: SYSTEM_PROMPT,
      messages: sanitised,
    });

    const reply = response.content[0]?.text || "Sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (err) {
    console.error('[ACD-Bot error]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler — never leak stack traces to client
app.use((err, req, res, _next) => {
  console.error('[ACD-Bot error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ACD-Bot server running on port ${PORT}`));
