import { describe, it, expect } from 'vitest';
import { hasActionType } from './hasActionType';
import { TestAction } from './types';
import { ActorHandle, HandlerAction, HandlerActionType } from '@reactive-kit/actor';
import { Message } from '@reactive-kit/runtime-messages';

describe(hasActionType, () => {
  it('should match the correct action type', () => {
    const action: TestAction<HandlerAction<Message<string, string>>> = {
      action: HandlerAction.Send({} as ActorHandle<Message<string, string>>, {
        type: 'START',
        payload: 'test',
      }),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasActionType(HandlerActionType.Send)(action);
    expect(result).toBe(true);
  });

  it('should not match the wrong action type', () => {
    const action: TestAction<HandlerAction<Message<string, string>>> = {
      action: HandlerAction.Spawn({} as ActorHandle<Message<string, string>>),
      state: {},
      from: {} as ActorHandle<unknown>,
    };
    const result = hasActionType(HandlerActionType.Send)(action);
    expect(result).toBe(false);
  });
});
