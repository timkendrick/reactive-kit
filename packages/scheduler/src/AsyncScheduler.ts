import {
  ACTOR_HANDLE_TYPE,
  HandlerActionType,
  type Actor,
  type ActorCreator,
  type ActorFactory,
  type ActorHandle,
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

import { createSchedulerCommandMessage, type SchedulerCommandMessage } from './messages';
import { SchedulerCommand, SchedulerCommandType, type SchedulerMiddlewareFactory } from './types';

type ActorState<T> = Enum<{
  [ActorStateType.Sync]: {
    handle: AsyncSchedulerActorHandle<T>;
    actor: Actor<T, T>;
    context: AsyncSchedulerHandlerContext<T>;
    origin: SchedulerCommandOrigin;
  };
  [ActorStateType.Async]: {
    handle: ActorHandle<T>;
    actor: AsyncTask<T, T>;
    inbox: AsyncQueue<T>;
    outbox: AsyncQueue<AsyncTaskResult<T>>;
    origin: SchedulerCommandOrigin;
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
    queue: Array<SchedulerQueueItem<T>>;
  };
  [AsyncSchedulerPhaseType.Busy]: {
    queue: Array<SchedulerQueueItem<T>>;
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

// Internal queue item types for command routing
type SchedulerQueueItem<T> = Enum<{
  [SchedulerCommandOrigin.External]: {
    command: SchedulerCommand<T>;
  };
  [SchedulerCommandOrigin.Internal]: {
    command: SchedulerCommand<T>;
  };
}>;
enum SchedulerCommandOrigin {
  External = 'External',
  Internal = 'Internal',
}
interface GenericSchedulerQueueItem extends GenericEnum<1> {
  instance: SchedulerQueueItem<this['T1']>;
}
const SchedulerQueueItem = Enum.create<GenericSchedulerQueueItem>({
  [SchedulerCommandOrigin.External]: true,
  [SchedulerCommandOrigin.Internal]: true,
});

export class AsyncScheduler<T> implements AsyncIterator<T, undefined> {
  private PHASE_IDLE: EnumVariant<AsyncSchedulerPhase<T>, AsyncSchedulerPhaseType.Idle> =
    AsyncSchedulerPhase.Idle();

  private handlers: Map<AsyncSchedulerActorHandle<T>, ActorState<T>>;
  private numInternalActors: number = 0;
  private numExternalActors: number = 0;
  private isTerminating: boolean = false;
  private phase: AsyncSchedulerPhase<T>;
  public readonly inputHandle: AsyncSchedulerActorHandle<T>;
  public readonly outputHandle: AsyncSchedulerActorHandle<T>;
  public readonly internalHandle: AsyncSchedulerActorHandle<T>;
  private outputQueue: AsyncQueue<T>;
  private nextHandleId: number = 0;
  private middlewareInputHandle: AsyncSchedulerActorHandle<SchedulerCommandMessage<T>> | null =
    null;

  public constructor(
    factory: (context: HandlerContext<T>) => ActorFactory<ActorHandle<T>, T, T>,
    middleware?: SchedulerMiddlewareFactory<T>,
  ) {
    this.phase = this.PHASE_IDLE;
    this.inputHandle = this.generateHandle<T>();
    this.outputHandle = this.generateHandle<T>();
    this.internalHandle = this.generateHandle<T>();
    this.handlers = new Map();
    this.outputQueue = new AsyncQueue<T>();
    // Set up middleware pipeline if middleware was provided
    if (middleware) {
      this.middlewareInputHandle = this.generateHandle<SchedulerCommandMessage<T>>();
      this.initMiddleware(middleware, this.middlewareInputHandle, this.internalHandle);
    }
    // Set up the root application actor
    this.initRootActor(factory, this.inputHandle, this.outputHandle);
    // Process the initial commands
    this.processCommands();
  }

  private initRootActor(
    factory: (context: HandlerContext<T>) => ActorFactory<ActorHandle<T>, T, T>,
    inputHandle: AsyncSchedulerActorHandle<T>,
    outputHandle: AsyncSchedulerActorHandle<T>,
  ) {
    // Create the root actor
    const context = this.createHandlerContext(inputHandle);
    const rootActor = factory(context);
    const spawnedActors = collectSpawnedActors(context);
    // Register the root actor and any child actors that were spawned within the root actor factory
    // Spawn the root actor and its children in the external context (i.e. application-level actors)
    this.enqueueCommands(SchedulerCommandOrigin.External, [
      SchedulerCommand.Spawn({
        source: null,
        target: inputHandle,
        actor: rootActor as ActorFactory<unknown, T, T>,
        config: outputHandle,
      }),
      ...(Array.from(spawnedActors?.entries() ?? []).map(([handle, { actor, config }]) =>
        SchedulerCommand.Spawn({
          source: null,
          target: handle as AsyncSchedulerActorHandle<T>,
          actor,
          config,
        }),
      ) ?? []),
    ]);
  }

  private initMiddleware(
    factory: SchedulerMiddlewareFactory<T>,
    inputHandle: AsyncSchedulerActorHandle<SchedulerCommandMessage<T>>,
    outputHandle: AsyncSchedulerActorHandle<T>,
  ): void {
    // Spawn the middleware actor so it's ready immediately, assigning it to the internal context
    this.enqueueCommands(SchedulerCommandOrigin.Internal, [
      SchedulerCommand.Spawn({
        source: null,
        target: inputHandle,
        actor: factory as ActorFactory<unknown, T, T>,
        config: outputHandle,
      }),
    ]);
  }

  private spawnActor<C>(
    handle: AsyncSchedulerActorHandle<T>,
    actor: ActorFactory<C, T, T>,
    config: C,
    origin: SchedulerCommandOrigin,
  ): ActorState<T> {
    switch (actor.async) {
      case true: {
        return this.spawnAsyncActor(handle, actor, config, origin);
      }
      case false: {
        return this.spawnSyncActor(handle, actor, config, origin);
      }
    }
  }

  private spawnSyncActor<C>(
    handle: AsyncSchedulerActorHandle<T>,
    { factory }: SyncActorFactory<C, T, T, Actor<T, T>>,
    config: C,
    origin: SchedulerCommandOrigin,
  ): ActorState<T> {
    const actor = factory(config, handle);
    const context = this.createHandlerContext(handle);
    const initActions = actor.init?.(context) ?? null;
    const spawnedActors = collectSpawnedActors(context);
    if (initActions && initActions.length > 0) {
      const commands = initActions
        .map((action) => {
          switch (action[VARIANT]) {
            case HandlerActionType.Spawn: {
              const { target } = action;
              const spawner = spawnedActors?.get(target) ?? null;
              if (!spawner) return null;
              const { actor, config } = spawner;
              return SchedulerCommand.Spawn({
                source: handle,
                target: target as AsyncSchedulerActorHandle<T>,
                actor,
                config,
              });
            }
            case HandlerActionType.Send: {
              const { target, message } = action;
              return SchedulerCommand.Send({
                source: handle,
                target: target as AsyncSchedulerActorHandle<T>,
                message,
              });
            }
            case HandlerActionType.Kill: {
              const { target } = action;
              return SchedulerCommand.Kill({
                source: handle,
                target,
              });
            }
            case HandlerActionType.Fail: {
              const { target, error } = action;
              return SchedulerCommand.Fail({
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
      // Use the actor's origin context for commands it generates during init
      this.enqueueCommands(origin, commands);
    }
    return ActorState.Sync({ handle, actor, context, origin });
  }

  private spawnAsyncActor<C>(
    handle: AsyncSchedulerActorHandle<T>,
    { factory }: AsyncActorFactory<C, T, T>,
    config: C,
    origin: SchedulerCommandOrigin,
  ): ActorState<T> {
    const actor = factory(config, handle);
    const inbox = new AsyncQueue<T>();
    const outbox = new AsyncQueue<AsyncTaskResult<T>>();
    this.subscribeAsyncHandlerEvents(actor, inbox, outbox, (actions) => {
      const commands = this.parseAsyncTaskResult(actions, handle);
      // The current callback is invoked asynchronously, so after queueing the commands
      // we need to trigger a new command processing cycle
      // Use the actor's origin context for commands it generates
      this.enqueueCommands(origin, commands);
      this.processCommands();
    });
    return ActorState.Async({ handle, actor, inbox, outbox, origin });
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
  ): Array<SchedulerCommand<T>> {
    if (!actions || actions.length === 0) return [];
    const commands = actions.map((action) => {
      switch (action[VARIANT]) {
        case HandlerActionType.Send: {
          const { target, message } = action;
          return SchedulerCommand.Send({
            source,
            target: target as AsyncSchedulerActorHandle<T>,
            message,
          });
        }
        case HandlerActionType.Kill: {
          const { target } = action;
          return SchedulerCommand.Kill({
            source,
            target,
          });
        }
        case HandlerActionType.Fail: {
          const { target, error } = action;
          return SchedulerCommand.Fail({
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

  private createHandlerContext<I>(
    handle: AsyncSchedulerActorHandle<I>,
  ): AsyncSchedulerHandlerContext<I> {
    const generateHandle = this.generateHandle.bind(this);
    return new AsyncSchedulerHandlerContext(handle, generateHandle);
  }

  private generateHandle<T>(): AsyncSchedulerActorHandle<T> {
    const uid = this.nextHandleId++;
    return new AsyncSchedulerActorHandle(uid);
  }

  public dispatch(message: T): void {
    if (this.handlers.size === 0) return;
    this.enqueueCommands(SchedulerCommandOrigin.External, [
      SchedulerCommand.Send({
        source: this.internalHandle,
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

  private enqueueCommands(
    type: SchedulerCommandOrigin,
    commands: Array<SchedulerCommand<T>>,
  ): void {
    if (commands.length === 0) return;
    const queueItems = commands.map((command) =>
      type === SchedulerCommandOrigin.External
        ? SchedulerQueueItem.External({ command })
        : SchedulerQueueItem.Internal({ command }),
    );
    switch (this.phase[VARIANT]) {
      case AsyncSchedulerPhaseType.Idle: {
        this.phase = AsyncSchedulerPhase.Queued({ queue: queueItems });
        break;
      }
      case AsyncSchedulerPhaseType.Queued:
      case AsyncSchedulerPhaseType.Busy: {
        this.phase.queue.push(...queueItems);
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
    // Keep track of actors that have been disposed during this cycle
    // so that we can ignore commands sent from them or targeting them
    const disposedActors = new Set<ActorHandle<T>>();
    // Main cycle: process all queued commands, then determine whether application is still active
    // If the application is no longer active, initiate termination
    active: while (true) {
      // Determine whether the application's root actor has been instantiated
      let isInitialized = this.numExternalActors > 0;
      // Iterate through all queued commands until the queue is exhausted
      let queueItem: SchedulerQueueItem<T> | undefined;
      while (AsyncSchedulerPhase.Busy.is(this.phase) && (queueItem = this.phase.queue.shift())) {
        // Ignore any commands sent from or targeting disposed actors
        if (queueItem[VARIANT] === SchedulerCommandOrigin.External) {
          const isTargetingDisposedActor =
            !SchedulerCommand.Terminate.is(queueItem.command) &&
            disposedActors.has(queueItem.command.target);
          if (isTargetingDisposedActor) continue;
          const isSentFromDisposedActor =
            SchedulerCommand.Send.is(queueItem.command) &&
            queueItem.command.source !== null &&
            disposedActors.has(queueItem.command.source);
          if (isSentFromDisposedActor) continue;
          if (
            queueItem.command[VARIANT] === SchedulerCommandType.Kill ||
            queueItem.command[VARIANT] === SchedulerCommandType.Fail
          ) {
            const { target } = queueItem.command;
            disposedActors.add(target);
          }
        }
        // If the command originated externally (from the application) and middleware is configured,
        // redispatch the command to the middleware and continue the loop with the next command
        const middlewareCommand: SchedulerCommandMessage<T> | null =
          this.middlewareInputHandle && queueItem[VARIANT] === SchedulerCommandOrigin.External
            ? createSchedulerCommandMessage(queueItem.command)
            : null;
        if (middlewareCommand) {
          // Send to middleware as an internal command
          this.enqueueCommands(SchedulerCommandOrigin.Internal, [
            SchedulerCommand.Send({
              source: null,
              target: this.middlewareInputHandle as unknown as AsyncSchedulerActorHandle<T>,
              message: middlewareCommand as unknown as T,
            }),
          ]);
          continue;
        }
        // Otherwise if this is an internal command, or there is no middleware configured,
        // execute the command immediately
        const { command } = queueItem;
        this.executeCommand(command, queueItem[VARIANT]);
        // If this command caused the application to become initialized, keep track of this fact
        // (this is required for applications that initialize and terminate within the same tick)
        isInitialized = isInitialized || this.numExternalActors > 0;
      }
      // If the application completed during this command processing cycle, initiate termination
      const wasAlreadyTerminating = this.isTerminating;
      const shouldTerminate =
        isInitialized && this.numExternalActors === 0 && !wasAlreadyTerminating;
      if (shouldTerminate) {
        this.isTerminating = true;
        // Initiate scheduler shutdown, sending the terminate command via the middleware pipeline
        this.enqueueCommands(SchedulerCommandOrigin.External, [SchedulerCommand.Terminate()]);
        continue active;
      }
      break;
    }
    this.phase = this.PHASE_IDLE;
  }

  private executeCommand(
    command: SchedulerCommand<T>,
    commandOrigin: SchedulerCommandOrigin,
  ): void {
    switch (command[VARIANT]) {
      case SchedulerCommandType.Send: {
        const { message, target } = command;
        const targetHandle = target as AsyncSchedulerActorHandle<T>;
        // Special case: If the target is the internal handle, this indicates the message
        // has been emitted from the middleware, so unwrap the message and execute it
        if (targetHandle === this.internalHandle) {
          const wrappedMessage = message as unknown as SchedulerCommandMessage<T>;
          // Despite the command coming from the middleware, its ultimate origin is the application,
          // so we pretend that the command came directly from the application.
          // This ensures that any commands emitted in response to this one will be correctly
          // identified as application-level commands.
          const origin = SchedulerCommandOrigin.External;
          return this.executeCommand(wrappedMessage.payload, origin);
        }
        const handlerState = this.handlers.get(targetHandle);
        if (!handlerState) {
          if (targetHandle === this.outputHandle) this.outputQueue.push(message);
          return;
        }
        switch (handlerState[VARIANT]) {
          case ActorStateType.Sync: {
            const { actor, handle, context, origin } = handlerState;
            // Handle the message immediately
            const commands = this.invokeHandler(actor, context, message, handle);
            // Use the actor's stored origin context for commands it generates
            this.enqueueCommands(origin, commands);
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
        return;
      }
      case SchedulerCommandType.Spawn: {
        const { target, actor, config } = command;
        const targetHandle = target as AsyncSchedulerActorHandle<T>;
        // If the actor already exists, silently ignore the command
        if (this.handlers.has(targetHandle)) return;
        // Inherit the origin context from the command that spawned this actor
        const actorState = this.spawnActor(targetHandle, actor, config, commandOrigin);
        this.handlers.set(targetHandle, actorState);
        if (actorState.origin === SchedulerCommandOrigin.Internal) {
          this.numInternalActors++;
        } else {
          this.numExternalActors++;
        }
        return;
      }
      case SchedulerCommandType.Kill:
      case SchedulerCommandType.Fail: {
        const { target } = command;
        const actorState = this.handlers.get(target as AsyncSchedulerActorHandle<T>);
        // If the actor does not exist, silently ignore the command
        if (!actorState) return;
        // Dispose async actor inbox and outbox
        if (ActorState.Async.is(actorState)) {
          actorState.inbox.return();
          actorState.outbox.return();
        }
        this.handlers.delete(target as AsyncSchedulerActorHandle<T>);
        if (actorState.origin === SchedulerCommandOrigin.Internal) {
          this.numInternalActors--;
        } else {
          this.numExternalActors--;
        }
        return;
      }
      case SchedulerCommandType.Terminate: {
        // Terminate the output queue so that iteration will complete for consumers
        this.outputQueue.return();
        return;
      }
      default: {
        return unreachable(command);
      }
    }
  }

  private invokeHandler(
    actor: Actor<T, T>,
    context: AsyncSchedulerHandlerContext<T>,
    message: T,
    source: AsyncSchedulerActorHandle<T> | null,
  ): Array<SchedulerCommand<T>> {
    const results = actor.handle(message, context);
    if (!results) return [];
    const spawnedActors = collectSpawnedActors(context);
    const commands = new Array<SchedulerCommand<T>>();
    for (const action of results) {
      switch (action[VARIANT]) {
        case HandlerActionType.Send: {
          const { target, message } = action;
          const command = SchedulerCommand.Send({
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
          const command = SchedulerCommand.Spawn({
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
          const command = SchedulerCommand.Kill({
            source,
            target,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Fail: {
          const { target, error } = action;
          const command = SchedulerCommand.Fail({
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

  public toJSON(): object {
    return {
      __type: 'AsyncSchedulerActorHandle',
      uid: this.uid,
    };
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

function collectSpawnedActors<T>(context: AsyncSchedulerHandlerContext<T>): Map<
  ActorHandle<T>,
  // These are not typed because the spawned child might expect different message types from the parent,
  // however this is incompatible with the type system of the scheduler, which assumes all actors have the same message type
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ActorCreator<any, any, any>
> | null {
  const { spawned } = context;
  if (spawned.length === 0) return null;
  const spawnedActors = new Map(spawned.map(({ handle, actor: spawner }) => [handle, spawner]));
  spawned.length = 0;
  return spawnedActors;
}
