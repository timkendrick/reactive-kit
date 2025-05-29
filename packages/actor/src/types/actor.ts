import { Enum, type EnumVariant, type GenericEnum } from '@reactive-kit/utils';

export interface Actor<I, O> {
  init?(this: this, context: HandlerContext<I>): HandlerResult<O>;
  handle(this: this, message: I, context: HandlerContext<I>): HandlerResult<O>;
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
  readonly [ACTOR_HANDLE_TYPE]: { bivarianceHack(message: T): void }['bivarianceHack'];
}
export const ACTOR_HANDLE_TYPE = Symbol('ACTOR_HANDLE_TYPE');

export function isActorHandle(value: unknown): value is ActorHandle<unknown> {
  return typeof value === 'object' && value !== null && ACTOR_HANDLE_TYPE in value;
}

export interface HandlerContext<T> {
  self(): ActorHandle<T>;
  spawn<C, I, O>(actor: ActorCreator<C, I, O>): ActorHandle<I>;
}

export type HandlerResult<T = unknown> = Array<HandlerAction<T>> | null;

export type HandlerAction<T> = Enum<{
  [HandlerActionType.Send]: {
    target: ActorHandle<T>;
    message: T;
  };
  [HandlerActionType.Spawn]: {
    target: ActorHandle<T>;
  };
  [HandlerActionType.Kill]: {
    target: ActorHandle<T>;
  };
  [HandlerActionType.Fail]: {
    target: ActorHandle<T>;
    error: unknown;
  };
}>;
export enum HandlerActionType {
  Spawn = 'Spawn',
  Kill = 'Kill',
  Send = 'Send',
  Fail = 'Fail',
}
interface GenericHandlerActionType extends GenericEnum<1> {
  instance: HandlerAction<this['T1']>;
}
export const HandlerAction = Enum.create<GenericHandlerActionType>({
  [HandlerActionType.Send]: true,
  [HandlerActionType.Spawn]: true,
  [HandlerActionType.Kill]: true,
  [HandlerActionType.Fail]: true,
});
export type SendHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Send>;
export type SpawnHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Spawn>;
export type KillHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Kill>;
export type FailHandlerAction<T> = EnumVariant<HandlerAction<T>, HandlerActionType.Fail>;

export type ActorType = string;

export type MaybeAsyncActor<I, O> = Actor<I, O> | AsyncTask<I, O>;

export type AsyncTaskType = ActorType;

export type AsyncTaskFactory<C, I, O> = AsyncActorFactory<C, I, O, AsyncTask<I, O>>;

export type AsyncTaskHandle = ActorHandle<never>;

export type AsyncTask<I, O> = (
  inbox: AsyncTaskInbox<I>,
  outbox: AsyncTaskOutbox<O>,
) => Promise<void>;

export type AsyncTaskInbox<T> = AsyncIterator<T, null, undefined>;
export type AsyncTaskOutbox<T> = (value: AsyncTaskResult<T>) => void;

export type AsyncTaskHandlerAction<T> = Exclude<HandlerAction<T>, SpawnHandlerAction<T>>;
export type AsyncTaskResult<T = unknown> = Array<AsyncTaskHandlerAction<T>> | null;
