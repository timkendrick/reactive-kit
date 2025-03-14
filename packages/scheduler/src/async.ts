import {
  ActorHandle,
  AsyncActor,
  HandlerActionType,
  HandlerContext,
  HandlerResult,
  Actor,
  ActorType,
  ActorCreator,
  ActorFactory,
} from '@reactive-kit/actor';
import {
  AsyncQueue,
  Enum,
  EnumVariant,
  VARIANT,
  instantiateEnum,
  subscribeAsyncIterator,
} from '@reactive-kit/utils';

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
  actor: Actor<T, T>;
  context: SchedulerHandlerContext<T>;
}

interface AsyncActorState<T> {
  handle: ActorHandle<T>;
  actor: AsyncActor<T>;
  inbox: AsyncQueue<T>;
  outbox: AsyncQueue<HandlerResult<T>>;
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

type AsyncSchedulerPhase<T> = Enum<{
  Idle: void;
  Busy: {
    queue: Array<AsyncSchedulerCommand<T>>;
  };
}>;

type AsyncSchedulerCommand<T> = Enum<{
  Dispatch: {
    target: SchedulerActorHandle<T>;
    message: T;
  };
  // FIXME: remove unused variant
  Handle: {
    handler: Actor<T, T>;
    context: SchedulerHandlerContext<T>;
    message: T;
  };
  Spawn: {
    target: SchedulerActorHandle<T>;
    actor: ActorCreator<unknown, T, T>;
  };
  Kill: {
    target: ActorHandle<T>;
  };
}>;

export const ROOT_ACTOR_TYPE: ActorType = '@reactive-kit/async-scheduler/root';

export class AsyncScheduler<T> implements AsyncIterator<T, null> {
  private handlers: Map<unknown, ActorState<T>>;
  private phase: AsyncSchedulerPhase<T> = instantiateEnum<AsyncSchedulerPhase<T>>('Idle', {});
  private inputHandle: SchedulerActorHandle<T>;
  private outputHandle: SchedulerActorHandle<T>;
  private outputQueue: AsyncQueue<T>;
  private nextHandleId: number = 1;

  public constructor(factory: (context: HandlerContext<T>) => ActorFactory<ActorHandle<T>, T, T>) {
    this.phase;
    this.handlers = new Map();
    const inputHandle = this.generateHandle<T>();
    const outputHandle = this.generateHandle<T>();
    this.inputHandle = inputHandle;
    this.outputHandle = outputHandle;
    this.outputQueue = new AsyncQueue<T>();
    const context = this.createHandlerContext(inputHandle);
    const rootActor = factory(context);
    const spawnedActors = collectSpawnedActors(context);
    this.handlers.set(
      inputHandle,
      this.spawnActor(inputHandle, { actor: rootActor, config: outputHandle }),
    );
    for (const [handle, spawner] of spawnedActors ?? []) {
      this.handlers.set(handle, this.spawnActor(handle as SchedulerActorHandle<T>, spawner));
    }
  }

  private spawnActor<C>(
    handle: SchedulerActorHandle<T>,
    spawner: ActorCreator<C, T, T>,
  ): ActorState<T> {
    switch (spawner.actor.async) {
      case false: {
        const actor = spawner.actor.factory(spawner.config);
        const context = this.createHandlerContext(handle);
        return ActorState.Sync({ handle, actor, context });
      }
      case true: {
        const actor = spawner.actor.factory(spawner.config, handle);
        const inbox = new AsyncQueue<T>();
        const outbox = new AsyncQueue<HandlerResult<T>>();
        subscribeHandlerEvents(actor, inbox, outbox, (results: HandlerResult<unknown>): void => {
          if (!results || results.length === 0) return;
          this.handleCommands(
            results.map((action) => {
              switch (action[VARIANT]) {
                case HandlerActionType.Spawn: {
                  const { target } = action;
                  return instantiateEnum<AsyncSchedulerCommand<T>>('Spawn', {
                    target,
                    actor,
                  });
                }
                case HandlerActionType.Kill: {
                  const { target } = action;
                  return instantiateEnum<AsyncSchedulerCommand<T>>('Kill', {
                    target,
                  });
                }
                case HandlerActionType.Send: {
                  const { target, message } = action;
                  return instantiateEnum<AsyncSchedulerCommand<T>>('Dispatch', {
                    target,
                    message,
                  });
                }
              }
            }),
          );
        });
        return ActorState.Async({ handle, actor, inbox, outbox });
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

  public dispatch(message: T): void {
    if (this.handlers.size === 0) return;
    return this.handleCommands([
      instantiateEnum<AsyncSchedulerCommand<T>>('Dispatch', {
        target: this.inputHandle,
        message,
      }),
    ]);
  }

  public next(): Promise<IteratorResult<T, null>> {
    return this.outputQueue.next();
  }

  private handleCommands(commands: Array<AsyncSchedulerCommand<T>>): void {
    // If another dispatch is already in progress, push the actions onto the internal queue
    if (this.phase[VARIANT] === 'Busy') {
      this.phase.queue.push(...commands);
      return;
    }
    const idlePhase = this.phase;
    this.phase = instantiateEnum<AsyncSchedulerPhase<T>>('Busy', {
      queue: [...commands],
    });
    let command: AsyncSchedulerCommand<T> | undefined;
    // Iterate through all queued commands until the queue is exhausted
    while (this.phase[VARIANT] === 'Busy' && (command = this.phase.queue.shift())) {
      switch (command[VARIANT]) {
        case 'Dispatch': {
          const { message, target } = command;
          const handlerState = this.handlers.get(target);
          if (!handlerState) {
            if (target === this.outputHandle) this.outputQueue.push(message);
            continue;
          }
          switch (handlerState[VARIANT]) {
            case ActorStateType.Sync: {
              const { actor, context } = handlerState;
              // Handle the message immediately
              const commands = this.invokeHandler(actor, context, message);
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
        case 'Handle': {
          const { handler, context, message } = command;
          const commands = this.invokeHandler(handler, context, message);
          this.phase.queue.push(...commands);
          break;
        }
        case 'Spawn': {
          const { target, actor } = command;
          if (this.handlers.has(target)) continue;
          this.handlers.set(target, this.spawnActor(target, actor));
          break;
        }
        case 'Kill': {
          const { target } = command;
          const handlerState = this.handlers.get(target);
          if (!handlerState) continue;
          this.handlers.delete(target);
          if (handlerState[VARIANT] === ActorStateType.Async) {
            handlerState.inbox.return();
            handlerState.outbox.return();
          }
          break;
        }
      }
    }
    this.phase = idlePhase;
    if (this.handlers.size === 0) this.outputQueue.return();
  }

  private invokeHandler(
    actor: Actor<T, T>,
    context: SchedulerHandlerContext<T>,
    message: T,
  ): Array<AsyncSchedulerCommand<T>> {
    const results = actor.handle(message, context);
    const spawnedActors = collectSpawnedActors(context);
    if (!results) return [];
    const commands = new Array<AsyncSchedulerCommand<T>>();
    for (const action of results) {
      switch (action[VARIANT]) {
        case HandlerActionType.Send: {
          const { target, message } = action;
          const command = instantiateEnum<AsyncSchedulerCommand<T>>('Dispatch', {
            target,
            message,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Spawn: {
          const { target } = action;
          if (!spawnedActors) continue;
          const actor = spawnedActors.get(target);
          if (!actor) continue;
          const command = instantiateEnum<AsyncSchedulerCommand<T>>('Spawn', {
            target,
            actor,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Kill: {
          const { target } = action;
          const command = instantiateEnum<AsyncSchedulerCommand<T>>('Kill', {
            target,
          });
          commands.push(command);
          break;
        }
      }
    }
    return commands;
  }
}

function subscribeHandlerEvents<I, O>(
  handler: AsyncActor<I, O>,
  inbox: AsyncQueue<I>,
  outbox: AsyncQueue<HandlerResult<O>>,
  callback: (results: HandlerResult<unknown>) => void,
): Promise<void> {
  return Promise.race([
    subscribeHandlerMessages(handler, inbox, outbox),
    subscribeAsyncIterator(outbox, callback).then(() => {}),
  ]);
}

function subscribeHandlerMessages<I, O>(
  handler: AsyncActor<I, O>,
  inbox: AsyncQueue<I>,
  outbox: AsyncQueue<HandlerResult<O>>,
): Promise<void> {
  const enum MessageType {
    Input,
    Output,
  }
  function withMessageType<T extends MessageType, V>(
    type: T,
    result: Promise<V>,
  ): Promise<{ type: T; result: V }> {
    return result.then((result) => ({ type, result }));
  }
  return new Promise<void>((resolve) => {
    let isInputCompleted = false;
    let isOutputCompleted = false;
    let nextInput = withMessageType(MessageType.Input, inbox.next());
    let nextOutput = withMessageType(MessageType.Output, handler.next());
    return next();

    function next(): void {
      Promise.race([nextInput, nextOutput]).then((status) => {
        switch (status.type) {
          case MessageType.Input: {
            const { result } = status;
            if (result.done) {
              isInputCompleted = true;
              nextInput = never();
              if (isOutputCompleted) return resolve();
              return next();
            }
            const { value: message } = result;
            nextInput = withMessageType(MessageType.Input, inbox.next());
            nextOutput = withMessageType(MessageType.Output, handler.next(message));
            return next();
          }
          case MessageType.Output: {
            const { result } = status;
            const { value: handlerResult } = result;
            isOutputCompleted = Boolean(result.done);
            nextOutput = isOutputCompleted
              ? never()
              : withMessageType(MessageType.Output, handler.next());
            outbox.push(handlerResult);
            if (isInputCompleted && isOutputCompleted) return resolve();
            return next();
          }
        }
      });
    }

    function never(): Promise<never> {
      return new Promise<never>(() => {});
    }
  }).then(() => {
    handler.return?.();
  });
}

class SchedulerActorHandle<T> implements ActorHandle<T> {
  public _type: ActorHandle<T>['_type'] = undefined as never;
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
  public readonly spawned = new Array<{
    // These are not typed because the spawned child might expect different message types from the parent,
    // however this is incompatible with the type system of the scheduler, which assumes all actors have the same message type
    handle: SchedulerActorHandle<any>;
    actor: ActorCreator<any, any, any>;
  }>();

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

  public spawn<C, I, O>(actor: ActorCreator<C, I, O>): ActorHandle<I> {
    const handle = this.generateHandle<I>();
    this.spawned.push({ handle, actor });
    return handle;
  }
}

function collectSpawnedActors<T>(
  context: SchedulerHandlerContext<T>,
): Map<ActorHandle<T>, ActorCreator<any, any, any>> | null {
  const { spawned } = context;
  if (spawned.length === 0) return null;
  const spawnedActors = new Map(spawned.map(({ handle, actor: spawner }) => [handle, spawner]));
  spawned.length = 0;
  return spawnedActors;
}
