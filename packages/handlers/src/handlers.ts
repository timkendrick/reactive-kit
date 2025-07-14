import { FetchHandler } from '@reactive-kit/plugin-fetch/handlers';
import { TimeHandler } from '@reactive-kit/plugin-time/handlers';
import { WebSocketHandler } from '@reactive-kit/plugin-websocket/handlers';
import type { RuntimeEffectHandlers } from '@reactive-kit/runtime';

/* eslint-disable-next-line prettier/prettier */
export const handlers: RuntimeEffectHandlers = [
  FetchHandler.FACTORY,
  TimeHandler.FACTORY,
  WebSocketHandler.FACTORY,
];
