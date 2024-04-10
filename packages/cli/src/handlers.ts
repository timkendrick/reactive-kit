import { FetchHandler } from '@reactive-kit/handler-fetch';
import { TimeHandler } from '@reactive-kit/handler-time';
import { type RuntimeEffectHandlers } from '@reactive-kit/runtime';

const handlers: RuntimeEffectHandlers = [
  (next) => new TimeHandler(next),
  (next) => new FetchHandler(next),
];

export default handlers;
