import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { computeState } from '../state/computeState';
import { readState } from '../state/readState';
import {
  createComputeStateValueResolver,
  createReadStateValueResolver,
  createSpawnedActorValueResolver,
  createStateRef,
} from '../types';
import { OP_TYPE_BLOCK_ENTER_STATE, type BlockEnterStateOp } from '../vm';
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

import { modifyState } from './modifyState';
import { noop } from './noop';
import { send } from './send';
import { sequence } from './sequence';
import { when } from './when';
import { whenState } from './whenState';
import { whileLoop } from './whileLoop';
import { withState } from './withState';

describe(whileLoop, () => {
  describe('compile', () => {
    it('should compile basic loop structure with body', () => {
      type TestState = { count: number };
      type TestMessage = string;

      const outboxHandle = createSpawnedActorValueResolver<TestMessage>(0);
      const initialStateFactory = () => ({ count: 0 });
      const stateRef0 = createStateRef<TestState>(0);
      const conditionSelector = (s: TestState) => s.count > 0;
      const breakPredicate = createReadStateValueResolver(stateRef0, conditionSelector);

      const command = withState<TestMessage, TestState>(initialStateFactory, (h) =>
        whileLoop((controls) =>
          sequence(() => [
            whenState(readState(h, conditionSelector), controls.break()),
            send(outboxHandle, 'LOOP'),
          ]),
        ),
      );
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_STATE,
          initialState: initialStateFactory,
          length: 12,
        } satisfies BlockEnterStateOp<TestState>,
        { type: OP_TYPE_LOOP_ENTER, length: 10 } satisfies LoopEnterOp,
        { type: OP_TYPE_BLOCK_ENTER, length: 8 } satisfies BlockEnterOp, // For sequence
        { type: OP_TYPE_BLOCK_ENTER, length: 5 } satisfies BlockEnterOp, // B_CONDITIONAL for whenState
        { type: OP_TYPE_BLOCK_ENTER, length: 2 } satisfies BlockEnterOp, // B_ELSE for whenState's empty else
        {
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: breakPredicate,
          blockIndex: 0,
        } satisfies BlockBreakIfOp, // P_original, targets B_ELSE
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 } satisfies BlockBreakOp, // Body of B_ELSE, targets B_CONDITIONAL
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 0 } satisfies LoopExitOp, // 'Then' path of whenState
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp, // End of B_CONDITIONAL
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: 'LOOP',
        } satisfies ActorSendOp<TestMessage>,
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp, // End of sequence
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp,
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp, // End of withState block
      ]);
    });

    it('should compile controls.break() correctly', () => {
      type TestMessage = string;

      const command = whileLoop<TestMessage>((controls) => controls.break());
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_LOOP_ENTER,
          length: 2,
        } satisfies LoopEnterOp,
        {
          type: OP_TYPE_LOOP_EXIT,
          loopIndex: 0,
        } satisfies LoopExitOp,
        {
          type: OP_TYPE_LOOP_CONTINUE,
          loopIndex: 0,
        } satisfies LoopContinueOp,
      ]);
    });

    it('should compile controls.continue() correctly', () => {
      type TestMessage = string;

      const command = whileLoop<TestMessage>((controls) => controls.continue());
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_LOOP_ENTER,
          length: 2,
        } satisfies LoopEnterOp,
        {
          type: OP_TYPE_LOOP_CONTINUE,
          loopIndex: 0,
        } satisfies LoopContinueOp,
        {
          type: OP_TYPE_LOOP_CONTINUE,
          loopIndex: 0,
        } satisfies LoopContinueOp,
      ]);
    });

    it('should compile nested loops with distinct control flow', () => {
      type TestMessage = string;
      type PredicateFnType = (msg: TestMessage) => msg is TestMessage;

      // Ideally we would be able to match the compiler-generated `(message, predicateFn) => predicateFn(message)`
      // In reality we can't do this because the function is created internally by the compiler.
      // For simplicity, we will trust that the compiler generates the correct function.
      const computedPredicateCombiner = expect.any(Function) as (
        message: TestMessage,
        predicateFn: PredicateFnType,
      ) => boolean;

      const predicateBreakInner = (msg: TestMessage): msg is TestMessage => msg === 'BREAK_INNER';
      const predicateBreakOuter = (msg: TestMessage): msg is TestMessage => msg === 'BREAK_OUTER';

      const messageHandle = createStateRef<TestMessage>(0);

      const command = whileLoop<TestMessage>((outerControls) =>
        whileLoop((innerControls) =>
          sequence(() => [
            when(predicateBreakInner, () => innerControls.break()),
            when(predicateBreakOuter, () => outerControls.break()),
          ]),
        ),
      );
      const instructions = compile(command);

      expect(instructions).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 17 } satisfies LoopEnterOp,
        { type: OP_TYPE_LOOP_ENTER, length: 15 } satisfies LoopEnterOp,
        { type: OP_TYPE_BLOCK_ENTER, length: 13 } satisfies BlockEnterOp,

        { type: OP_TYPE_BLOCK_ENTER_AWAIT, length: 5 } satisfies BlockEnterAwaitOp,
        { type: OP_TYPE_BLOCK_ENTER, length: 2 } satisfies BlockEnterOp,
        {
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, predicateBreakInner],
            computedPredicateCombiner,
          ),
          blockIndex: 0,
        } satisfies BlockBreakIfOp,
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 } satisfies BlockBreakOp,
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 0 } satisfies LoopExitOp,
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp,

        { type: OP_TYPE_BLOCK_ENTER_AWAIT, length: 5 } satisfies BlockEnterAwaitOp,
        { type: OP_TYPE_BLOCK_ENTER, length: 2 } satisfies BlockEnterOp,
        {
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, predicateBreakOuter],
            computedPredicateCombiner,
          ),
          blockIndex: 0,
        } satisfies BlockBreakIfOp,
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 } satisfies BlockBreakOp,
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 1 } satisfies LoopExitOp,
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp,

        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 } satisfies BlockBreakOp,
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp,
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp,
      ]);
    });

    it('should compile breaking an outer loop from an inner loop', () => {
      type TestMessage = string;

      const command = whileLoop<TestMessage>(
        (
          outerControls, // Outer loop. loopIndex from inner will be 1.
        ) =>
          whileLoop(
            (
              _innerControls, // Inner loop. loopIndex from inner will be 0.
            ) => outerControls.break(), // Compiles to LOOP_EXIT { loopIndex: 1 }
          ),
      );
      const instructions = compile(command);
      // Expected structure:
      // LOOP_ENTER (outer, length = 1 for its LOOP_ENTER_INNER + 2 for L_inner_body_len + 1 for its own LOOP_CONTINUE = 4)
      //   LOOP_ENTER (inner, length = 1 for LOOP_EXIT_OUTER + 1 for its own LOOP_CONTINUE = 2)
      //     LOOP_EXIT { loopIndex: 1 } // Targets outer loop
      //   LOOP_CONTINUE { loopIndex: 0 } // Mandatory for inner loop (as it didn't break itself)
      // LOOP_CONTINUE { loopIndex: 0 } // Mandatory for outer loop (as it didn't break itself)
      expect(instructions).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 4 } satisfies LoopEnterOp,
        { type: OP_TYPE_LOOP_ENTER, length: 2 } satisfies LoopEnterOp,
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 1 } satisfies LoopExitOp,
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp,
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp,
      ]);
    });

    it('should compile continuing an outer loop from an inner loop', () => {
      type TestMessage = string;

      const command = whileLoop<TestMessage>(
        (
          outerControls, // Outer loop
        ) =>
          whileLoop(
            (
              _innerControls, // Inner loop
            ) => outerControls.continue(), // Compiles to LOOP_CONTINUE { loopIndex: 1 }
          ),
      );
      const instructions = compile(command);
      // Expected structure:
      // LOOP_ENTER (outer, length = 1 for L_E_I + 2 for L_i_b_l + 1 for own L_C = 4)
      //   LOOP_ENTER (inner, length = 1 for L_C_O + 1 for own L_C = 2)
      //     LOOP_CONTINUE { loopIndex: 1 } // Targets outer loop's start
      //   LOOP_CONTINUE { loopIndex: 0 } // Mandatory for inner loop
      // LOOP_CONTINUE { loopIndex: 0 } // Mandatory for outer loop
      expect(instructions).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 4 } satisfies LoopEnterOp,
        { type: OP_TYPE_LOOP_ENTER, length: 2 } satisfies LoopEnterOp,
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 1 } satisfies LoopContinueOp,
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp,
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 } satisfies LoopContinueOp,
      ]);
    });
  });

  describe('evaluate', () => {
    type TestMessage = string | { type: 'CANCEL' };

    it('should execute body multiple times until state condition met (break)', async () => {
      type State = { count: number };
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, State>(
          () => ({ count: 0 }),
          (h) =>
            sequence(() => [
              whileLoop((controls) =>
                sequence(() => [
                  // Use whenState to check condition *before* incrementing
                  whenState(
                    readState(h, (s) => s.count >= 3),
                    controls.break(),
                  ),
                  send(outbox, 'TICK'),
                  modifyState(h, (s) => ({ count: s.count + 1 })),
                ]),
              ),
              send(outbox, 'DONE'),
            ]),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect((await scheduler.next()).value).toBe('TICK'); // count 0 -> 1
      expect((await scheduler.next()).value).toBe('TICK'); // count 1 -> 2
      expect((await scheduler.next()).value).toBe('TICK'); // count 2 -> 3
      expect((await scheduler.next()).value).toBe('DONE'); // count is 3, loop breaks
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should break loop based on incoming message using when()', async () => {
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        whileLoop<TestMessage>((loop) =>
          sequence<TestMessage>(() => [
            send<TestMessage, TestMessage>(outbox, 'TICK'),
            // Await the next incoming message
            when<TestMessage, { type: 'CANCEL' }>(
              (msg): msg is { type: 'CANCEL' } => typeof msg === 'object' && msg.type === 'CANCEL',
              () => loop.break(),
              () => noop(), // Loop back around if the message is not CANCEL
            ),
          ]),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect((await scheduler.next()).value).toBe('TICK');
      scheduler.dispatch({ type: 'CANCEL' });
      expect((await scheduler.next()).done).toBe(true); // Loop breaks after CANCEL
    });

    it('should skip iteration body using continue based on state', async () => {
      type State = { count: number; skip: boolean };
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, State>(
          () => ({ count: 0, skip: false }),
          (h) =>
            sequence(() => [
              whileLoop((controls) =>
                sequence(() => [
                  whenState(
                    readState(h, (s) => s.count >= 2),
                    controls.break(),
                  ),
                  // If skip is true, reset it and continue
                  whenState(
                    readState(h, (s) => s.skip),
                    sequence(() => [
                      send(outbox, 'SKIP'),
                      modifyState(h, (s) => ({ ...s, skip: false })),
                      controls.continue(),
                    ]),
                  ),
                  // Otherwise, do work, increment count, and set skip for next time
                  sequence(() => [
                    send(outbox, 'WORK'),
                    modifyState(h, (s) => ({ ...s, count: s.count + 1, skip: true })),
                  ]),
                ]),
              ),
              send(outbox, 'LOOP_END'),
            ]),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect((await scheduler.next()).value).toBe('WORK'); // count=0, skip=false -> WORK, count=1, skip=true
      expect((await scheduler.next()).value).toBe('SKIP'); // count=1, skip=true -> SKIP, skip=false
      expect((await scheduler.next()).value).toBe('WORK'); // count=1, skip=false -> WORK, count=2, skip=true
      expect((await scheduler.next()).value).toBe('LOOP_END'); // count=2, loop breaks
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should implicitly continue if body completes without break/continue', async () => {
      type State = { count: number };
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, State>(
          () => ({ count: 0 }),
          (h) =>
            sequence(() => [
              whileLoop((controls) =>
                // Body completes normally, loop should continue until break condition
                sequence(() => [
                  whenState(
                    readState(h, (s) => s.count >= 2),
                    controls.break(),
                  ),
                  send(outbox, 'STEP'),
                  modifyState(h, (s) => ({ count: s.count + 1 })),
                ]),
              ),
              send(outbox, 'FINAL'),
            ]),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect((await scheduler.next()).value).toBe('STEP'); // count 0 -> 1
      expect((await scheduler.next()).value).toBe('STEP'); // count 1 -> 2
      expect((await scheduler.next()).value).toBe('FINAL'); // count is 2, loop breaks
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should execute nested loops correctly', async () => {
      type OuterState = { outerCount: number };
      type InnerState = { innerCount: number };
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, OuterState>(
          () => ({ outerCount: 0 }),
          (outerH) =>
            whileLoop((outerControls) =>
              sequence(() => [
                whenState(
                  readState(outerH, (s) => s.outerCount >= 2),
                  outerControls.break(),
                ),
                modifyState(outerH, (s) => ({ outerCount: s.outerCount + 1 })), // Increment outer before inner loop
                send(
                  outbox,
                  readState(outerH, (s) => `OUTER_${s.outerCount - 1}`),
                ),
                withState<TestMessage, InnerState>(
                  () => ({ innerCount: 0 }),
                  (innerH) =>
                    whileLoop((innerControls) =>
                      sequence(() => [
                        whenState(
                          readState(innerH, (s) => s.innerCount >= 1),
                          innerControls.break(),
                        ),
                        modifyState(innerH, (s) => ({ innerCount: s.innerCount + 1 })), // Increment inner
                        send(
                          outbox,
                          computeState(
                            [outerH, innerH],
                            (o, i) => `OUTER_${o.outerCount - 1}-INNER_${i.innerCount - 1}`,
                          ),
                        ),
                      ]),
                    ),
                ),
              ]),
            ),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect((await scheduler.next()).value).toBe('OUTER_0');
      expect((await scheduler.next()).value).toBe('OUTER_0-INNER_0');
      expect((await scheduler.next()).value).toBe('OUTER_1');
      expect((await scheduler.next()).value).toBe('OUTER_1-INNER_0');
      expect((await scheduler.next()).done).toBe(true); // Outer breaks as count reaches 2
    });

    it('should break inner loop but continue outer loop', async () => {
      type State = { count: number };
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, State>(
          () => ({ count: 0 }),
          (outerH) =>
            whileLoop((outerControls) =>
              sequence(() => [
                whenState(
                  readState(outerH, (s) => s.count >= 3),
                  outerControls.break(),
                ),
                send(
                  outbox,
                  readState(outerH, (s) => `OUTER_${s.count}`),
                ),
                modifyState(outerH, (s) => ({ count: s.count + 1 })), // Increment outer count
                withState<TestMessage, State>(
                  () => ({ count: 0 }),
                  (
                    innerH, // Inner loop always starts at 0
                  ) =>
                    whileLoop((innerControls) =>
                      sequence(() => [
                        // Inner loop breaks immediately after one iteration
                        whenState(
                          readState(innerH, (s) => s.count >= 1),
                          innerControls.break(),
                        ),
                        send(
                          outbox,
                          readState(innerH, (s) => `INNER_${s.count}`),
                        ),
                        modifyState(innerH, (s) => ({ count: s.count + 1 })),
                      ]),
                    ),
                ),
              ]),
            ),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect((await scheduler.next()).value).toBe('OUTER_0'); // Outer 0 starts
      expect((await scheduler.next()).value).toBe('INNER_0'); // Inner 0 runs, then breaks
      expect((await scheduler.next()).value).toBe('OUTER_1'); // Outer 1 starts
      expect((await scheduler.next()).value).toBe('INNER_0'); // Inner 0 runs, then breaks
      expect((await scheduler.next()).value).toBe('OUTER_2'); // Outer 2 starts
      expect((await scheduler.next()).value).toBe('INNER_0'); // Inner 0 runs, then breaks
      expect((await scheduler.next()).done).toBe(true); // Outer breaks as count reaches 3
    });

    it('should break outer loop from within inner loop', async () => {
      type State = { count: number };
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, State>(
          () => ({ count: 0 }),
          (outerH) =>
            whileLoop(
              (
                outerControls, // Outer loop condition is high (never met)
              ) =>
                sequence(() => [
                  send(
                    outbox,
                    readState(outerH, (s) => `OUTER_${s.count}`),
                  ),
                  withState<TestMessage, State>(
                    () => ({ count: 0 }),
                    (innerH) =>
                      whileLoop(
                        (
                          _innerControls, // Inner loop uses outer break
                        ) =>
                          sequence(() => [
                            send(
                              outbox,
                              readState(innerH, (s) => `INNER_${s.count}`),
                            ),
                            // Break outer loop when inner count reaches 1
                            whenState(
                              readState(innerH, (s) => s.count >= 1),
                              outerControls.break(),
                            ),
                            modifyState(innerH, (s) => ({ count: s.count + 1 })),
                          ]),
                      ),
                  ),
                  // This should not be reached if outer loop breaks
                  modifyState(outerH, (s) => ({ count: s.count + 1 })),
                ]),
            ),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect((await scheduler.next()).value).toBe('OUTER_0');
      expect((await scheduler.next()).value).toBe('INNER_0');
      expect((await scheduler.next()).value).toBe('INNER_1');
      // Inner count becomes 1, triggers outerControls.break()
      expect((await scheduler.next()).done).toBe(true);
    });
  });
});
