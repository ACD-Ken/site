const { isIP } = require('node:net');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { formatBotReply } = require('./reply-format');
const {
  buildKnowledgeContext,
  getRemovedProjectReply,
  shouldBlockRemovedProjectQuery,
} = require('./chatbot-knowledge');

const USER_LIMIT = 500;
const REPLY_LIMIT = 3000;
const RATE_WINDOW = 15 * 60 * 1000;

function validateHistory(messages) {
  if (!Array.isArray(messages) || messages.length > 12 || messages.at(-1)?.role !== 'user') {
    return null;
  }

  const history = [];
  for (const message of messages) {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      return null;
    }
    const limit = message.role === 'user' ? USER_LIMIT : REPLY_LIMIT;
    const content = message.content.replace(/\0/g, '').trim();
    if (!content || message.content.length > limit) return null;
    history.push({ role: message.role, content });
  }
  return history.slice(-6);
}

function createChatApp({ client, onRailway = false, allowLocal = false, systemPrompt, model, dailyLimit = 250 }) {
  const app = express();
  app.set('etag', false);
  app.set('query parser', false);
  app.use(helmet());
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  const allowedOrigins = new Set(['https://acd-ken.github.io']);
  if (allowLocal) {
    allowedOrigins.add('http://localhost:8000');
    allowedOrigins.add('http://127.0.0.1:8000');
  }

  function allowPortfolioOrigin(req, res, next) {
    const origin = req.get('Origin');
    res.vary('Origin');
    // An origin check constrains browsers. Direct clients can supply their own headers.
    if (!allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'This chat is available from the portfolio site.' });
    }
    res.set('Access-Control-Allow-Origin', origin);
    next();
  }

  function getRateLimitKey(req) {
    // Use Railway's edge-provided client address only on the Railway service.
    const edgeIp = onRailway && req.get('X-Real-IP');
    if (edgeIp && isIP(edgeIp)) return edgeIp;
    return req.socket.remoteAddress || 'unknown-client';
  }

  const globalLimiter = rateLimit({
    windowMs: RATE_WINDOW,
    limit: 100,
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: () => 'chat',
    message: { error: 'Chat is busy. Please try again in a few minutes.' },
  });
  const chatLimiter = rateLimit({
    windowMs: RATE_WINDOW,
    limit: 15,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: getRateLimitKey,
    message: { error: 'Too many messages. Please try again in a few minutes.' },
  });

  app.get('/healthz', (_req, res) => res.sendStatus(client ? 200 : 503));
  app.options('/api/chat', allowPortfolioOrigin, (_req, res) => {
    res.set({
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
    res.sendStatus(204);
  });

  let budgetDay = 0;
  let providerCalls = 0;
  let inFlight = 0;
  const jsonBody = express.json({ limit: '32kb', inflate: false });
  app.post('/api/chat', allowPortfolioOrigin, chatLimiter, globalLimiter, (req, res, next) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Send an application/json request.' });
    }
    next();
  }, jsonBody, async (req, res) => {
    const history = validateHistory(req.body?.messages);
    if (!history) {
      return res.status(400).json({ error: 'Send a valid chat history ending with your message.' });
    }

    const question = history.at(-1).content;
    if (shouldBlockRemovedProjectQuery(question)) {
      return res.json({ reply: getRemovedProjectReply() });
    }
    if (!client) return res.status(503).json({ error: 'Chat is temporarily unavailable.' });
    if (inFlight >= 3) {
      res.set('Retry-After', '10');
      return res.status(503).json({ error: 'Chat is busy. Please try again shortly.' });
    }

    const now = Date.now();
    const today = Math.floor(now / 86_400_000);
    if (today !== budgetDay) {
      budgetDay = today;
      providerCalls = 0;
    }
    if (providerCalls >= dailyLimit) {
      res.set('Retry-After', String(Math.ceil(((today + 1) * 86_400_000 - now) / 1000)));
      return res.status(429).json({ error: 'Chat has reached its daily capacity. Please try again tomorrow.' });
    }

    providerCalls += 1;
    inFlight += 1;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    res.once('close', cancel);
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: 450,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: buildKnowledgeContext(question) },
          ...history,
        ],
      }, { signal: controller.signal });
      const reply = formatBotReply(response.choices[0]?.message?.content).slice(0, REPLY_LIMIT);
      if (!res.destroyed) {
        res.json({ reply: reply || "Sorry, I couldn't generate a response." });
      }
    } catch {
      if (!res.destroyed) {
        console.error('[ACD-Bot] Chat provider request failed');
        res.status(502).json({ error: 'Chat is temporarily unavailable.' });
      }
    } finally {
      res.off('close', cancel);
      inFlight -= 1;
    }
  });

  app.all('/api/chat', (_req, res) => {
    res.set('Allow', 'POST, OPTIONS').status(405).json({ error: 'Method not allowed.' });
  });
  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, _req, res, _next) => {
    const errors = {
      400: 'Invalid JSON request.',
      413: 'Chat request is too large.',
      415: 'Unsupported request encoding.',
    };
    const message = errors[err.status];
    if (!message) console.error('[ACD-Bot] Request handler failed');
    res.status(message ? err.status : 500).json({ error: message || 'Internal server error.' });
  });
  return app;
}

module.exports = { createChatApp };
