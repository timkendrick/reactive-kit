import { Enum, type EnumVariant, type PhantomType, VARIANT, instantiateEnum } from '@trigger/utils';

export interface Actor<I, O = unknown> {
  handle(message: I, context: HandlerContext<I>): HandlerResult<O>;
}

export interface ActorHandle<T> {
  // See https://stackoverflow.com/questions/52667959/what-is-the-purpose-of-bivariancehack-in-typescript-types
  _type: PhantomType<{ bivarianceHack(message: T): void }['bivarianceHack']>;
}

export interface HandlerContext<T> {
  self(): ActorHandle<T>;
  spawn<T>(factory: () => Actor<T>): ActorHandle<T>;
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
