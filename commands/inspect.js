import { execSync } from 'child_process';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { printArt, tq } from '../lib/art.js';

export async function inspect(brainFile, chalk, ora) {
  if (!brainFile) {
    console.error(chalk.red('Usage: agent-brain-duplicator inspect <brain.tar.gz>'));
    process.exit(1);
  }

  printArt(chalk);
  const t = tq(chalk);

  const spinner = ora({ text: `Reading ${path.basename(brainFile)}...`, color: 'cyan' }).start();
  const tmpDir = path.join(os.tmpdir(), 'abd-inspect-' + Date.now());

  try {
    mkdirSync(tmpDir, { recursive: true });
    execSync(`tar -xzf ${brainFile} -C ${tmpDir}`, { stdio: 'pipe' });

    const brainJson = execSync(`find ${tmpDir} -name brain.json`).toString().trim();
    if (!brainJson) throw new Error('brain.json not found - invalid brain package');

    const manifest = JSON.parse(readFileSync(brainJson, 'utf8'));
    spinner.succeed(t('Brain package read'));

    const { agent, contents, secretsChecklist, createdAt, isTemplate } = manifest;

    const W = 60;
    const eq = '═'.repeat(W);
    const dsh = '─'.repeat(W);

    console.log('\n' + t('╔' + eq + '╗'));
    console.log(t('║') + chalk.bold('  Brain Manifest') + ' '.repeat(W - 15) + t('║'));
    console.log(t('╚' + eq + '╝') + '\n');

    console.log('  ' + chalk.dim('Agent:    ') + chalk.bold(agent.name));
    console.log('  ' + chalk.dim('Group:    ') + agent.groupName);
    console.log('  ' + chalk.dim('Created:  ') + new Date(createdAt).toLocaleString());
    if (agent.agentId) console.log('  ' + chalk.dim('Agent ID: ') + chalk.dim(agent.agentId));
    if (isTemplate) console.log('  ' + chalk.dim('Mode:     ') + chalk.yellow('Template') + chalk.dim(' — secrets are placeholders'));

    console.log('\n' + t('  ' + dsh));
    console.log('\n  ' + chalk.bold('Contents'));
    console.log('  ' + chalk.dim('Skills:  ') + (contents.skills.length ? t(contents.skills.join(', ')) : chalk.dim('none')));
    console.log('  ' + chalk.dim('Memory:  ') + contents.memoryFiles.length + ' files');
    console.log('  ' + chalk.dim('Scripts: ') + contents.scripts.length + ' files');

    const configSecrets = secretsChecklist.filter(s => s.source === 'config.js');
    const vaultSecrets = secretsChecklist.filter(s => s.source === 'vault');

    if (configSecrets.length > 0) {
      console.log('\n  ' + chalk.bold('config.js secrets'));
      configSecrets.forEach(s => console.log('  ' + chalk.yellow('  →') + ' ' + s.label + chalk.dim(' (' + s.key + ')')));
    }
    if (vaultSecrets.length > 0) {
      console.log('\n  ' + chalk.bold('Vault secrets'));
      vaultSecrets.forEach(s => console.log('  ' + chalk.yellow('  →') + ' ' + s.label));
    }

    const wsSize = execSync(`du -sh "${tmpDir}"/**/workspace.tar.gz 2>/dev/null | head -1 || echo '?'`).toString().split('\t')[0].trim();
    const csSize = execSync(`du -sh "${tmpDir}"/**/claude-shared.tar.gz 2>/dev/null | head -1 || echo '?'`).toString().split('\t')[0].trim();

    console.log('\n' + t('  ' + dsh));
    console.log('\n  ' + chalk.bold('Package sizes'));
    console.log('  ' + chalk.dim('  workspace.tar.gz:     ') + wsSize);
    console.log('  ' + chalk.dim('  claude-shared.tar.gz: ') + csSize + '\n');

  } catch (e) {
    spinner.fail(e.message);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
