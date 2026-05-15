#!/usr/bin/env node
import chalk from 'chalk';
import ora from 'ora';
import { snapshot } from './commands/snapshot.js';
import { inspect } from './commands/inspect.js';
import { deploy } from './commands/deploy.js';

const [,, command, ...args] = process.argv;

const HELP = `
${chalk.bold.cyan('agent-brain-duplicator')} ${chalk.dim('—')} Clone NanoClaw agent brains

${chalk.bold('Commands:')}
  ${chalk.cyan('snapshot')}                             Run INSIDE the agent — pack the brain
    ${chalk.dim('--template')}                           Strip secrets → reusable template brain
  ${chalk.cyan('inspect')}  ${chalk.dim('<brain.tar.gz>')}               Show what's inside before deploying
  ${chalk.cyan('deploy')}   ${chalk.dim('<brain.tar.gz> --group <name>')} Run on HOST Mac — unpack to new agent
    ${chalk.dim('--nanoclaw-root <path>')}               NanoClaw root (auto-detected)

${chalk.bold('Typical flow:')}
  ${chalk.dim('1.')} Inside agent:  ${chalk.cyan('agent-brain-duplicator snapshot')}
  ${chalk.dim('2.')} On Mac:        ${chalk.cyan('agent-brain-duplicator inspect brain-DATE-name.tar.gz')}
  ${chalk.dim('3.')} On Mac:        ${chalk.cyan('agent-brain-duplicator deploy brain-DATE-name.tar.gz --group my-clone')}
  ${chalk.dim('4.')} NanoClaw UI:   New Agent → group: my-clone → the wizard handles the rest

${chalk.bold('Template flow:')} (share with others)
  ${chalk.dim('1.')} Inside agent:  ${chalk.cyan('agent-brain-duplicator snapshot --template')}
  ${chalk.dim('2.')} Share the .tar.gz — it has no real secrets inside
  ${chalk.dim('3.')} Recipient:     ${chalk.cyan('agent-brain-duplicator deploy brain.tar.gz --group their-name')}
                 ${chalk.dim('→ interactive wizard prompts for their own API keys')}
`;

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
  default:
    console.log(HELP);
}
