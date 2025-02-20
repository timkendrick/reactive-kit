import { AsyncTaskFactory, type ActorHandle, type HandlerContext } from '@reactive-kit/actor';
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
import { createTimeTask } from '../tasks/TimeTask';

type TimeHandlerInternalMessage = TimeHandlerEmitMessage;

type TimeTaskState = null;

export class TimeHandler extends AsyncTaskHandler<
  TimeEffect,
  TimeHandlerInternalMessage,
  TimeTaskState
> {
  public constructor(next: ActorHandle<EffectHandlerOutputMessage>) {
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
    task: AsyncTaskFactory<TimeHandlerInternalMessage>;
    state: TimeTaskState;
  } {
    return {
      task: createTimeTask(taskId, effect, context.self()),
      state: null,
    };
  }

  protected override acceptInternal(
    message: Message<unknown>,
  ): message is TimeHandlerInternalMessage {
    return isTimeHandlerEmitMessage(message);
  }

  protected override handleTaskMessage(
    message: TimeHandlerInternalMessage,
    state: TimeTaskState,
    effect: TimeEffect,
    context: HandlerContext<EffectHandlerInput<TimeHandlerInternalMessage>>,
  ): EffectHandlerOutput<TimeHandlerInternalMessage> {
    const { time } = message;
    const effectValue = createResult(time);
    const action = this.emit(EFFECT_TYPE_TIME, new Map([[effect.id, effectValue]]));
    return [action];
  }
}
