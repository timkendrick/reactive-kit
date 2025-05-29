import { describe, expect, it } from 'vitest';

import { HandlerAction, HandlerActionType, type ActorHandle } from '@reactive-kit/actor';
import type { Message } from '@reactive-kit/plugin-evaluate';

import { hasActionType } from './hasActionType';
import type { TestAction } from './types';

describe(hasActionType, () => {
  it('should match the correct action type', () => {
    const action: TestAction<HandlerAction<Message<string, string>>> = {
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
    const result = hasActionType(HandlerActionType.Send)(action);
    expect(result).toBe(true);
  });

  it('should not match the wrong action type', () => {
    const action: TestAction<HandlerAction<Message<string, string>>> = {
      action: HandlerAction.Spawn({
        target: {} as ActorHandle<Message<string, string>>,
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasActionType(HandlerActionType.Send)(action);
    expect(result).toBe(false);
  });
});
