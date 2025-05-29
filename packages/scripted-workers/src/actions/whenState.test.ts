import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { computeState } from '../state/computeState';
import { readState } from '../state/readState';
import {
  createReadStateValueResolver,
  createSpawnedActorValueResolver,
  createStateRef,
} from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_ACTOR_SEND } from '../vm/operations/actorSend';
import { OP_TYPE_BLOCK_BREAK } from '../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_BREAK_IF } from '../vm/operations/blockBreakIf';
import { OP_TYPE_BLOCK_ENTER } from '../vm/operations/blockEnter';
import { OP_TYPE_BLOCK_ENTER_STATE } from '../vm/operations/blockEnterState';

import { send } from './send';
import { sequence } from './sequence';
import { whenState } from './whenState';
import { withState } from './withState';

describe(whenState, () => {
  describe(compile, () => {
    it('should compile whenState with true and false branches within withState', () => {
      type TestState = { condition: boolean };
      type TestMessage = string;

      const outboxHandle = createSpawnedActorValueResolver<string>(0);
      const extractCondition = (s: TestState) => s.condition;
      const initialStateFactory = (): TestState => ({ condition: true });
      const command = withState<TestMessage, TestState>(initialStateFactory, (stateHandle) => {
        return whenState(
          readState(stateHandle, extractCondition),
          send<TestMessage, string>(outboxHandle, 'TRUE'),
          send<TestMessage, string>(outboxHandle, 'FALSE'),
        );
      });
      const instructions = compile(command);

      const stateRef0 = createStateRef<TestState>(0);
      const predicateResolver = createReadStateValueResolver(stateRef0, extractCondition);

      expect(instructions).toEqual([
        // Enter withState block
        { type: OP_TYPE_BLOCK_ENTER_STATE, initialState: initialStateFactory, length: 8 },
        // B_CONDITIONAL (main block from compileConditionalBlock)
        { type: OP_TYPE_BLOCK_ENTER, length: 6 }, // Length covers B_ELSE, true path, and its own final break
        // B_ELSE (nested block from compileConditionalBlock for the false path)
        { type: OP_TYPE_BLOCK_ENTER, length: 3 }, // Length covers BREAK_IF, false command, and its BREAK
        { type: OP_TYPE_BLOCK_BREAK_IF, predicate: predicateResolver, blockIndex: 0 }, // Targets B_ELSE
        // False path contents
        { type: OP_TYPE_ACTOR_SEND, target: outboxHandle, message: 'FALSE' },
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 }, // Targets B_CONDITIONAL
        // True path contents
        { type: OP_TYPE_ACTOR_SEND, target: outboxHandle, message: 'TRUE' },
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Targets B_CONDITIONAL
        // Final break for the withState block
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 },
      ]);
    });

    it('should compile whenState with commandIfTrue only', () => {
      type TestState = { condition: boolean };
      type TestMessage = string;

      const outboxHandle = createSpawnedActorValueResolver<string>(0);
      const extractCondition = (s: TestState) => s.condition;
      const initialStateFactory = (): TestState => ({ condition: true });
      const command = withState<TestMessage, TestState>(initialStateFactory, (stateHandle) => {
        return whenState(
          readState(stateHandle, extractCondition),
          send<TestMessage, string>(outboxHandle, 'TRUE'),
        );
      });
      const instructions = compile(command);

      const stateRef0 = createStateRef<TestState>(0);
      const predicateResolver = createReadStateValueResolver(stateRef0, extractCondition);

      expect(instructions).toEqual([
        // Enter withState block
        { type: OP_TYPE_BLOCK_ENTER_STATE, initialState: initialStateFactory, length: 7 },
        // B_CONDITIONAL (main block from compileConditionalBlock)
        { type: OP_TYPE_BLOCK_ENTER, length: 5 }, // Length covers B_ELSE, true path, and its own final break
        // B_ELSE (nested block from compileConditionalBlock for the false path)
        { type: OP_TYPE_BLOCK_ENTER, length: 2 }, // Length for BREAK_IF + BREAK
        { type: OP_TYPE_BLOCK_BREAK_IF, predicate: predicateResolver, blockIndex: 0 }, // Targets B_ELSE
        // False path contents (empty for this test case)
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 }, // Targets B_CONDITIONAL
        // True path contents
        { type: OP_TYPE_ACTOR_SEND, target: outboxHandle, message: 'TRUE' },
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Targets B_CONDITIONAL
        // Final break for the withState block
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 },
      ]);
    });
  });

  describe('evaluate', () => {
    it('should execute commandIfTrue when predicate resolves true', async () => {
      type TestState = { condition: boolean };
      type TestMessage = string;

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, TestState>(
          () => ({ condition: true }),
          (stateHandle) => {
            const predicate = readState(stateHandle, (s) => s.condition);
            return whenState(predicate, send(outbox, 'TRUE'), send(outbox, 'FALSE'));
          },
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.value).toBe('TRUE');
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should execute commandIfFalse when predicate resolves false', async () => {
      type TestState = { condition: boolean };
      type TestMessage = string;

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, TestState>(
          () => ({ condition: false }),
          (stateHandle) => {
            const predicate = readState(stateHandle, (s) => s.condition);
            return whenState(predicate, send(outbox, 'TRUE'), send(outbox, 'FALSE'));
          },
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.value).toBe('FALSE');
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should execute default false branch (noop) if commandIfFalse omitted', async () => {
      type TestState = { condition: boolean };
      type TestMessage = string;

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, TestState>(
          () => ({ condition: false }),
          (stateHandle) =>
            sequence(() => [
              whenState(
                readState(stateHandle, (s) => s.condition),
                send(outbox, 'TRUE'),
              ), // commandIfFalse omitted
              send(outbox, 'AFTER'), // Should execute regardless
            ]),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.value).toBe('AFTER');
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should work with predicate from computeState', async () => {
      type TestMessage = string;
      type TestState1 = { a: number };
      type TestState2 = { b: number };

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, TestState1>(
          () => ({ a: 1 }),
          (h1) =>
            withState<TestMessage, TestState2>(
              () => ({ b: 2 }),
              (h2) => {
                const predicate = computeState([h1, h2], (s1, s2) => s1.a + s2.b > 2);
                return whenState(predicate, send(outbox, 'SUM_GT_2'), send(outbox, 'SUM_LE_2'));
              },
            ),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.value).toBe('SUM_GT_2');
      expect((await scheduler.next()).done).toBe(true);
    });
  });
});
