#!/usr/bin/env node
import chalk from 'chalk';
import ora from 'ora';
import { snapshot } from './commands/snapshot.js';
import { inspect } from './commands/inspect.js';
import { deploy } from './commands/deploy.js';
import { list } from './commands/list.js';
import { printArt, tq } from './lib/art.js';

const [,, command, ...args] = process.argv;

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = args[i + 1];
      opts[key] = (next && !next.startsWith('--')) ? (i++, next) : true;
    } else {
      opts._positional = opts._positional || [];
      opts._positional.push(args[i]);
    }
  }
  return opts;
}

const opts = parseArgs(args);

if (!command) {
  const t = tq(chalk);
  printArt(chalk);

  console.log(chalk.bold('  Commands:\n'));
  console.log('  ' + t('snapshot') + chalk.dim('                              Pack the brain (run inside agent)'));
  console.log('    ' + chalk.dim('--template') + '                          Strip secrets → safe to share');
  console.log('  ' + t('inspect') + '  ' + chalk.dim('<brain.tar.gz>') + chalk.dim('               Show contents'));
  console.log('  ' + t('deploy') + '   ' + chalk.dim('<brain.tar.gz> --group <name>') + chalk.dim('  Deploy to new agent'));
  console.log('    ' + chalk.dim('--nanoclaw-root <path>') + '             Override NanoClaw path');
  console.log('  ' + t('list') + chalk.dim('                                 List brain archives here'));

  console.log('\n  ' + chalk.bold('Typical flow:\n'));
  console.log('  ' + chalk.dim('1.') + ' Inside agent:  ' + t('agent-brain-duplicator snapshot'));
  console.log('  ' + chalk.dim('2.') + ' On Mac:        ' + t('agent-brain-duplicator inspect brain-DATE-name.tar.gz'));
  console.log('  ' + chalk.dim('3.') + ' On Mac:        ' + t('agent-brain-duplicator deploy brain-DATE-name.tar.gz --group my-clone'));
  console.log('  ' + chalk.dim('4.') + ' NanoClaw UI:   New Agent → group: my-clone\n');

  console.log('  ' + chalk.bold('Template (share without secrets):\n'));
  console.log('  ' + chalk.dim('1.') + ' ' + t('agent-brain-duplicator snapshot --template'));
  console.log('  ' + chalk.dim('2.') + ' Share the .tar.gz — no real keys inside');
  console.log('  ' + chalk.dim('3.') + ' Recipient runs deploy → wizard prompts for their own keys\n');
  process.exit(0);
}

switch (command) {
  case 'snapshot':
    await snapshot(chalk, ora, { template: !!opts.template });
    break;
  case 'inspect':
    await inspect(opts._positional?.[0], chalk, ora);
    break;
  case 'deploy':
    await deploy(opts._positional?.[0], opts.group, opts.nanoclaRoot, chalk, ora);
    break;
  case 'list':
    await list(opts._positional?.[0], chalk);
    break;
  default:
    console.error(chalk.red(`Unknown command: ${command}`));
    console.error(chalk.dim('Run agent-brain-duplicator with no arguments to see help.'));
    process.exit(1);
}
