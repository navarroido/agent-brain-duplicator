const SECRET_KEYS = [
  'YOUTUBE_API_KEY', 'HEYGEN_API_KEY', 'SHEETS_URL',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'BUFFER_API_KEY',
  'TWITTER_API_KEY', 'INSTAGRAM_ACCESS_TOKEN', 'GOOGLE_API_KEY',
];

export function scrubConfig(content) {
  let result = content;
  for (const key of SECRET_KEYS) {
    result = result.replace(
      new RegExp(`(\\b${key}\\s*=\\s*)(['"\`])(?!YOUR_)[^'"\`]*\\2`, 'g'),
      `$1$2YOUR_${key}$2`
    );
  }
  return result;
}

export function injectSecrets(content, secretMap) {
  let result = content;
  for (const [key, value] of Object.entries(secretMap)) {
    if (!value) continue;
    const escaped = value.replace(/\\/g, '\\\\').replace(/\$/g, '\\$');
    result = result.replace(
      new RegExp(`(\\b${key}\\s*=\\s*)(['"\`])([^'"\`]*)\\2`, 'g'),
      `$1$2${escaped}$2`
    );
  }
  return result;
}

export function readConfigValues(content, keys) {
  const values = {};
  for (const key of keys) {
    const m = content.match(new RegExp(`\\b${key}\\s*=\\s*['"\`]([^'"\`]*)['"\`]`));
    values[key] = m ? m[1] : '';
  }
  return values;
}
