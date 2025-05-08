import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '@reactive-kit/plugin-evaluate';
import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';

import { delay } from './delay';

describe(delay, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should pause execution for the specified duration', async () => {
    const duration = 100;
    type TestMessage = Message<string, string>;

    const actor = act<TestMessage>((_self, {}) => delay(duration));
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

    // The delay command completes without emitting a value
    expect(result).toEqual({ done: true, value: undefined });
  });

  it('should handle zero duration correctly', async () => {
    const duration = 0;
    type TestMessage = Message<string, string>;

    const actor = act<TestMessage>((_self, {}) => delay(duration));
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
    expect(result).toEqual({ done: true, value: undefined });
  });
});
