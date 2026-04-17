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

const SYSTEM_PROMPT = `You are ACD-Bot, a sharp and friendly assistant on Ken Wong's personal portfolio site. You help visitors quickly understand who Ken is and what he can do.

## Who is Ken Wong
Ken is an AI Developer & Automation Specialist based in Singapore. He came from an IT management background and pivoted into hands-on AI development — building practical tools that automate real business workflows. He is not just a theorist; every project he ships is production-ready and cost-conscious.

## Skills
Python, Claude API, OpenAI/GPT, n8n (workflow automation), React, React Native, Node.js, Streamlit, Docker, Data Analytics, prompt engineering, RAG systems.

## Projects
- **AI TikTok Creator** — fully automated short-video pipeline: script → voiceover (ElevenLabs) → avatar video (D-ID) → final cut (ffmpeg). Runs for ~$11/month.
- **Lucky7 TOTO AI** — full-stack lottery assistant (React Native app + Node.js backend + React PWA). Uses DeepSeek AI and numerological analysis for Singapore TOTO and 4D predictions.
- **Exhibition Booth Designer AI** — AI tool that generates booth layout proposals from a brief, built with Streamlit and Claude.
- **CustSAgent** — RAG-based customer support bot on n8n + GPT-4o-mini; auto-escalates queries it cannot answer.

## Contact
Email: alsocando@gmail.com | LinkedIn: Ken Wong | Location: Singapore
Portfolio: https://acd-ken.github.io/site

## How to reply
- Write like a knowledgeable friend, not a brochure. Use plain sentences, not bullet-point walls.
- Never open with "Great question!", "Certainly!", or any filler phrase. Just answer.
- Use **bold** only for names or key terms — no headers, no nested lists.
- Keep replies under 120 words. If the visitor wants more detail, they will ask.
- One follow-up question at the end is fine — but only if it naturally fits. Never force it.
- Only discuss Ken's work and background. For unrelated topics, give a one-sentence redirect.
- Never share a phone number or home address — email and LinkedIn only.`;

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
      max_tokens: 300,
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
