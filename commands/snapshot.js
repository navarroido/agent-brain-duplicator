import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { detectPaths, readContainerJson } from '../lib/detect.js';
import { buildManifest } from '../lib/manifest.js';
import { scrubConfig } from '../lib/config-scrubber.js';

export async function snapshot(chalk, ora, { template = false } = {}) {
  console.log(chalk.bold('\n🧠 agent-brain-duplicator snapshot\n'));
  if (template) {
    console.log(chalk.yellow('  Template mode: secrets will be replaced with placeholders\n'));
  }

  const spinner = ora('Detecting agent paths...').start();
  let paths;
  try {
    paths = detectPaths();
    spinner.succeed(`Agent: ${chalk.cyan(paths.groupName)}`);
  } catch (e) {
    spinner.fail(e.message);
    process.exit(1);
  }

  const container = readContainerJson();
  const agentName = container.assistantName || paths.groupName;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = template ? '-template' : '';
  const brainName = `brain-${date}-${agentName.toLowerCase().replace(/\s+/g, '-')}${suffix}`;
  const outputDir = `/workspace/agent/${brainName}`;
  const outputTar = `/workspace/agent/${brainName}.tar.gz`;

  spinner.start('Building brain manifest...');
  const manifest = buildManifest({
    groupName: paths.groupName,
    agentId: paths.agentId,
    agentName,
    isTemplate: template,
  });

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'brain.json'), JSON.stringify(manifest, null, 2));
  spinner.succeed('Manifest ready');

  // Pack workspace
  spinner.start('Packing workspace...');
  const excludes = [
    "--exclude='*/node_modules'",
    "--exclude='*/.pnpm'",
    '--exclude=package-lock.json',
    '--exclude=*.tar.gz',
    '--exclude=brain-*',
    '--exclude=conversations',
    '--exclude=videos',
  ].join(' ');

  try {
    execSync(
      `tar ${excludes} -czf ${outputDir}/workspace.tar.gz -C /workspace agent`,
      { stdio: 'pipe' }
    );
    spinner.succeed('Workspace packed');
  } catch (e) {
    spinner.fail('Workspace pack failed: ' + e.message);
    process.exit(1);
  }

  // Template mode: scrub secret values from config.js inside the tar
  if (template) {
    const configSecrets = manifest.secretsChecklist.filter(s => s.source === 'config.js');
    if (configSecrets.length > 0) {
      spinner.start('Scrubbing secrets...');
      const scrubDir = `${outputDir}-scrub`;
      try {
        mkdirSync(scrubDir, { recursive: true });
        execSync(`tar -xzf ${outputDir}/workspace.tar.gz -C ${scrubDir}`, { stdio: 'pipe' });

        const configPath = `${scrubDir}/agent/config.js`;
        if (existsSync(configPath)) {
          const original = readFileSync(configPath, 'utf8');
          const scrubbed = scrubConfig(original);
          writeFileSync(configPath, scrubbed);
        }

        execSync(`tar -czf ${outputDir}/workspace.tar.gz -C ${scrubDir} agent`, { stdio: 'pipe' });
        execSync(`rm -rf ${scrubDir}`, { stdio: 'pipe' });
        spinner.succeed(`Secrets scrubbed (${configSecrets.length} keys replaced)`);
      } catch (e) {
        execSync(`rm -rf ${scrubDir}`, { stdio: 'pipe' });
        spinner.warn('Scrub failed, continuing: ' + e.message);
      }
    }
  }

  // Pack .claude-shared
  spinner.start('Packing memory & settings...');
  try {
    execSync(
      `tar --exclude=shell-snapshots --exclude=sessions --exclude=backups --exclude=telemetry \
       -czf ${outputDir}/claude-shared.tar.gz -C /home/node .claude`,
      { stdio: 'pipe' }
    );
    spinner.succeed('Memory & settings packed');
  } catch (e) {
    spinner.warn('Memory pack failed (continuing): ' + e.message);
  }

  // Bundle everything
  spinner.start('Creating brain bundle...');
  execSync(`tar -czf ${outputTar} -C /workspace/agent ${brainName}`, { stdio: 'pipe' });
  execSync(`rm -rf ${outputDir}`, { stdio: 'pipe' });
  spinner.succeed('Brain bundle created');

  const size = execSync(`du -sh ${outputTar}`).toString().split('\t')[0];

  console.log(chalk.green('\n✅ Snapshot complete!\n'));
  console.log(`  ${chalk.bold('File:')}   ${outputTar}`);
  console.log(`  ${chalk.bold('Size:')}   ${size}`);
  console.log(`  ${chalk.bold('Agent:')}  ${agentName}`);
  if (template) console.log(`  ${chalk.bold('Mode:')}   ${chalk.yellow('Template')} (secrets replaced with placeholders)`);
  console.log(`  ${chalk.bold('Skills:')} ${manifest.contents.skills.join(', ') || 'none'}`);
  console.log(`  ${chalk.bold('Memory:')} ${manifest.contents.memoryFiles.length} files`);
  console.log(`  ${chalk.bold('Scripts:')} ${manifest.contents.scripts.length} files`);

  if (!template) {
    console.log(chalk.yellow('\n⚠️  Secrets checklist (add to new agent vault):'));
    manifest.secretsChecklist.forEach(s => console.log(`  - ${s.label}`));
  }

  console.log(chalk.dim(`\nTo inspect: agent-brain-duplicator inspect ${brainName}.tar.gz`));
  console.log(chalk.dim(`To deploy:  agent-brain-duplicator deploy ${brainName}.tar.gz --group <new-group-name>\n`));
}
