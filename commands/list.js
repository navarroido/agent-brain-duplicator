import { readdirSync, statSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { printArt, tq } from '../lib/art.js';

export async function list(dir, chalk) {
  const t = tq(chalk);
  const searchDir = dir || process.cwd();

  if (!existsSync(searchDir)) {
    console.error(chalk.red('Directory not found: ' + searchDir));
    process.exit(1);
  }

  const files = readdirSync(searchDir)
    .filter(f => f.startsWith('brain-') && f.endsWith('.tar.gz'))
    .map(f => {
      const fullPath = path.join(searchDir, f);
      const stat = statSync(fullPath);
      const size = execSync(`du -sh "${fullPath}"`).toString().split('\t')[0].trim();
      const isTemplate = f.includes('-template');
      return { name: f, fullPath, size, mtime: stat.mtime, isTemplate };
    })
    .sort((a, b) => b.mtime - a.mtime);

  printArt(chalk);
  console.log(chalk.bold('  Brain archives in: ') + chalk.dim(searchDir) + '\n');

  if (files.length === 0) {
    console.log(chalk.dim('  No brain archives found.\n'));
    console.log('  Create one: ' + t('agent-brain-duplicator snapshot') + '\n');
    return;
  }

  const W = 60;
  console.log(t('  ' + '─'.repeat(W)));
  console.log(
    '  ' + chalk.bold('File'.padEnd(44)) +
    chalk.bold('Size'.padEnd(8)) +
    chalk.bold('Date')
  );
  console.log(t('  ' + '─'.repeat(W)));

  for (const f of files) {
    const dateStr = f.mtime.toLocaleDateString();
    const tag = f.isTemplate ? chalk.yellow(' [template]') : '';
    const name = f.name.length > 42 ? f.name.slice(0, 39) + '...' : f.name;
    console.log(
      '  ' + t(name.padEnd(44)) +
      chalk.dim(f.size.padEnd(8)) +
      chalk.dim(dateStr) +
      tag
    );
  }

  console.log(t('  ' + '─'.repeat(W)));
  console.log('\n  ' + chalk.dim(`${files.length} archive${files.length !== 1 ? 's' : ''} found\n`));
}
