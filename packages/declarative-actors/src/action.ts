import type {
  DelayAction,
  KillAction,
  ModifyStateAction,
  NoopAction,
  SendAction,
  SequenceAction,
  SpawnAction,
  WaitForAction,
  WhenAction,
  WhenStateAction,
  WhileLoopAction,
  WithStateAction,
} from './actions';
import type {
  CompleteAction,
  DoneAction,
  FailAction,
  LoopBreakAction,
  LoopContinueAction,
} from './actions/internal';

/**
 * A union of all specific declarative action command types.
 * This is the type that ActorCommand<T> will ultimately represent.
 * @template T The message type of the overall actor definition.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ActorAction<T> =
  | DelayAction<T>
  | DoneAction
  | KillAction<T>
  | ModifyStateAction<T, any>
  | NoopAction<T>
  | SendAction<T, unknown>
  | SequenceAction<T>
  | WaitForAction<T, any>
  | WhenAction<T, any>
  | WhenStateAction<T>
  | WhileLoopAction<T>
  | WithStateAction<T, any>
  | CompleteAction<T>
  | FailAction<T>
  | LoopBreakAction<T>
  | LoopContinueAction<T>
  | SpawnAction<T, any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */
