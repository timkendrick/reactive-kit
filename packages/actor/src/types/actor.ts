import {
  Enum,
  VARIANT,
  instantiateEnum,
  type EnumVariant,
  type PhantomType,
} from '@reactive-kit/utils';

export interface Actor<I, O> {
  handle(message: I, context: HandlerContext<I>): HandlerResult<O>;
}

export interface ActorFactoryBase {
  type: ActorType;
}

export type ActorFactory<C, I, O> =
  | SyncActorFactory<C, I, O, Actor<I, O>>
  | AsyncActorFactory<C, I, O, AsyncActor<I, O>>;

export interface ActorCreator<C, I, O> {
  actor: ActorFactory<C, I, O>;
  config: C;
}

export interface SyncActorFactory<C, I, O, A extends Actor<I, O>> extends ActorFactoryBase {
  async: false;
  factory: (config: C) => A;
}

export interface AsyncActorFactory<C, I, O, A extends AsyncActor<I, O>> extends ActorFactoryBase {
  async: true;
  factory: (config: C, self: ActorHandle<I>) => A;
}

export interface ActorHandle<T> {
  // See https://stackoverflow.com/questions/52667959/what-is-the-purpose-of-bivariancehack-in-typescript-types
  _type: PhantomType<{ bivarianceHack(message: T): void }['bivarianceHack']>;
}

export interface HandlerContext<T> {
  self(): ActorHandle<T>;
  spawn<C, I, O>(actor: ActorCreator<C, I, O>): ActorHandle<I>;
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
  [HandlerActionType.Send]: {
    target: ActorHandle<T>;
    message: T;
  };
  [HandlerActionType.Kill]: {
    target: ActorHandle<T>;
  };
}>;

export type SpawnHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Spawn>;
export type SendHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Send>;
export type KillHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Kill>;

export type ActorType = string;

export type MaybeAsyncActor<I, O = unknown> = Actor<I, O> | AsyncActor<I, O>;

export type AsyncTaskType = ActorType;

export interface AsyncTaskFactory<C, I, O> extends AsyncActorFactory<C, I, O, AsyncActor<I, O>> {}

export type AsyncTaskHandle = ActorHandle<never>;

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
      return instantiateEnum(HandlerActionType.Spawn, {
        target,
      });
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
