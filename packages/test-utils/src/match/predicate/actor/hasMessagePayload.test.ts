import { describe, expect, it } from 'vitest';

import { HandlerAction, type ActorHandle, type SendHandlerAction } from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/runtime-messages';

import { hasMessagePayload } from './hasMessagePayload';
import type { TestAction } from './types';

describe('hasMessagePayload', () => {
  it('should match the correct message payload', () => {
    const predicate = (value: string) => value === 'test';
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasMessagePayload(predicate)(action);
    expect(result).toBe(true);
  });

  it('should not match the wrong message payload', () => {
    const predicate = (value: string) => value === 'test';
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'wrong',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasMessagePayload(predicate)(action);
    expect(result).toBe(false);
  });
});
