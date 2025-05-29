import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { computeState } from '../state/computeState';
import { readState } from '../state/readState';
import {
  createReadStateValueResolver,
  createSpawnedActorValueResolver,
  createStateRef,
  type StateRef,
} from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_ACTOR_SEND } from '../vm/operations/actorSend';
import { OP_TYPE_BLOCK_BREAK } from '../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_ENTER_STATE } from '../vm/operations/blockEnterState';

import { modifyState } from './modifyState';
import { send } from './send';
import { sequence } from './sequence';
import { withState } from './withState';

describe(withState, () => {
  describe(compile, () => {
    it('should compile withState, pushing and popping state around compiled inner block', () => {
      const outboxHandle = createSpawnedActorValueResolver<number>(0);
      type TestState = { value: number };
      type TestMsg = number | string;
      const initialStateFactory = (): TestState => ({ value: 0 });
      const selector = (s: TestState) => s.value;

      const factory = (stateHandle: StateRef<TestState>) =>
        send<TestMsg, number>(outboxHandle, readState(stateHandle, selector));

      const command = withState<TestMsg, TestState>(initialStateFactory, factory);
      const instructions = compile(command);

      const expectedStateRefForReadState = createStateRef<TestState>(0);
      const expectedMessageResolver = createReadStateValueResolver(
        expectedStateRefForReadState,
        selector,
      );

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_STATE,
          initialState: initialStateFactory,
          length: 2,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: expectedMessageResolver,
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        },
      ]);
    });
  });

  describe('evaluate', () => {
    it('should initialize state and make it readable', async () => {
      type State = { count: number };
      type Msg = number;
      const actorDef = act<Msg>((_self, { outbox }) =>
        withState<Msg, State>(
          () => ({ count: 5 }),
          (stateHandle) =>
            send(
              outbox,
              readState(stateHandle, (s) => s.count),
            ),
        ),
      );
      const scheduler = new AsyncScheduler<Msg>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.value).toBe(5);
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should allow state modification within its scope', async () => {
      type State = { count: number };
      type Msg = number;
      const actorDef = act<Msg>((_self, { outbox }) =>
        withState<Msg, State>(
          () => ({ count: 0 }),
          (stateHandle) =>
            sequence(() => [
              modifyState(stateHandle, (s) => ({ count: s.count + 1 })), // 0 -> 1
              send(
                outbox,
                readState(stateHandle, (s) => s.count),
              ), // Sends 1
            ]),
        ),
      );
      const scheduler = new AsyncScheduler<Msg>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.value).toBe(1);
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should handle nested withState scopes correctly', async () => {
      type OuterState = { name: string };
      type InnerState = { value: number };
      type Msg = string;

      const actorDef = act<Msg>((_self, { outbox }) =>
        withState<Msg, OuterState>(
          () => ({ name: 'outer' }),
          (outerH) =>
            withState<Msg, InnerState>(
              () => ({ value: 10 }),
              (innerH) => {
                const computedResolver = computeState(
                  [outerH, innerH],
                  (o, i) => `${o.name}-${i.value}`,
                );
                return send(outbox, computedResolver);
              },
            ),
        ),
      );
      const scheduler = new AsyncScheduler<Msg>((_ctx) => actorDef);
      const result = await scheduler.next();
      expect(result.value).toBe('outer-10');
      expect((await scheduler.next()).done).toBe(true);
    });

    it('should isolate state between sibling scopes', async () => {
      type State = { id: string; value: number };
      type Msg = string;

      const actorDef = act<Msg>((_self, { outbox }) =>
        sequence(() => [
          // First scope
          withState<Msg, State>(
            () => ({ id: 'first', value: 1 }),
            (h) =>
              send(
                outbox,
                computeState([h], (s) => `${s.id}-${s.value}`),
              ),
          ),
          // Second scope
          withState<Msg, State>(
            () => ({ id: 'second', value: 2 }),
            (h) =>
              send(
                outbox,
                computeState([h], (s) => `${s.id}-${s.value}`),
              ),
          ),
        ]),
      );

      const scheduler = new AsyncScheduler<Msg>((_ctx) => actorDef);
      const r1 = await scheduler.next();
      expect(r1.value).toBe('first-1');
      const r2 = await scheduler.next();
      expect(r2.value).toBe('second-2');
      expect((await scheduler.next()).done).toBe(true);
    });
  });
});
