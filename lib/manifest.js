import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import path from 'path';

export function buildManifest({ groupName, agentId, agentName, isTemplate = false }) {
  const skills = collectSkills();
  const memoryFiles = collectMemory();
  const scripts = collectScripts();
  const secretsChecklist = detectSecrets();

  return {
    version: '1',
    createdAt: new Date().toISOString(),
    isTemplate,
    agent: {
      name: agentName || groupName,
      groupName,
      agentId,
    },
    contents: {
      skills,
      memoryFiles,
      scripts,
    },
    secretsChecklist,
  };
}

function collectSkills() {
  const skillsDir = '/workspace/agent/.claude-skills';
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir).filter(f => statSync(path.join(skillsDir, f)).isDirectory());
}

function collectMemory() {
  const memoryDir = '/home/node/.claude/projects/-workspace-agent/memory';
  if (!existsSync(memoryDir)) return [];
  return readdirSync(memoryDir).filter(f => f.endsWith('.md'));
}

function collectScripts() {
  const workspace = '/workspace/agent';
  if (!existsSync(workspace)) return [];
  return readdirSync(workspace)
    .filter(f => (f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.ts')) && !f.includes('test'));
}

function detectSecrets() {
  const secrets = [];
  const configPath = '/workspace/agent/config.js';

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf8');
    const knownVars = [
      { key: 'YOUTUBE_API_KEY', label: 'YouTube API Key', hint: 'console.cloud.google.com → APIs & Services → Credentials' },
      { key: 'HEYGEN_API_KEY', label: 'HeyGen API Key', hint: 'app.heygen.com → Account → API' },
      { key: 'SHEETS_URL', label: 'Google Sheets URL', hint: 'Full URL of your Google Sheets document' },
      { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', hint: 'platform.openai.com/api-keys' },
      { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', hint: 'console.anthropic.com/settings/keys' },
      { key: 'BUFFER_API_KEY', label: 'Buffer API Key', hint: 'buffer.com/developers → API Keys' },
      { key: 'TWITTER_API_KEY', label: 'Twitter/X API Key', hint: 'developer.twitter.com → Projects & Apps' },
    ];

    for (const v of knownVars) {
      if (content.includes(v.key)) {
        secrets.push({ ...v, source: 'config.js' });
      }
    }
  }

  secrets.push({ key: 'BUFFER', label: 'Buffer API credentials', source: 'vault', hint: 'Add in NanoClaw vault → Settings → Secrets' });
  secrets.push({ key: 'LINKEDIN', label: 'LinkedIn credentials', source: 'vault', hint: 'Add in NanoClaw vault → Settings → Secrets' });

  return secrets;
}
