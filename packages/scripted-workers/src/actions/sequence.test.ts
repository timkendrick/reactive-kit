import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { createSpawnedActorValueResolver, type ActorCommand } from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_ACTOR_SEND } from '../vm/operations/actorSend';
import { OP_TYPE_BLOCK_BREAK } from '../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_ENTER } from '../vm/operations/blockEnter';
import { OP_TYPE_DELAY } from '../vm/operations/delay';

import { delay } from './delay';
import { send } from './send';
import { sequence } from './sequence';

describe(sequence, () => {
  describe(compile, () => {
    it('should compile a sequence of commands in order', () => {
      const targetHandle = createSpawnedActorValueResolver<string>(0);
      const command = sequence<never>(() => [
        send(targetHandle, 'A'),
        delay(10),
        send(targetHandle, 'B'),
      ]);
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 4, // send, delay, send, break = 4 ops
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'A',
        },
        {
          type: OP_TYPE_DELAY,
          durationMs: 10,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'B',
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        },
      ]);
    });

    it('should compile nested sequences preserving order', () => {
      const targetHandle = createSpawnedActorValueResolver<string>(0);
      const command = sequence<never>(() => [
        send(targetHandle, 'A'),
        sequence<never>(() => [delay(5), send(targetHandle, 'B')]),
        send(targetHandle, 'C'),
      ]);
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER, // Outer sequence
          length: 7,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'A',
        },
        // Inner sequence starts
        {
          type: OP_TYPE_BLOCK_ENTER, // Inner sequence
          length: 3,
        },
        {
          type: OP_TYPE_DELAY,
          durationMs: 5,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'B',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // Inner sequence break
          blockIndex: 0,
        },
        // Inner sequence ends
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'C',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // Outer sequence break
          blockIndex: 0,
        },
      ]);
    });

    it('should compile the done() command to a block break', () => {
      const targetHandle = createSpawnedActorValueResolver<string>(0);
      let doneCommand: ActorCommand<never> | null = null;
      const command = sequence<never>((controls) => {
        doneCommand = controls.done();
        return [send(targetHandle, 'A'), doneCommand!, send(targetHandle, 'B')];
      });
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 4, // SEND_A, DONE_BREAK, SEND_B, COMPILER_BREAK
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'A',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // From controls.done()
          blockIndex: 0,
        },
        {
          type: OP_TYPE_ACTOR_SEND, // This is compiled, though VM might not run it
          target: targetHandle,
          message: 'B',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // Compiler-inserted for the sequence
          blockIndex: 0,
        },
      ]);
    });

    it('should compile inner controls.done() to a block break skipping inner commands', () => {
      const targetHandle = createSpawnedActorValueResolver<string>(0);
      const command = sequence<never>((_outerControls) => [
        send(targetHandle, 'OUTER1'),
        sequence((innerControls) => [
          send(targetHandle, 'INNER1'),
          innerControls.done(),
          send(targetHandle, 'INNER_SKIP'),
        ]),
        send(targetHandle, 'OUTER2'),
      ]);
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER, // Outer sequence
          length: 8,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'OUTER1',
        },
        {
          type: OP_TYPE_BLOCK_ENTER, // Inner sequence
          length: 4,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'INNER1',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // innerControls.done()
          blockIndex: 0, // Breaks the inner block
        },
        {
          type: OP_TYPE_ACTOR_SEND, // Unreachable if inner done() is taken
          target: targetHandle,
          message: 'INNER_SKIP',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // Compiler-inserted for inner block
          blockIndex: 0,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'OUTER2',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // Compiler-inserted for outer block
          blockIndex: 0,
        },
      ]);
    });

    it('should compile outer controls.done() from inner scope to a block break skipping outer commands', () => {
      const targetHandle = createSpawnedActorValueResolver<string>(0);
      const command = sequence<never>((outerControls) => [
        send(targetHandle, 'OUTER1'),
        sequence((_innerControls) => [
          send(targetHandle, 'INNER1'),
          outerControls.done(),
          send(targetHandle, 'INNER_SKIP'),
        ]),
        send(targetHandle, 'OUTER_SKIP'),
      ]);
      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER, // Outer sequence
          length: 8,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'OUTER1',
        },
        {
          type: OP_TYPE_BLOCK_ENTER, // Inner sequence
          length: 4,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: 'INNER1',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // outerControls.done()
          blockIndex: 1, // Breaks the outer block (0 is inner, 1 is outer)
        },
        {
          type: OP_TYPE_ACTOR_SEND, // Unreachable
          target: targetHandle,
          message: 'INNER_SKIP',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // Compiler-inserted for inner block
          blockIndex: 0,
        },
        {
          type: OP_TYPE_ACTOR_SEND, // Unreachable
          target: targetHandle,
          message: 'OUTER_SKIP',
        },
        {
          type: OP_TYPE_BLOCK_BREAK, // Compiler-inserted for outer block
          blockIndex: 0,
        },
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

    it('should execute commands in sequence', async () => {
      type TestMessage = string;
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [send(outbox, '1'), delay(10), send(outbox, '2')]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_context) => actorDef);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('1');
      expect(r1.done).toBe(false);

      const r2Promise = scheduler.next();
      await vi.advanceTimersByTimeAsync(9);

      await vi.advanceTimersByTimeAsync(1);
      const r2 = await r2Promise;
      expect(r2.value).toBe('2');
      expect(r2.done).toBe(false);

      const r3 = await scheduler.next();
      expect(r3.done).toBe(true);
    });

    it('should terminate sequence early when done() is called', async () => {
      type TestMessage = string;
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence((controls) => [send(outbox, 'FIRST'), controls.done(), send(outbox, 'SECOND')]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_context) => actorDef);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('FIRST');
      expect(r1.done).toBe(false);

      const r2 = await scheduler.next();
      expect(r2.done).toBe(true); // Sequence terminated early
    });

    it('should handle nested sequences', async () => {
      type TestMessage = string;
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [
          send(outbox, 'A'),
          sequence(() => [send(outbox, 'B'), delay(5)]),
          send(outbox, 'C'),
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_context) => actorDef);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('A');

      const r2 = await scheduler.next();
      expect(r2.value).toBe('B');

      const r3Promise = scheduler.next();
      await vi.advanceTimersByTimeAsync(5);
      const r3 = await r3Promise;
      expect(r3.value).toBe('C');

      const r4 = await scheduler.next();
      expect(r4.done).toBe(true);
    });

    it('should terminate only the inner sequence when inner done() is called within nested sequence', async () => {
      type TestMessage = string;
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence((_outerControls) => [
          send(outbox, 'OUTER_START'),
          sequence((innerControls) => [
            send(outbox, 'INNER_START'),
            innerControls.done(),
            send(outbox, 'INNER_SKIPPED'),
          ]),
          send(outbox, 'OUTER_END'),
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_context) => actorDef);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('OUTER_START');
      const r2 = await scheduler.next();
      expect(r2.value).toBe('INNER_START');
      const r3 = await scheduler.next();
      expect(r3.value).toBe('OUTER_END');
      const r4 = await scheduler.next();
      expect(r4.done).toBe(true);
    });

    it('should terminate the outer sequence when outer done() is called from within nested sequence', async () => {
      type TestMessage = string;
      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence((outerControls) => [
          send(outbox, 'OUTER_START'),
          sequence((_innerControls) => [
            send(outbox, 'INNER_START'),
            outerControls.done(),
            send(outbox, 'INNER_SKIPPED'),
          ]),
          send(outbox, 'OUTER_SKIPPED'),
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_context) => actorDef);

      const r1 = await scheduler.next();
      expect(r1.value).toBe('OUTER_START');
      const r2 = await scheduler.next();
      expect(r2.value).toBe('INNER_START');
      const r3 = await scheduler.next();
      expect(r3.done).toBe(true); // Outer sequence terminated
    });
  });
});
