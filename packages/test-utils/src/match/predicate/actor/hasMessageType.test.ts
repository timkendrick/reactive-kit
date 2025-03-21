import { describe, expect, it } from 'vitest';

import { HandlerAction, type ActorHandle, type SendHandlerAction } from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/plugin-evaluate';

import { hasMessageType } from './hasMessageType';
import type { TestAction } from './types';

describe('hasMessageType', () => {
  it('should match the correct message type', () => {
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({
        target: {} as ActorHandle<Message<string, string>>,
        message: {
          type: 'START',
          payload: 'test',
        },
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasMessageType('START')(action);
    expect(result).toBe(true);
  });

  it('should not match the wrong message type', () => {
    const action: TestAction<SendHandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({
        target: {} as ActorHandle<Message<string, string>>,
        message: {
          type: 'START',
          payload: 'test',
        },
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasMessageType('END')(action);
    expect(result).toBe(false);
  });
});
