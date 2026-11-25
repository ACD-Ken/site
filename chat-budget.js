const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const RETENTION = 30 * DAY;

function readAttempts(filename) {
  try {
    const attempts = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (!Array.isArray(attempts) || attempts.some((time, index) =>
      !Number.isSafeInteger(time) || time < 0 || (index > 0 && time < attempts[index - 1])
    )) {
      throw new Error('Invalid chat budget data');
    }
    return attempts;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function saveAttempts(filename, attempts) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(attempts));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temporary, filename);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function createChatBudget({
  directory,
  burstLimit = 20,
  dailyLimit = 100,
  monthlyLimit = 1000,
  now = Date.now,
} = {}) {
  let filename;
  if (directory) {
    if (!path.isAbsolute(directory) || !fs.statSync(directory).isDirectory()) {
      throw new Error('Chat budget requires an existing absolute storage directory');
    }
    filename = path.join(directory, 'acd-chat-attempts.json');
  }
  let attempts = filename ? readAttempts(filename) : [];
  const windows = [
    { code: 'CHAT_BURST_LIMIT', duration: 15 * MINUTE, limit: burstLimit },
    { code: 'CHAT_DAILY_LIMIT', duration: DAY, limit: dailyLimit },
    { code: 'CHAT_MONTHLY_LIMIT', duration: RETENTION, limit: monthlyLimit },
  ];

  return {
    reserve() {
      const timestamp = Math.max(now(), attempts.at(-1) ?? 0);
      const recent = attempts.filter(time => time > timestamp - RETENTION);
      let blocked;
      for (const { code, duration, limit } of windows) {
        const active = recent.filter(time => time > timestamp - duration);
        if (active.length < limit) continue;
        const retryAfterSeconds = Math.ceil((active[active.length - limit] + duration - timestamp) / 1000);
        if (!blocked || retryAfterSeconds >= blocked.retryAfterSeconds) {
          blocked = { code, retryAfterSeconds };
        }
      }
      if (blocked) return blocked;

      recent.push(timestamp);
      // Railway mounts the volume on one replica. Reserve each attempt before
      // calling the provider, including attempts that fail or are interrupted.
      if (filename) saveAttempts(filename, recent);
      attempts = recent;
      return null;
    },
  };
}

module.exports = { createChatBudget };
