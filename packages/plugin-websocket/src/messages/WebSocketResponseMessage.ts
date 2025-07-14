import type { Message } from '@reactive-kit/message';

import type { WebSocketResponseState } from '../types';

export const MESSAGE_WEB_SOCKET_RESPONSE = '@reactive-kit/handler-web-socket/response';

export type TaskId = number;

export interface WebSocketResponsePayload {
  taskId: TaskId;
  response: WebSocketResponseState;
}

export interface WebSocketResponseMessage
  extends Message<typeof MESSAGE_WEB_SOCKET_RESPONSE, WebSocketResponsePayload> {}

export function createWebSocketResponseMessage(
  taskId: TaskId,
  response: WebSocketResponseState,
): WebSocketResponseMessage {
  return { type: MESSAGE_WEB_SOCKET_RESPONSE, payload: { taskId, response } };
}

export function isWebSocketResponseMessage(
  message: Message<unknown, unknown>,
): message is WebSocketResponseMessage {
  return message.type === MESSAGE_WEB_SOCKET_RESPONSE;
}
