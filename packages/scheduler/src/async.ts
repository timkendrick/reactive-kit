import {
  HandlerActionType,
  type Actor,
  type ActorCreator,
  type ActorFactory,
  type ActorHandle,
  type ActorType,
  type AsyncTask,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';
import {
  AsyncQueue,
  Enum,
  VARIANT,
  nonNull,
  subscribeAsyncIterator,
  type GenericEnum,
} from '@reactive-kit/utils';

type ActorState<T> = Enum<{
  [ActorStateType.Sync]: SyncActorState<T>;
  [ActorStateType.Async]: AsyncActorState<T>;
}>;
const enum ActorStateType {
  Sync = 'Sync',
  Async = 'Async',
}
interface SyncActorState<T> {
  handle: ActorHandle<T>;
  actor: Actor<T, T>;
  context: SchedulerHandlerContext<T>;
}
interface AsyncActorState<T> {
  handle: ActorHandle<T>;
  actor: AsyncTask<T, T>;
  inbox: AsyncQueue<T>;
  outbox: AsyncQueue<HandlerResult<T>>;
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
  [AsyncSchedulerPhaseType.Busy]: {
    queue: Array<AsyncSchedulerCommand<T>>;
  };
}>;
const enum AsyncSchedulerPhaseType {
  Idle = 'Idle',
  Busy = 'Busy',
}
interface GenericAsyncSchedulerPhase extends GenericEnum<1> {
  instance: AsyncSchedulerPhase<this['T1']>;
}
const AsyncSchedulerPhase = Enum.create<GenericAsyncSchedulerPhase>({
  [AsyncSchedulerPhaseType.Idle]: true,
  [AsyncSchedulerPhaseType.Busy]: true,
});

type AsyncSchedulerCommand<T> = Enum<{
  Dispatch: {
    target: SchedulerActorHandle<T>;
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
interface GenericAsyncSchedulerCommand extends GenericEnum<1> {
  instance: AsyncSchedulerCommand<this['T1']>;
}
const AsyncSchedulerCommand = Enum.create<GenericAsyncSchedulerCommand>({
  Dispatch: true,
  Spawn: true,
  Kill: true,
});

export const ROOT_ACTOR_TYPE: ActorType = '@reactive-kit/async-scheduler/root';

export class AsyncScheduler<T> implements AsyncIterator<T, undefined> {
  private handlers: Map<unknown, ActorState<T>>;
  private phase: AsyncSchedulerPhase<T>;
  private inputHandle: SchedulerActorHandle<T>;
  private outputHandle: SchedulerActorHandle<T>;
  private outputQueue: AsyncQueue<T>;
  private nextHandleId: number = 1;

  public constructor(factory: (context: HandlerContext<T>) => ActorFactory<ActorHandle<T>, T, T>) {
    this.phase = AsyncSchedulerPhase.Idle();
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
      this.spawnActor(
        inputHandle,
        rootActor.async
          ? { actor: rootActor, config: outputHandle }
          : { actor: rootActor, config: outputHandle },
      ),
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
        const actor = spawner.actor.factory(spawner.config, handle);
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
            results
              .map((action) => {
                switch (action[VARIANT]) {
                  case HandlerActionType.Spawn: {
                    return null;
                  }
                  case HandlerActionType.Kill: {
                    const { target } = action;
                    return AsyncSchedulerCommand.Kill({
                      target: target as ActorHandle<T>,
                    });
                  }
                  case HandlerActionType.Send: {
                    const { target, message } = action;
                    return AsyncSchedulerCommand.Dispatch({
                      target: target as SchedulerActorHandle<T>,
                      message: message as T,
                    });
                  }
                }
              })
              .filter(nonNull),
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
    const uid = this.nextHandleId++;
    return new SchedulerActorHandle(uid);
  }

  public dispatch(message: T): void {
    if (this.handlers.size === 0) return;
    return this.handleCommands([
      AsyncSchedulerCommand.Dispatch({
        target: this.inputHandle,
        message,
      }),
    ]);
  }

  public async next(): Promise<IteratorResult<T, undefined>> {
    const result = await this.outputQueue.next();
    if (result.done) return { done: true, value: undefined };
    return result;
  }

  private handleCommands(commands: Array<AsyncSchedulerCommand<T>>): void {
    // If another dispatch is already in progress, push the actions onto the internal queue
    if (this.phase[VARIANT] === 'Busy') {
      this.phase.queue.push(...commands);
      return;
    }
    const idlePhase = this.phase;
    this.phase = AsyncSchedulerPhase.Busy({ queue: [...commands] });
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
          const command = AsyncSchedulerCommand.Dispatch({
            target: target as SchedulerActorHandle<T>,
            message: message as T,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Spawn: {
          const { target } = action;
          if (!spawnedActors) continue;
          const actor = spawnedActors.get(target);
          if (!actor) continue;
          const command = AsyncSchedulerCommand.Spawn({
            target: target as SchedulerActorHandle<T>,
            actor: actor as ActorCreator<unknown, T, T>,
          });
          commands.push(command);
          break;
        }
        case HandlerActionType.Kill: {
          const { target } = action;
          const command = AsyncSchedulerCommand.Kill({
            target: target as ActorHandle<T>,
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
  handler: AsyncTask<I, O>,
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
  handler: AsyncTask<I, O>,
  inbox: AsyncQueue<I>,
  outbox: AsyncQueue<HandlerResult<O>>,
): Promise<void> {
  return handler(inbox, (actions) => outbox.push(actions));
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
    /* eslint-disable @typescript-eslint/no-explicit-any */
    handle: SchedulerActorHandle<any>;
    actor: ActorCreator<any, any, any>;
    /* eslint-enable @typescript-eslint/no-explicit-any */
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Map<ActorHandle<T>, ActorCreator<any, any, any>> | null {
  const { spawned } = context;
  if (spawned.length === 0) return null;
  const spawnedActors = new Map(spawned.map(({ handle, actor: spawner }) => [handle, spawner]));
  spawned.length = 0;
  return spawnedActors;
}
