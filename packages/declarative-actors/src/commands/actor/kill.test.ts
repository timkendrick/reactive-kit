import { describe, expect, it } from 'vitest';

import type { Message } from '@reactive-kit/plugin-evaluate';
import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../../act';

import { kill } from './kill';

describe(kill, () => {
  it('should complete the task', async () => {
    type TestMessage = Message<string, string>;
    const actor = act<TestMessage>((self, {}) => kill(self));
    const scheduler = new AsyncScheduler(() => actor);
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: true, value: undefined });
    }
  });

  it('should prevent further actions in a sequence', async () => {
    type TestMessage = Message<string, string>;
    const actor = act<TestMessage>((self, {}) => kill(self));
    const scheduler = new AsyncScheduler(() => actor);
    // First call completes the task
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: true, value: undefined });
    }
    // Subsequent calls should also report done
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: true, value: undefined });
    }
  });
});
