import {
  HandlerAction,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
  type SchedulerCommandMessage,
  type SchedulerMiddlewareActor,
  type SchedulerMiddlewareFactory,
} from '@reactive-kit/runtime';
import { type Serializer } from '@reactive-kit/serialization';

export function cliLoggerMiddleware<T>(
  output: NodeJS.WriteStream,
  serializer: Serializer<SchedulerCommandMessage<T>, string>,
): SchedulerMiddlewareFactory<T> {
  return {
    type: '@reactive-kit/cli/logger',
    async: false,
    factory: (next, _self) => new CliLoggerMiddleware(output, serializer, next),
  };
}

class CliLoggerMiddleware<T> implements SchedulerMiddlewareActor<T> {
  public constructor(
    private readonly output: NodeJS.WriteStream,
    private readonly serializer: Serializer<SchedulerCommandMessage<T>, string>,
    private readonly next: ActorHandle<SchedulerCommandMessage<T>>,
  ) {}

  public handle(
    this: this,
    message: SchedulerCommandMessage<T>,
    _context: HandlerContext<SchedulerCommandMessage<T>>,
  ): HandlerResult<SchedulerCommandMessage<T>> {
    this.output.write(this.serializer.serialize(message) + '\n');
    return [HandlerAction.Send({ target: this.next, message })];
  }
}
