import { describe, it, expect } from 'vitest';
import { hasMessagePayload } from './hasMessagePayload';
import { TestAction } from './types';
import { HandlerAction, ActorHandle, SendHandlerAction } from '@reactive-kit/actor';
import { Message } from '@reactive-kit/runtime-messages';

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
