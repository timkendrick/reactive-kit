import { describe, expect, test } from 'vitest';

import {
  HandlerAction,
  type Actor,
  type ActorFactory,
  type ActorHandle,
  type AsyncTask,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';

import { AsyncScheduler } from './AsyncScheduler';
import {
  createSchedulerCommandMessage,
  isSchedulerCommandMessage,
  type SchedulerCommandMessage,
} from './messages';
import { composeMiddleware } from './middleware';
import { SchedulerCommand, type SchedulerMiddlewareFactory } from './types';

describe(AsyncScheduler, () => {
  describe('Core functionality', () => {
    interface Message<T, V> {
      type: T;
      payload: V;
    }

    test('Simple sync actor', async () => {
      enum AppMessageType {
        Increment,
        Decrement,
        Result,
        Destroy,
      }
      type IncrementMessage = Message<AppMessageType.Increment, null>;
      type DecrementMessage = Message<AppMessageType.Decrement, null>;
      type DestroyMessage = Message<AppMessageType.Destroy, null>;
      type ResultMessage = Message<AppMessageType.Result, { value: number }>;
      type AppMessage = IncrementMessage | DecrementMessage | DestroyMessage | ResultMessage;
      class AppActor implements Actor<IncrementMessage | DecrementMessage, AppMessage> {
        private readonly output: ActorHandle<ResultMessage>;
        private counter = 0;
        public constructor(output: ActorHandle<ResultMessage>) {
          this.output = output;
        }
        public handle(
          message: AppMessage,
          context: HandlerContext<AppMessage>,
        ): HandlerResult<AppMessage> {
          switch (message.type) {
            case AppMessageType.Increment:
              return [
                HandlerAction.Send({
                  target: this.output,
                  message: {
                    type: AppMessageType.Result,
                    payload: { value: ++this.counter },
                  },
                }),
              ];
            case AppMessageType.Decrement:
              return [
                HandlerAction.Send({
                  target: this.output,
                  message: {
                    type: AppMessageType.Result,
                    payload: { value: --this.counter },
                  },
                }),
              ];
            case AppMessageType.Destroy:
              return [HandlerAction.Kill({ target: context.self() })];
            default:
              return null;
          }
        }
      }
      const APP_ACTOR = {
        type: 'AppActor',
        async: false,
        factory: (output: ActorHandle<AppMessage>, _self: ActorHandle<AppMessage>) =>
          new AppActor(output),
      } satisfies ActorFactory<ActorHandle<AppMessage>, AppMessage, AppMessage>;
      const scheduler = new AsyncScheduler<AppMessage>(() => APP_ACTOR);
      scheduler.dispatch({ type: AppMessageType.Increment, payload: null });
      {
        const result = await scheduler.next();
        expect(result).toEqual({
          done: false,
          value: { type: AppMessageType.Result, payload: { value: 1 } },
        });
      }
      scheduler.dispatch({ type: AppMessageType.Increment, payload: null });
      scheduler.dispatch({ type: AppMessageType.Increment, payload: null });
      {
        const result = await scheduler.next();
        expect(result).toEqual({
          done: false,
          value: { type: AppMessageType.Result, payload: { value: 2 } },
        });
      }
      {
        const result = await scheduler.next();
        expect(result).toEqual({
          done: false,
          value: { type: AppMessageType.Result, payload: { value: 3 } },
        });
      }
      scheduler.dispatch({ type: AppMessageType.Decrement, payload: null });
      {
        const result = await scheduler.next();
        expect(result).toEqual({
          done: false,
          value: { type: AppMessageType.Result, payload: { value: 2 } },
        });
      }
      scheduler.dispatch({ type: AppMessageType.Destroy, payload: null });
      {
        const result = await scheduler.next();
        expect(result).toEqual({ done: true, value: undefined });
      }
    });
  });

  describe('middleware', () => {
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

    describe('Usage examples', () => {
      // Test message types for middleware tests
      interface TestMessage {
        type: 'TEST' | 'ECHO';
        payload: string;
      }

      test('Logging', async () => {
        function createLoggingMiddleware<T>(
          logger: (message: SchedulerCommand<T>) => void,
        ): SchedulerMiddlewareFactory<T> {
          return {
            type: 'LoggingMiddleware',
            async: false,
            factory: (next: ActorHandle<SchedulerCommandMessage<T>>) => ({
              handle(
                message: SchedulerCommandMessage<T>,
                _context: HandlerContext<SchedulerCommandMessage<T>>,
              ) {
                logger(message.payload);
                return [HandlerAction.Send({ target: next, message })];
              },
            }),
          };
        }
        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Create scheduler with logging middleware
        const loggedMessages: Array<SchedulerCommand<TestMessage>> = [];
        const loggingMiddleware = createLoggingMiddleware<TestMessage>((command) => {
          loggedMessages.push(command);
        });

        const scheduler = new AsyncScheduler<TestMessage>(
          () => echoActorFactory,
          loggingMiddleware,
        );

        // Send a test message
        scheduler.dispatch({ type: 'TEST', payload: 'hello' });

        // Get the response
        const result = await scheduler.next();
        expect(result.done).toBe(false);
        expect(result.value).toEqual({ type: 'ECHO', payload: 'hello' });

        // Verify middleware logged the exact expected commands
        expect(loggedMessages).toEqual([
          // Instantiate the root actor
          SchedulerCommand.Spawn({
            source: null,
            target: scheduler.inputHandle,
            actor: echoActorFactory,
            config: scheduler.outputHandle,
          }),
          // Dispatch a message to the root actor
          SchedulerCommand.Send({
            source: scheduler.internalHandle,
            target: scheduler.inputHandle,
            message: { type: 'TEST', payload: 'hello' } as TestMessage,
          }),
          // Root actor echoes the message to the output handle
          SchedulerCommand.Send({
            source: scheduler.inputHandle,
            target: scheduler.outputHandle,
            message: { type: 'ECHO', payload: 'hello' } as TestMessage,
          }),
        ]);
      });

      test('Filtering', async () => {
        const allowedMessages: Array<SchedulerCommand<TestMessage>> = [];
        const blockedMessages: Array<string> = [];

        function createFilteringMiddleware(
          predicate: (message: TestMessage) => boolean,
        ): SchedulerMiddlewareFactory<TestMessage> {
          return {
            type: 'FilteringMiddleware',
            async: false,
            factory: (next: ActorHandle<SchedulerCommandMessage<TestMessage>>) => ({
              handle(
                message: SchedulerCommandMessage<TestMessage>,
                _context: HandlerContext<SchedulerCommandMessage<TestMessage>>,
              ) {
                const { payload: command } = message;
                // Block Send commands with payload 'blocked'
                if (SchedulerCommand.Send.is(command) && !predicate(command.message)) {
                  blockedMessages.push((command.message as TestMessage).payload);
                  return null; // Block the message
                }
                allowedMessages.push(command);
                return [HandlerAction.Send({ target: next, message })];
              },
            }),
          };
        }

        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Create scheduler with filtering middleware
        const filteringMiddleware = createFilteringMiddleware(
          (message) => !message.payload.includes('blocked'),
        );
        const scheduler = new AsyncScheduler<TestMessage>(
          () => echoActorFactory,
          filteringMiddleware,
        );

        // Send test messages - one should be blocked
        scheduler.dispatch({ type: 'TEST', payload: 'allowed' });
        scheduler.dispatch({ type: 'TEST', payload: 'blocked' });
        scheduler.dispatch({ type: 'TEST', payload: 'also-allowed' });

        // Only allowed messages should produce responses
        const result1 = await scheduler.next();
        expect(result1.done).toBe(false);
        expect(result1.value).toEqual({ type: 'ECHO', payload: 'allowed' });

        const result2 = await scheduler.next();
        expect(result2.done).toBe(false);
        expect(result2.value).toEqual({ type: 'ECHO', payload: 'also-allowed' });

        // Verify the blocked message was filtered out
        expect(blockedMessages).toEqual(['blocked']);

        // Verify exact commands that were allowed through
        expect(allowedMessages).toEqual([
          // Spawn command for the echo actor
          SchedulerCommand.Spawn({
            source: null,
            target: scheduler.inputHandle,
            actor: echoActorFactory,
            config: scheduler.outputHandle,
          }),
          // First allowed message dispatch
          SchedulerCommand.Send({
            source: scheduler.internalHandle,
            target: scheduler.inputHandle,
            message: { type: 'TEST', payload: 'allowed' } as TestMessage,
          }),
          // Echo response for first message
          SchedulerCommand.Send({
            source: scheduler.inputHandle,
            target: scheduler.outputHandle,
            message: { type: 'ECHO', payload: 'allowed' } as TestMessage,
          }),
          // Second allowed message dispatch
          SchedulerCommand.Send({
            source: scheduler.internalHandle,
            target: scheduler.inputHandle,
            message: { type: 'TEST', payload: 'also-allowed' } as TestMessage,
          }),
          // Echo response for second message
          SchedulerCommand.Send({
            source: scheduler.inputHandle,
            target: scheduler.outputHandle,
            message: { type: 'ECHO', payload: 'also-allowed' } as TestMessage,
          }),
        ]);
      });

      test('Synthesizing', async () => {
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
                // When we see a message that matches the predicate, synthesize an additional message
                if (SchedulerCommand.Send.is(command) && predicate(command.message)) {
                  const duplicatedCommand = SchedulerCommand.Send({
                    ...command,
                    message: factory(command.message),
                  });
                  // Send both the original and the synthesized message
                  return [
                    HandlerAction.Send({ target: next, message }),
                    HandlerAction.Send({
                      target: next,
                      message: createSchedulerCommandMessage(duplicatedCommand),
                    }),
                  ];
                }
                // Pass through other messages unchanged
                return [HandlerAction.Send({ target: next, message })];
              },
            }),
          };
        }

        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Create scheduler with synthesizing middleware
        const synthesizingMiddleware = createSynthesizingMiddleware(
          (message) => message.type === 'TEST' && message.payload === 'synthesize',
          (_) => ({ type: 'TEST', payload: 'synthesized' }),
        );
        const scheduler = new AsyncScheduler<TestMessage>(
          () => echoActorFactory,
          synthesizingMiddleware,
        );

        // Send a test message that should trigger synthesis
        scheduler.dispatch({ type: 'TEST', payload: 'synthesize' });

        // Should get echo for both the original and synthesized message
        const result1 = await scheduler.next();
        expect(result1.done).toBe(false);
        expect(result1.value).toEqual({ type: 'ECHO', payload: 'synthesize' });

        const result2 = await scheduler.next();
        expect(result2.done).toBe(false);
        expect(result2.value).toEqual({ type: 'ECHO', payload: 'synthesized' });
      });

      describe('Mocking', () => {
        // Test message types for middleware tests
        interface TestMessage {
          type: 'TEST' | 'ECHO' | 'MOCKED';
          payload: string;
        }

        function createMockingMiddleware<T>(
          taskType: string,
          mockTask: ActorFactory<ActorHandle<T>, T, T>,
        ): SchedulerMiddlewareFactory<T> {
          return {
            type: 'MockingMiddleware',
            async: false,
            factory: (next: ActorHandle<SchedulerCommandMessage<T>>) => ({
              handle(
                message: SchedulerCommandMessage<T>,
                _context: HandlerContext<SchedulerCommandMessage<T>>,
              ) {
                const { payload: command } = message;
                if (SchedulerCommand.Spawn.is(command) && command.actor.type === taskType) {
                  // Spawn an instance of the mock actor instead of the original actor
                  const mockCommand = SchedulerCommand.Spawn({
                    ...command,
                    actor: mockTask,
                  });
                  const modifiedMessage: SchedulerCommandMessage<T> = {
                    ...message,
                    payload: mockCommand,
                  };
                  return [HandlerAction.Send({ target: next, message: modifiedMessage })];
                }
                return [HandlerAction.Send({ target: next, message })];
              },
            }),
          };
        }

        test('should allow mocking actors', async () => {
          const mockTaskFactory: ActorFactory<
            ActorHandle<TestMessage>,
            TestMessage,
            TestMessage
          > = {
            type: 'MockTask',
            async: false,
            factory: (output: ActorHandle<TestMessage>) => ({
              handle: (message: TestMessage, _context: HandlerContext<TestMessage>) => [
                HandlerAction.Send({
                  target: output,
                  message: { type: 'MOCKED', payload: message.payload },
                }),
              ],
            }),
          };

          const echoActorFactory: ActorFactory<
            ActorHandle<TestMessage>,
            TestMessage,
            TestMessage
          > = {
            type: 'EchoActor',
            async: false,
            factory: (output) => new EchoActor(output),
          };

          // Create scheduler with mocking middleware that replaces EchoActor with MockTask
          const mockingMiddleware = createMockingMiddleware<TestMessage>(
            'EchoActor',
            mockTaskFactory,
          );
          const scheduler = new AsyncScheduler<TestMessage>(
            () => echoActorFactory,
            mockingMiddleware,
          );

          // Send a test message
          scheduler.dispatch({ type: 'TEST', payload: 'hello' });

          // Get the response - should be from mock task, not echo actor
          const result = await scheduler.next();
          expect(result.done).toBe(false);
          expect(result.value).toEqual({ type: 'MOCKED', payload: 'hello' });
        });
      });

      describe('Async Validation Middleware', () => {
        // Test message types for middleware tests
        interface TestMessage {
          type: 'CREATE_USER' | 'OTHER_ACTION';
          payload: string;
        }

        // Shared setup for validation middleware
        interface ValidationResultMessage<T> {
          type: 'VALIDATION_RESULT';
          payload: {
            value: T;
            isInvalid: boolean;
          };
        }

        test('should allow async validation', async () => {
          interface ValidationWorkerRequest<T> {
            type: 'VALIDATION_WORKER_REQUEST';
            payload: {
              originalMessage: T;
              workerId: string;
            };
          }

          interface ValidationWorkerResponse<T> {
            type: 'VALIDATION_WORKER_RESPONSE';
            payload: {
              workerId: string;
              originalMessage: T;
              isInvalid: boolean;
            };
          }

          type ValidationWorkerMessage<T> =
            | ValidationWorkerRequest<T>
            | ValidationWorkerResponse<T>;

          class ValidationWorker
            implements
              Actor<ValidationWorkerMessage<TestMessage>, ValidationWorkerMessage<TestMessage>>
          {
            constructor(private callback: ActorHandle<ValidationWorkerMessage<TestMessage>>) {}

            handle(
              message: ValidationWorkerMessage<TestMessage>,
              context: HandlerContext<ValidationWorkerMessage<TestMessage>>,
            ): HandlerResult<ValidationWorkerMessage<TestMessage>> {
              if (message.type === 'VALIDATION_WORKER_REQUEST') {
                const { originalMessage, workerId } = message.payload;
                // Simulate async validation work
                const isInvalid = originalMessage.payload.includes('invalid');
                // Send response back to the caller and then kill self
                return [
                  HandlerAction.Send({
                    target: this.callback,
                    message: {
                      type: 'VALIDATION_WORKER_RESPONSE',
                      payload: {
                        workerId,
                        originalMessage,
                        isInvalid,
                      },
                    } satisfies ValidationWorkerResponse<TestMessage>,
                  }),
                  HandlerAction.Kill({ target: context.self() }),
                ];
              }
              return null;
            }
          }

          type ValidationMiddlewareMessage<T> =
            | SchedulerCommandMessage<T>
            | ValidationWorkerMessage<T>
            | SchedulerCommandMessage<ValidationResultMessage<T>>;

          class ValidationMiddleware
            implements
              Actor<
                ValidationMiddlewareMessage<TestMessage>,
                ValidationMiddlewareMessage<TestMessage>
              >
          {
            private workerCount = 0;
            private pendingWorkers = new Map<
              string,
              {
                target: ActorHandle<TestMessage | ValidationResultMessage<TestMessage>>;
                message: TestMessage;
              }
            >();

            constructor(private next: ActorHandle<ValidationMiddlewareMessage<TestMessage>>) {}

            handle(
              message: ValidationMiddlewareMessage<TestMessage>,
              context: HandlerContext<ValidationMiddlewareMessage<TestMessage>>,
            ): HandlerResult<ValidationMiddlewareMessage<TestMessage>> {
              // Handle CREATE_USER messages by spawning validation workers
              if (
                isSchedulerCommandMessage(message) &&
                SchedulerCommand.Send.is(message.payload) &&
                message.payload.message.type === 'CREATE_USER'
              ) {
                const workerId = `worker-${this.workerCount++}`;
                const originalMessage = message.payload.message;
                this.pendingWorkers.set(workerId, {
                  target: message.payload.target,
                  message: originalMessage,
                });
                // Create a validation worker
                const workerHandle = context.spawn({
                  actor: {
                    type: 'ValidationWorker',
                    async: false,
                    factory: (next: ActorHandle<ValidationWorkerMessage<TestMessage>>) =>
                      new ValidationWorker(next),
                  },
                  config: context.self(),
                });
                return [
                  // Emit message to next middleware,
                  HandlerAction.Send({ target: this.next, message }),
                  // Spawn validation worker
                  HandlerAction.Spawn({ target: workerHandle }),
                  // Send validation request to worker
                  HandlerAction.Send({
                    target: workerHandle,
                    message: {
                      type: 'VALIDATION_WORKER_REQUEST',
                      payload: {
                        originalMessage,
                        workerId,
                      },
                    },
                  }),
                ];
              }

              // Handle worker responses
              if (
                !isSchedulerCommandMessage(message) &&
                message.type === 'VALIDATION_WORKER_RESPONSE'
              ) {
                const workerResponse = message;
                const { workerId, originalMessage, isInvalid } = workerResponse.payload;

                // Remove from pending workers
                const pendingWorker = this.pendingWorkers.get(workerId);
                if (!pendingWorker) return [];
                const { target: originalTarget } = pendingWorker;
                this.pendingWorkers.delete(workerId);
                // Emit validation result message to next middleware
                return [
                  HandlerAction.Send({
                    target: this.next,
                    message: createSchedulerCommandMessage(
                      SchedulerCommand.Send<ValidationResultMessage<TestMessage>>({
                        source: context.self() as ActorHandle<unknown> as ActorHandle<
                          ValidationResultMessage<TestMessage>
                        >,
                        target: originalTarget as ActorHandle<ValidationResultMessage<TestMessage>>,
                        message: {
                          type: 'VALIDATION_RESULT',
                          payload: {
                            value: originalMessage,
                            isInvalid,
                          },
                        },
                      }),
                    ),
                  }),
                ];
              }

              // Pass through other messages unchanged
              return [HandlerAction.Send({ target: this.next, message })];
            }
          }

          function createValidationMiddleware(): SchedulerMiddlewareFactory<TestMessage> {
            return {
              type: 'ValidationMiddleware',
              async: false,
              factory: (
                next: ActorHandle<SchedulerCommandMessage<TestMessage>>,
              ): Actor<
                SchedulerCommandMessage<TestMessage>,
                SchedulerCommandMessage<TestMessage>
              > =>
                new ValidationMiddleware(next) as Actor<
                  SchedulerCommandMessage<TestMessage>,
                  SchedulerCommandMessage<TestMessage>
                >,
            };
          }

          const echoActorFactory: ActorFactory<
            ActorHandle<TestMessage>,
            TestMessage,
            TestMessage
          > = {
            type: 'EchoActor',
            async: false,
            factory: (output) => new EchoActor(output),
          };

          // Create scheduler with validation middleware
          const validationMiddleware = createValidationMiddleware();
          const scheduler = new AsyncScheduler<TestMessage>(
            () => echoActorFactory,
            validationMiddleware,
          );

          // Send valid and invalid CREATE_USER messages
          scheduler.dispatch({ type: 'CREATE_USER', payload: 'valid-user' });
          scheduler.dispatch({ type: 'CREATE_USER', payload: 'invalid-user' });
          scheduler.dispatch({ type: 'OTHER_ACTION', payload: 'some-action' });

          const result1 = await scheduler.next();
          expect(result1.done).toBe(false);
          expect(result1.value).toEqual({ type: 'ECHO', payload: 'valid-user' });

          const result2 = await scheduler.next();
          expect(result2.done).toBe(false);
          expect(result2.value).toEqual({
            type: 'ECHO',
            payload: {
              value: {
                type: 'CREATE_USER',
                payload: 'valid-user',
              },
              isInvalid: false,
            },
          });

          const result3 = await scheduler.next();
          expect(result3.done).toBe(false);
          expect(result3.value).toEqual({ type: 'ECHO', payload: 'invalid-user' });

          const result4 = await scheduler.next();
          expect(result4.done).toBe(false);
          expect(result4.value).toEqual({
            type: 'ECHO',
            payload: {
              value: {
                type: 'CREATE_USER',
                payload: 'invalid-user',
              },
              isInvalid: true,
            },
          });

          const result5 = await scheduler.next();
          expect(result5.done).toBe(false);
          expect(result5.value).toEqual({ type: 'ECHO', payload: 'some-action' });
        });
      });
    });

    describe('async middleware', () => {
      // Test message types for async middleware tests
      interface TestMessage {
        type: 'TEST' | 'ECHO';
        payload: string;
      }

      test('should processes messages asynchronously', async () => {
        const processedMessages: Array<SchedulerCommand<TestMessage>> = [];

        // Create an async middleware that simulates async processing (e.g., database lookup)
        function createAsyncLoggingMiddleware(): SchedulerMiddlewareFactory<TestMessage> {
          return {
            type: 'AsyncLoggingMiddleware',
            async: true,
            factory: (
              next: ActorHandle<SchedulerCommandMessage<TestMessage>>,
            ): AsyncTask<
              SchedulerCommandMessage<TestMessage>,
              SchedulerCommandMessage<TestMessage>
            > => {
              return async (inbox, outbox) => {
                for await (const message of inbox) {
                  // Simulate async processing with a small delay
                  await new Promise((resolve) => setTimeout(resolve, 10));
                  processedMessages.push(message.payload);
                  // Forward the message after async processing
                  outbox([HandlerAction.Send({ target: next, message })]);
                }
              };
            },
          };
        }

        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Create scheduler with async middleware
        const asyncMiddleware = createAsyncLoggingMiddleware();
        const scheduler = new AsyncScheduler<TestMessage>(() => echoActorFactory, asyncMiddleware);

        // Send a test message
        scheduler.dispatch({ type: 'TEST', payload: 'hello' });

        // Get the response
        const result = await scheduler.next();
        expect(result.done).toBe(false);
        expect(result.value).toEqual({ type: 'ECHO', payload: 'hello' });

        // Verify async middleware processed the commands
        expect(processedMessages).toEqual([
          SchedulerCommand.Spawn({
            source: null,
            target: scheduler.inputHandle,
            actor: echoActorFactory,
            config: scheduler.outputHandle,
          }),
          SchedulerCommand.Send({
            source: scheduler.internalHandle,
            target: scheduler.inputHandle,
            message: { type: 'TEST', payload: 'hello' } as TestMessage,
          }),
          SchedulerCommand.Send({
            source: scheduler.inputHandle,
            target: scheduler.outputHandle,
            message: { type: 'ECHO', payload: 'hello' } as TestMessage,
          }),
        ]);
      });

      test('should allow transforming messages', async () => {
        let transformCount = 0;

        // Create async middleware that transforms certain messages
        function createAsyncTransformMiddleware(): SchedulerMiddlewareFactory<TestMessage> {
          return {
            type: 'AsyncTransformMiddleware',
            async: true,
            factory: (
              next: ActorHandle<SchedulerCommandMessage<TestMessage>>,
            ): AsyncTask<
              SchedulerCommandMessage<TestMessage>,
              SchedulerCommandMessage<TestMessage>
            > => {
              return async (inbox, outbox) => {
                for await (const message of inbox) {
                  if (SchedulerCommand.Send.is(message.payload)) {
                    const sendCommand = message.payload;
                    const originalMessage = sendCommand.message as TestMessage;

                    // Transform TEST messages to include a counter
                    if (originalMessage.type === 'TEST') {
                      await new Promise((resolve) => setTimeout(resolve, 5)); // Simulate async work

                      transformCount++;
                      const transformedCommand = SchedulerCommand.Send({
                        ...sendCommand,
                        message: {
                          type: 'TEST',
                          payload: `transformed-${transformCount}-${originalMessage.payload}`,
                        } as TestMessage,
                      });

                      outbox([
                        HandlerAction.Send({
                          target: next,
                          message: { ...message, payload: transformedCommand },
                        }),
                      ]);
                      continue;
                    }
                  }
                  // Pass through other messages unchanged
                  outbox([HandlerAction.Send({ target: next, message })]);
                }
              };
            },
          };
        }

        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Create scheduler with async transform middleware
        const transformMiddleware = createAsyncTransformMiddleware();
        const scheduler = new AsyncScheduler<TestMessage>(
          () => echoActorFactory,
          transformMiddleware,
        );

        // Send multiple test messages
        scheduler.dispatch({ type: 'TEST', payload: 'first' });
        scheduler.dispatch({ type: 'TEST', payload: 'second' });

        // Get the responses
        const result1 = await scheduler.next();
        expect(result1.done).toBe(false);
        expect(result1.value).toEqual({ type: 'ECHO', payload: 'transformed-1-first' });

        const result2 = await scheduler.next();
        expect(result2.done).toBe(false);
        expect(result2.value).toEqual({ type: 'ECHO', payload: 'transformed-2-second' });

        expect(transformCount).toBe(2);
      });

      test('should allow filtering messages', async () => {
        const blockedMessages: Array<string> = [];
        const allowedMessages: Array<string> = [];

        // Create async middleware that blocks certain messages based on async validation
        function createAsyncValidationMiddleware(): SchedulerMiddlewareFactory<TestMessage> {
          return {
            type: 'AsyncValidationMiddleware',
            async: true,
            factory: (
              next: ActorHandle<SchedulerCommandMessage<TestMessage>>,
            ): AsyncTask<
              SchedulerCommandMessage<TestMessage>,
              SchedulerCommandMessage<TestMessage>
            > => {
              return async (inbox, outbox) => {
                for await (const message of inbox) {
                  if (
                    SchedulerCommand.Send.is(message.payload) &&
                    message.payload.message.type === 'TEST'
                  ) {
                    const sendCommand = message.payload;
                    const originalMessage = sendCommand.message as TestMessage;
                    // Simulate async validation
                    await new Promise((resolve) => setTimeout(resolve, 5));
                    // Block messages with payload containing 'blocked'
                    if (originalMessage.payload.includes('blocked')) {
                      blockedMessages.push(originalMessage.payload);
                      // Don't forward blocked messages
                      continue;
                    }
                    allowedMessages.push(originalMessage.payload);
                  }
                  // Forward allowed messages
                  outbox([HandlerAction.Send({ target: next, message })]);
                }
              };
            },
          };
        }

        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Create scheduler with async validation middleware
        const validationMiddleware = createAsyncValidationMiddleware();
        const scheduler = new AsyncScheduler<TestMessage>(
          () => echoActorFactory,
          validationMiddleware,
        );

        // Send test messages - some should be blocked
        scheduler.dispatch({ type: 'TEST', payload: 'allowed-message' });
        scheduler.dispatch({ type: 'TEST', payload: 'blocked-message' });
        scheduler.dispatch({ type: 'TEST', payload: 'another-allowed' });

        // Only allowed messages should produce responses
        const result1 = await scheduler.next();
        expect(result1.done).toBe(false);
        expect(result1.value).toEqual({ type: 'ECHO', payload: 'allowed-message' });

        const result2 = await scheduler.next();
        expect(result2.done).toBe(false);
        expect(result2.value).toEqual({ type: 'ECHO', payload: 'another-allowed' });

        // Verify which messages were blocked vs allowed
        expect(blockedMessages).toEqual(['blocked-message']);
        expect(allowedMessages).toEqual(['allowed-message', 'another-allowed']);
      });

      test('should allow synthesizing new messages asynchronously', async () => {
        const synthesizedMessages: Array<string> = [];

        // Create async middleware that synthesizes additional messages based on async conditions
        function createAsyncSynthesizingMiddleware(): SchedulerMiddlewareFactory<TestMessage> {
          return {
            type: 'AsyncSynthesizingMiddleware',
            async: true,
            factory: (
              next: ActorHandle<SchedulerCommandMessage<TestMessage>>,
            ): AsyncTask<
              SchedulerCommandMessage<TestMessage>,
              SchedulerCommandMessage<TestMessage>
            > => {
              return async (inbox, outbox) => {
                for await (const message of inbox) {
                  if (
                    SchedulerCommand.Send.is(message.payload) &&
                    (message.payload.message as TestMessage).type === 'TEST' &&
                    (message.payload.message as TestMessage).payload === 'expand'
                  ) {
                    // Simulate async work to determine what to synthesize
                    await new Promise((resolve) => setTimeout(resolve, 5));

                    // Send the original message
                    outbox([HandlerAction.Send({ target: next, message })]);

                    // Synthesize two additional messages based on async processing
                    const synth1 = SchedulerCommand.Send({
                      ...message.payload,
                      message: { type: 'TEST', payload: 'synth-1' } as TestMessage,
                    });
                    const synth2 = SchedulerCommand.Send({
                      ...message.payload,
                      message: { type: 'TEST', payload: 'synth-2' } as TestMessage,
                    });

                    synthesizedMessages.push('synth-1', 'synth-2');

                    // Send synthesized messages
                    outbox([
                      HandlerAction.Send({
                        target: next,
                        message: createSchedulerCommandMessage(synth1),
                      }),
                    ]);
                    outbox([
                      HandlerAction.Send({
                        target: next,
                        message: createSchedulerCommandMessage(synth2),
                      }),
                    ]);
                    continue;
                  }
                  // Pass through other messages unchanged
                  outbox([HandlerAction.Send({ target: next, message })]);
                }
              };
            },
          };
        }

        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Create scheduler with async synthesizing middleware
        const synthMiddleware = createAsyncSynthesizingMiddleware();
        const scheduler = new AsyncScheduler<TestMessage>(() => echoActorFactory, synthMiddleware);

        // Send a message that should trigger synthesis
        scheduler.dispatch({ type: 'TEST', payload: 'expand' });

        // Should get echo for original + 2 synthesized messages
        const result1 = await scheduler.next();
        expect(result1.done).toBe(false);
        expect(result1.value).toEqual({ type: 'ECHO', payload: 'expand' });

        const result2 = await scheduler.next();
        expect(result2.done).toBe(false);
        expect(result2.value).toEqual({ type: 'ECHO', payload: 'synth-1' });

        const result3 = await scheduler.next();
        expect(result3.done).toBe(false);
        expect(result3.value).toEqual({ type: 'ECHO', payload: 'synth-2' });

        // Verify the synthesized messages were created
        expect(synthesizedMessages).toEqual(['synth-1', 'synth-2']);
      });

      test('should allow interleaving sync and async middleware', async () => {
        const processingOrder: Array<string> = [];

        // Create sync middleware
        function createSyncLogMiddleware(name: string): SchedulerMiddlewareFactory<TestMessage> {
          return {
            type: `${name}SyncMiddleware`,
            async: false,
            factory: (next: ActorHandle<SchedulerCommandMessage<TestMessage>>) => ({
              handle(message: SchedulerCommandMessage<TestMessage>) {
                const isLoggedMessage =
                  SchedulerCommand.Send.is(message.payload) &&
                  message.payload.message.type === 'TEST';
                if (isLoggedMessage) processingOrder.push(`${name}_sync`);
                return [HandlerAction.Send({ target: next, message })];
              },
            }),
          };
        }

        // Create async middleware
        function createAsyncLogMiddleware(name: string): SchedulerMiddlewareFactory<TestMessage> {
          return {
            type: `${name}AsyncMiddleware`,
            async: true,
            factory: (
              next: ActorHandle<SchedulerCommandMessage<TestMessage>>,
            ): AsyncTask<
              SchedulerCommandMessage<TestMessage>,
              SchedulerCommandMessage<TestMessage>
            > => {
              return async (inbox, outbox) => {
                for await (const message of inbox) {
                  const isLoggedMessage =
                    SchedulerCommand.Send.is(message.payload) &&
                    message.payload.message.type === 'TEST';
                  if (isLoggedMessage) processingOrder.push(`${name}_async_start`);
                  await new Promise((resolve) => setTimeout(resolve, 5)); // Simulate async work
                  outbox([HandlerAction.Send({ target: next, message })]);
                  if (isLoggedMessage) processingOrder.push(`${name}_async_end`);
                }
              };
            },
          };
        }

        const echoActorFactory: ActorFactory<ActorHandle<TestMessage>, TestMessage, TestMessage> = {
          type: 'EchoActor',
          async: false,
          factory: (output) => new EchoActor(output),
        };

        // Chain sync and async middleware together
        const chainedMiddleware = composeMiddleware<TestMessage>(
          createSyncLogMiddleware('FIRST'),
          createAsyncLogMiddleware('SECOND'),
          createSyncLogMiddleware('THIRD'),
        );

        // Create scheduler with chained middleware
        const scheduler = new AsyncScheduler<TestMessage>(
          () => echoActorFactory,
          chainedMiddleware,
        );

        // Send a test message
        scheduler.dispatch({ type: 'TEST', payload: 'mixed-chain' });

        // Get the response
        const result = await scheduler.next();
        expect(result.done).toBe(false);
        expect(result.value).toEqual({ type: 'ECHO', payload: 'mixed-chain' });

        // Verify processing order shows both sync and async processing
        expect(processingOrder).toEqual([
          'FIRST_sync',
          'SECOND_async_start',
          'SECOND_async_end',
          'THIRD_sync',
        ]);
      });
    });
  });
});
