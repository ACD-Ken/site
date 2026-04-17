const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

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

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: messages.slice(-6),
  });

  const reply = response.content[0]?.text || "Sorry, I couldn't generate a response.";
  res.json({ reply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ACD-Bot server running on port ${PORT}`));
