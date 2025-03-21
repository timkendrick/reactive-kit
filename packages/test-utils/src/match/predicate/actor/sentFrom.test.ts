import { describe, it, expect } from 'vitest';
import { sentFrom } from './sentFrom';
import { TestAction } from './types';
import { HandlerAction, ActorHandle, SendHandlerAction } from '@reactive-kit/actor';
import { Message } from '@reactive-kit/runtime-messages';

describe('sentFrom', () => {
  it('should match the correct actor', () => {
    const sender = {} as ActorHandle<unknown>;
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: sender,
    };
    const result = sentFrom(sender)(action);
    expect(result).toBe(true);
  });

  it('should not match the wrong actor', () => {
    const sender = {} as ActorHandle<unknown>;
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = sentFrom(sender)(action);
    expect(result).toBe(false);
  });
});
