/// <reference lib="dom" />
import { AsyncTaskFactory, type ActorHandle, type HandlerContext } from '@reactive-kit/actor';
import {
  AsyncTaskHandler,
  AsyncTaskId,
  type EffectHandlerInput,
  type EffectHandlerOutput,
  type EffectHandlerOutputMessage,
} from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/runtime-messages';
import { createResult, type Expression } from '@reactive-kit/types';
import { EFFECT_TYPE_FETCH, type FetchEffect } from '../effects';
import { isFetchHandlerResponseMessage, type FetchHandlerResponseMessage } from '../messages';
import { createFetchTask } from '../tasks';

type FetchHandlerInternalMessage = FetchHandlerResponseMessage;

interface FetchTaskState {
  controller: AbortController;
}

export class FetchHandler extends AsyncTaskHandler<
  FetchEffect,
  FetchHandlerInternalMessage,
  FetchTaskState
> {
  public constructor(next: ActorHandle<EffectHandlerOutputMessage>) {
    super(EFFECT_TYPE_FETCH, next);
  }

  protected override getInitialValue(effect: FetchEffect): Expression<any> | null {
    return null;
  }

  protected override createTask(
    taskId: AsyncTaskId,
    effect: FetchEffect,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): {
    task: AsyncTaskFactory<FetchHandlerInternalMessage>;
    state: FetchTaskState;
  } {
    // TODO: Abort fetch requests on unsubscribe
    const controller = new AbortController();
    return {
      task: createFetchTask(taskId, effect, controller, context.self()),
      state: {
        controller,
      },
    };
  }

  protected override acceptInternal(
    message: Message<unknown>,
  ): message is FetchHandlerInternalMessage {
    return isFetchHandlerResponseMessage(message);
  }

  protected override handleTaskMessage(
    message: FetchHandlerInternalMessage,
    state: FetchTaskState,
    effect: FetchEffect,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const { response } = message;
    const effectValue = createResult(response);
    const action = this.emit(EFFECT_TYPE_FETCH, new Map([[effect.id, effectValue]]));
    return [action];
  }
}
