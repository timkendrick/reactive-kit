import type { Message } from '@reactive-kit/runtime-messages';
import type { FetchResponseState } from '../types';
import { AsyncTaskId, AsyncTaskMessage } from '@reactive-kit/handler-utils';

export const MESSAGE_FETCH_HANDLER_RESPONSE = '@reactive-kit/handler-fetch/response';

export interface FetchHandlerResponseMessage
  extends AsyncTaskMessage<typeof MESSAGE_FETCH_HANDLER_RESPONSE> {
  response: FetchResponseState;
}

export function createFetchHandlerResponseMessage(
  taskId: AsyncTaskId,
  response: FetchResponseState,
): FetchHandlerResponseMessage {
  return { type: MESSAGE_FETCH_HANDLER_RESPONSE, taskId, response };
}

export function isFetchHandlerResponseMessage(
  message: Message<unknown>,
): message is FetchHandlerResponseMessage {
  return message.type === MESSAGE_FETCH_HANDLER_RESPONSE;
}
