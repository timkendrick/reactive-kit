import { Enum, type EnumVariant, type GenericEnum, type PhantomType } from '@reactive-kit/utils';

export interface Actor<I, O> {
  handle(message: I, context: HandlerContext<I>): HandlerResult<O>;
}

export interface ActorFactoryBase {
  type: ActorType;
}

export type ActorFactory<C, I, O> =
  | SyncActorFactory<C, I, O, Actor<I, O>>
  | AsyncActorFactory<C, I, O, AsyncTask<I, O>>;

export type ActorCreator<C, I, O> = SyncActorCreator<C, I, O> | AsyncActorCreator<C, I, O>;

export interface SyncActorCreator<C, I, O> {
  actor: SyncActorFactory<C, I, O, Actor<I, O>>;
  config: C;
}

export interface AsyncActorCreator<C, I, O> {
  actor: AsyncActorFactory<C, I, O, AsyncTask<I, O>>;
  config: C;
}

export interface SyncActorFactory<C, I, O, A extends Actor<I, O> = Actor<I, O>>
  extends ActorFactoryBase {
  async: false;
  factory: (config: C, self: ActorHandle<I>) => A;
}

export interface AsyncActorFactory<C, I, O, A extends AsyncTask<I, O> = AsyncTask<I, O>>
  extends ActorFactoryBase {
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
export enum HandlerActionType {
  Spawn = 'Spawn',
  Kill = 'Kill',
  Send = 'Send',
}
interface GenericHandlerActionType extends GenericEnum<1> {
  instance: HandlerAction<this['T1']>;
}
export const HandlerAction = Enum.create<GenericHandlerActionType>({
  [HandlerActionType.Send]: true,
  [HandlerActionType.Spawn]: true,
  [HandlerActionType.Kill]: true,
});

export type SpawnHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Spawn>;
export type SendHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Send>;
export type KillHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Kill>;

export type ActorType = string;

export type MaybeAsyncActor<I, O> = Actor<I, O> | AsyncTask<I, O>;

export type AsyncTaskType = ActorType;

export type AsyncTaskFactory<C, I, O> = AsyncActorFactory<C, I, O, AsyncTask<I, O>>;

export type AsyncTaskHandle = ActorHandle<never>;

export type AsyncTask<I, O> = (
  inbox: AsyncTaskInbox<I>,
  outbox: AsyncTaskOutbox<O>,
) => Promise<void>;

export type AsyncTaskInbox<T> = AsyncIterator<T, null, never>;
export type AsyncTaskOutbox<T> = (value: HandlerResult<T>) => void;
