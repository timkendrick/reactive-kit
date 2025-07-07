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

import { IdentitySchedulerMiddlewareActor, identityMiddleware } from './identityMiddleware';

describe('composition helpers', () => {
  // Test message types for middleware tests
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
  describe(identityMiddleware, () => {
    test('factory', () => {
      const mockNext = {} as AsyncSchedulerActorHandle<TestMessage>;
      const self = {} as AsyncSchedulerActorHandle<TestMessage>;
      const identityFactory = identityMiddleware<TestMessage>();
      const identityActor = identityFactory.factory(mockNext, self);
      expect(identityActor).toBeInstanceOf(IdentitySchedulerMiddlewareActor);
    });

    test('should pass through messages unchanged', async () => {
      const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
        type: 'EchoActor',
        async: false,
        factory: (output) => new EchoActor(output),
      };

      // Create scheduler with identity middleware
      const scheduler = new AsyncScheduler<TestMessage>(
        () => echoActorFactory,
        identityMiddleware<TestMessage>(),
      );

      // Send test messages
      scheduler.dispatch({ type: 'TEST', payload: 'first' });
      scheduler.dispatch({ type: 'TEST', payload: 'second' });

      // Should get normal echo responses
      const result1 = await scheduler.next();
      expect(result1.done).toBe(false);
      expect(result1.value).toEqual({ type: 'ECHO', payload: 'first' });

      const result2 = await scheduler.next();
      expect(result2.done).toBe(false);
      expect(result2.value).toEqual({ type: 'ECHO', payload: 'second' });
    });
  });
});
