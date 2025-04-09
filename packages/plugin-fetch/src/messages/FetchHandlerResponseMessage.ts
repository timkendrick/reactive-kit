import {
  type AsyncTaskId,
  type AsyncTaskMessage,
  type AsyncTaskMessagePayload,
} from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/plugin-evaluate';

import type { FetchResponseState } from '../types';

export const MESSAGE_FETCH_HANDLER_RESPONSE = '@reactive-kit/handler-fetch/response';

export interface FetchHandlerResponseMessagePayload extends AsyncTaskMessagePayload {
  response: FetchResponseState;
}

export type FetchHandlerResponseMessage = AsyncTaskMessage<
  typeof MESSAGE_FETCH_HANDLER_RESPONSE,
  FetchHandlerResponseMessagePayload
>;

export function createFetchHandlerResponseMessage(
  taskId: AsyncTaskId,
  response: FetchResponseState,
): FetchHandlerResponseMessage {
  return { type: MESSAGE_FETCH_HANDLER_RESPONSE, payload: { taskId, response } };
}

export function isFetchHandlerResponseMessage(
  message: Message<unknown, unknown>,
): message is FetchHandlerResponseMessage {
  return message.type === MESSAGE_FETCH_HANDLER_RESPONSE;
}
