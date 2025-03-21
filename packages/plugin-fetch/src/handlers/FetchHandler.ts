import { ActorFactory, type ActorHandle, type HandlerContext } from '@reactive-kit/actor';
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
import { FETCH_TASK, FetchTaskFactory, type FetchTaskConfig } from '../tasks';

type FetchHandlerInternalMessage = FetchHandlerResponseMessage;

export const ACTOR_TYPE_FETCH_HANDLER = '@reactive-kit/actor/fetch-handler';

export interface FetchHandlerConfig {
  next: ActorHandle<EffectHandlerOutputMessage>;
}

export class FetchHandler extends AsyncTaskHandler<
  FetchEffect,
  FetchHandlerInternalMessage,
  FetchTaskConfig
> {
  public static readonly FACTORY: ActorFactory<
    FetchHandlerConfig,
    Message<unknown, unknown>,
    EffectHandlerOutputMessage | FetchHandlerInternalMessage
  > = {
    type: ACTOR_TYPE_FETCH_HANDLER,
    async: false,
    factory: (config: FetchHandlerConfig) => new FetchHandler(config),
  };

  public constructor(config: FetchHandlerConfig) {
    const { next } = config;
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
    task: FetchTaskFactory;
    config: FetchTaskConfig;
  } {
    // TODO: Abort fetch requests on unsubscribe
    const controller = new AbortController();
    return {
      task: FETCH_TASK,
      config: {
        taskId,
        effect,
        controller,
        output: context.self(),
      },
    };
  }

  protected override acceptInternal(
    message: Message<unknown, unknown>,
  ): message is FetchHandlerInternalMessage {
    return isFetchHandlerResponseMessage(message);
  }

  protected override handleTaskMessage(
    message: FetchHandlerInternalMessage,
    state: FetchTaskConfig,
    effect: FetchEffect,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const { response } = message;
    const effectValue = createResult(response);
    const action = this.emit(EFFECT_TYPE_FETCH, new Map([[effect.id, effectValue]]));
    return [action];
  }
}
