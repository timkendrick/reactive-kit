import { describe, expect, it } from 'vitest';

import { HandlerAction, type ActorHandle, type SendHandlerAction } from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/runtime-messages';

import { sentTo } from './sentTo';
import type { TestAction } from './types';

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
