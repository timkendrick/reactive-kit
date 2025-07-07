import { type ActorHandle, type HandlerContext, type SyncActorFactory } from '@reactive-kit/actor';
import {
  AsyncTaskHandler,
  type AsyncTaskId,
  type EffectHandlerInput,
  type EffectHandlerOutput,
  type EffectHandlerOutputMessage,
} from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/message';
import { createResult, type Expression } from '@reactive-kit/types';

import { EFFECT_TYPE_TIME, type TimeEffect } from '../effects';
import { isTimeHandlerEmitMessage, type TimeHandlerEmitMessage } from '../messages';
import { TIME_TASK, type TimeTaskConfig, type TimeTaskFactory } from '../tasks/TimeTask';

export const ACTOR_TYPE_TIME_HANDLER = '@reactive-kit/actor/time-handler';

export interface TimeHandlerConfig {
  next: ActorHandle<EffectHandlerOutputMessage>;
}

export type TimeHandlerInternalMessage = TimeHandlerEmitMessage;

export class TimeHandler extends AsyncTaskHandler<
  TimeEffect,
  TimeHandlerInternalMessage,
  TimeTaskConfig
> {
  public static readonly FACTORY: SyncActorFactory<
    TimeHandlerConfig,
    Message<unknown, unknown>,
    EffectHandlerOutputMessage | TimeHandlerInternalMessage
  > = {
    type: ACTOR_TYPE_TIME_HANDLER,
    async: false,
    factory: (config: TimeHandlerConfig, _self: ActorHandle<Message<unknown, unknown>>) =>
      new TimeHandler(config),
  };

  public constructor(config: TimeHandlerConfig) {
    const { next } = config;
    super(EFFECT_TYPE_TIME, next);
  }

  protected override getInitialValue(_effect: TimeEffect): Expression<unknown> | null {
    return null;
  }

  protected override createTask(
    taskId: AsyncTaskId,
    effect: TimeEffect,
    context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): {
    task: TimeTaskFactory;
    config: TimeTaskConfig;
  } {
    return {
      task: TIME_TASK,
      config: {
        taskId,
        effect,
        output: context.self(),
      },
    };
  }

  protected override acceptInternal(
    message: Message<unknown, unknown>,
  ): message is TimeHandlerInternalMessage {
    return isTimeHandlerEmitMessage(message);
  }

  protected override handleTaskMessage(
    message: TimeHandlerInternalMessage,
    _state: TimeTaskConfig,
    effect: TimeEffect,
    _context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): EffectHandlerOutput<TimeHandlerInternalMessage> {
    const { time } = message.payload;
    const effectValue = createResult(time);
    const action = this.emit(EFFECT_TYPE_TIME, new Map([[effect.id, effectValue]]));
    return [action];
  }
}
