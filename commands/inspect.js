import { execSync } from 'child_process';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';

export async function inspect(brainFile, chalk, ora) {
  if (!brainFile) {
    console.error(chalk.red('Usage: agent-brain-duplicator inspect <brain.tar.gz>'));
    process.exit(1);
  }

  const spinner = ora(`Reading ${path.basename(brainFile)}...`).start();
  const tmpDir = path.join(os.tmpdir(), 'abd-inspect-' + Date.now());

  try {
    mkdirSync(tmpDir, { recursive: true });
    execSync(`tar -xzf ${brainFile} -C ${tmpDir}`, { stdio: 'pipe' });

    const brainJson = execSync(`find ${tmpDir} -name brain.json`).toString().trim();
    if (!brainJson) throw new Error('brain.json not found - invalid brain package');

    const manifest = JSON.parse(readFileSync(brainJson, 'utf8'));
    spinner.succeed('Brain package read');

    const { agent, contents, secretsChecklist, createdAt, isTemplate } = manifest;

    const W = 60;
    const eq = '═'.repeat(W);
    console.log('\n' + chalk.bold.cyan('╔' + eq + '╗'));
    console.log(
      chalk.bold.cyan('║') +
      chalk.bold('  🧠  Brain Manifest') +
      ' '.repeat(W - 19) +
      chalk.bold.cyan('║')
    );
    console.log(chalk.bold.cyan('╚' + eq + '╝'));
    console.log();

    console.log(`  ${chalk.bold('Agent:')}    ${chalk.cyan(agent.name)}`);
    console.log(`  ${chalk.bold('Group:')}    ${agent.groupName}`);
    console.log(`  ${chalk.bold('Created:')}  ${new Date(createdAt).toLocaleString()}`);
    if (agent.agentId) console.log(`  ${chalk.bold('Agent ID:')} ${chalk.dim(agent.agentId)}`);
    if (isTemplate) console.log(`  ${chalk.bold('Mode:')}     ${chalk.yellow('Template')} — secrets are placeholders`);

    console.log(chalk.bold('\n  Contents:'));
    console.log(`    ${chalk.dim('Skills:')}  ${contents.skills.length ? chalk.cyan(contents.skills.join(', ')) : chalk.dim('none')}`);
    console.log(`    ${chalk.dim('Memory:')}  ${contents.memoryFiles.length} files`);
    console.log(`    ${chalk.dim('Scripts:')} ${contents.scripts.length} files`);

    const configSecrets = secretsChecklist.filter(s => s.source === 'config.js');
    const vaultSecrets = secretsChecklist.filter(s => s.source === 'vault');

    if (configSecrets.length > 0) {
      console.log(chalk.bold('\n  config.js secrets:'));
      configSecrets.forEach(s => console.log(`    ${chalk.yellow('→')} ${s.label} ${chalk.dim('(' + s.key + ')')}`));
    }
    if (vaultSecrets.length > 0) {
      console.log(chalk.bold('\n  Vault secrets:'));
      vaultSecrets.forEach(s => console.log(`    ${chalk.yellow('→')} ${s.label}`));
    }

    const wsSize = execSync(`du -sh "${tmpDir}"/**/workspace.tar.gz 2>/dev/null | head -1 || echo '?'`).toString().split('\t')[0].trim();
    const csSize = execSync(`du -sh "${tmpDir}"/**/claude-shared.tar.gz 2>/dev/null | head -1 || echo '?'`).toString().split('\t')[0].trim();
    console.log(chalk.bold('\n  Package sizes:'));
    console.log(`    workspace.tar.gz:     ${wsSize}`);
    console.log(`    claude-shared.tar.gz: ${csSize}`);
    console.log();

  } catch (e) {
    spinner.fail(e.message);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
