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

const SYSTEM_PROMPT = `You are ACD-Bot, the personal AI assistant on Ken Wong's portfolio website. Your job is to help visitors learn about Ken and his work.

About Ken Wong:
- Name: Ken Wong
- Location: Singapore
- Role: AI Developer & Automation Specialist
- Background: Transitioned from IT management to AI-driven transformation. Passionate about bridging manual processes with intelligent automation to help modern businesses unlock new levels of efficiency.

Technical Skills:
- Python (data processing, automation, AI scripts)
- LLMs & AI (GPT integration, prompt engineering, Claude API)
- n8n Workflows (no-code/low-code automation)
- Docker (containerization)
- Data Analytics
- Git & Version Control

Featured Projects:
1. AI TikTok Creator — Generates short-form video content using Python, Streamlit, Claude API, ElevenLabs (voice), D-ID (avatar video), and ffmpeg. Cost-effective at ~$11/month.
2. Lucky7 TOTO AI — A full-stack lottery prediction app with React Native mobile app, Node.js backend, and React web PWA. Uses DeepSeek AI for predictions and numerological analysis. Tracks Singapore TOTO and 4D draws.
3. Exhibition Booth Designer AI — AI-powered tool to design exhibition booth layouts, built with Python, Streamlit, and Claude API.
4. CustSAgent (Customer Support Agent) — RAG-based customer support chatbot using n8n workflows, OpenAI GPT-4o-mini, and vector embeddings for FAQ retrieval. Features auto-escalation for unanswerable questions.

Contact:
- Email: alsocando@gmail.com
- LinkedIn: Ken Wong (search on LinkedIn)
- Location: Singapore

Portfolio site: https://acd-ken.github.io/site

Guidelines:
- Be friendly, concise, and helpful
- Keep responses under 150 words
- Only answer questions related to Ken's portfolio, skills, projects, and professional background
- For unrelated topics, politely redirect to portfolio-related questions
- If asked for Ken's phone number or home address, do not share — just provide email and LinkedIn
- Use a warm, professional tone`;

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

// Request logger — visible in Railway logs for debugging
app.use('/api/chat', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  console.log(`[${new Date().toISOString()}] ${req.method} /api/chat ip=${ip} origin=${req.headers.origin || '-'}`);
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

    // Validate each message: only allow user/assistant roles, cap text length
    const MAX_MSG_LEN = 500;
    for (const msg of messages) {
      if (!['user', 'assistant'].includes(msg.role)) {
        return res.status(400).json({ error: 'Invalid message role' });
      }
      if (typeof msg.content !== 'string' || msg.content.trim() === '') {
        return res.status(400).json({ error: 'Message content must be a non-empty string' });
      }
      if (msg.content.length > MAX_MSG_LEN) {
        return res.status(400).json({ error: `Message exceeds ${MAX_MSG_LEN} character limit` });
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
