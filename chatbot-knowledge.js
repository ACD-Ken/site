const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'can', 'does', 'for',
  'from', 'have', 'he', 'how', 'i', 'in', 'is', 'it', 'ken', 'me', 'of',
  'on', 'or', 'tell', 'the', 'to', 'what', 'with', 'you',
]);

const INTENT_RULES = [
  ['hiring', /\b(hire|hiring|consult|consulting|collaborate|collaboration|available|availability|contact|email|linkedin|role|job|recruit)\b/i],
  ['projects', /\b(project|projects|portfolio|lucky7|toto|tiktok|booth|custsagent|rag|automation|n8n|aws|migration)\b/i],
  ['skills', /\b(skill|skills|python|node|react|docker|sql|data|infrastructure|agentic|ai|automation|llm|prompt)\b/i],
  ['work_history', /\b(experience|career|work|history|advertising|tbwa|saatchi|omd|hdb|tessag|regional)\b/i],
  ['certifications', /\b(cert|certificate|certification|bells|cissp|diploma|course|training|sctp)\b/i],
  ['setup', /\b(setup|macbook|macair|homebrew|docker|ngrok|environment|install)\b/i],
];

const KNOWLEDGE_BASE = [
  {
    id: 'profile-summary',
    intent: 'skills',
    title: 'Ken profile summary',
    keywords: ['profile', 'summary', 'who', 'ken', 'it', 'leader', 'agentic', 'ai', 'singapore'],
    content: 'Ken Wong is a Singapore-based Seasoned IT Leader and Agentic AI Specialist with 30 years of experience across public sector, heavy industry, global advertising networks, and AI automation systems. He has worked across 6 Southeast Asian markets and focuses on production-ready, cost-conscious delivery.',
  },
  {
    id: 'skills-core',
    intent: 'skills',
    title: 'Core skills',
    keywords: ['skills', 'ai', 'automation', 'agentic', 'rag', 'llm', 'python', 'node', 'react', 'sql', 'infrastructure'],
    content: 'Ken works across Agentic AI, n8n automation, prompt engineering, RAG pipelines, LLM integration, Python, Node.js, React, React Native, Streamlit, Docker, SQL, data analytics, AWS S3, Office 365, SharePoint, Aruba/Cisco network security, and regional IT team leadership.',
  },
  {
    id: 'work-advertising',
    intent: 'work_history',
    title: 'Advertising technology career',
    keywords: ['advertising', 'm&c', 'saatchi', 'tbwa', 'sia', 'dam', 'regional', 'creative'],
    content: 'Ken spent 17 years in advertising technology and IT leadership. He was IT Manager at M&C Saatchi Singapore & Malaysia from 2001 to 2006, then worked with TBWA Group from 2006 to 2023. At TBWA he rose into regional IT leadership covering South and Southeast Asia, supported the Singapore Airlines account win, and implemented a bespoke Digital Asset Management system.',
  },
  {
    id: 'work-regional-it',
    intent: 'work_history',
    title: 'Regional IT leadership',
    keywords: ['regional', 'omd', 'tbwa', 'markets', 'infrastructure', 'aws', 'covid'],
    content: 'Ken led regional IT operations across Singapore, Malaysia, Thailand, Vietnam, Indonesia, and India. His work included infrastructure consolidation, APAC hardware and software standardisation, AWS/S3 legacy storage migration, and COVID-19 safety-return protocol planning.',
  },
  {
    id: 'project-lucky7',
    intent: 'projects',
    title: 'Lucky7 TOTO AI',
    keywords: ['lucky7', 'toto', '4d', 'lottery', 'react', 'native', 'node', 'deepseek', 'pwa'],
    content: 'Lucky7 TOTO AI is Ken\'s full-stack lottery assistant with a React Native app, Node.js backend, and React PWA. It uses DeepSeek AI and numerological analysis for Singapore TOTO and 4D prediction workflows.',
  },
  {
    id: 'project-tiktok',
    intent: 'projects',
    title: 'AI TikTok Creator',
    keywords: ['tiktok', 'creator', 'short', 'video', 'elevenlabs', 'd-id', 'ffmpeg'],
    content: 'AI TikTok Creator is Ken\'s automated short-video pipeline: script generation to ElevenLabs voiceover, D-ID avatar video, and ffmpeg final cut. It is designed to run at roughly 11 dollars per month.',
  },
  {
    id: 'project-rag',
    intent: 'projects',
    title: 'CustSAgent RAG bot',
    keywords: ['custsagent', 'rag', 'customer', 'support', 'n8n', 'gpt', 'escalation'],
    content: 'CustSAgent is Ken\'s RAG-based customer support bot built on n8n and GPT-4o-mini. It retrieves knowledge-base answers and escalates queries it cannot answer.',
  },
  {
    id: 'project-booth',
    intent: 'projects',
    title: 'Exhibition Booth Designer AI',
    keywords: ['booth', 'exhibition', 'designer', 'streamlit', 'oai', 'openai', 'layout'],
    content: 'Exhibition Booth Designer AI generates booth layout proposals from a brief. Ken built it with Streamlit and OAI to turn early requirements into practical layout concepts.',
  },
  {
    id: 'certifications',
    intent: 'certifications',
    title: 'Certifications and training',
    keywords: ['certification', 'certificate', 'bells', 'cissp', 'n8n', 'data', 'diploma', 'sctp'],
    content: 'Ken\'s certifications and training include Specialist Certificate in Agentic AI from BELLS SCTP, CISSP training from NTUC LearningHub, Agentic AI to Automate Web Commerce from HexaCore Lab, n8n Automation Certification from HexaCore Lab, Associate Data Analyst SCTP from NTUC LearningHub, and Advanced Diploma in IT from Informatics Computer School.',
  },
  {
    id: 'contact',
    intent: 'hiring',
    title: 'Contact and availability',
    keywords: ['hire', 'hiring', 'contact', 'email', 'linkedin', 'consulting', 'full-time', 'speaking', 'automation'],
    content: 'Ken is open to consulting, full-time roles, speaking engagements, and automation projects across Southeast Asia. Contact him by email at ken@alsocando.com or alsocando@gmail.com, or via LinkedIn at linkedin.com/in/kenwong3. Do not share a phone number or WhatsApp.',
  },
  {
    id: 'setup-guide',
    intent: 'setup',
    title: 'MacAir development setup',
    keywords: ['setup', 'macair', 'macbook', 'homebrew', 'docker', 'n8n', 'ngrok', 'install'],
    content: 'Ken\'s MacAir development setup guide covers Homebrew, Docker Desktop, n8n on port 5678 with Docker Compose, and ngrok tunnelling for local n8n testing. His listed system is MacBook Air M4, macOS Tahoe 26.2, 16 GB RAM, and 512 GB storage.',
  },
];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.&-]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function classifyIntent(query) {
  const text = String(query || '');
  const match = INTENT_RULES.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : 'general';
}

function retrieveKnowledge(query, limit = 4) {
  const intent = classifyIntent(query);
  const queryTokens = new Set(tokenize(query));

  return KNOWLEDGE_BASE
    .map((entry) => {
      const keywordScore = entry.keywords.reduce((score, keyword) => {
        return score + (queryTokens.has(keyword.toLowerCase()) ? 4 : 0);
      }, 0);
      const contentTokens = tokenize(`${entry.title} ${entry.content}`);
      const contentScore = contentTokens.reduce((score, token) => {
        return score + (queryTokens.has(token) ? 1 : 0);
      }, 0);
      const intentScore = entry.intent === intent ? 6 : 0;

      return { ...entry, score: keywordScore + contentScore + intentScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function buildKnowledgeContext(query) {
  const intent = classifyIntent(query);
  const results = retrieveKnowledge(query);
  const facts = results.map((entry, index) => {
    return `${index + 1}. ${entry.title}: ${entry.content}`;
  }).join('\n');

  return [
    `Visitor intent: ${intent}`,
    'Use these facts as the primary source for the answer. If the facts do not cover the question, say what you can answer about Ken and redirect politely.',
    facts || 'No matching local knowledge facts found.',
  ].join('\n');
}

module.exports = {
  classifyIntent,
  retrieveKnowledge,
  buildKnowledgeContext,
  KNOWLEDGE_BASE,
};
