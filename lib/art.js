const ART = `
                                                   0
                                                  0
                                                 00  00
                                                00   0
                                               00   00
                              00000000000000 00    0           000
                           0000           00000   00        000 00 0000
                         000              00 000000        00  00   0 00
                       000              000    000        00   00 000 00
                      000                       000       0  700007   0
                     000                         000     00000       00
                    00     000000            00  000     00         00
                   00     0000  0           0000 0000    00       000
                  000      000000           000000000   00000   000
                  00         00   000    00   000  00 000   00000
                 000              0000000000       0000    000
                 00                2000000         000   000
                 00                                00  000
                 000                              200000
                  00                             000
                 00000      000                0000
                 0000000   00 00       0000000000
                00   00000000  000   0000       0000
                 06     00000   000000             000
                 00        0000000000000            000
                  00        00         7000       7  00
                  000000000000            00      2  00
                   00    006000      20000000        00
                   60        0007    000            000
                    0000  000000000    000         00000
                       000       0000000000       000000000
                        0000    000            000000    000
                           00000000000000000000000     60000
                       00000000000000000000000000000000000
`;

export function printArt(chalk) {
  const t = chalk.hex('#2DD4BF');
  console.log(t(ART));
  console.log(
    '  ' + t('agent-brain-duplicator') +
    chalk.dim('  —  Clone NanoClaw agent brains\n')
  );
}

export function printHeader(chalk, title) {
  const t = chalk.hex('#2DD4BF');
  const W = 60;
  const eq = '═'.repeat(W);
  console.log('\n' + t('╔' + eq + '╗'));
  console.log(
    t('║') + chalk.bold('  🧠  ' + title) +
    ' '.repeat(Math.max(0, W - 5 - title.length)) +
    t('║')
  );
  console.log(t('╚' + eq + '╝') + '\n');
}

export function tq(chalk) {
  return chalk.hex('#2DD4BF');
}
