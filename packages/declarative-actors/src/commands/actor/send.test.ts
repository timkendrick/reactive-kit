import { describe, expect, it } from 'vitest';

import type { Message } from '@reactive-kit/plugin-evaluate';
import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../../act';

import { send } from './send';

describe(send, () => {
  it('should send the provided message', async () => {
    type TestMessage = Message<string, string>;
    const actor = act<TestMessage>((_self, { outbox }) =>
      send(outbox, { type: 'START', payload: 'foo' }),
    );
    const scheduler = new AsyncScheduler(() => actor);
    {
      const result = await scheduler.next();
      expect(result).toEqual({
        done: false,
        value: { type: 'START', payload: 'foo' },
      });
    }
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: true, value: undefined });
    }
  });
});
