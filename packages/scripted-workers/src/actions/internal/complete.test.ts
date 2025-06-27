import { describe, expect, it } from 'vitest';

import type { ActorHandle } from '@reactive-kit/actor';
import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../../act';
import { readState } from '../../state/readState';
import { compile } from '../../vm/compile';
import { OP_TYPE_TASK_COMPLETE, type TaskCompleteOp } from '../../vm/operations/taskComplete';
import { modifyState } from '../modifyState';
import { send } from '../send';
import { sequence } from '../sequence';
import { whenState } from '../whenState';
import { whileLoop } from '../whileLoop';
import { withState } from '../withState';

import { complete } from './complete';

describe(complete, () => {
  describe(compile, () => {
    it('should compile to a TASK_COMPLETE instruction', () => {
      const self = {} as ActorHandle<never>;
      const command = complete(self);

      const instructions = compile(command);
      expect(instructions).toEqual([{ type: OP_TYPE_TASK_COMPLETE } satisfies TaskCompleteOp]);
    });
  });

  describe('evaluate', () => {
    it('should terminate the actor normally when complete is called', async () => {
      const actorDef = act<never>(
        (_self, { complete: taskCompleteHelper }) => taskCompleteHelper(), // This uses the helper from act, which should internally call our complete(self) action
      );
      const scheduler = new AsyncScheduler<never>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.done).toBe(true);
      expect(result.value).toBeUndefined(); // Standard completion value
    });

    it('should terminate immediately when called within a sequence', async () => {
      type TestMsg = string;
      const actorDef = act<TestMsg>((_self, { outbox, complete: taskCompleteHelper }) =>
        sequence(() => [
          send(outbox, 'BEFORE_COMPLETE'),
          taskCompleteHelper(),
          send(outbox, 'AFTER_COMPLETE'), // Should not execute
        ]),
      );
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef);
      const r1 = await scheduler.next();
      expect(r1.value).toBe('BEFORE_COMPLETE');
      expect(r1.done).toBe(false);
      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
      expect(r2.value).toBeUndefined();
    });

    it('should terminate immediately when called within a nested sequence', async () => {
      type TestMsg = string;
      const actorDef = act<TestMsg>((_self, { outbox, complete: taskCompleteHelper }) =>
        sequence(() => [
          send(outbox, 'OUTER_BEFORE'),
          sequence(() => [
            send(outbox, 'INNER_BEFORE'),
            taskCompleteHelper(), // Complete here
            send(outbox, 'INNER_AFTER'), // Should not run
          ]),
          send(outbox, 'OUTER_AFTER'), // Should not run
        ]),
      );
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('OUTER_BEFORE');
      expect(r1.done).toBe(false);

      const r2 = await scheduler.next();
      expect(r2.value).toBe('INNER_BEFORE');
      expect(r2.done).toBe(false);

      // After processing INNER_BEFORE, the complete() should execute and terminate the task
      const r3 = await scheduler.next();
      expect(r3.done).toBe(true);
      expect(r3.value).toBeUndefined();
    });

    it('should terminate immediately when called within a whileLoop', async () => {
      type TestMsg = string;
      type LoopState = { count: number };
      const actorDef = act<TestMsg>((_self, { outbox, complete: taskCompleteHelper }) =>
        withState<TestMsg, LoopState>(
          () => ({ count: 0 }),
          (handle) =>
            whileLoop((_loop) =>
              sequence(() => [
                send(outbox, 'LOOP_TICK'),
                // Immediately complete on first iteration
                taskCompleteHelper(),
                // These should not run
                modifyState(handle, (s) => ({ count: s.count + 1 })),
                send(outbox, 'AFTER_TICK_IN_LOOP'),
              ]),
            ),
        ),
      );
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef);
      const r1 = await scheduler.next();
      expect(r1.value).toBe('LOOP_TICK');
      expect(r1.done).toBe(false);
      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
      expect(r2.value).toBeUndefined();
    });

    it('should complete conditionally when state is true', async () => {
      type TestMsg = string;
      type CondState = { doComplete: boolean };
      const actorDef = act<TestMsg>((_self, { outbox, complete: taskCompleteHelper }) =>
        withState<TestMsg, CondState>(
          () => ({ doComplete: true }),
          (handle) =>
            whenState(
              readState(handle, (s) => s.doComplete),
              taskCompleteHelper(), // True branch: complete
              send(outbox, 'NOT_COMPLETED'), // False branch
            ),
        ),
      );
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef);
      // Should complete immediately, no message sent
      const result = await scheduler.next();
      expect(result.done).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('should continue when conditional complete state is false', async () => {
      type TestMsg = string;
      type CondState = { doComplete: boolean };
      const actorDef = act<TestMsg>((_self, { outbox, complete: taskCompleteHelper }) =>
        withState<TestMsg, CondState>(
          () => ({ doComplete: false }),
          (handle) =>
            sequence(() => [
              whenState(
                readState(handle, (s) => s.doComplete),
                taskCompleteHelper(), // True branch
                send(outbox, 'NOT_COMPLETED'), // False branch: should execute
              ),
              send(outbox, 'AFTER_CONDITIONAL'), // Should execute after whenState
            ]),
        ),
      );
      const scheduler = new AsyncScheduler<TestMsg>((_ctx) => actorDef);

      // Should send NOT_COMPLETED from the false branch
      const r1 = await scheduler.next();
      expect(r1.value).toBe('NOT_COMPLETED');
      expect(r1.done).toBe(false);

      // Should send AFTER_CONDITIONAL
      const r2 = await scheduler.next();
      expect(r2.value).toBe('AFTER_CONDITIONAL');
      expect(r2.done).toBe(false);

      // Should complete naturally after the sequence finishes
      const r3 = await scheduler.next();
      expect(r3.done).toBe(true);
      expect(r3.value).toBeUndefined();
    });
  });
});
