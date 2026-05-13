function formatBotReply(text) {
  return String(text || '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[([^\]\n]+)\]\([^)]+\)/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

module.exports = { formatBotReply };
