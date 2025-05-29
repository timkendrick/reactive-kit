import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { readState } from '../state/readState';
import { createStateRef } from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_BLOCK_BREAK } from '../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_ENTER_STATE } from '../vm/operations/blockEnterState';
import { OP_TYPE_STATE_UPDATE } from '../vm/operations/stateUpdate';

import { modifyState } from './modifyState';
import { send } from './send';
import { sequence } from './sequence';
import { withState } from './withState';

describe(modifyState, () => {
  describe(compile, () => {
    it('should compile modifyState action with state handle and updater', () => {
      type TestState = { count: number };
      const updater = (s: TestState) => ({ count: s.count + 1 });
      const initialStateFactory = () => ({ count: 0 });

      const commandToCompile = withState<never, TestState>(initialStateFactory, (stateHandle) =>
        modifyState(stateHandle, updater),
      );

      const instructions = compile(commandToCompile);

      const expectedStateHandle = createStateRef<TestState>(0);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_STATE,
          initialState: initialStateFactory,
          length: 2,
        },
        {
          type: OP_TYPE_STATE_UPDATE,
          stateHandle: expectedStateHandle,
          updater,
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        },
      ]);
    });
  });

  describe('evaluate', () => {
    it('should update the state correctly based on the updater function', async () => {
      type TestState = { count: number };
      type TestMessage = number;

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, TestState>(
          () => ({ count: 0 }),
          (stateHandle) =>
            sequence(() => [
              modifyState(stateHandle, (s: TestState) => ({ count: s.count + 1 })), // 0 -> 1
              send(
                outbox,
                readState(stateHandle, (s: TestState) => s.count),
              ),
            ]),
        ),
      );

      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      const result1 = await scheduler.next();
      expect(result1).toEqual({ done: false, value: 1 });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: true, value: undefined });
    });

    it('should handle multiple modifyState calls sequentially', async () => {
      type TestState = { count: number };
      type Msg = number;

      const actorDef = act<Msg>((_self, { outbox }) =>
        withState<Msg, TestState>(
          () => ({ count: 0 }),
          (stateHandle) =>
            sequence(() => [
              modifyState(stateHandle, (s: TestState) => ({ count: s.count + 1 })), // 0 -> 1
              modifyState(stateHandle, (s: TestState) => ({ count: s.count * 10 })), // 1 -> 10
              send(
                outbox,
                readState(stateHandle, (s: TestState) => s.count),
              ),
            ]),
        ),
      );

      const scheduler = new AsyncScheduler<Msg>((_ctx) => actorDef);

      const result1 = await scheduler.next();
      expect(result1).toEqual({ done: false, value: 10 });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: true, value: undefined });
    });
  });
});
