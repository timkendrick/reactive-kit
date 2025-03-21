import { describe, it, expect } from 'vitest';
import { hasMessageType } from './hasMessageType';
import { TestAction } from './types';
import { HandlerAction, ActorHandle, SendHandlerAction } from '@reactive-kit/actor';
import { Message } from '@reactive-kit/runtime-messages';

describe('hasMessageType', () => {
  it('should match the correct message type', () => {
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasMessageType('START')(action);
    expect(result).toBe(true);
  });

  it('should not match the wrong message type', () => {
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasMessageType('END')(action);
    expect(result).toBe(false);
  });
});
