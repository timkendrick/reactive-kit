import { describe, expect, it } from 'vitest';

import { type ActorHandle } from '@reactive-kit/actor';
import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { readState } from '../state/readState';
import {
  createComputeStateValueResolver,
  createReadStateValueResolver,
  createSpawnedActorValueResolver,
  createStateRef,
  type StateRef,
} from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_ACTOR_SEND } from '../vm/operations/actorSend';
import { OP_TYPE_BLOCK_BREAK, type BlockBreakOp } from '../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_BREAK_IF, type BlockBreakIfOp } from '../vm/operations/blockBreakIf';
import { OP_TYPE_BLOCK_ENTER, type BlockEnterOp } from '../vm/operations/blockEnter';
import {
  OP_TYPE_BLOCK_ENTER_AWAIT,
  type BlockEnterAwaitOp,
} from '../vm/operations/blockEnterAwait';
import {
  OP_TYPE_BLOCK_ENTER_STATE,
  type BlockEnterStateOp,
} from '../vm/operations/blockEnterState';

import { send } from './send';
import { sequence } from './sequence';
import { when } from './when';
import { whileLoop } from './whileLoop';
import { withState } from './withState';

describe(when, () => {
  type StartMsg = { type: 'START'; payload: string };
  type OtherMsg = { type: 'OTHER'; payload: string };
  type KeyMsg = { type: 'KEY' };
  type TestMessage = StartMsg | OtherMsg | KeyMsg | string; // Union type for tests

  describe(compile, () => {
    it('should compile when with a static predicate and commandIfTrue', () => {
      const outboxHandle = createSpawnedActorValueResolver<string>(0);

      const staticPredicate = (msg: TestMessage): msg is StartMsg =>
        typeof msg === 'object' && msg.type === 'START';

      const extractMessagePayload = (m: StartMsg) => m.payload;

      const command = when<TestMessage, StartMsg>(
        staticPredicate,
        (msgHandle: StateRef<StartMsg>) =>
          send<TestMessage, string>(outboxHandle, readState(msgHandle, extractMessagePayload)),
      );

      // Create mock handles for any state references
      // (the index can be known in advance due to the deterministic order of compiled instructions)
      const messageHandle = createStateRef<StartMsg>(0);

      // Ideally we would be able to match the compiler-generated `(message, predicateFn) => predicateFn(message)`
      // In reality we can't do this because the function is created internally by the compiler.
      // For simplicity, we will trust that the compiler generates the correct function.
      const computedPredicateCombiner = expect.any(Function) as (
        message: TestMessage,
        predicateFn: typeof staticPredicate,
      ) => boolean;

      const instructions = compile(command);
      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_AWAIT,
          length: 5,
        } satisfies BlockEnterAwaitOp,
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 2,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, staticPredicate],
            computedPredicateCombiner,
          ),
          blockIndex: 0,
        } satisfies BlockBreakIfOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 1,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: createReadStateValueResolver(messageHandle, extractMessagePayload),
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
      ]);
    });

    it('should compile when with a static predicate, commandIfTrue, and commandIfFalse', () => {
      const outboxHandle = createSpawnedActorValueResolver<string>(0);
      const staticPredicate = (msg: TestMessage): msg is StartMsg =>
        typeof msg === 'object' && msg.type === 'START';

      const extractMessagePayload = (m: StartMsg) => m.payload;

      const command = when<TestMessage, StartMsg>(
        staticPredicate,
        (msgHandle: StateRef<StartMsg>) =>
          send<TestMessage, string>(outboxHandle, readState(msgHandle, extractMessagePayload)),
        (_msgHandle: StateRef<TestMessage>) =>
          send<TestMessage, string>(outboxHandle, 'FALSE_BRANCH'),
      );

      // Create mock handles for any state references
      // (the index can be known in advance due to the deterministic order of compiled instructions)
      const messageHandle = createStateRef<StartMsg>(0);

      // Ideally we would be able to match the compiler-generated `(message, predicateFn) => predicateFn(message)`
      // In reality we can't do this because the function is created internally by the compiler.
      // For simplicity, we will trust that the compiler generates the correct function.
      const computedPredicateCombiner = expect.any(Function) as (
        message: TestMessage,
        predicateFn: typeof staticPredicate,
      ) => boolean;

      const instructions = compile(command);
      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_AWAIT,
          length: 6,
        } satisfies BlockEnterAwaitOp,
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 3,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, staticPredicate],
            computedPredicateCombiner,
          ),
          blockIndex: 0,
        } satisfies BlockBreakIfOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: 'FALSE_BRANCH',
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 1,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: createReadStateValueResolver(messageHandle, extractMessagePayload),
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
      ]);
    });

    it('should compile when with a dynamic predicate (from state) and commandIfTrue', () => {
      const outboxHandle = createSpawnedActorValueResolver<string>(0);
      type PredicateFnType = (msg: TestMessage) => msg is StartMsg;
      type PredicateStateType = { pred: PredicateFnType };
      const dynamicPredicateFn: PredicateFnType = (msg: TestMessage): msg is StartMsg =>
        typeof msg === 'object' && msg.type === 'START' && msg.payload === 'DYNAMIC';
      const extractDynamicPayload = (m: StartMsg) => `dynamic: ${m.payload}`;

      const initialPredicateStateFactory = (): PredicateStateType => ({ pred: dynamicPredicateFn });
      const extractPredicate = (s: PredicateStateType): PredicateFnType => s.pred;

      const command = withState(initialPredicateStateFactory, (stateHandle) => {
        return when<TestMessage, StartMsg>(
          readState(stateHandle, extractPredicate),
          (msgHandle: StateRef<StartMsg>) =>
            send<TestMessage, string>(outboxHandle, readState(msgHandle, extractDynamicPayload)),
        );
      });

      // Create mock handles for any state references
      // (the index can be known in advance due to the deterministic order of compiled instructions)
      const predicateHandle = createStateRef<{ pred: PredicateFnType }>(0);
      const messageHandle = createStateRef<TestMessage>(1);
      const narrowedMessageHandle = createStateRef<StartMsg>(1); // Same as messageHandle, but with a narrower type

      // Ideally we would be able to match the compiler-generated `(message, predicateFn) => predicateFn(message)`
      // In reality we can't do this because the function is created internally by the compiler.
      // For simplicity, we will trust that the compiler generates the correct function.
      const computedPredicateCombiner = expect.any(Function) as (
        message: TestMessage,
        predicateFn: PredicateFnType,
      ) => boolean;

      const instructions = compile(command);
      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_STATE,
          initialState: initialPredicateStateFactory,
          length: 7,
        } satisfies BlockEnterStateOp<{ pred: PredicateFnType }>,
        {
          type: OP_TYPE_BLOCK_ENTER_AWAIT,
          length: 5,
        } satisfies BlockEnterAwaitOp,
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 2,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, createReadStateValueResolver(predicateHandle, extractPredicate)],
            computedPredicateCombiner,
          ),
          blockIndex: 0,
        } satisfies BlockBreakIfOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 1,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: createReadStateValueResolver(narrowedMessageHandle, extractDynamicPayload),
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
      ]);
    });

    it('should compile when with a dynamic predicate (from state), commandIfTrue, and commandIfFalse', () => {
      const outboxHandle = createSpawnedActorValueResolver<string>(0);
      type PredicateFnType = (msg: TestMessage) => msg is StartMsg;
      type PredicateStateType = { pred: PredicateFnType };
      const dynamicPredicateFn: PredicateFnType = (msg: TestMessage): msg is StartMsg =>
        typeof msg === 'object' && msg.type === 'START' && msg.payload === 'DYNAMIC_IF_ELSE';

      const extractDynamicPayloadIfTrue = (m: StartMsg) => `dynamic_true: ${m.payload}`;

      const initialPredicateStateFactory = (): PredicateStateType => ({ pred: dynamicPredicateFn });
      const extractPredicate = (s: PredicateStateType): PredicateFnType => s.pred;

      const command = withState(initialPredicateStateFactory, (stateHandle) => {
        return when<TestMessage, StartMsg>(
          readState(stateHandle, extractPredicate), // Example of a dynamic predicate
          (msgHandle: StateRef<StartMsg>) =>
            send<TestMessage, string>(
              outboxHandle,
              readState(msgHandle, extractDynamicPayloadIfTrue),
            ),
          (_msgHandle: StateRef<TestMessage>) =>
            send<TestMessage, string>(outboxHandle, 'DYNAMIC_FALSE_BRANCH'),
        );
      });

      // Mock handles
      const predicateHandle = createStateRef<PredicateStateType>(0);
      const messageHandle = createStateRef<TestMessage>(1);
      const narrowedMessageHandle = createStateRef<StartMsg>(1); // For commandIfTrue

      // Ideally we would be able to match the compiler-generated `(message, predicateFn) => predicateFn(message)`
      // In reality we can't do this because the function is created internally by the compiler.
      // For simplicity, we will trust that the compiler generates the correct function.
      const computedPredicateCombiner = expect.any(Function) as (
        message: TestMessage,
        predicateFn: PredicateFnType,
      ) => boolean;

      const instructions = compile(command);
      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_STATE,
          initialState: initialPredicateStateFactory,
          length: 8,
        } satisfies BlockEnterStateOp<PredicateStateType>,
        {
          type: OP_TYPE_BLOCK_ENTER_AWAIT,
          length: 6,
        } satisfies BlockEnterAwaitOp,
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 3,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_BLOCK_BREAK_IF,
          predicate: createComputeStateValueResolver(
            [messageHandle, createReadStateValueResolver(predicateHandle, extractPredicate)],
            computedPredicateCombiner,
          ),
          blockIndex: 0,
        } satisfies BlockBreakIfOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: 'DYNAMIC_FALSE_BRANCH',
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 1,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outboxHandle,
          message: createReadStateValueResolver(narrowedMessageHandle, extractDynamicPayloadIfTrue),
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
      ]);
    });
  });

  describe('evaluate', () => {
    const predicate = (msg: TestMessage): msg is StartMsg =>
      typeof msg === 'object' && msg.type === 'START';
    const trueCmdFactory = (outbox: ActorHandle<TestMessage>) => (msgHandle: StateRef<StartMsg>) =>
      send<TestMessage, string>(
        outbox,
        readState(msgHandle, (m) => m.payload),
      );
    const falseCmdFactory =
      (outbox: ActorHandle<TestMessage>) => (_msgHandle: StateRef<TestMessage>) =>
        send<TestMessage, TestMessage>(outbox, 'FALSE');

    it('should execute commandIfTrue when predicate matches', async () => {
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        when<TestMessage, StartMsg>(predicate, trueCmdFactory(outbox), falseCmdFactory(outbox)),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      scheduler.dispatch({ type: 'START', payload: 'TRUE_PAYLOAD' });
      const r1 = await scheduler.next();
      expect(r1.value).toBe('TRUE_PAYLOAD');
      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
    });

    it('should execute commandIfFalse when predicate does not match', async () => {
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        when<TestMessage, StartMsg>(predicate, trueCmdFactory(outbox), falseCmdFactory(outbox)),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      scheduler.dispatch({ type: 'OTHER', payload: 'IGNORE' });
      const r1 = await scheduler.next();
      expect(r1.value).toBe('FALSE');
      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
    });

    it('should execute default false branch (noop) if commandIfFalse is omitted', async () => {
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [
          when<TestMessage, StartMsg>(predicate, trueCmdFactory(outbox)), // No commandIfFalse
          send<TestMessage, TestMessage>(outbox, 'AFTER_WHEN'),
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      scheduler.dispatch({ type: 'OTHER', payload: 'IGNORE' }); // Predicate is false
      // The when consumes the message but does nothing.
      const r1 = await scheduler.next();
      expect(r1.value).toBe('AFTER_WHEN');
      const r2 = await scheduler.next();
      expect(r2.done).toBe(true);
    });

    it('should consume only one message per invocation', async () => {
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [
          send<TestMessage, TestMessage>(outbox, 'START'), // Initial message
          when<TestMessage, StartMsg>(predicate, trueCmdFactory(outbox), falseCmdFactory(outbox)), // Consumes msg1
          when<TestMessage, StartMsg>(predicate, trueCmdFactory(outbox), falseCmdFactory(outbox)), // Consumes msg2
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      const r1 = await scheduler.next(); // Expect START
      expect(r1.value).toBe('START');

      const msg1: TestMessage = { type: 'START', payload: 'PAYLOAD1' };
      scheduler.dispatch(msg1); // For first when
      const r2 = await scheduler.next(); // Expect PAYLOAD1
      expect(r2.value).toBe('PAYLOAD1');

      const msg2: TestMessage = { type: 'OTHER', payload: 'IGNORE' };
      scheduler.dispatch(msg2); // For second when
      const r3 = await scheduler.next(); // Expect FALSE
      expect(r3.value).toBe('FALSE');

      const r4 = await scheduler.next();
      expect(r4.done).toBe(true);
    });

    it('should correctly use a state value resolver for the predicate', async () => {
      type State = { matchType: string };
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        withState<TestMessage, State>(
          () => ({ matchType: 'KEY' }),
          (stateHandle) =>
            whileLoop((loop) =>
              when<TestMessage, KeyMsg>(
                readState<State, (msg: TestMessage) => msg is KeyMsg>(
                  stateHandle,
                  (s) =>
                    // Predicate checks message type against state
                    (msg: TestMessage): msg is KeyMsg =>
                      typeof msg === 'object' && 'type' in msg && msg.type === s.matchType,
                ),
                (_msgHandle: StateRef<KeyMsg>) =>
                  sequence(() => [
                    send<TestMessage, TestMessage>(outbox, 'TRUE_STATE'),
                    loop.break(),
                  ]),
                (_msgHandle: StateRef<TestMessage>) =>
                  send<TestMessage, TestMessage>(outbox, 'FALSE_STATE'),
              ),
            ),
        ),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      scheduler.dispatch({ type: 'OTHER', payload: 'irrelevant' });
      const r1 = await scheduler.next();
      expect(r1.value).toBe('FALSE_STATE');

      scheduler.dispatch({ type: 'KEY' });
      const r2 = await scheduler.next();
      expect(r2.value).toBe('TRUE_STATE');

      const r3 = await scheduler.next();
      expect(r3.done).toBe(true);
    });
  });
});
