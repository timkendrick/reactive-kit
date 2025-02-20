import { AsyncTaskId, AsyncTaskMessage } from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/runtime-messages';

export const MESSAGE_TIME_HANDLER_EMIT = '@reactive-kit/plugin-time/emit';

export interface TimeHandlerEmitMessage extends AsyncTaskMessage<typeof MESSAGE_TIME_HANDLER_EMIT> {
  time: Date;
}

export function createTimeHandlerEmitMessage(
  taskId: AsyncTaskId,
  time: Date,
): TimeHandlerEmitMessage {
  return { type: MESSAGE_TIME_HANDLER_EMIT, taskId, time };
}

export function isTimeHandlerEmitMessage(
  message: Message<unknown>,
): message is TimeHandlerEmitMessage {
  return message.type === MESSAGE_TIME_HANDLER_EMIT;
}
