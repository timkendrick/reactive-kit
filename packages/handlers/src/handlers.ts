import { FetchHandler } from '@reactive-kit/plugin-fetch';
import { TimeHandler } from '@reactive-kit/plugin-time';
import type { RuntimeEffectHandlers } from '@reactive-kit/runtime';

export const handlers: RuntimeEffectHandlers = [
  (next) => new FetchHandler(next),
  (next) => new TimeHandler(next),
];
