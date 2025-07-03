import type { AsyncTaskId, AsyncTaskMessage } from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/plugin-evaluate';

export const MESSAGE_TIME_HANDLER_EMIT = '@reactive-kit/plugin-time/emit';

export interface AsyncTaskMessagePayload {
  taskId: AsyncTaskId;
  time: Date;
}

export type TimeHandlerEmitMessage = AsyncTaskMessage<
  typeof MESSAGE_TIME_HANDLER_EMIT,
  AsyncTaskMessagePayload
>;

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
