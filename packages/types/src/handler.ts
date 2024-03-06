import { Enum, type EnumVariant, type PhantomType, VARIANT, instantiateEnum } from '@trigger/utils';
import { Stream } from './stream';

export enum ActorType {
  Sync = 'Sync',
  Async = 'Async',
}

export type Actor<T> = Enum<{
  [ActorType.Sync]: {
    actor: SyncActor<T>;
  };
  [ActorType.Async]: {
    actor: AsyncActor<T, T>;
  };
}>;

export const Actor = {
  [ActorType.Sync]: Object.assign(
    function Sync<T>(actor: SyncActor<T>): EnumVariant<Actor<T>, ActorType.Sync> {
      return instantiateEnum(ActorType.Sync, { actor });
    },
    {
      [VARIANT]: ActorType.Sync,
      is: function is<T>(value: Actor<T>): value is EnumVariant<Actor<T>, ActorType.Sync> {
        return value[VARIANT] === ActorType.Sync;
      },
    },
  ),
  [ActorType.Async]: Object.assign(
    function Async<T>(actor: AsyncActor<T, T>): EnumVariant<Actor<T>, ActorType.Async> {
      return instantiateEnum(ActorType.Async, { actor });
    },
    {
      [VARIANT]: ActorType.Async,
      is: function is<T>(value: Actor<T>): value is EnumVariant<Actor<T>, ActorType.Async> {
        return value[VARIANT] === ActorType.Async;
      },
    },
  ),
};

export interface SyncActor<T> {
  handle(message: T, context: HandlerContext<T>): HandlerResult;
}

export type ActorHandleMethod<T> = { bivarianceHack(message: T): void }['bivarianceHack'];

export interface ActorHandle<T> {
  _type: PhantomType<ActorHandleMethod<T>>;
}

export interface HandlerContext<T> {
  self(): ActorHandle<T>;
  spawn<T>(factory: () => SyncActor<T>): ActorHandle<T>;
  spawnAsync<T>(factory: AsyncTaskFactory<T>): ActorHandle<T>;
}

export type HandlerResult<T = unknown> = Array<HandlerAction<T>> | null;

export enum HandlerActionType {
  Spawn = 'Spawn',
  Kill = 'Kill',
  Send = 'Send',
}

export type HandlerAction<T> = Enum<{
  [HandlerActionType.Spawn]: {
    target: ActorHandle<T>;
  };
  [HandlerActionType.Kill]: {
    target: ActorHandle<T>;
  };
  [HandlerActionType.Send]: {
    target: ActorHandle<T>;
    message: T;
  };
}>;

export type AsyncTaskHandle = ActorHandle<never>;

export type AsyncTaskFactory<I, O = unknown> = (self: ActorHandle<I>) => AsyncActor<I, O>;

export interface AsyncActor<I, O = unknown>
  extends AsyncIterator<HandlerResult<O>, HandlerResult<O>, I> {}

export type AsyncTaskResult<T = unknown> = IteratorResult<HandlerResult<T>, HandlerResult<T>>;
export type AsyncTaskYieldResult<T> = IteratorYieldResult<HandlerResult<T>>;
export type AsyncTaskReturnResult<T> = IteratorReturnResult<HandlerResult<T>>;

export const HandlerAction = {
  [HandlerActionType.Spawn]: Object.assign(
    function Spawn<T>(
      target: ActorHandle<T>,
    ): EnumVariant<HandlerAction<T>, HandlerActionType.Spawn> {
      return instantiateEnum(HandlerActionType.Spawn, { target });
    },
    {
      [VARIANT]: HandlerActionType.Spawn,
      is: function is<T>(
        value: HandlerAction<T>,
      ): value is EnumVariant<HandlerAction<T>, HandlerActionType.Spawn> {
        return value[VARIANT] === HandlerActionType.Spawn;
      },
    },
  ),
  [HandlerActionType.Kill]: Object.assign(
    function Kill<T>(
      target: ActorHandle<T>,
    ): EnumVariant<HandlerAction<T>, HandlerActionType.Kill> {
      return instantiateEnum(HandlerActionType.Kill, { target });
    },
    {
      [VARIANT]: HandlerActionType.Kill,
      is: function is<T>(
        value: HandlerAction<T>,
      ): value is EnumVariant<HandlerAction<T>, HandlerActionType.Kill> {
        return value[VARIANT] === HandlerActionType.Kill;
      },
    },
  ),
  [HandlerActionType.Send]: Object.assign(
    function Send<T>(
      target: ActorHandle<T>,
      message: T,
    ): EnumVariant<HandlerAction<T>, HandlerActionType.Send> {
      return instantiateEnum(HandlerActionType.Send, { target, message });
    },
    {
      [VARIANT]: HandlerActionType.Send,
      is: function is<T>(
        value: HandlerAction<T>,
      ): value is EnumVariant<HandlerAction<T>, HandlerActionType.Send> {
        return value[VARIANT] === HandlerActionType.Send;
      },
    },
  ),
};
