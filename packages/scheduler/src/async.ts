import {
  ACTOR_HANDLE_TYPE,
  HandlerActionType,
  type Actor,
  type ActorCreator,
  type ActorFactory,
  type ActorHandle,
  type ActorType,
  type AsyncActorFactory,
  type AsyncTask,
  type AsyncTaskResult,
  type HandlerContext,
  type SyncActorFactory,
} from '@reactive-kit/actor';
import {
  AsyncQueue,
  Enum,
  VARIANT,
  nonNull,
  subscribeAsyncIterator,
  unreachable,
  type EnumVariant,
  type GenericEnum,
} from '@reactive-kit/utils';

type ActorState<T> = Enum<{
  [ActorStateType.Sync]: {
    handle: AsyncSchedulerActorHandle<T>;
    actor: Actor<T, T>;
    context: AsyncSchedulerHandlerContext<T>;
  };
  [ActorStateType.Async]: {
    handle: ActorHandle<T>;
    actor: AsyncTask<T, T>;
    inbox: AsyncQueue<T>;
    outbox: AsyncQueue<AsyncTaskResult<T>>;
  };
}>;
const enum ActorStateType {
  Sync = 'Sync',
  Async = 'Async',
}
interface GenericActorState extends GenericEnum<1> {
  instance: ActorState<this['T1']>;
}
const ActorState = Enum.create<GenericActorState>({
  [ActorStateType.Sync]: true,
  [ActorStateType.Async]: true,
});

type AsyncSchedulerPhase<T> = Enum<{
  [AsyncSchedulerPhaseType.Idle]: void;
  [AsyncSchedulerPhaseType.Queued]: {
    queue: Array<AsyncSchedulerCommand<T>>;
  };
  [AsyncSchedulerPhaseType.Busy]: {
    queue: Array<AsyncSchedulerCommand<T>>;
  };
}>;
const enum AsyncSchedulerPhaseType {
  Idle = 'Idle',
  Queued = 'Queued',
  Busy = 'Busy',
}
interface GenericAsyncSchedulerPhase extends GenericEnum<1> {
  instance: AsyncSchedulerPhase<this['T1']>;
}
const AsyncSchedulerPhase = Enum.create<GenericAsyncSchedulerPhase>({
  [AsyncSchedulerPhaseType.Idle]: true,
  [AsyncSchedulerPhaseType.Queued]: true,
  [AsyncSchedulerPhaseType.Busy]: true,
});

export type AsyncSchedulerCommand<T> = Enum<{
  [AsyncSchedulerCommandType.Send]: {
    source: AsyncSchedulerActorHandle<T> | null;
    target: AsyncSchedulerActorHandle<T>;
    message: T;
  };
  [AsyncSchedulerCommandType.Spawn]: {
    source: AsyncSchedulerActorHandle<T> | null;
    target: AsyncSchedulerActorHandle<T>;
    actor: ActorFactory<any, T, T>; // eslint-disable-line @typescript-eslint/no-explicit-any
    config: unknown;
  };
  [AsyncSchedulerCommandType.Kill]: {
    source: AsyncSchedulerActorHandle<T> | null;
    target: ActorHandle<T>;
  };
  [AsyncSchedulerCommandType.Fail]: {
    source: AsyncSchedulerActorHandle<T> | null;
    target: ActorHandle<T>;
    error: unknown;
  };
}>;
export enum AsyncSchedulerCommandType {
  Send = 'Send',
  Spawn = 'Spawn',
  Kill = 'Kill',
  Fail = 'Fail',
}
export interface GenericAsyncSchedulerCommand extends GenericEnum<1> {
  instance: AsyncSchedulerCommand<this['T1']>;
}
export const AsyncSchedulerCommand = Enum.create<GenericAsyncSchedulerCommand>({
  [AsyncSchedulerCommandType.Send]: true,
  [AsyncSchedulerCommandType.Spawn]: true,
  [AsyncSchedulerCommandType.Kill]: true,
  [AsyncSchedulerCommandType.Fail]: true,
});

export const ROOT_ACTOR_TYPE: ActorType = '@reactive-kit/async-scheduler/root';

export class AsyncScheduler<T> implements AsyncIterator<T, undefined> {
  private PHASE_IDLE: EnumVariant<AsyncSchedulerPhase<T>, AsyncSchedulerPhaseType.Idle> =
    AsyncSchedulerPhase.Idle();

  private handlers: Map<AsyncSchedulerActorHandle<T>, ActorState<T>>;
  private phase: AsyncSchedulerPhase<T>;
  private inputHandle: AsyncSchedulerActorHandle<T>;
  private outputHandle: AsyncSchedulerActorHandle<T>;
  private outputQueue: AsyncQueue<T>;
  private nextHandleId: number = 0;
  private middleware: ((command: AsyncSchedulerCommand<T>) => void) | null;

  public constructor(
    factory: (context: HandlerContext<T>) => ActorFactory<ActorHandle<T>, T, T>,
    middleware?: (command: AsyncSchedulerCommand<T>) => void,
  ) {
    this.middleware = middleware ?? null;
    this.phase = this.PHASE_IDLE;
    this.handlers = new Map();
    const outputHandle = this.generateHandle<T>();
    const inputHandle = this.generateHandle<T>();
    this.inputHandle = inputHandle;
    this.outputHandle = outputHandle;
    this.outputQueue = new AsyncQueue<T>();
    const context = this.createHandlerContext(inputHandle);
    const rootActor = factory(context);
    const spawnedActors = collectSpawnedActors(context);
    // Register the root actor and any child actors that were spawned within the root actor factory
    const initActorSource = outputHandle;
    this.enqueueCommands([
      AsyncSchedulerCommand.Spawn({
        source: initActorSource,
        target: inputHandle,
        actor: rootActor,
        config: outputHandle,
      }),
      ...(Array.from(spawnedActors?.entries() ?? []).map(([handle, { actor, config }]) =>
        AsyncSchedulerCommand.Spawn({
          source: initActorSource,
          target: handle as AsyncSchedulerActorHandle<T>,
          actor,
          config,
        }),
      ) ?? []),
    ]);
    // Process the initial commands
    this.processCommands();
  }

  private spawnActor<C>(
    handle: AsyncSchedulerActorHandle<T>,
    actor: ActorFactory<C, T, T>,
    config: C,
  ): ActorState<T> {
    switch (actor.async) {
      case true: {
        return this.spawnAsyncActor(handle, actor, config);
      }
      case false: {
        return this.spawnSyncActor(handle, actor, config);
      }
    }
  }

  private spawnSyncActor<C>(
    handle: AsyncSchedulerActorHandle<T>,
    { factory }: SyncActorFactory<C, T, T, Actor<T, T>>,
    config: C,
  ): ActorState<T> {
    const actor = factory(config, handle);
    const context = this.createHandlerContext(handle);
    const initActions = typeof actor.init === 'function' ? actor.init(context) : null;
    if (initActions && initActions.length > 0) {
      const spawnedActors = collectSpawnedActors(context);
      const commands = initActions
        .map((action) => {
          switch (action[VARIANT]) {
            case HandlerActionType.Spawn: {
              const { target } = action;
              const spawner = spawnedActors?.get(target) ?? null;
              if (!spawner) return null;
              const { actor, config } = spawner;
              return AsyncSchedulerCommand.Spawn({
                source: handle,
                target: target as AsyncSchedulerActorHandle<T>,
                actor,
                config,
              });
            }
            case HandlerActionType.Send: {
              const { target, message } = action;
              return AsyncSchedulerCommand.Send({
                source: handle,
                target: target as AsyncSchedulerActorHandle<T>,
                message,
              });
            }
            case HandlerActionType.Kill: {
              const { target } = action;
              return AsyncSchedulerCommand.Kill({
                source: handle,
                target,
              });
            }
            case HandlerActionType.Fail: {
              const { target, error } = action;
              return AsyncSchedulerCommand.Fail({
                source: handle,
                target,
                error,
              });
            }
            default: {
              return unreachable(action);
            }
          }
        })
        .filter(nonNull);
      // The current method is always invoked synchronously by the scheduler,
      // there is no need to trigger a new command processing cycle after queueing the commands
      this.enqueueCommands(commands);
    }
    return ActorState.Sync({ handle, actor, context });
  }

  private spawnAsyncActor<C>(
    handle: AsyncSchedulerActorHandle<T>,
    { factory }: AsyncActorFactory<C, T, T>,
    config: C,
  ): ActorState<T> {
    const actor = factory(config, handle);
    const inbox = new AsyncQueue<T>();
    const outbox = new AsyncQueue<AsyncTaskResult<T>>();
    this.subscribeAsyncHandlerEvents(actor, inbox, outbox, (actions) => {
      const commands = this.parseAsyncTaskResult(actions, handle);
      // The current callback is invoked asynchronously, so after queueing the commands
      // we need to trigger a new command processing cycle
      this.enqueueCommands(commands);
      this.processCommands();
    });
    return ActorState.Async({ handle, actor, inbox, outbox });
  }

  private subscribeAsyncHandlerEvents<I, O>(
    handler: AsyncTask<I, O>,
    inbox: AsyncQueue<I>,
    outbox: AsyncQueue<AsyncTaskResult<O>>,
    callback: (results: AsyncTaskResult<O>) => void,
  ): Promise<void> {
    return Promise.race([
      this.subscribeHandlerMessages(handler, inbox, outbox),
      subscribeAsyncIterator(outbox, callback).then(() => {}),
    ]);
  }
  private subscribeHandlerMessages<I, O>(
    handler: AsyncTask<I, O>,
    inbox: AsyncQueue<I>,
    outbox: AsyncQueue<AsyncTaskResult<O>>,
  ): Promise<void> {
    return handler(inbox, (actions) => outbox.push(actions));
  }

  private parseAsyncTaskResult(
    actions: AsyncTaskResult<T>,
    source: AsyncSchedulerActorHandle<T>,
  ): Array<AsyncSchedulerCommand<T>> {
    if (!actions || actions.length === 0) return [];
    const commands = actions.map((action) => {
      switch (action[VARIANT]) {
        case HandlerActionType.Send: {
          const { target, message } = action;
          return AsyncSchedulerCommand.Send({
            source,
            target: target as AsyncSchedulerActorHandle<T>,
            message,
          });
        }
        case HandlerActionType.Kill: {
          const { target } = action;
          return AsyncSchedulerCommand.Kill({
            source,
            target,
          });
        }
        case HandlerActionType.Fail: {
          const { target, error } = action;
          return AsyncSchedulerCommand.Fail({
            source,
            target,
            error,
          });
        }
        default: {
          return unreachable(action);
        }
      }
    });
    return commands;
  }

  private createHandlerContext<T>(
    handle: AsyncSchedulerActorHandle<T>,
  ): AsyncSchedulerHandlerContext<T> {
    const generateHandle = this.generateHandle.bind(this);
    return new AsyncSchedulerHandlerContext(handle, generateHandle);
  }

  private generateHandle<T>(): AsyncSchedulerActorHandle<T> {
    const uid = this.nextHandleId++;
    return new AsyncSchedulerActorHandle(uid);
  }

  public dispatch(message: T): void {
    if (this.handlers.size === 0) return;
    this.enqueueCommands([
      AsyncSchedulerCommand.Send({
        source: null,
        target: this.inputHandle,
        message,
      }),
    ]);
    return this.processCommands();
  }

  public async next(): Promise<IteratorResult<T, undefined>> {
    const result = await this.outputQueue.next();
    if (result.done) return { done: true, value: undefined };
    return result;
  }

  private enqueueCommands(commands: Array<AsyncSchedulerCommand<T>>): void {
    if (commands.length === 0) return;
    switch (this.phase[VARIANT]) {
      case AsyncSchedulerPhaseType.Idle: {
        this.phase = AsyncSchedulerPhase.Queued({ queue: commands });
        break;
      }
      case AsyncSchedulerPhaseType.Queued:
      case AsyncSchedulerPhaseType.Busy: {
        this.phase.queue.push(...commands);
        break;
      }
      default: {
        return unreachable(this.phase);
      }
    }
  }

  private processCommands(): void {
    // If there are no queued commands, or another dispatch is already ongoing, bail out
    if (AsyncSchedulerPhase.Idle.is(this.phase) || AsyncSchedulerPhase.Busy.is(this.phase)) {
      return;
    }
    // Instantiate the busy phase with the currently-queued commands
    this.phase = AsyncSchedulerPhase.Busy({ queue: this.phase.queue });
    let command: AsyncSchedulerCommand<T> | undefined;
    // Iterate through all queued commands until the queue is exhausted
    loop: while (AsyncSchedulerPhase.Busy.is(this.phase) && (command = this.phase.queue.shift())) {
      if (this.middleware) this.middleware(command);
      switch (command[VARIANT]) {
        case AsyncSchedulerCommandType.Send: {
          const { message, target } = command;
          const handlerState = this.handlers.get(target);
          if (!handlerState) {
            if (target === this.outputHandle) this.outputQueue.push(message);
            continue;
          }
          switch (handlerState[VARIANT]) {
            case ActorStateType.Sync: {
              const { actor, handle, context } = handlerState;
              // Handle the message immediately
              const commands = this.invokeHandler(actor, context, message, handle);
              this.phase.queue.push(...commands);
              break;
            }
            case ActorStateType.Async: {
              // Push the message into the handler's event queue
              // (this will flow through the event handler asynchronously, to be picked up by the handler's
              // event subscriber callback as an internal action)
              handlerState.inbox.push(message);
              break;
            }
          }
          break;
        }
        case AsyncSchedulerCommandType.Spawn: {
          const { target, actor, config } = command;
          if (this.handlers.has(target)) continue;
          this.handlers.set(target, this.spawnActor(target, actor, config));
          break;
        }
        case AsyncSchedulerCommandType.Kill:
        case AsyncSchedulerCommandType.Fail: {
          const { target } = command;
          const handlerState = this.handlers.get(target as AsyncSchedulerActorHandle<T>);
          if (!handlerState) continue;
          if (ActorState.Async.is(handlerState)) {
            handlerState.inbox.return();
            handlerState.outbox.return();
          }
          this.handlers.delete(target as AsyncSchedulerActorHandle<T>);
          if (this.handlers.size === 0) {
            this.outputQueue.return();
            break loop;
          }
          break;
        }
        default: {
          return unreachable(command);
        }
      }
    }
    this.phase = this.PHASE_IDLE;
  }

  private invokeHandler(
    actor: Actor<T, T>,
    context: AsyncSchedulerHandlerContext<T>,
    message: T,
    source: AsyncSchedulerActorHandle<T> | null,
  ): Array<AsyncSchedulerCommand<T>> {
    const results = actor.handle(message, context);
    if (!results) return [];
    const spawnedActors = collectSpawnedActors(context);
    const commands = new Array<AsyncSchedulerCommand<T>>();
    for (const action of results) {
      switch (action[VARIANT]) {
        case HandlerActionType.Send: {
          const { target, message } = action;
          const command = AsyncSchedulerCommand.Send({
            source,
            target: target as AsyncSchedulerActorHandle<T>,
            message,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Spawn: {
          const { target } = action;
          if (!spawnedActors) continue;
          const spawner = spawnedActors.get(target);
          if (!spawner) continue;
          const { actor, config } = spawner;
          const command = AsyncSchedulerCommand.Spawn({
            source,
            target: target as AsyncSchedulerActorHandle<T>,
            actor,
            config,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Kill: {
          const { target } = action;
          const command = AsyncSchedulerCommand.Kill({
            source,
            target,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Fail: {
          const { target, error } = action;
          const command = AsyncSchedulerCommand.Fail({
            source,
            target,
            error,
          });
          commands.push(command);
          break;
        }
        default: {
          return unreachable(action);
        }
      }
    }
    return commands;
  }
}

export class AsyncSchedulerActorHandle<T> implements ActorHandle<T> {
  private uid: number;

  public constructor(uid: number) {
    this.uid = uid;
  }

  public id(): number {
    return this.uid;
  }

  public get [ACTOR_HANDLE_TYPE](): never {
    return undefined as never;
  }
}

class AsyncSchedulerHandlerContext<T> implements HandlerContext<T> {
  private handle: AsyncSchedulerActorHandle<T>;
  private generateHandle: <T>() => AsyncSchedulerActorHandle<T>;
  public readonly spawned = new Array<{
    // These are not typed because the spawned child might expect different message types from the parent,
    // however this is incompatible with the type system of the scheduler, which assumes all actors have the same message type
    /* eslint-disable @typescript-eslint/no-explicit-any */
    handle: AsyncSchedulerActorHandle<any>;
    actor: ActorCreator<any, any, any>;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }>();

  public constructor(
    handle: AsyncSchedulerActorHandle<T>,
    generateHandle: <T>() => AsyncSchedulerActorHandle<T>,
  ) {
    this.handle = handle;
    this.generateHandle = generateHandle;
  }

  public self(): ActorHandle<T> {
    return this.handle;
  }

  public spawn<C, I, O>(actor: ActorCreator<C, I, O>): ActorHandle<I> {
    const handle = this.generateHandle<I>();
    this.spawned.push({ handle, actor });
    return handle;
  }
}

function collectSpawnedActors<T>(
  context: AsyncSchedulerHandlerContext<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Map<ActorHandle<T>, ActorCreator<any, any, any>> | null {
  const { spawned } = context;
  if (spawned.length === 0) return null;
  const spawnedActors = new Map(spawned.map(({ handle, actor: spawner }) => [handle, spawner]));
  spawned.length = 0;
  return spawnedActors;
}
