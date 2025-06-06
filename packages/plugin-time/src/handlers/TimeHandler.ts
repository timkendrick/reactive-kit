import { ActorFactory, type ActorHandle, type HandlerContext } from '@reactive-kit/actor';
import {
  AsyncTaskHandler,
  AsyncTaskId,
  type EffectHandlerInput,
  type EffectHandlerOutput,
  type EffectHandlerOutputMessage,
} from '@reactive-kit/handler-utils';
import { type Message } from '@reactive-kit/runtime-messages';
import { createResult, type Expression } from '@reactive-kit/types';
import { EFFECT_TYPE_TIME, type TimeEffect } from '../effects';
import { isTimeHandlerEmitMessage, type TimeHandlerEmitMessage } from '../messages';
import { TIME_TASK, type TimeTaskConfig, type TimeTaskFactory } from '../tasks/TimeTask';

export const ACTOR_TYPE_TIME_HANDLER = '@reactive-kit/actor/time-handler';

export interface TimeHandlerConfig {
  next: ActorHandle<EffectHandlerOutputMessage>;
}

type TimeHandlerInternalMessage = TimeHandlerEmitMessage;

export class TimeHandler extends AsyncTaskHandler<
  TimeEffect,
  TimeHandlerInternalMessage,
  TimeTaskConfig
> {
  public static readonly FACTORY: ActorFactory<
    TimeHandlerConfig,
    Message<unknown>,
    EffectHandlerOutputMessage | TimeHandlerInternalMessage
  > = {
    type: ACTOR_TYPE_TIME_HANDLER,
    async: false,
    factory: (config: TimeHandlerConfig) => new TimeHandler(config),
  };

  public constructor(config: TimeHandlerConfig) {
    const { next } = config;
    super(EFFECT_TYPE_TIME, next);
  }

  protected override getInitialValue(effect: TimeEffect): Expression<any> | null {
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
    message: Message<unknown>,
  ): message is TimeHandlerInternalMessage {
    return isTimeHandlerEmitMessage(message);
  }

  protected override handleTaskMessage(
    message: TimeHandlerInternalMessage,
    state: TimeTaskConfig,
    effect: TimeEffect,
    context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): EffectHandlerOutput<TimeHandlerInternalMessage> {
    const { time } = message;
    const effectValue = createResult(time);
    const action = this.emit(EFFECT_TYPE_TIME, new Map([[effect.id, effectValue]]));
    return [action];
  }
}
