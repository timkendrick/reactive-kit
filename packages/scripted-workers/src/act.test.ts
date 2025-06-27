import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from './act';
import { noop } from './actions';

describe(act, () => {
  it('should allow creating actor definitions', async () => {
    const actor = act<never>(() => noop());
    const scheduler = new AsyncScheduler<never>((_ctx) => actor);
    const result = await scheduler.next();
    expect(result.done).toBe(true);
    expect(result.value).toBeUndefined(); // Standard completion value
  });
});
