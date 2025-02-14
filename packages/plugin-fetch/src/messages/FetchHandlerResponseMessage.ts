import type { Message } from '@reactive-kit/runtime-messages';
import type { FetchResponseState } from '../types';

export const MESSAGE_FETCH_HANDLER_RESPONSE = '@reactive-kit/handler-fetch/response';

export type TaskId = number;

export interface FetchHandlerResponseMessage
  extends Message<typeof MESSAGE_FETCH_HANDLER_RESPONSE> {
  taskId: TaskId;
  response: FetchResponseState;
}

export function createFetchHandlerResponseMessage(
  taskId: TaskId,
  response: FetchResponseState,
): FetchHandlerResponseMessage {
  return { type: MESSAGE_FETCH_HANDLER_RESPONSE, taskId, response };
}

export function isFetchHandlerResponseMessage(
  message: Message<unknown>,
): message is FetchHandlerResponseMessage {
  return message.type === MESSAGE_FETCH_HANDLER_RESPONSE;
}
