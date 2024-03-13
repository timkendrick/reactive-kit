import {
  Actor,
  ActorHandle,
  HandlerAction,
  HandlerContext,
  HandlerResult,
} from '@reactive-kit/actor';
import { describe, expect, test } from 'vitest';

import { AsyncScheduler } from './async';

interface Message<T> {
  type: T;
}

describe(AsyncScheduler, () => {
  test('Simple sync actor', async () => {
    enum AppMessageType {
      Increment,
      Decrement,
      Result,
      Destroy,
    }
    interface IncrementMessage extends Message<AppMessageType.Increment> {}
    interface DecrementMessage extends Message<AppMessageType.Decrement> {}
    interface DestroyMessage extends Message<AppMessageType.Destroy> {}
    interface ResultMessage extends Message<AppMessageType.Result> {
      value: number;
    }
    type AppMessage = IncrementMessage | DecrementMessage | DestroyMessage | ResultMessage;
    class AppActor implements Actor<IncrementMessage | DecrementMessage> {
      private readonly output: ActorHandle<ResultMessage>;
      private counter = 0;
      public constructor(output: ActorHandle<ResultMessage>) {
        this.output = output;
      }
      public handle(
        message: AppMessage,
        context: HandlerContext<AppMessage>,
      ): HandlerResult<AppMessage> {
        switch (message.type) {
          case AppMessageType.Increment:
            return [
              HandlerAction.Send(this.output, {
                type: AppMessageType.Result,
                value: ++this.counter,
              }),
            ];
          case AppMessageType.Decrement:
            return [
              HandlerAction.Send(this.output, {
                type: AppMessageType.Result,
                value: --this.counter,
              }),
            ];
          case AppMessageType.Destroy:
            return [HandlerAction.Kill(context.self())];
          default:
            return null;
        }
      }
    }
    const scheduler = new AsyncScheduler<AppMessage>((output) => new AppActor(output));
    scheduler.dispatch({ type: AppMessageType.Increment });
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: { type: AppMessageType.Result, value: 1 } });
    }
    scheduler.dispatch({ type: AppMessageType.Increment });
    scheduler.dispatch({ type: AppMessageType.Increment });
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: { type: AppMessageType.Result, value: 2 } });
    }
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: { type: AppMessageType.Result, value: 3 } });
    }
    scheduler.dispatch({ type: AppMessageType.Decrement });
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: { type: AppMessageType.Result, value: 2 } });
    }
    scheduler.dispatch({ type: AppMessageType.Destroy });
    {
      const result = await scheduler.next();
      expect(result).toEqual({ done: true, value: null });
    }
  });
});
