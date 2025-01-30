/// <reference types="plop" />

import path from 'node:path';

const __dirname = import.meta.dirname;

const TEMPLATE_PATH = path.join(__dirname, 'template');
const PACKAGE_TEMPLATE_PATH = path.join(__dirname, '..', 'package', 'template');

/**
 * @param {import('plop').NodePlopAPI} plop
 * @returns {void}
 */
export default function (plop) {
  plop.setGenerator('plugin', {
    prompts: [
      {
        type: 'input',
        name: 'pluginName',
        message: 'Plugin name',
        validate: function (value) {
          if (/^[a-z][a-z_-]*$/.test(value)) {
            return true;
          }
          return 'Invalid plugin name';
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Plugin description',
        default: ({ pluginName }) => `ReactiveKit ${pluginName} plugin`,
        validate: function (value) {
          if (/^.+$/.test(value)) {
            return true;
          }
          return 'Invalid description';
        },
      },
      {
        type: 'input',
        name: 'packageName',
        message: 'Package name',
        default: ({ pluginName }) => `plugin-${pluginName}`,
        validate: function (value) {
          if (/^plugin-[a-z][a-z_-]*$/.test(value)) {
            return true;
          }
          return 'Invalid plugin package name';
        },
      },
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'packages/{{packageName}}',
        templateFiles: PACKAGE_TEMPLATE_PATH,
        base: PACKAGE_TEMPLATE_PATH,
      },
      {
        type: 'addMany',
        destination: 'packages/{{packageName}}',
        templateFiles: TEMPLATE_PATH,
        base: TEMPLATE_PATH,
      },
      {
        type: 'append',
        path: 'packages/{{packageName}}/src/index.ts',
        template: [
          "export * from './effects';",
          "export * from './handlers';",
          "export * from './hooks';",
          "export * from './messages';",
          "export * from './types';",
          '',
        ].join('\n'),
      },
      {
        type: 'modify',
        path: 'packages/hooks/src/hooks.ts',
        pattern: /\n$/,
        template: [
          '',
          "export { use{{ pascalCase pluginName }} } from '@reactive-kit/{{ packageName }}';",
          '',
        ].join('\n'),
      },
      {
        type: 'modify',
        path: 'packages/handlers/src/handlers.ts',
        pattern: /^/,
        template: [
          "import { {{ pascalCase pluginName }}Handler } from '@reactive-kit/{{ packageName }}';",
          '',
        ].join('\n'),
      },
      {
        type: 'modify',
        path: 'packages/handlers/src/handlers.ts',
        pattern: /\];\n$/,
        template: ['  (next) => new {{ pascalCase pluginName }}Handler(next),', '];', ''].join(
          '\n',
        ),
      },
      {
        type: 'shell',
        command: 'pnpm install',
      },
      {
        type: 'shell',
        cwd: 'packages/{{packageName}}',
        command: `pnpm add ${[
          '@reactive-kit/actor',
          '@reactive-kit/actor-utils',
          '@reactive-kit/hash',
          '@reactive-kit/runtime-messages',
          '@reactive-kit/reactive-utils',
          '@reactive-kit/types',
          '@reactive-kit/utils',
        ]
          .map((dependency) => `${dependency}@workspace:*`)
          .join(' ')}`,
      },
      {
        type: 'shell',
        cwd: 'packages/hooks',
        command: `pnpm add @reactive-kit/{{ packageName }}@workspace:*`,
      },
      {
        type: 'shell',
        cwd: 'packages/handlers',
        command: `pnpm add @reactive-kit/{{ packageName }}@workspace:*`,
      },
    ],
  });
}
