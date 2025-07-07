/// <reference types="plop" />

import path from 'node:path';

const __dirname = import.meta.dirname;

const TEMPLATE_PATH = path.join(__dirname, '../../../templates/plugin');
const PACKAGE_TEMPLATE_PATH = path.join(__dirname, '../../../templates/package');

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
        validate(value) {
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
        validate(value) {
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
        validate(value) {
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
        globOptions: {
          dot: true,
        },
      },
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
        type: 'modify',
        path: 'packages/{{packageName}}/package.json',
        pattern: staticRegExp(
          [
            '    "exports": {',
            '      ".": {',
            '        "import": "./lib/lib.js",',
            '        "require": "./lib/lib.cjs"',
            '      }',
            '    }',
          ].join('\n'),
        ),
        template: [
          '    "exports": {',
          '      ".": {',
          '        "import": "./lib/lib.js",',
          '        "require": "./lib/lib.cjs"',
          '      },',
          '      "./effects": {',
          '        "import": "./lib/effects.js",',
          '        "require": "./lib/effects.cjs"',
          '      },',
          '      "./handlers": {',
          '        "import": "./lib/handlers.js",',
          '        "require": "./lib/handlers.cjs"',
          '      },',
          '      "./hooks": {',
          '        "import": "./lib/hooks.js",',
          '        "require": "./lib/hooks.cjs"',
          '      },',
          '      "./messages": {',
          '        "import": "./lib/messages.js",',
          '        "require": "./lib/messages.cjs"',
          '      },',
          '      "./middleware": {',
          '        "import": "./lib/middleware.js",',
          '        "require": "./lib/middleware.cjs"',
          '      },',
          '      "./mocks": {',
          '        "import": "./lib/mocks.js",',
          '        "require": "./lib/mocks.cjs"',
          '      },',
          '      "./tasks": {',
          '        "import": "./lib/tasks.js",',
          '        "require": "./lib/tasks.cjs"',
          '      },',
          '      "./types": {',
          '        "import": "./lib/types.js",',
          '        "require": "./lib/types.cjs"',
          '      }',
          '    }',
        ].join('\n'),
      },
      {
        type: 'modify',
        path: 'packages/{{packageName}}/tsconfig.json',
        pattern: /"include": \["src", "lib.ts", "lib.test.ts"/,
        template: '"include": ["src", "lib.ts", "lib.test.ts", "*.ts", "*.test.ts"',
      },
      {
        type: 'modify',
        path: 'packages/{{packageName}}/vite.config.ts',
        pattern: staticRegExp('entry: resolve(__dirname, pkg.module)'),
        template: [
          'entry: {',
          '          lib: resolve(__dirname, pkg.module),',
          "          effects: resolve(__dirname, './effects.ts'),",
          "          handlers: resolve(__dirname, './handlers.ts'),",
          "          hooks: resolve(__dirname, './hooks.ts'),",
          "          messages: resolve(__dirname, './messages.ts'),",
          "          middleware: resolve(__dirname, './middleware.ts'),",
          "          mocks: resolve(__dirname, './mocks.ts'),",
          "          tasks: resolve(__dirname, './tasks.ts'),",
          "          types: resolve(__dirname, './types.ts'),",
          '        }',
        ].join('\n'),
      },
      {
        type: 'modify',
        path: 'packages/{{packageName}}/lib.test.ts',
        pattern: staticRegExp('expect({ ...lib }).toEqual({'),
        template: [
          'expect({ ...lib }).toEqual({',
          '    {{ pascalCase pluginName }}Handler: lib.{{ pascalCase pluginName }}Handler,',
          '    EFFECT_TYPE_{{ constantCase pluginName }}: lib.EFFECT_TYPE_{{ constantCase pluginName }},',
          '    create{{ pascalCase pluginName }}Effect: lib.create{{ pascalCase pluginName }}Effect,',
          '    is{{ pascalCase pluginName }}Effect: lib.is{{ pascalCase pluginName }}Effect,',
          '    use{{ pascalCase pluginName }}: lib.use{{ pascalCase pluginName }},',
        ].join('\n'),
      },
      {
        type: 'append',
        path: 'packages/{{packageName}}/src/index.ts',
        template: [
          "export * from './effects';",
          "export * from './handlers';",
          "export * from './hooks';",
          "export * from './messages';",
          "export * from './middleware';",
          "export * from './mocks';",
          "export * from './tasks';",
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
          "export { use{{ pascalCase pluginName }} } from '@reactive-kit/{{ packageName }}/hooks';",
          '',
        ].join('\n'),
      },
      {
        type: 'modify',
        path: 'packages/handlers/src/handlers.ts',
        pattern: /^/,
        template: [
          "import { {{ pascalCase pluginName }}Handler } from '@reactive-kit/{{ packageName }}/handlers';",
          '',
        ].join('\n'),
      },
      {
        type: 'modify',
        path: 'packages/handlers/src/handlers.ts',
        pattern: /\];\n$/,
        template: ['  {{ pascalCase pluginName }}Handler.FACTORY,', '];', ''].join('\n'),
      },
      {
        type: 'shell',
        command: 'pnpm install',
      },
      {
        type: 'shell',
        cwd: 'packages/{{packageName}}',
        command: `pnpm add --save-dev ${[
          '@reactive-kit/actor',
          '@reactive-kit/actor-utils',
          '@reactive-kit/handler-utils',
          '@reactive-kit/hash',
          '@reactive-kit/message',
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
        command: `pnpm add --save-dev @reactive-kit/{{ packageName }}@workspace:*`,
      },
      {
        type: 'shell',
        cwd: 'packages/handlers',
        command: `pnpm add --save-dev @reactive-kit/{{ packageName }}@workspace:*`,
      },
    ],
  });
}

function staticRegExp(string) {
  return new RegExp(string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}
