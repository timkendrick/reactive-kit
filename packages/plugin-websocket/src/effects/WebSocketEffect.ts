import type { HashableObject } from '@reactive-kit/hash';
import { createEffect, type EffectExpression } from '@reactive-kit/types';
import type { WebSocketRequest, WebSocketResponseState } from '../types';

export const EFFECT_TYPE_WEB_SOCKET = '@reactive-kit/effect-web-socket';

export interface WebSocketEffect extends EffectExpression<WebSocketResponseState> {
  type: WebSocketEffectType;
  payload: WebSocketEffectPayload;
}

export type WebSocketEffectType = typeof EFFECT_TYPE_WEB_SOCKET;

export type WebSocketEffectPayload = HashableObject<WebSocketRequest>;

export function createWebSocketEffect(request: WebSocketRequest): WebSocketEffect {
  return createEffect(EFFECT_TYPE_WEB_SOCKET, request);
}

export function isWebSocketEffect(error: EffectExpression<unknown>): error is WebSocketEffect {
  return error.type === EFFECT_TYPE_WEB_SOCKET;
}
