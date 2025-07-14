import { register } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';

import { handlers } from '@reactive-kit/handlers';
import { type Hashable } from '@reactive-kit/hash';
import { Runtime } from '@reactive-kit/runtime';
import type { Expression } from '@reactive-kit/types';
import { subscribeAsyncIterator } from '@reactive-kit/utils';
import { WebSocketServer } from 'ws';

declare module 'node:module' {
  export function register(
    specifier: string | URL,
    parentUrl?: string | URL,
    options?: {
      parentUrl?: string | URL;
      data?: unknown;
      transferList?: Array<Transferable>;
    },
  ): void;
}

export function main(): Promise<void> {
  const args = process.argv.slice(2);
  const port = Number(process.env.PORT) || 8080;
  if (args.length === 0) throw new Error('No input file specified');
  if (isNaN(port)) throw new Error(`Invalid port: ${process.env.PORT}`);
  const [inputPath] = args;
  const modulePath = join(process.cwd(), inputPath);
  const loadModule = registerModuleLoader('@reactive-kit/loader');
  return loadModule<{ default: Expression<Hashable> }>(modulePath).then((module) => {
    const { default: expression } = module;
    const runtime = new Runtime(handlers);
    return serve(runtime, expression, port).then(
      () => process.exit(0),
      (error) => {
        process.stderr.write(`${error.stack}\n`, () => {
          process.exit(1);
        });
      },
    );
  });
}

function serve(runtime: Runtime, expression: Expression<Hashable>, port: number): Promise<null> {
  // Launch a WebSocket server that listens for connections on the specified port
  // On receiving a connection, the server will stream the expression evaluation results to the client,
  // encoded as JSON payloads
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    const results = runtime.subscribe(expression);
    subscribeAsyncIterator(results, (value) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(new TextEncoder().encode(formatResult(value)));
      }
    }).catch((error) => {
      ws.send(`Error: ${error.message}`);
    });
  });

  return new Promise(() => {
    wss.on('listening', () => {
      process.stdout.write(`WebSocket server is listening on port ${port}\n`);
    });
  });
}

function formatResult(value: unknown): string {
  return JSON.stringify(value);
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
