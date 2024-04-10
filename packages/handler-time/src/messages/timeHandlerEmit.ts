import type { Message } from '@reactive-kit/runtime-messages';

export type TaskId = number;

export const MESSAGE_TIME_HANDLER_EMIT = '@reactive-kit/handler-time/emit';

export interface TimeHandlerEmitMessage extends Message<typeof MESSAGE_TIME_HANDLER_EMIT> {
  taskId: TaskId;
  time: Date;
}

export function createTimeHandlerEmitMessage(taskId: TaskId, time: Date): TimeHandlerEmitMessage {
  return { type: MESSAGE_TIME_HANDLER_EMIT, taskId, time };
}

export function isTimeHandlerEmitMessage(
  message: Message<unknown>,
): message is TimeHandlerEmitMessage {
  return message.type === MESSAGE_TIME_HANDLER_EMIT;
}
