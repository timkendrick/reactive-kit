import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HandlerAction, type ActorHandle } from '@reactive-kit/actor';
import {
  AsyncScheduler,
  SchedulerCommand,
  type SchedulerCommandMessage,
  type SchedulerMiddlewareFactory,
} from '@reactive-kit/scheduler';

import { act } from '../../act';
import { readState } from '../../state/readState';
import { compile } from '../../vm/compile';
import { OP_TYPE_TASK_FAIL, type TaskFailOp } from '../../vm/operations/taskFail';
import { delay } from '../delay';
import { modifyState } from '../modifyState';
import { send } from '../send';
import { sequence } from '../sequence';
import { whenState } from '../whenState';
import { whileLoop } from '../whileLoop';
import { withState } from '../withState';

import { fail } from './fail';

// Test helper to create logging middleware that captures commands
function createLoggingMiddleware<T>(): {
  middleware: SchedulerMiddlewareFactory<T>;
  capturedCommands: Array<SchedulerCommand<T>>;
} {
  const capturedCommands: Array<SchedulerCommand<T>> = [];
  const middleware: SchedulerMiddlewareFactory<T> = {
    type: 'LoggingMiddleware',
    async: false,
    factory: (next: ActorHandle<SchedulerCommandMessage<T>>) => ({
      handle(message: SchedulerCommandMessage<T>) {
        capturedCommands.push(message.payload);
        return [HandlerAction.Send({ target: next, message })];
      },
    }),
  };
  return { middleware, capturedCommands };
}

describe(fail, () => {
  describe(compile, () => {
    it('should compile the fail action to a TASK_FAIL instruction', () => {
      const self = {} as ActorHandle<never>;
      const command = fail(self, new Error('uh-oh'));

      const instructions = compile(command);
      expect(instructions).toEqual([
        { type: OP_TYPE_TASK_FAIL, error: new Error('uh-oh') } satisfies TaskFailOp,
      ]);
    });
  });

  describe('evaluate', () => {
    it('should terminate the actor immediately when fail is called', async () => {
      const actorDef = act<never>(
        (_self, { fail: taskFailHelper }) => taskFailHelper(new Error('uh-oh')), // This uses the helper from act, which should internally call our fail(self) action
      );
      const { middleware, capturedCommands } = createLoggingMiddleware<never>();
      const scheduler = new AsyncScheduler<never>((_ctx) => actorDef, middleware);
      const result = await scheduler.next();
      expect(result.done).toBe(true);
      expect(result.value).toBeUndefined(); // Standard completion value
      expect(capturedCommands).toContainEqual(
        SchedulerCommand.Fail({
          source: scheduler.inputHandle,
          target: scheduler.inputHandle,
          error: new Error('uh-oh'),
        }),
      );
    });

    it('should terminate immediately when called within a sequence', async () => {
      type TestMsg = string;
      const actorDef = act<TestMsg>((_self, { outbox, fail: taskFailHelper }) =>
        sequence(() => [
          send(outbox, 'BEFORE_FAIL'),
          taskFailHelper(new Error('uh-oh')),
          send(outbox, 'AFTER_FAIL'), // Should not execute
        ]),
      );
      const { middleware, capturedCommands } = createLoggingMiddleware<TestMsg>();
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef, middleware);
      const r1 = await scheduler.next();
      expect(r1.value).toBe('BEFORE_FAIL');
      expect(r1.done).toBe(false);
      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
      expect(r2.value).toBeUndefined();
      expect(capturedCommands).toContainEqual(
        SchedulerCommand.Fail({
          source: scheduler.inputHandle,
          target: scheduler.inputHandle,
          error: new Error('uh-oh'),
        }),
      );
    });

    it('should terminate immediately when called within a nested sequence', async () => {
      type TestMsg = string;
      const actorDef = act<TestMsg>((_self, { outbox, fail: taskFailHelper }) =>
        sequence(() => [
          send(outbox, 'OUTER_BEFORE'),
          sequence(() => [
            send(outbox, 'INNER_BEFORE'),
            taskFailHelper(new Error('uh-oh')), // Complete here
            send(outbox, 'INNER_AFTER'), // Should not run
          ]),
          send(outbox, 'OUTER_AFTER'), // Should not run
        ]),
      );
      const { middleware, capturedCommands } = createLoggingMiddleware<TestMsg>();
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef, middleware);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('OUTER_BEFORE');
      expect(r1.done).toBe(false);

      const r2 = await scheduler.next();
      expect(r2.value).toBe('INNER_BEFORE');
      expect(r2.done).toBe(false);

      // After processing INNER_BEFORE, the fail() should execute and terminate the task
      const r3 = await scheduler.next();
      expect(r3.done).toBe(true);
      expect(r3.value).toBeUndefined();
      expect(capturedCommands).toContainEqual(
        SchedulerCommand.Fail({
          source: scheduler.inputHandle,
          target: scheduler.inputHandle,
          error: new Error('uh-oh'),
        }),
      );
    });

    it('should terminate immediately when called within a whileLoop', async () => {
      type TestMsg = string;
      type LoopState = { count: number };
      const actorDef = act<TestMsg>((_self, { outbox, fail: taskFailHelper }) =>
        withState<TestMsg, LoopState>(
          () => ({ count: 0 }),
          (handle) =>
            whileLoop((_loop) =>
              sequence(() => [
                send(outbox, 'LOOP_TICK'),
                // Immediately fail on first iteration
                taskFailHelper(new Error('uh-oh')),
                // These should not run
                modifyState(handle, (s) => ({ count: s.count + 1 })),
                send(outbox, 'AFTER_TICK_IN_LOOP'),
              ]),
            ),
        ),
      );
      const { middleware, capturedCommands } = createLoggingMiddleware<TestMsg>();
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef, middleware);
      const r1 = await scheduler.next();
      expect(r1.value).toBe('LOOP_TICK');
      expect(r1.done).toBe(false);
      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
      expect(r2.value).toBeUndefined();
      expect(capturedCommands).toContainEqual(
        SchedulerCommand.Fail({
          source: scheduler.inputHandle,
          target: scheduler.inputHandle,
          error: new Error('uh-oh'),
        }),
      );
    });

    it('should fail conditionally when state is true', async () => {
      type TestMsg = string;
      type CondState = { doComplete: boolean };
      const actorDef = act<TestMsg>((_self, { outbox, fail: taskFailHelper }) =>
        withState<TestMsg, CondState>(
          () => ({ doComplete: true }),
          (handle) =>
            whenState(
              readState(handle, (s) => s.doComplete),
              taskFailHelper(new Error('uh-oh')), // True branch: fail
              send(outbox, 'NOT_FAILED'), // False branch
            ),
        ),
      );
      const { middleware, capturedCommands } = createLoggingMiddleware<TestMsg>();
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef, middleware);
      // Should fail immediately, no message sent
      const result = await scheduler.next();
      expect(result.done).toBe(true);
      expect(result.value).toBeUndefined();
      expect(capturedCommands).toContainEqual(
        SchedulerCommand.Fail({
          source: scheduler.inputHandle,
          target: scheduler.inputHandle,
          error: new Error('uh-oh'),
        }),
      );
    });

    it('should continue when conditional fail state is false', async () => {
      type TestMsg = string;
      type CondState = { doComplete: boolean };
      const actorDef = act<TestMsg>((_self, { outbox, fail: taskFailHelper }) =>
        withState<TestMsg, CondState>(
          () => ({ doComplete: false }),
          (handle) =>
            sequence(() => [
              whenState(
                readState(handle, (s) => s.doComplete),
                taskFailHelper(new Error('uh-oh')), // True branch
                send(outbox, 'NOT_FAILED'), // False branch: should execute
              ),
              send(outbox, 'AFTER_CONDITIONAL'), // Should execute after whenState
            ]),
        ),
      );
      const { middleware, capturedCommands } = createLoggingMiddleware<TestMsg>();
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef, middleware);

      // Should send NOT_FAILED from the false branch
      const r1 = await scheduler.next();
      expect(r1.value).toBe('NOT_FAILED');
      expect(r1.done).toBe(false);

      // Should send AFTER_CONDITIONAL
      const r2 = await scheduler.next();
      expect(r2.value).toBe('AFTER_CONDITIONAL');
      expect(r2.done).toBe(false);

      // Should fail naturally after the sequence finishes
      const r3 = await scheduler.next();
      expect(r3.done).toBe(true);
      expect(r3.value).toBeUndefined();
      expect(capturedCommands).not.toContainEqual(
        SchedulerCommand.Fail({
          source: expect.any(Object),
          target: expect.any(Object),
          error: new Error('uh-oh'),
        }),
      );
    });

    describe('asynchronous usage', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should terminate at the correct point when called after a delay', async () => {
        type TestMsg = string;
        const duration = 100;
        const actorDef = act<TestMsg>((_self, { outbox, fail: taskFailHelper }) =>
          sequence(() => [
            send(outbox, 'BEFORE_FAIL'),
            delay(duration),
            taskFailHelper(new Error('uh-oh')),
            send(outbox, 'AFTER_FAIL'), // Should not execute
          ]),
        );
        const { middleware, capturedCommands } = createLoggingMiddleware<TestMsg>();
        const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef, middleware);
        const r1 = await scheduler.next();
        expect(r1.value).toBe('BEFORE_FAIL');
        expect(r1.done).toBe(false);

        let resolved = false;
        const promise = scheduler.next().then((result) => {
          resolved = true;
          return result;
        });

        // Immediately check - promise should not be resolved
        expect(resolved).toBe(false);

        // Advance time by less than the duration
        await vi.advanceTimersByTimeAsync(duration - 1);
        expect(resolved).toBe(false);

        // Advance time past the duration
        await vi.advanceTimersByTimeAsync(1);
        expect(resolved).toBe(true);

        // Now the promise should resolve
        const r2 = await promise;
        expect(r2.done).toBe(true);
        expect(r2.value).toBeUndefined();

        expect(capturedCommands).toContainEqual(
          SchedulerCommand.Fail({
            source: scheduler.inputHandle,
            target: scheduler.inputHandle,
            error: new Error('uh-oh'),
          }),
        );
      });
    });
  });
});
