import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskFactory,
  type AsyncTaskResult,
} from '@reactive-kit/actor';
import { fromAsyncIteratorFactory } from '@reactive-kit/actor-utils';
import type { AsyncTaskId } from '@reactive-kit/handler-utils';
import { createAsyncTrigger, type AsyncTrigger } from '@reactive-kit/utils';

import type { TimeEffect } from '../effects';
import { createTimeHandlerEmitMessage, type TimeHandlerEmitMessage } from '../messages';

export const TASK_TYPE_TIME = '@reactive-kit/task/time';

export interface TimeTaskConfig {
  taskId: AsyncTaskId;
  effect: TimeEffect;
  output: ActorHandle<TimeHandlerEmitMessage>;
}

export type TimeTaskFactory = AsyncTaskFactory<TimeTaskConfig, never, TimeHandlerEmitMessage>;

export const TIME_TASK: TimeTaskFactory = fromAsyncIteratorFactory<
  TimeTaskConfig,
  TimeHandlerEmitMessage
>(TASK_TYPE_TIME, (config) => {
  const { taskId, effect, output } = config;
  const interval = effect.payload;
  let activeInterval: ReturnType<typeof setInterval> | undefined;
  const requestQueue = new Array<AsyncTrigger<Date>['emit']>();
  const resultQueue = new Array<Date>();
  function onEmit(value: Date): void {
    const pendingRequest = requestQueue.shift();
    if (pendingRequest) {
      pendingRequest(value);
    } else {
      resultQueue.push(value);
    }
  }
  return {
    next(): Promise<IteratorResult<AsyncTaskResult<TimeHandlerEmitMessage>>> {
      if (!activeInterval) {
        resultQueue.push(new Date());
        activeInterval = setInterval(() => onEmit(new Date()), interval);
      }
      const nextValue = (() => {
        const queuedResult = resultQueue.shift();
        if (queuedResult != null) {
          return Promise.resolve(queuedResult);
        } else {
          const { signal, emit } = createAsyncTrigger<Date>();
          requestQueue.push(emit);
          return signal;
        }
      })();
      return nextValue.then((value) => ({
        done: false,
        value: [
          HandlerAction.Send({
            target: output,
            message: createTimeHandlerEmitMessage(taskId, value),
          }),
        ],
      }));
    },
    return(): Promise<IteratorResult<AsyncTaskResult<TimeHandlerEmitMessage>>> {
      if (activeInterval != null) clearInterval(activeInterval);
      requestQueue.length = 0;
      resultQueue.length = 0;
      return Promise.resolve({ done: true, value: null });
    },
    throw(): Promise<IteratorResult<AsyncTaskResult<TimeHandlerEmitMessage>>> {
      if (activeInterval != null) clearInterval(activeInterval);
      requestQueue.length = 0;
      resultQueue.length = 0;
      return Promise.resolve({ done: true, value: null });
    },
  };
});
