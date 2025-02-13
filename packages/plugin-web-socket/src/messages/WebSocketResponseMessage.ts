import type { WebSocketResponseState } from '../types';
import type { Message } from '@reactive-kit/runtime-messages';

export const MESSAGE_WEB_SOCKET_RESPONSE = '@reactive-kit/handler-web-socket/response';

export type TaskId = number;

export interface WebSocketResponseMessage extends Message<typeof MESSAGE_WEB_SOCKET_RESPONSE> {
  taskId: TaskId;
  response: WebSocketResponseState;
}

export function createWebSocketResponseMessage(
  taskId: TaskId,
  response: WebSocketResponseState,
): WebSocketResponseMessage {
  return { type: MESSAGE_WEB_SOCKET_RESPONSE, taskId, response };
}

export function isWebSocketResponseMessage(
  message: Message<unknown>,
): message is WebSocketResponseMessage {
  return message.type === MESSAGE_WEB_SOCKET_RESPONSE;
}
