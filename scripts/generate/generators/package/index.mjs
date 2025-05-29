/// <reference types="plop" />

import path from 'node:path';

const __dirname = import.meta.dirname;

const TEMPLATE_PATH = path.join(__dirname, 'template');

/**
 * @param {import('plop').NodePlopAPI} plop
 * @returns {void}
 */
export default function (plop) {
  plop.setGenerator('package', {
    prompts: [
      {
        type: 'input',
        name: 'packageName',
        message: 'Package name',
        validate(value) {
          if (/^[a-z][a-z_-]*$/.test(value)) {
            return true;
          }
          return 'Invalid package name';
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Package description',
        default: ({ packageName }) => `ReactiveKit ${packageName}`,
        validate(value) {
          if (/^.+$/.test(value)) {
            return true;
          }
          return 'Invalid description';
        },
      },
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'packages/{{packageName}}',
        templateFiles: TEMPLATE_PATH,
        base: TEMPLATE_PATH,
        globOptions: {
          dot: true,
        },
      },
      {
        type: 'shell',
        command: 'pnpm install',
      },
    ],
  });
}
