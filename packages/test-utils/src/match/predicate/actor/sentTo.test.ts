import { describe, it, expect } from 'vitest';
import { sentTo } from './sentTo';
import { TestAction } from './types';
import { HandlerAction, ActorHandle, SendHandlerAction } from '@reactive-kit/actor';
import { Message } from '@reactive-kit/runtime-messages';

describe('sentTo', () => {
  it('should match the correct actor', () => {
    const target = {} as ActorHandle<Message<string, string>>;
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send(target, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = sentTo(target)(action);
    expect(result).toBe(true);
  });

  it('should not match the wrong actor', () => {
    const target = {} as ActorHandle<Message<string, string>>;
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = sentTo(target)(action);
    expect(result).toBe(false);
  });
});
