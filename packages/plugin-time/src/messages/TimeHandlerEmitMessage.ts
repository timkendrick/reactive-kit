import { AsyncTaskId, AsyncTaskMessage } from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/runtime-messages';

export const MESSAGE_TIME_HANDLER_EMIT = '@reactive-kit/plugin-time/emit';

interface AsyncTaskMessagePayload {
  taskId: AsyncTaskId;
  time: Date;
}

export interface TimeHandlerEmitMessage
  extends AsyncTaskMessage<typeof MESSAGE_TIME_HANDLER_EMIT, AsyncTaskMessagePayload> {}

export function createTimeHandlerEmitMessage(
  taskId: AsyncTaskId,
  time: Date,
): TimeHandlerEmitMessage {
  return { type: MESSAGE_TIME_HANDLER_EMIT, payload: { taskId, time } };
}

export function isTimeHandlerEmitMessage(
  message: Message<unknown, unknown>,
): message is TimeHandlerEmitMessage {
  return message.type === MESSAGE_TIME_HANDLER_EMIT;
}
