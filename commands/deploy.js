import { execSync } from 'child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import os from 'os';
import { injectSecrets, readConfigValues } from '../lib/config-scrubber.js';

function findNanoclaRoot(hint) {
  if (hint && existsSync(hint)) return hint;

  const candidates = [
    path.join(os.homedir(), 'Desktop/nano/nanoclaw-v2'),
    path.join(os.homedir(), 'nano/nanoclaw-v2'),
    path.join(os.homedir(), 'nanoclaw-v2'),
  ];
  for (const c of candidates) {
    if (existsSync(path.join(c, 'groups'))) return c;
  }

  try {
    const mountinfo = readFileSync('/proc/self/mountinfo', 'utf8');
    const match = mountinfo.match(/\/([^/]+\/Desktop\/[^/]+\/nanoclaw[^/]+)\//);
    if (match) return '/Users/' + match[1];
  } catch {}

  return null;
}

async function runSetupWizard(targetGroup, secretsChecklist, chalk) {
  const configSecrets = secretsChecklist.filter(s => s.source === 'config.js');
  const vaultSecrets = secretsChecklist.filter(s => s.source === 'vault');

  if (configSecrets.length === 0) {
    if (vaultSecrets.length > 0) {
      console.log(chalk.yellow('\n⚠  Add these in the NanoClaw vault after deploy:'));
      vaultSecrets.forEach(s => console.log(`   ${chalk.yellow('→')} ${s.label}`));
    }
    return;
  }

  const configPath = path.join(targetGroup, 'config.js');
  const configContent = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
  const currentValues = readConfigValues(configContent, configSecrets.map(s => s.key));

  const W = 60;
  const eq = '═'.repeat(W);
  const dsh = '─'.repeat(W);

  console.log('\n' + chalk.bold.cyan('╔' + eq + '╗'));
  console.log(
    chalk.bold.cyan('║') +
    chalk.bold('  🧠  Agent Setup Wizard') +
    ' '.repeat(W - 23) +
    chalk.bold.cyan('║')
  );
  console.log(chalk.bold.cyan('╚' + eq + '╝'));
  console.log();
  console.log('  ' + chalk.white.bold('Configure your new agent\'s secrets.'));
  console.log('  ' + chalk.dim('Press Enter to keep the current value, or type a new one.'));
  console.log();

  const isInteractive = process.stdin.isTTY;
  if (!isInteractive) {
    console.log(chalk.yellow('  (Non-interactive terminal — skipping wizard. Edit config.js manually.)'));
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => rl.question(q, r));

  const newValues = {};

  for (let i = 0; i < configSecrets.length; i++) {
    const s = configSecrets[i];
    const current = currentValues[s.key] || '';
    const isPlaceholder = !current || current.startsWith('YOUR_');

    console.log(chalk.dim('  ' + dsh));
    console.log();
    console.log('  ' + chalk.bold.white(`[${i + 1}/${configSecrets.length}]`) + '  ' + chalk.bold.cyan(s.label));
    if (s.hint) console.log('  ' + chalk.dim('    ' + s.hint));
    console.log();

    let promptStr;
    if (isPlaceholder) {
      promptStr = '  ' + chalk.cyan('›') + ' ' + chalk.white('Enter value') + chalk.dim(' (required): ');
    } else {
      const masked =
        current.length > 10
          ? current.slice(0, 4) + chalk.dim('••••') + current.slice(-4)
          : chalk.dim('••••••••');
      console.log('  ' + chalk.dim('  Current: ') + masked);
      promptStr = '  ' + chalk.cyan('›') + ' ' + chalk.white('New value') + chalk.dim(' (Enter to keep): ');
    }

    const answer = (await ask(promptStr)).trim();

    if (answer) {
      newValues[s.key] = answer;
      console.log('  ' + chalk.green('  ✓ Saved'));
    } else if (!isPlaceholder) {
      console.log('  ' + chalk.dim('  ✓ Keeping existing value'));
    } else {
      console.log('  ' + chalk.yellow('  ↷ Skipped — edit config.js later'));
    }
    console.log();
  }

  rl.close();

  if (Object.keys(newValues).length > 0 && existsSync(configPath)) {
    let content = readFileSync(configPath, 'utf8');
    content = injectSecrets(content, newValues);
    writeFileSync(configPath, content);
  }

  console.log(chalk.dim('  ' + dsh));
  console.log();

  if (vaultSecrets.length > 0) {
    console.log('  ' + chalk.bold.yellow('⚠  Also add these in the NanoClaw vault:'));
    vaultSecrets.forEach(s => console.log('     ' + chalk.yellow('→') + ' ' + chalk.white(s.label)));
    console.log('     ' + chalk.dim('(NanoClaw UI → Agent Settings → Secrets)'));
    console.log();
  }
}

export async function deploy(brainFile, groupName, nanoclaRootHint, chalk, ora) {
  if (!brainFile || !groupName) {
    console.error(chalk.red('\nUsage: agent-brain-duplicator deploy <brain.tar.gz> --group <new-group-name>'));
    console.error(chalk.dim('       --nanoclaw-root <path>   (auto-detected if omitted)\n'));
    process.exit(1);
  }

  const nanoclaRoot = findNanoclaRoot(nanoclaRootHint);
  if (!nanoclaRoot) {
    console.error(chalk.red('\nCould not find nanoclaw-v2 directory.'));
    console.error(chalk.yellow('Pass it explicitly: --nanoclaw-root ~/Desktop/nano/nanoclaw-v2\n'));
    process.exit(1);
  }

  const W = 60;
  const eq = '═'.repeat(W);
  console.log('\n' + chalk.bold.cyan('╔' + eq + '╗'));
  console.log(
    chalk.bold.cyan('║') +
    chalk.bold('  🧠  agent-brain-duplicator  —  Deploy') +
    ' '.repeat(W - 39) +
    chalk.bold.cyan('║')
  );
  console.log(chalk.bold.cyan('╚' + eq + '╝'));
  console.log();
  console.log(`  ${chalk.dim('Brain:')}      ${chalk.cyan(path.basename(brainFile))}`);
  console.log(`  ${chalk.dim('New group:')}  ${chalk.cyan(groupName)}`);
  console.log(`  ${chalk.dim('NanoClaw:')}   ${chalk.dim(nanoclaRoot)}`);
  console.log();

  const spinner = ora('Reading brain package...').start();
  const tmpDir = path.join(os.tmpdir(), 'abd-deploy-' + Date.now());

  try {
    mkdirSync(tmpDir, { recursive: true });
    execSync(`tar -xzf ${brainFile} -C ${tmpDir}`, { stdio: 'pipe' });

    const brainJson = execSync(`find ${tmpDir} -name brain.json`).toString().trim();
    if (!brainJson) throw new Error('brain.json not found — invalid brain package');
    const manifest = JSON.parse(readFileSync(brainJson, 'utf8'));
    const createdDate = new Date(manifest.createdAt).toLocaleDateString();
    spinner.succeed(`Brain: ${chalk.cyan(manifest.agent.name)} — ${chalk.dim(createdDate)}${manifest.isTemplate ? chalk.yellow(' [template]') : ''}`);

    const targetGroup = path.join(nanoclaRoot, 'groups', groupName);
    if (existsSync(targetGroup)) {
      console.error(chalk.red(`\n  Group already exists: ${targetGroup}`));
      console.error(chalk.yellow('  Choose a different name or delete the existing group first.\n'));
      process.exit(1);
    }
    mkdirSync(targetGroup, { recursive: true });

    const wsFile = execSync(`find ${tmpDir} -name workspace.tar.gz`).toString().trim();
    if (wsFile) {
      spinner.start('Deploying workspace...');
      execSync(`tar -xzf ${wsFile} -C ${targetGroup} --strip-components=1`, { stdio: 'pipe' });
      spinner.succeed('Workspace deployed');
    }

    const csFile = execSync(`find ${tmpDir} -name claude-shared.tar.gz`).toString().trim();
    let claudeSharedTarget = '';
    if (csFile) {
      claudeSharedTarget = path.join(nanoclaRoot, 'data', '.claude-shared-' + groupName);
      spinner.start('Restoring memory & settings...');
      mkdirSync(claudeSharedTarget, { recursive: true });
      execSync(`tar -xzf ${csFile} -C ${claudeSharedTarget} --strip-components=1`, { stdio: 'pipe' });
      spinner.succeed('Memory & settings restored');
    }

    // Setup wizard
    await runSetupWizard(targetGroup, manifest.secretsChecklist, chalk);

    console.log(chalk.bold.green('✅ Deploy complete!\n'));
    console.log(`  ${chalk.bold('Group:')}    ${chalk.cyan(targetGroup)}`);
    if (claudeSharedTarget) {
      console.log(`  ${chalk.bold('Memory:')}   ${chalk.dim(claudeSharedTarget)}`);
    }

    console.log(chalk.bold('\n📋 Next steps in NanoClaw:'));
    console.log(`  1. New Agent → group: ${chalk.cyan(groupName)}`);
    console.log('  2. Add vault secrets (listed above)');
    console.log('  3. Start — the agent wakes up with the full brain');

    console.log(chalk.dim(`\nCloned from: ${manifest.agent.name} (${manifest.agent.groupName})`));
    console.log(chalk.dim(`Snapshot:    ${new Date(manifest.createdAt).toLocaleString()}\n`));

  } catch (e) {
    spinner.fail(e.message);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
