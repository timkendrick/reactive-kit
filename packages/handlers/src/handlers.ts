import { FetchHandler } from '@reactive-kit/handler-fetch';
import { TimeHandler } from '@reactive-kit/handler-time';
import { type RuntimeEffectHandlers } from '@reactive-kit/runtime';

export const handlers: RuntimeEffectHandlers = [
  (next) => new FetchHandler(next),
  (next) => new TimeHandler(next),
];
