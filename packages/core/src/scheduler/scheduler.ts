import {
  Actor,
  ActorHandle,
  ActorType,
  AsyncActor,
  HandlerAction,
  HandlerActionType,
  HandlerContext,
  StreamSink,
  SyncActor,
  UnsubscribeCallback,
} from '@trigger/types';
import { input } from '../utils/stream';
import { Enum, EnumVariant, PhantomType, VARIANT, instantiateEnum } from '@trigger/utils';

enum ActorStateType {
  Sync = 'Sync',
  Async = 'Async',
}

type ActorState<T> = Enum<{
  [ActorStateType.Sync]: SyncActorState<T>;
  [ActorStateType.Async]: AsyncActorState<T>;
}>;

interface SyncActorState<T> {
  handle: ActorHandle<T>;
  actor: SyncActor<T>;
  context: SchedulerHandlerContext<T>;
}

interface AsyncActorState<T> {
  handle: ActorHandle<T>;
  actor: AsyncActor<T>;
  events: AsyncActorEvents<T>;
}

interface AsyncActorEvents<T> {
  queue: StreamSink<T>;
  unsubscribe: UnsubscribeCallback;
}

const ActorState = {
  [ActorStateType.Sync]: Object.assign(
    function Sync<T>(state: SyncActorState<T>): EnumVariant<ActorState<T>, ActorStateType.Sync> {
      return instantiateEnum(ActorStateType.Sync, state);
    },
    {
      [VARIANT]: ActorStateType.Sync,
      is: function is<T>(
        value: ActorState<T>,
      ): value is EnumVariant<ActorState<T>, ActorStateType.Sync> {
        return value[VARIANT] === ActorStateType.Sync;
      },
    },
  ),
  [ActorStateType.Async]: Object.assign(
    function Async<T>(state: AsyncActorState<T>): EnumVariant<ActorState<T>, ActorStateType.Async> {
      return instantiateEnum(ActorStateType.Async, state);
    },
    {
      [VARIANT]: ActorStateType.Async,
      is: function is<T>(
        value: ActorState<T>,
      ): value is EnumVariant<ActorState<T>, ActorStateType.Async> {
        return value[VARIANT] === ActorStateType.Async;
      },
    },
  ),
};

type SchedulerPhase<T> = Enum<{
  Idle: void;
  Busy: {
    queue: Array<SchedulerCommand<T>>;
  };
}>;

type SchedulerCommand<T> = Enum<{
  Dispatch: {
    target: SchedulerActorHandle<T>;
    message: T;
  };
  Handle: {
    handler: SyncActor<T>;
    context: SchedulerHandlerContext<T>;
    message: T;
  };
  Spawn: {
    handle: SchedulerActorHandle<T>;
    factory: () => Actor<T>;
  };
  Kill: {
    target: ActorHandle<T>;
  };
}>;

export class Scheduler<T> {
  private handlers: Map<unknown, ActorState<T>>;
  private phase: SchedulerPhase<T> = instantiateEnum<SchedulerPhase<T>>('Idle', {});
  private nextHandleId: number = 1;

  public constructor(factory: () => Actor<T>) {
    this.phase;
    this.handlers = new Map();
    const rootHandle = this.generateHandle<T>();
    this.handlers.set(rootHandle, this.spawnActor(rootHandle, factory));
  }

  private spawnActor(handle: SchedulerActorHandle<T>, factory: () => Actor<T>): ActorState<T> {
    const handler = factory();
    const context = this.createHandlerContext(handle);
    switch (handler[VARIANT]) {
      case ActorType.Sync: {
        const { actor } = handler;
        return ActorState.Sync({ handle, actor, context });
      }
      case ActorType.Async: {
        const { actor } = handler;
        const callback = this.handleCommands.bind(this);
        const events = subscribeActorEvents(actor, context, callback);
        return ActorState.Async({ handle, actor, events });
      }
    }
  }

  private createHandlerContext<T>(handle: SchedulerActorHandle<T>): SchedulerHandlerContext<T> {
    const generateHandle = this.generateHandle.bind(this);
    return new SchedulerHandlerContext(handle, generateHandle);
  }

  private generateHandle<T>(): SchedulerActorHandle<T> {
    const uid = ++this.nextHandleId;
    return new SchedulerActorHandle(uid);
  }

  public dispatch(target: ActorHandle<T>, message: T): void {
    return this.handleCommands([
      instantiateEnum<SchedulerCommand<T>>('Dispatch', {
        action: HandlerAction.Send(target, message),
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
    let command: SchedulerCommand<T> | undefined;
    // Iterate through all queued commands until the queue is exhausted
    while (this.phase[VARIANT] === 'Busy' && (command = this.phase.queue.shift())) {
      switch (command[VARIANT]) {
        case 'Dispatch': {
          const { message, target } = command;
          const handlerState = this.handlers.get(target.id());
          if (!handlerState) continue;
          switch (handlerState[VARIANT]) {
            case ActorStateType.Sync: {
              const { actor, context } = handlerState;
              // Handle the message immediately
              const commands = this.invokeHandler(actor, context, message);
              this.phase.queue.push(...commands);
              break;
            }
            case ActorStateType.Async:
              // Push the message into the handler's event queue
              // (this will flow through the event stream transformer either synchronously or asynchronously,
              // to be picked up by the handler's event stream output listener as an internal action)
              handlerState.events.queue.next(message);
              break;
          }
          break;
        }
        case 'Handle': {
          const { handler, context, message } = command;
          const commands = this.invokeHandler(handler, context, message);
          this.phase.queue.push(...commands);
          break;
        }
        case 'Spawn': {
          const { handle, factory } = command;
          if (this.handlers.has(handle)) continue;
          this.handlers.set(handle, this.spawnActor(handle, factory));
          break;
        }
        case 'Kill': {
          const { target } = command;
          const handlerState = this.handlers.get(target);
          if (!handlerState) continue;
          if (handlerState[VARIANT] === ActorStateType.Async) {
            handlerState.events.unsubscribe();
          }
          break;
        }
      }
    }
    this.phase = idlePhase;
  }

  private invokeHandler(
    actor: SyncActor<T>,
    context: SchedulerHandlerContext<T>,
    message: T,
  ): Array<SchedulerCommand<T>> {
    const results = actor.handle(message, context);
    const spawnedActors = context.collectSpawnedActors();
    if (!results) return [];
    const commands = new Array<SchedulerCommand<T>>();
    for (const action of results) {
      switch (action[VARIANT]) {
        case HandlerActionType.Send: {
          const command = instantiateEnum<SchedulerCommand<T>>('Dispatch', action);
          commands.push(command);
        }
        case HandlerActionType.Spawn: {
          if (!spawnedActors) continue;
          const spawnedActor = spawnedActors.get(action.target);
          if (!spawnedActor) continue;
          const command = instantiateEnum<SchedulerCommand<T>>('Spawn', spawnedActor);
          commands.push(command);
        }
        case HandlerActionType.Kill: {
          const command = instantiateEnum<SchedulerCommand<T>>('Kill', action);
          commands.push(command);
        }
      }
    }
    return commands;
  }
}

function subscribeActorEvents<T>(
  handler: AsyncActor<T>,
  context: HandlerContext<T>,
  callback: (commands: Array<SchedulerCommand<T>>) => void,
): AsyncActorEvents<T> {
  // Create an events pipeline which operates as follows:
  // 1. Messages are pushed into the handler's queue by the scheduler
  // 2. The handler's custom event transformation pipeline transforms the incoming message stream either synchronously or asynchronously
  // 3. The transformed message stream is pushed into the scheduler's internal event queue to be invoked on the handler directly
  const queue = input<T>();
  const events = handler.events(queue);
  const unsubscribe = events.subscribe({
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
  return { queue, unsubscribe };
}

class SchedulerActorHandle<T> implements ActorHandle<T> {
  public _type: PhantomType<T> = undefined as never;
  private uid: number;

  public constructor(uid: number) {
    this.uid = uid;
  }

  public id(): number {
    return this.uid;
  }
}

class SchedulerHandlerContext<T> implements HandlerContext<T> {
  private handle: SchedulerActorHandle<T>;
  private generateHandle: <T>() => SchedulerActorHandle<T>;
  private spawned: Map<SchedulerActorHandle<unknown>, SpawnedActor<unknown>> = new Map();

  public constructor(
    handle: SchedulerActorHandle<T>,
    generateHandle: <T>() => SchedulerActorHandle<T>,
  ) {
    this.handle = handle;
    this.generateHandle = generateHandle;
  }

  public self(): ActorHandle<T> {
    return this.handle;
  }

  public spawn<T>(factory: () => SyncActor<T>): ActorHandle<T> {
    const handle = this.generateHandle<T>();
    this.spawned.set(handle, { handle, factory: () => Actor.Sync(factory()) });
    return handle;
  }

  public spawnAsync<T>(factory: () => AsyncActor<T>): ActorHandle<T> {
    const handle = this.generateHandle<T>();
    this.spawned.set(handle, { handle, factory: () => Actor.Async(factory()) });
    return handle;
  }

  public collectSpawnedActors(): Map<ActorHandle<unknown>, SpawnedActor<unknown>> | null {
    const { spawned } = this;
    if (spawned.size === 0) return null;
    this.spawned = new Map();
    return spawned;
  }
}

interface SpawnedActor<T> {
  handle: SchedulerActorHandle<T>;
  factory: () => Actor<T>;
}
