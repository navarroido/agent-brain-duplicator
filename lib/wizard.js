import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { injectSecrets, readConfigValues } from './config-scrubber.js';
import { tq } from './art.js';

async function askVisible(rl, prompt) {
  return new Promise(r => rl.question(prompt, r));
}

async function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(prompt);
    rl._writeToOutput = () => {};
    rl.question('', (val) => {
      rl.close();
      process.stdout.write('\n');
      resolve(val.trim());
    });
  });
}

export async function runSetupWizard(targetGroup, secretsChecklist, chalk) {
  const t = tq(chalk);
  const configSecrets = secretsChecklist.filter(s => s.source === 'config.js');
  const vaultSecrets = secretsChecklist.filter(s => s.source === 'vault');

  if (configSecrets.length === 0) {
    if (vaultSecrets.length > 0) {
      console.log(chalk.yellow('\n  ⚠  Add these in the NanoClaw vault after deploy:'));
      vaultSecrets.forEach(s => console.log('     ' + chalk.yellow('→') + ' ' + s.label));
      console.log();
    }
    return;
  }

  const configPath = `${targetGroup}/config.js`;
  const configContent = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
  const currentValues = readConfigValues(configContent, configSecrets.map(s => s.key));

  const W = 60;
  const eq = '═'.repeat(W);
  const dsh = '─'.repeat(W);

  console.log('\n' + t('╔' + eq + '╗'));
  console.log(t('║') + chalk.bold('  🧠  Agent Setup Wizard') + ' '.repeat(W - 23) + t('║'));
  console.log(t('╚' + eq + '╝'));
  console.log();
  console.log('  ' + chalk.bold.white('Configure your new agent\'s secrets.'));
  console.log('  ' + chalk.dim('API keys are hidden as you type. Press Enter to skip.'));
  console.log();

  if (!process.stdin.isTTY) {
    console.log(chalk.yellow('  (Non-interactive terminal — skipping wizard. Edit config.js manually.)'));
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const newValues = {};

  for (let i = 0; i < configSecrets.length; i++) {
    const s = configSecrets[i];
    const current = currentValues[s.key] || '';
    const isPlaceholder = !current || current.startsWith('YOUR_');

    console.log(t('  ' + dsh));
    console.log();
    console.log('  ' + chalk.bold(t(`[${i + 1}/${configSecrets.length}]`)) + '  ' + chalk.bold.white(s.label));
    if (s.hint) console.log('  ' + chalk.dim('    ' + s.hint));
    console.log();

    let answer;
    if (isPlaceholder) {
      answer = await askHidden('  ' + t('›') + ' ' + chalk.white('Enter value (hidden): '));
    } else {
      const masked = current.length > 8
        ? current.slice(0, 3) + '••••' + current.slice(-3)
        : '••••••••';
      console.log('  ' + chalk.dim('  Current: ' + masked));
      answer = await askHidden('  ' + t('›') + ' ' + chalk.white('New value (Enter to keep): '));
    }

    if (answer) {
      newValues[s.key] = answer;
      console.log('  ' + chalk.green('  ✓ Saved'));
    } else if (!isPlaceholder) {
      console.log('  ' + chalk.dim('  ✓ Keeping existing'));
    } else {
      console.log('  ' + chalk.yellow('  ↷ Skipped'));
    }
    console.log();
  }

  rl.close();

  if (Object.keys(newValues).length > 0 && existsSync(configPath)) {
    let content = readFileSync(configPath, 'utf8');
    content = injectSecrets(content, newValues);
    writeFileSync(configPath, content);
  }

  console.log(t('  ' + dsh));
  console.log();

  if (vaultSecrets.length > 0) {
    console.log('  ' + chalk.bold.yellow('⚠  Also add these in the NanoClaw vault:'));
    vaultSecrets.forEach(s => console.log('     ' + chalk.yellow('→') + ' ' + chalk.white(s.label)));
    console.log('     ' + chalk.dim('(NanoClaw UI → Agent Settings → Secrets)'));
    console.log();
  }
}
