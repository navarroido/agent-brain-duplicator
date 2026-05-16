import { execSync } from 'child_process';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { runSetupWizard } from '../lib/wizard.js';
import { printArt, tq } from '../lib/art.js';

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

  printArt(chalk);
  const t = tq(chalk);

  console.log(chalk.bold('  deploy\n'));
  console.log('  ' + chalk.dim('Brain:      ') + t(path.basename(brainFile)));
  console.log('  ' + chalk.dim('New group:  ') + chalk.bold(groupName));
  console.log('  ' + chalk.dim('NanoClaw:   ') + chalk.dim(nanoclaRoot) + '\n');

  const spinner = ora({ text: 'Reading brain package...', color: 'cyan' }).start();
  const tmpDir = path.join(os.tmpdir(), 'abd-deploy-' + Date.now());

  try {
    mkdirSync(tmpDir, { recursive: true });
    execSync(`tar -xzf ${brainFile} -C ${tmpDir}`, { stdio: 'pipe' });

    const brainJson = execSync(`find ${tmpDir} -name brain.json`).toString().trim();
    if (!brainJson) throw new Error('brain.json not found — invalid brain package');
    const manifest = JSON.parse(readFileSync(brainJson, 'utf8'));
    const date = new Date(manifest.createdAt).toLocaleDateString();
    spinner.succeed(
      t(manifest.agent.name) + chalk.dim(` — ${date}`) +
      (manifest.isTemplate ? '  ' + chalk.yellow('[template]') : '')
    );

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
      spinner.succeed(t('Workspace deployed'));
    }

    const csFile = execSync(`find ${tmpDir} -name claude-shared.tar.gz`).toString().trim();
    let claudeSharedTarget = '';
    if (csFile) {
      claudeSharedTarget = path.join(nanoclaRoot, 'data', '.claude-shared-' + groupName);
      spinner.start('Restoring memory & settings...');
      mkdirSync(claudeSharedTarget, { recursive: true });
      execSync(`tar -xzf ${csFile} -C ${claudeSharedTarget} --strip-components=1`, { stdio: 'pipe' });
      spinner.succeed(t('Memory & settings restored'));
    }

    await runSetupWizard(targetGroup, manifest.secretsChecklist, chalk);

    console.log('\n  ' + chalk.bold.green('✅ Deploy complete!\n'));
    console.log('  ' + chalk.dim('Group:  ') + t(targetGroup));
    if (claudeSharedTarget) console.log('  ' + chalk.dim('Memory: ') + chalk.dim(claudeSharedTarget));

    console.log('\n  ' + chalk.bold('Next steps in NanoClaw:'));
    console.log('  ' + chalk.dim('1. ') + 'New Agent → group: ' + t(groupName));
    console.log('  ' + chalk.dim('2. ') + 'Add vault secrets (listed above)');
    console.log('  ' + chalk.dim('3. ') + 'Start — the agent wakes up with the full brain\n');

    console.log(chalk.dim(`  Cloned from: ${manifest.agent.name} (${manifest.agent.groupName})`));
    console.log(chalk.dim(`  Snapshot:    ${new Date(manifest.createdAt).toLocaleString()}\n`));

  } catch (e) {
    spinner.fail(e.message);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
