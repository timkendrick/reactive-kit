import {
  HandlerAction,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
  type SchedulerCommandMessage,
  type SchedulerMiddlewareActor,
  type SchedulerMiddlewareFactory,
} from '@reactive-kit/runtime';

export function consoleLoggerMiddleware<T>(output: Console): SchedulerMiddlewareFactory<T> {
  return {
    type: '@reactive-kit/dom/logger',
    async: false,
    factory: (next, _self) => new ConsoleLoggerMiddleware(output, next),
  };
}

class ConsoleLoggerMiddleware<T> implements SchedulerMiddlewareActor<T> {
  public constructor(
    private readonly output: Console,
    private readonly next: ActorHandle<SchedulerCommandMessage<T>>,
  ) {}

  public handle(
    this: this,
    message: SchedulerCommandMessage<T>,
    _context: HandlerContext<SchedulerCommandMessage<T>>,
  ): HandlerResult<SchedulerCommandMessage<T>> {
    this.output.log(message);
    return [HandlerAction.Send({ target: this.next, message })];
  }
}
