import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { readState } from '../state';
import { compile } from '../vm/compile';
import { OP_TYPE_DELAY } from '../vm/operations/delay';

import { delay } from './delay';
import { send } from './send';
import { sequence } from './sequence';
import { waitFor } from './waitFor';
import { when } from './when';
import { withState } from './withState';

describe(delay, () => {
  describe(compile, () => {
    it('should compile delays with static duration', () => {
      const program = delay(100);
      const instructions = compile(program);
      expect(instructions).toEqual([
        {
          type: OP_TYPE_DELAY,
          durationMs: 100,
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

    it('should pause execution for the specified duration', async () => {
      type TestMessage = string;
      const duration = 100;

      const actor = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [delay(duration), send(outbox, 'DONE')]),
      );
      const scheduler = new AsyncScheduler(() => actor);

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
      const result = await promise;
      expect(result).toEqual({ done: false, value: 'DONE' });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: true, value: undefined });
    });

    it('should handle zero duration correctly', async () => {
      type TestMessage = string;
      const duration = 0;

      const actor = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [delay(duration), send(outbox, 'DONE')]),
      );
      const scheduler = new AsyncScheduler(() => actor);

      let resolved = false;
      const promise = scheduler.next().then((result) => {
        resolved = true;
        return result;
      });

      // Even with 0ms delay, it should wait for the next tick
      expect(resolved).toBe(false);

      // Advance timers slightly to allow the timeout(0) to execute
      await vi.advanceTimersByTimeAsync(0);
      expect(resolved).toBe(true);

      const result = await promise;
      expect(result).toEqual({ done: false, value: 'DONE' });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: true, value: undefined });
    });

    it('should handle dynamic duration', async () => {
      type TestMessage = string;
      const duration = 100;

      const actor = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [
          withState(
            () => ({ duration }),
            (state) => delay(readState(state, (s) => s.duration)),
          ),
          send(outbox, 'DONE'),
        ]),
      );
      const scheduler = new AsyncScheduler(() => actor);

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
      const result = await promise;
      expect(result).toEqual({ done: false, value: 'DONE' });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: true, value: undefined });
    });

    it('should allow delayed receipt of messages awaited using when()', async () => {
      type TestMessage = string;
      const duration = 100;

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence<TestMessage>(() => [
          send<TestMessage, TestMessage>(outbox, 'TICK'),
          delay(duration),
          when<TestMessage, 'KEY'>(
            (msg): msg is 'KEY' => msg === 'KEY',
            () => send(outbox, 'SUCCESS'),
            () => send(outbox, 'FAILURE'),
          ),
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect(await scheduler.next()).toEqual({ done: false, value: 'TICK' });

      scheduler.dispatch('KEY');

      let resolved = false;
      const promise = scheduler.next().then((result) => {
        resolved = true;
        return result;
      });

      // Advance time by less than the duration
      await vi.advanceTimersByTimeAsync(duration - 1);
      expect(resolved).toBe(false);

      // Advance time past the duration
      await vi.advanceTimersByTimeAsync(1);
      expect(resolved).toBe(true);

      // Now the promise should resolve
      const result = await promise;
      expect(result).toEqual({ done: false, value: 'SUCCESS' });

      expect((await scheduler.next()).done).toBe(true);
    });

    it('should allow delayed receipt of messages awaited using waitFor()', async () => {
      type TestMessage = string;
      const duration = 100;

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence<TestMessage>(() => [
          send<TestMessage, TestMessage>(outbox, 'TICK'),
          delay(duration),
          waitFor<TestMessage, 'KEY'>(
            (msg): msg is 'KEY' => msg === 'KEY',
            (_msg) => send(outbox, 'SUCCESS'),
          ),
        ]),
      );
      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);
      expect(await scheduler.next()).toEqual({ done: false, value: 'TICK' });

      scheduler.dispatch('FOO');
      scheduler.dispatch('BAR');
      scheduler.dispatch('KEY');

      let resolved = false;
      const promise = scheduler.next().then((result) => {
        resolved = true;
        return result;
      });

      // Advance time by less than the duration
      await vi.advanceTimersByTimeAsync(duration - 1);
      expect(resolved).toBe(false);

      // Advance time past the duration
      await vi.advanceTimersByTimeAsync(1);
      expect(resolved).toBe(true);

      // Now the promise should resolve
      const result = await promise;
      expect(result).toEqual({ done: false, value: 'SUCCESS' });

      expect((await scheduler.next()).done).toBe(true);
    });
  });
});
