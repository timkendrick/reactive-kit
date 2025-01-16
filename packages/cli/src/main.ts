import { register } from 'node:module';
import { join } from 'node:path';
import { handlers } from '@reactive-kit/handlers';
import { type Hashable } from '@reactive-kit/hash';
import { Runtime } from '@reactive-kit/runtime';
import type { Expression } from '@reactive-kit/types';
import { subscribeAsyncIterator } from '@reactive-kit/utils';

declare module 'node:module' {
  export function register(
    specifier: string | URL,
    parentUrl?: string | URL,
    options?: {
      parentUrl?: string | URL;
      data?: any;
      transferList?: Array<Transferable>;
    },
  ): void;
}

export function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) throw new Error('No input file specified');
  const [inputPath] = args;
  const modulePath = join(process.cwd(), inputPath);
  const loadModule = registerModuleLoader('@reactive-kit/loader');
  return loadModule<{ default: Expression<Hashable> }>(modulePath).then((module) => {
    const { default: expression } = module;
    const runtime = new Runtime(handlers);
    const results = runtime.subscribe(expression);
    return subscribeAsyncIterator(
      results,
      (value) =>
        new Promise((resolve) =>
          process.stdout.write(`${formatResult(value)}\n`, () => {
            resolve();
          }),
        ),
    ).then(
      () => process.exit(0),
      (error) => {
        process.stderr.write(`${error.stack}\n`, () => {
          process.exit(1);
        });
      },
    );
  });
}

function formatResult(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function registerModuleLoader(specifier: string | URL): <T>(modulePath: string) => Promise<T> {
  register(specifier, import.meta.url);

  return function loadModule<T>(modulePath: string): Promise<T> {
    return import(modulePath).then(
      (module) => module as T,
      (error) => {
        throw new Error(`Failed to load ${modulePath}`, { cause: error });
      },
    );
  };
}
