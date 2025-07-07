import { describe, expect, test } from 'vitest';

import {
  HandlerAction,
  type Actor,
  type ActorFactory,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';

import { AsyncScheduler, type AsyncSchedulerActorHandle } from '../AsyncScheduler';
import { createSchedulerCommandMessage, type SchedulerCommandMessage } from '../messages';
import { SchedulerCommand, type SchedulerMiddlewareFactory } from '../types';

import {
  ChainSchedulerMiddlewareActor,
  chainMiddleware,
  composeMiddleware,
} from './chainMiddleware';
import { IdentitySchedulerMiddlewareActor } from './identityMiddleware';

describe(chainMiddleware, () => {
  interface TestMessage {
    type: 'TEST' | 'ECHO';
    payload: string;
  }

  class EchoActor<T extends { type: string; payload: unknown }>
    implements Actor<T, T | { type: 'ECHO'; payload: T['payload'] }>
  {
    constructor(private output: ActorHandle<T>) {}

    handle(message: T, _context: HandlerContext<T>): HandlerResult<T> {
      return [
        HandlerAction.Send({
          target: this.output,
          message: { type: 'ECHO', payload: message.payload } as T,
        }),
      ];
    }
  }

  // Helper middleware factories for testing chain behavior
  function createOrderingMiddleware(
    name: string,
    results: Array<string>,
  ): SchedulerMiddlewareFactory<TestMessage> {
    return {
      type: `${name}Middleware`,
      async: false,
      factory: (next: ActorHandle<SchedulerCommandMessage<TestMessage>>) => ({
        handle(
          message: SchedulerCommandMessage<TestMessage>,
          _context: HandlerContext<SchedulerCommandMessage<TestMessage>>,
        ) {
          // Log when processing a TEST message
          if (
            SchedulerCommand.Send.is(message.payload) &&
            (message.payload.message as TestMessage).type === 'TEST'
          ) {
            results.push(name);
          }
          return [HandlerAction.Send({ target: next, message })];
        },
      }),
    };
  }

  function createFilteringMiddleware(
    predicate: (message: TestMessage) => boolean,
  ): SchedulerMiddlewareFactory<TestMessage> {
    return {
      type: 'FilteringMiddleware',
      async: false,
      factory: (_next: ActorHandle<SchedulerCommandMessage<TestMessage>>) => ({
        handle(
          message: SchedulerCommandMessage<TestMessage>,
          _context: HandlerContext<SchedulerCommandMessage<TestMessage>>,
        ) {
          // Block all TEST messages
          if (SchedulerCommand.Send.is(message.payload) && !predicate(message.payload.message)) {
            return null; // Block the message
          }
          // Let other messages through (like spawn commands)
          return [HandlerAction.Send({ target: _next, message })];
        },
      }),
    };
  }

  function createLoggingMiddleware(
    results: Array<string>,
  ): SchedulerMiddlewareFactory<TestMessage> {
    return {
      type: 'LoggingMiddleware',
      async: false,
      factory: (next: ActorHandle<SchedulerCommandMessage<TestMessage>>) => ({
        handle(
          message: SchedulerCommandMessage<TestMessage>,
          _context: HandlerContext<SchedulerCommandMessage<TestMessage>>,
        ) {
          // Log TEST messages that reach this middleware
          if (
            SchedulerCommand.Send.is(message.payload) &&
            (message.payload.message as TestMessage).type === 'TEST'
          ) {
            results.push((message.payload.message as TestMessage).payload);
          }
          return [HandlerAction.Send({ target: next, message })];
        },
      }),
    };
  }

  function createSynthesizingMiddleware(
    predicate: (message: TestMessage) => boolean,
    factory: (message: TestMessage) => TestMessage,
  ): SchedulerMiddlewareFactory<TestMessage> {
    return {
      type: 'SynthesizingMiddleware',
      async: false,
      factory: (next: ActorHandle<SchedulerCommandMessage<TestMessage>>) => ({
        handle(
          message: SchedulerCommandMessage<TestMessage>,
          _context: HandlerContext<SchedulerCommandMessage<TestMessage>>,
        ) {
          const { payload: command } = message;
          // When we see a TEST message with payload 'synthesize', create an additional message
          if (SchedulerCommand.Send.is(command) && predicate(command.message)) {
            const syntheticCommand = SchedulerCommand.Send({
              ...command,
              message: factory(command.message),
            });

            // Send both the original and the synthesized message
            return [
              HandlerAction.Send({ target: next, message }),
              HandlerAction.Send({
                target: next,
                message: createSchedulerCommandMessage(syntheticCommand),
              }),
            ];
          }
          // Pass through other messages unchanged
          return [HandlerAction.Send({ target: next, message })];
        },
      }),
    };
  }

  test('factory', () => {
    const chainedFactory = chainMiddleware(
      createOrderingMiddleware('LEFT', []),
      createOrderingMiddleware('RIGHT', []),
    );

    expect(chainedFactory).toEqual({
      type: 'ChainMiddleware',
      async: false,
      factory: expect.any(Function),
    } satisfies SchedulerMiddlewareFactory<TestMessage>);

    const mockNext = {} as AsyncSchedulerActorHandle<SchedulerCommandMessage<TestMessage>>;
    const self = {} as AsyncSchedulerActorHandle<SchedulerCommandMessage<TestMessage>>;
    const chainedActor = chainedFactory.factory(mockNext, self);

    expect(chainedActor).toBeInstanceOf(ChainSchedulerMiddlewareActor);
  });

  test('should flow messages through both middlewares', async () => {
    const processingOrder: Array<string> = [];

    const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
      type: 'EchoActor',
      async: false,
      factory: (output) => new EchoActor(output),
    };

    // Chain two ordering middlewares
    const chainedMiddleware = chainMiddleware(
      createOrderingMiddleware('FIRST', processingOrder),
      createOrderingMiddleware('SECOND', processingOrder),
    );

    const scheduler = new AsyncScheduler<TestMessage>(() => echoActorFactory, chainedMiddleware);

    // Send a test message
    scheduler.dispatch({ type: 'TEST', payload: 'chain-test' });

    // Should get normal echo response
    const result = await scheduler.next();
    expect(result.done).toBe(false);
    expect(result.value).toEqual({ type: 'ECHO', payload: 'chain-test' });

    // Verify processing order shows message flowed through both middlewares
    expect(processingOrder).toEqual(['FIRST', 'SECOND']);
  });

  test('should allow left middleware to block messages', async () => {
    const rightProcessed: Array<string> = [];

    const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
      type: 'EchoActor',
      async: false,
      factory: (output) => new EchoActor(output),
    };

    // Left middleware blocks, right middleware logs
    const chainedMiddleware = chainMiddleware(
      createFilteringMiddleware((message) => !message.payload.includes('blocked')),
      createLoggingMiddleware(rightProcessed),
    );

    const scheduler = new AsyncScheduler<TestMessage>(() => echoActorFactory, chainedMiddleware);

    // Send test messages - blocked messages should be blocked by left middleware
    scheduler.dispatch({ type: 'TEST', payload: 'blocked1' });
    scheduler.dispatch({ type: 'TEST', payload: 'allowed1' });
    scheduler.dispatch({ type: 'TEST', payload: 'blocked2' });

    // Wait a short time to ensure any processing would have occurred
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Only allowed messages should have reached the right middleware
    expect(rightProcessed).toEqual(['allowed1']);
  });

  test('should allow left middleware to create new messages', async () => {
    const rightProcessed: Array<string> = [];

    const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
      type: 'EchoActor',
      async: false,
      factory: (output) => new EchoActor(output),
    };

    // Left middleware synthesizes, right middleware logs what it sees
    const chainedMiddleware = chainMiddleware(
      createSynthesizingMiddleware(
        (message) => message.type === 'TEST' && message.payload === 'synthesize',
        (_) => ({ type: 'TEST', payload: 'synthesized' }),
      ),
      createLoggingMiddleware(rightProcessed),
    );

    const scheduler = new AsyncScheduler<TestMessage>(() => echoActorFactory, chainedMiddleware);

    // Send a message that triggers synthesis
    scheduler.dispatch({ type: 'TEST', payload: 'synthesize' });

    // Should get echoes for both original and synthetic messages
    const result1 = await scheduler.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toEqual({ type: 'ECHO', payload: 'synthesize' });

    const result2 = await scheduler.next();
    expect(result2.done).toBe(false);
    expect(result2.value).toEqual({ type: 'ECHO', payload: 'synthesized' });

    // Right middleware should have logged both messages
    expect(rightProcessed).toEqual(['synthesize', 'synthesized']);
  });

  test('should allow right middleware to block messages', async () => {
    const leftProcessed: Array<string> = [];

    const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
      type: 'EchoActor',
      async: false,
      factory: (output) => new EchoActor(output),
    };

    // Left middleware logs, right middleware blocks
    const chainedMiddleware = chainMiddleware(
      createLoggingMiddleware(leftProcessed),
      createFilteringMiddleware((message) => !message.payload.includes('blocked')),
    );

    const scheduler = new AsyncScheduler<TestMessage>(() => echoActorFactory, chainedMiddleware);

    // Send test messages - should be processed by left but blocked by right
    scheduler.dispatch({ type: 'TEST', payload: 'blocked1' });
    scheduler.dispatch({ type: 'TEST', payload: 'allowed1' });
    scheduler.dispatch({ type: 'TEST', payload: 'blocked2' });

    const result1 = await scheduler.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toEqual({ type: 'ECHO', payload: 'allowed1' });

    // Left middleware should have seen the messages but they shouldn't reach the actor
    expect(leftProcessed).toEqual(['blocked1', 'allowed1', 'blocked2']);
  });

  test('should allow right middleware to create new messages', async () => {
    const leftProcessed: Array<string> = [];

    const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
      type: 'EchoActor',
      async: false,
      factory: (output) => new EchoActor(output),
    };

    // Left middleware logs, right middleware synthesizes
    const chainedMiddleware = chainMiddleware(
      createLoggingMiddleware(leftProcessed),
      createSynthesizingMiddleware(
        (message) => message.type === 'TEST' && message.payload === 'synthesize',
        (_) => ({ type: 'ECHO', payload: 'synthetic' }),
      ),
    );

    const scheduler = new AsyncScheduler<TestMessage>(() => echoActorFactory, chainedMiddleware);

    // Send a message that triggers synthesis in the right middleware
    scheduler.dispatch({ type: 'TEST', payload: 'synthesize' });

    // Should get echoes for both original and synthetic messages
    const result1 = await scheduler.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toEqual({ type: 'ECHO', payload: 'synthesize' });

    const result2 = await scheduler.next();
    expect(result2.done).toBe(false);
    expect(result2.value).toEqual({ type: 'ECHO', payload: 'synthetic' });

    // Left middleware should have seen only the original message (before synthesis)
    expect(leftProcessed).toEqual(['synthesize']);
  });
});

describe(composeMiddleware, () => {
  interface TestMessage {
    type: 'TEST' | 'ECHO';
    payload: string;
  }

  describe('factory', () => {
    test('should handle empty case', () => {
      const composedFactory = composeMiddleware<TestMessage>();

      expect(composedFactory).toEqual({
        type: expect.any(String),
        async: false,
        factory: expect.any(Function),
      } satisfies SchedulerMiddlewareFactory<TestMessage>);

      const mockNext = {} as AsyncSchedulerActorHandle<SchedulerCommandMessage<TestMessage>>;
      const self = {} as AsyncSchedulerActorHandle<SchedulerCommandMessage<TestMessage>>;
      const actor = composedFactory.factory(mockNext, self);

      expect(actor).toBeInstanceOf(IdentitySchedulerMiddlewareActor);
    });

    test('should handle single middleware', () => {
      const factory: SchedulerMiddlewareFactory<TestMessage> = {
        type: 'SingleMiddleware',
        async: false,
        factory: () => ({
          handle: () => null,
        }),
      };

      const composedFactory = composeMiddleware(factory);

      expect(composedFactory).toBe(factory); // Should return the same factory
    });

    test('should compose multiple middlewares', () => {
      const factory1: SchedulerMiddlewareFactory<TestMessage> = {
        type: 'FirstMiddleware',
        async: false,
        factory: () => ({
          handle: () => null,
        }),
      };
      const factory2: SchedulerMiddlewareFactory<TestMessage> = {
        type: 'SecondMiddleware',
        async: false,
        factory: () => ({
          handle: () => null,
        }),
      };
      const factory3: SchedulerMiddlewareFactory<TestMessage> = {
        type: 'ThirdMiddleware',
        async: false,
        factory: () => ({
          handle: () => null,
        }),
      };

      const composedFactory = composeMiddleware(factory1, factory2, factory3);

      expect(composedFactory).toEqual({
        type: expect.any(String),
        async: false,
        factory: expect.any(Function),
      } satisfies SchedulerMiddlewareFactory<TestMessage>);

      const mockNext = {} as AsyncSchedulerActorHandle<SchedulerCommandMessage<TestMessage>>;
      const self = {} as AsyncSchedulerActorHandle<SchedulerCommandMessage<TestMessage>>;
      const actor = composedFactory.factory(mockNext, self);

      expect(actor).toBeInstanceOf(ChainSchedulerMiddlewareActor);
    });
  });
});
