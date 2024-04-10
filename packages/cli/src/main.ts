import { join } from 'node:path';
import { subscribeAsyncIterator } from '@reactive-kit/utils';
import { type Hashable } from '@reactive-kit/hash';
import { type Reactive } from '@reactive-kit/interpreter';
import { Runtime } from '@reactive-kit/runtime';
import handlers from './handlers';

export function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) throw new Error('No input file specified');
  const [inputPath] = args;
  const modulePath = join(process.cwd(), inputPath);
  return loadModule<{ default: Reactive<Hashable> }>(modulePath).then((module) => {
    const { default: expression } = module;
    const runtime = new Runtime(handlers);
    const results = runtime.subscribe(expression as Reactive<Hashable>);
    subscribeAsyncIterator(
      results,
      (value) =>
        new Promise((resolve) =>
          process.stdout.write(`${formatValue(value)}\n`, () => {
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

function loadModule<T>(modulePath: string): Promise<T> {
  return import(modulePath).then(
    (module) => module as T,
    (error) => {
      throw new Error(`Failed to load ${modulePath}`, { cause: error });
    },
  );
}

function formatValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
