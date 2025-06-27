import type { AsyncTaskId, AsyncTaskMessage } from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/plugin-evaluate';

export const MESSAGE_ACT_HANDLER_DELAY_COMPLETE = '@reactive-kit/handler-act/delay-complete';

interface ActHandlerDelayCompleteMessagePayload {
  taskId: AsyncTaskId;
}

export type ActHandlerDelayCompleteMessage = AsyncTaskMessage<
  typeof MESSAGE_ACT_HANDLER_DELAY_COMPLETE,
  ActHandlerDelayCompleteMessagePayload
>;

export function createActHandlerDelayCompleteMessage(
  taskId: AsyncTaskId,
): ActHandlerDelayCompleteMessage {
  return { type: MESSAGE_ACT_HANDLER_DELAY_COMPLETE, payload: { taskId } };
}

export function isActHandlerDelayCompleteMessage(
  message: Message<unknown, unknown>,
): message is ActHandlerDelayCompleteMessage {
  return message.type === MESSAGE_ACT_HANDLER_DELAY_COMPLETE;
}
