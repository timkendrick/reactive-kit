import type { FetchResponse } from '@reactive-kit/effect-fetch';
import type { Message } from '@reactive-kit/runtime-messages';

export const MESSAGE_FETCH_HANDLER_RESPONSE = '@reactive-kit/handler-fetch/response';

export type TaskId = number;

export type FetchResponseState =
  | { success: true; response: FetchResponse }
  | { success: false; error: Error; body: string | null };

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
