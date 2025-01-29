import childProcess from 'node:child_process';

/**
 * @param {import('plop').NodePlopAPI} plop
 * @returns {void}
 */
export default function (plop) {
  plop.setActionType('shell', async function (answers, config, plop) {
    const { command: commandTemplate, cwd: cwdTemplate } = config;
    const command = plop.renderString(commandTemplate, answers);
    const cwd =
      typeof cwdTemplate === 'string' ? plop.renderString(cwdTemplate, answers) : undefined;
    await log(`Running command: ${command}`);
    return await spawnCommand(command, { cwd });
  });
}

function log(message) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`${message}\n`, (err) => (err ? reject(err) : resolve()));
  });
}

function spawnCommand(command, { cwd }) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, { shell: true, stdio: 'inherit', cwd });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
}
