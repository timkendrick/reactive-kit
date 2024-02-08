import {
  Handler,
  HandlerAction,
  HandlerContext,
  HandlerMessage,
  ProcessId,
  StreamSink,
  UnsubscribeCallback,
} from '@trigger/types';
import { input } from '../utils/stream';
import { Enum, VARIANT, instantiateEnum } from '@trigger/utils';

export interface SchedulerFactory<T extends HandlerMessage<unknown>> {
  (context: SchedulerFactoryContext): Map<ProcessId, Handler<T>>;
}

export interface SchedulerFactoryContext {
  generatePid(): ProcessId;
}

interface HandlerState<T extends HandlerMessage<unknown>> {
  handler: Handler<T>;
  events: {
    queue: StreamSink<T>;
    subscription: UnsubscribeCallback;
  };
}

type SchedulerPhase<T extends HandlerMessage<unknown>> = Enum<{
  Idle: void;
  Busy: {
    queue: Array<SchedulerCommand<T>>;
  };
}>;

type SchedulerCommand<T extends HandlerMessage<unknown>> = Enum<{
  Dispatch: {
    action: HandlerAction<T>;
  };
  Handle: {
    handler: Handler<T>;
    context: HandlerContext;
    message: T;
  };
}>;

export class Scheduler<T extends HandlerMessage<unknown>> {
  private handlers: Map<ProcessId, HandlerState<T>>;
  private nextPid: number;
  private phase: SchedulerPhase<T> = instantiateEnum<SchedulerPhase<T>>('Idle', {});

  public constructor(factory: SchedulerFactory<T>) {
    this.phase;
    this.nextPid = 1;
    const initialHandlers = factory({
      generatePid: () => this.generatePid(),
    });
    this.handlers = new Map(
      Array.from(initialHandlers.entries()).map(([pid, handler]) => {
        const context = this.createHandlerContext(pid);
        const callback = this.handleCommands.bind(this);
        const handlerState = subscribeHandlerEvents(handler, context, callback);
        return [pid, handlerState];
      }),
    );
  }

  private createHandlerContext(pid: ProcessId): HandlerContext {
    return {
      pid,
      generatePid: () => this.generatePid(),
    };
  }

  private generatePid(): ProcessId {
    return this.nextPid++;
  }

  public dispatch(pid: ProcessId, message: T): void {
    return this.handleCommands([
      instantiateEnum<SchedulerCommand<T>>('Dispatch', {
        action: HandlerAction.Send(pid, message),
      }),
    ]);
  }

  private handleCommands(commands: Array<SchedulerCommand<T>>): void {
    // If another dispatch is already in progress, push the actions onto the internal queue
    if (this.phase[VARIANT] === 'Busy') {
      this.phase.queue.push(...commands);
      return;
    }
    const idlePhase = this.phase;
    this.phase = instantiateEnum<SchedulerPhase<T>>('Busy', {
      queue: [...commands],
    });
    let schedulerAction: SchedulerCommand<T> | undefined;
    // Iterate through all actions until the queue is exhausted
    while (this.phase[VARIANT] === 'Busy' && (schedulerAction = this.phase.queue.shift())) {
      switch (schedulerAction[VARIANT]) {
        case 'Dispatch': {
          const { action } = schedulerAction;
          switch (action[VARIANT]) {
            case 'Send': {
              const { message, pid } = action;
              const handler = this.handlers.get(pid);
              if (!handler) continue;
              // Push the item into the handler's event queue
              // (this will flow through the event stream transformer either synchronously or asynchronously,
              // to be picked up by the handler's event stream output listener as an internal action)
              for (const handler of this.handlers.values()) {
                handler.events.queue.next(message);
              }
              break;
            }
          }
          break;
        }
        case 'Handle': {
          const { handler, context, message } = schedulerAction;
          const results = handler.handle(message, context);
          if (results) {
            const commands = results.map((action) =>
              instantiateEnum<SchedulerCommand<T>>('Dispatch', action),
            );
            this.phase.queue.push(...commands);
          }
          break;
        }
      }
    }
    this.phase = idlePhase;
  }
}

function subscribeHandlerEvents<T extends HandlerMessage<unknown>>(
  handler: Handler<T>,
  context: HandlerContext,
  callback: (commands: Array<SchedulerCommand<T>>) => void,
): HandlerState<T> {
  // Create an events pipeline which operates as follows:
  // 1. Messages are pushed into the handler's queue by the scheduler
  // 2. The handler's custom event transformation pipeline transforms the incoming message stream either synchronously or asynchronously
  // 3. The transformed message stream is pushed into the scheduler's internal event queue to be invoked on the handler directly
  const queue = input<T>();
  const events = handler.events(queue);
  const subscription = events.subscribe({
    next: (messages: Array<T>): void => {
      const commands = messages.map((message) =>
        instantiateEnum<SchedulerCommand<T>>('Handle', {
          handler,
          context,
          message,
        }),
      );
      callback(commands);
    },
  });
  return { handler, events: { queue, subscription } };
}
