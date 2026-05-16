import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { detectPaths, readContainerJson } from '../lib/detect.js';
import { buildManifest } from '../lib/manifest.js';
import { scrubConfig } from '../lib/config-scrubber.js';
import { printArt, tq } from '../lib/art.js';

export async function snapshot(chalk, ora, { template = false } = {}) {
  printArt(chalk);
  const t = tq(chalk);

  console.log(chalk.bold('  snapshot') + (template ? '  ' + chalk.yellow('[template mode]') : '') + '\n');

  const spinner = ora({ text: 'Detecting agent paths...', color: 'cyan' }).start();
  let paths;
  try {
    paths = detectPaths();
    spinner.succeed(t('Agent: ') + chalk.bold(paths.groupName));
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

  spinner.start('Building manifest...');
  const manifest = buildManifest({
    groupName: paths.groupName,
    agentId: paths.agentId,
    agentName,
    isTemplate: template,
  });

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'brain.json'), JSON.stringify(manifest, null, 2));
  spinner.succeed(t('Manifest ready'));

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
    execSync(`tar ${excludes} -czf ${outputDir}/workspace.tar.gz -C /workspace agent`, { stdio: 'pipe' });
    spinner.succeed(t('Workspace packed'));
  } catch (e) {
    spinner.fail('Workspace pack failed: ' + e.message);
    process.exit(1);
  }

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
          writeFileSync(configPath, scrubConfig(readFileSync(configPath, 'utf8')));
        }
        execSync(`tar -czf ${outputDir}/workspace.tar.gz -C ${scrubDir} agent`, { stdio: 'pipe' });
        execSync(`rm -rf ${scrubDir}`, { stdio: 'pipe' });
        spinner.succeed(t(`Secrets scrubbed`) + chalk.dim(` (${configSecrets.length} keys replaced)`));
      } catch (e) {
        execSync(`rm -rf ${scrubDir}`, { stdio: 'pipe' });
        spinner.warn('Scrub failed: ' + e.message);
      }
    }
  }

  spinner.start('Packing memory & settings...');
  try {
    execSync(
      `tar --exclude=shell-snapshots --exclude=sessions --exclude=backups --exclude=telemetry \
       -czf ${outputDir}/claude-shared.tar.gz -C /home/node .claude`,
      { stdio: 'pipe' }
    );
    spinner.succeed(t('Memory & settings packed'));
  } catch (e) {
    spinner.warn('Memory pack failed (continuing): ' + e.message);
  }

  spinner.start('Bundling...');
  execSync(`tar -czf ${outputTar} -C /workspace/agent ${brainName}`, { stdio: 'pipe' });
  execSync(`rm -rf ${outputDir}`, { stdio: 'pipe' });
  spinner.succeed(t('Brain bundle ready'));

  const size = execSync(`du -sh ${outputTar}`).toString().split('\t')[0];

  console.log('\n' + chalk.bold.green('  ✅ Snapshot complete!\n'));
  console.log('  ' + chalk.dim('File:    ') + chalk.bold(outputTar));
  console.log('  ' + chalk.dim('Size:    ') + size);
  console.log('  ' + chalk.dim('Agent:   ') + agentName);
  if (template) console.log('  ' + chalk.dim('Mode:    ') + chalk.yellow('Template') + chalk.dim(' (no real secrets inside)'));
  console.log('  ' + chalk.dim('Skills:  ') + (manifest.contents.skills.join(', ') || 'none'));
  console.log('  ' + chalk.dim('Memory:  ') + manifest.contents.memoryFiles.length + ' files');
  console.log('  ' + chalk.dim('Scripts: ') + manifest.contents.scripts.length + ' files');

  if (!template) {
    console.log('\n  ' + chalk.yellow('⚠  Secrets to add to new agent vault:'));
    manifest.secretsChecklist.forEach(s => console.log('     ' + chalk.yellow('→') + ' ' + s.label));
  }

  console.log('\n  ' + chalk.dim('inspect: ') + t(`agent-brain-duplicator inspect ${brainName}.tar.gz`));
  console.log('  ' + chalk.dim('deploy:  ') + t(`agent-brain-duplicator deploy ${brainName}.tar.gz --group <name>`) + '\n');
}
