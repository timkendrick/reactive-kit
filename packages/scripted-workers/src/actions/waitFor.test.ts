import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { readState } from '../state/readState';
import {
  createComputeStateValueResolver,
  createReadStateValueResolver,
  createSpawnedActorValueResolver,
  createStateRef,
} from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_ACTOR_SEND, type ActorSendOp } from '../vm/operations/actorSend';
import { OP_TYPE_BLOCK_BREAK, type BlockBreakOp } from '../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_BREAK_IF, type BlockBreakIfOp } from '../vm/operations/blockBreakIf';
import { OP_TYPE_BLOCK_ENTER, type BlockEnterOp } from '../vm/operations/blockEnter';
import {
  OP_TYPE_BLOCK_ENTER_AWAIT,
  type BlockEnterAwaitOp,
} from '../vm/operations/blockEnterAwait';
import { OP_TYPE_LOOP_CONTINUE, type LoopContinueOp } from '../vm/operations/loopContinue';
import { OP_TYPE_LOOP_ENTER, type LoopEnterOp } from '../vm/operations/loopEnter';
import { OP_TYPE_LOOP_EXIT, type LoopExitOp } from '../vm/operations/loopExit';

import { send } from './send';
import { sequence } from './sequence';
import { waitFor } from './waitFor';
import { withState } from './withState';

describe(waitFor, () => {
  describe(compile, () => {
    it('should compile waitFor with a predicate (and implicit noop commandIfTrue)', () => {
      const predicate = (msg: string): msg is string => msg === 'TEST';
      const program = waitFor(predicate);

      // Create mock handles for any state references
      // (the index can be known in advance due to the deterministic order of compiled instructions)
      const messageHandle = createStateRef<string>(0);

      // Ideally we would be able to match the compiler-generated `(message, predicateFn) => predicateFn(message)`
      // In reality we can't do this because the function is created internally by the compiler.
      // For simplicity, we will trust that the compiler generates the correct function.
      const computedPredicateCombiner = expect.any(Function) as (
        message: string,
        predicateFn: typeof predicate,
      ) => boolean;

      const instructions = compile(program);
      expect(instructions).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 7 } satisfies LoopEnterOp, // Loop starts
        { type: OP_TYPE_BLOCK_ENTER_AWAIT, length: 5 } satisfies BlockEnterAwaitOp, // Await message
        { type: OP_TYPE_BLOCK_ENTER, length: 2 } satisfies BlockEnterOp, // Inner conditional block
        {
          // If predicate is true, break this inner block to proceed to true instructions + LOOP_EXIT
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, predicate],
            computedPredicateCombiner,
          ),
          blockIndex: 0,
        } satisfies BlockBreakIfOp,
        // Predicate is false path:
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 } satisfies BlockBreakOp, // Exit await scope
        // Predicate is true path (after BLOCK_BREAK_IF): empty
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 0 } satisfies LoopExitOp, // Exit outer loop
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp, // Break BLOCK_ENTER_AWAIT scope
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp, // Continue outer loop (inserted by the compiler)
      ]);
    });

    it('should compile waitFor with predicate and commandIfTrue', () => {
      const outboxHandle = createSpawnedActorValueResolver<never>(0);
      type TestMessage = { payload: number };
      const predicate = (msg: TestMessage): msg is TestMessage => typeof msg.payload === 'number';

      const extractWholeMessage = (m: TestMessage) => m;

      const program = waitFor(predicate, (msgHandle) =>
        send(outboxHandle, readState(msgHandle, extractWholeMessage)),
      );

      // Create mock handles for any state references
      // (the index can be known in advance due to the deterministic order of compiled instructions)
      const messageHandle = createStateRef<TestMessage>(0);

      // Ideally we would be able to match the compiler-generated `(message, predicateFn) => predicateFn(message)`
      // In reality we can't do this because the function is created internally by the compiler.
      // For simplicity, we will trust that the compiler generates the correct function.
      const computedPredicateCombiner = expect.any(Function) as (
        message: TestMessage,
        predicateFn: typeof predicate,
      ) => boolean;

      const instructions = compile(program);
      expect(instructions).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 8 } satisfies LoopEnterOp, // Loop starts
        { type: OP_TYPE_BLOCK_ENTER_AWAIT, length: 6 } satisfies BlockEnterAwaitOp, // Await message
        { type: OP_TYPE_BLOCK_ENTER, length: 2 } satisfies BlockEnterOp, // Inner conditional block (for predicate false path)
        {
          // If predicate is true, break this inner block to proceed to commandIfTrue + LOOP_EXIT
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, predicate],
            computedPredicateCombiner,
          ),
          blockIndex: 0, // Targets the inner conditional block at instruction 2
        } satisfies BlockBreakIfOp,
        // Predicate is false path:
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 } satisfies BlockBreakOp, // Exit await scope
        // Predicate is true path (after BLOCK_BREAK_IF from instruction 3):
        {
          // commandIfTrue
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: createReadStateValueResolver(messageHandle, extractWholeMessage),
        } satisfies ActorSendOp<TestMessage>,
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 0 } satisfies LoopExitOp, // Exit outer loop (instruction 0)
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp, // Compiler-inserted: Break BLOCK_ENTER_AWAIT scope (instruction 1)
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp, // Compiler-inserted: Continue outer loop (instruction 0)
      ]);
    });
  });

  describe('evaluate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should pause execution until a matching message arrives', async () => {
      type TestMessage = string;
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [
          send(outbox, 'WAITING'),
          waitFor((msg: TestMessage): msg is TestMessage => msg === 'GO'),
          send(outbox, 'PROCEEDING'),
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('WAITING');

      scheduler.dispatch('IGNORE_ME');
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);

      let proceedMessageReceived = false;
      const nextPromise = scheduler.next().then((r) => {
        proceedMessageReceived = true;
        return r;
      });
      expect(proceedMessageReceived).toBe(false);

      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);

      scheduler.dispatch('GO');

      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(proceedMessageReceived).toBe(true);

      const r2 = await nextPromise;
      expect(r2.value).toBe('PROCEEDING');

      const r3 = await scheduler.next();
      expect(r3.done).toBe(true);
    });

    it('should execute commandIfTrue with the matched message', async () => {
      type TestMessage = { type: string; payload: number };

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        waitFor<TestMessage, TestMessage>(
          (msg): msg is TestMessage => typeof msg === 'object' && msg.type === 'DATA',
          (msg) => send(outbox, msg),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      scheduler.dispatch({ type: 'IGNORE_ME', payload: 0 });
      scheduler.dispatch({ type: 'OTHER', payload: 0 });
      scheduler.dispatch({ type: 'DATA', payload: 123 });

      const r1 = await scheduler.next();
      expect(r1.value).toEqual({ type: 'DATA', payload: 123 });

      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
    });

    it('should correctly use a state value resolver for the predicate', async () => {
      type TestMessage = string;
      type State = { triggerWord: string };

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, State>(
          () => ({ triggerWord: 'SECRET' }),
          (stateHandle) =>
            sequence(() => [
              waitFor<TestMessage, TestMessage>(
                readState(
                  stateHandle,
                  (s) =>
                    (msg: TestMessage): msg is TestMessage =>
                      msg === s.triggerWord,
                ),
              ),
              send(outbox, 'TRIGGERED'),
            ]),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      scheduler.dispatch('NOPE');
      scheduler.dispatch('SECRET');

      const r1 = await scheduler.next();
      expect(r1.value).toBe('TRIGGERED');

      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
    });
  });
});
