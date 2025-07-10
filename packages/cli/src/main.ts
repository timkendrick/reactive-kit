import { register } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';

import { handlers } from '@reactive-kit/handlers';
import { hash, type Hashable } from '@reactive-kit/hash';
import { Runtime, type RuntimeMessage } from '@reactive-kit/runtime';
import { ExtendedJsonSerializer } from '@reactive-kit/serialization';
import type { Expression } from '@reactive-kit/types';
import { Enum, subscribeAsyncIterator, type GenericEnum } from '@reactive-kit/utils';

import { cliLoggerMiddleware } from './middleware';

export function main(): Promise<void> {
  const result = parseArgs(process.argv.slice(2));
  if (Result.Error.is(result)) return exit(1, result.error);
  const { value: args } = result;
  const { input: inputPath, log: logType } = args;
  const modulePath = join(process.cwd(), inputPath);
  const loadModule = registerModuleLoader('@reactive-kit/loader');
  return loadModule<{ default: Expression<Hashable> }>(modulePath).then((module) => {
    const { default: expression } = module;
    const jsonSerializer = new ExtendedJsonSerializer({
      getFunctionId: (value) => hash(value.toString()),
      getSymbolId: (value) => hash(Symbol.keyFor(value)),
      fallback: (value: object) => (value as { toJSON?: () => unknown }).toJSON?.() ?? null,
    });
    const output = process.stderr;
    const logSerializer = logType === CliLogType.Json ? jsonSerializer : null;
    const logMiddleware =
      logSerializer === null
        ? undefined
        : cliLoggerMiddleware<RuntimeMessage>(output, logSerializer);
    const runtime = new Runtime(handlers, { middleware: logMiddleware });
    const results = runtime.subscribe(expression);
    return subscribeAsyncIterator(
      results,
      (value) =>
        new Promise((resolve) =>
          process.stdout.write(jsonSerializer.serialize(value) + '\n', () => {
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

interface CliArgs {
  input: string;
  log: CliLogType | null;
}

const enum CliLogType {
  Json,
}

type Result<T, E> = Enum<{
  [ResultType.Success]: { value: T };
  [ResultType.Error]: { error: E };
}>;
interface GenericResult extends GenericEnum<2> {
  instance: Result<this['T1'], this['T2']>;
}
const enum ResultType {
  Success = 'Success',
  Error = 'Error',
}
const Result = Enum.create<GenericResult>({
  [ResultType.Success]: true,
  [ResultType.Error]: true,
});

function parseArgs(args: Array<string>): Result<CliArgs, string> {
  let input: string | null = null;
  let log: CliLogType | null = null;
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--log') {
      if (log !== null) {
        return Result.Error({ error: 'Duplicate --log argument' });
      }
      if (i + 1 >= args.length) {
        return Result.Error({ error: 'Missing value for --log' });
      }
      const logValue = args[i + 1];
      if (logValue !== 'json') {
        return Result.Error({ error: 'Invalid value for --log: ' + logValue });
      }
      log = CliLogType.Json;
      i += 2;
      continue;
    } else if (arg.startsWith('--log=')) {
      if (log !== null) {
        return Result.Error({ error: 'Duplicate --log argument' });
      }
      const logValue = arg.slice('--log='.length);
      if (logValue !== 'json') {
        return Result.Error({ error: 'Invalid value for --log: ' + logValue });
      }
      log = CliLogType.Json;
      i += 1;
      continue;
    } else if (!arg.startsWith('--')) {
      if (input !== null) {
        return Result.Error({ error: 'Multiple input files specified' });
      }
      input = arg;
      i += 1;
      continue;
    } else {
      return Result.Error({ error: 'Unknown argument: ' + arg });
    }
  }
  if (input === null) {
    return Result.Error({ error: 'No input file specified' });
  }
  return Result.Success({ value: { input, log } });
}

function exit(code: number, message: string): Promise<void> {
  return new Promise((resolve) => {
    process.stderr.write(message + '\n', () => {
      resolve(process.exit(code));
    });
  });
}
