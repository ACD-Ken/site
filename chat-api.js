const { isIP } = require('node:net');
const express = require('express');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { createChatBudget } = require('./chat-budget');
const { formatBotReply } = require('./reply-format');
const {
  buildKnowledgeContext,
  getRemovedProjectReply,
  shouldBlockRemovedProjectQuery,
} = require('./chatbot-knowledge');

const USER_LIMIT = 500;
const REPLY_LIMIT = 3000;
const RATE_WINDOW = 15 * 60 * 1000;
const LIMIT_MESSAGES = {
  CHAT_BURST_LIMIT: 'ACD-Bot has reached its short-term usage limit.',
  CHAT_DAILY_LIMIT: 'ACD-Bot has reached its daily usage limit.',
  CHAT_MONTHLY_LIMIT: 'ACD-Bot has reached its 30-day usage limit.',
};

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
    history.push({ role: message.role, content: message.role === 'assistant' ? content.slice(0, 1000) : content });
  }
  return history.slice(-6);
}

function createChatApp({
  client, onRailway = false, allowLocal = false, systemPrompt, model,
  budget = createChatBudget(), chatEnabled = true,
}) {
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
    const clientIp = edgeIp && isIP(edgeIp) ? edgeIp : req.socket.remoteAddress;
    return clientIp ? ipKeyGenerator(clientIp) : 'unknown-client';
  }

  const globalLimiter = rateLimit({
    windowMs: RATE_WINDOW,
    limit: 60,
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: () => 'chat',
    message: { error: 'Chat is busy. Please try again in a few minutes.' },
  });
  const chatLimiter = rateLimit({
    windowMs: RATE_WINDOW,
    limit: 10,
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

  let providerAuthFailed = false;
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
    if (!client || !chatEnabled || providerAuthFailed) {
      return res.status(503).json({ error: 'Chat is temporarily unavailable.' });
    }
    if (inFlight >= 2) {
      res.set('Retry-After', '10');
      return res.status(503).json({ error: 'Chat is busy. Please try again shortly.' });
    }

    try {
      const limit = budget.reserve();
      if (limit) {
        res.set('Retry-After', String(limit.retryAfterSeconds));
        return res.status(429).json({ ...limit, error: LIMIT_MESSAGES[limit.code] });
      }
    } catch {
      console.error('[ACD-Bot] Usage budget storage unavailable');
      return res.status(503).json({ error: 'Chat is temporarily unavailable.' });
    }

    inFlight += 1;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    res.once('close', cancel);
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: 350,
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
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) providerAuthFailed = true;
      if (!res.destroyed) {
        console.error(providerAuthFailed
          ? '[ACD-Bot] Provider authorization failed. Chat paused until restart.'
          : '[ACD-Bot] Chat provider request failed');
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
