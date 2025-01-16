import type { Hashable, HashableObject } from '@reactive-kit/hash';
import type { Expression, ResultExpression, SuspenseExpression } from './expression';
import { TYPE } from './type';

export const TYPE_GENERATOR = Symbol.for('@reactive-kit/symbols/generator');
export type TYPE_GENERATOR = typeof TYPE_GENERATOR;

export const CONTINUE: unique symbol = Symbol('CONTINUE');
export type CONTINUE = typeof CONTINUE;

export interface GeneratorStateMachineImpl<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TStatics extends GeneratorStatics,
  TYield extends Hashable,
  TNext extends Hashable,
  TError extends Hashable,
  TResult,
> {
  (
    context: GeneratorContext<
      TArgs,
      TLocals,
      TIntermediates,
      TStatics,
      TYield,
      TNext,
      TError,
      TResult
    >,
  ): Expression<TResult> | SuspenseExpression<TResult> | CONTINUE;
}

export interface GeneratorStateMachine<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TStatics extends GeneratorStatics,
  TYield extends Hashable,
  TNext extends Hashable,
  TError extends Hashable,
  TResult,
> extends GeneratorStateMachineImpl<
    TArgs,
    TLocals,
    TIntermediates,
    TStatics,
    TYield,
    TNext,
    TError,
    TResult
  > {
  [TYPE]: TYPE_GENERATOR;
  [TYPE_GENERATOR]: GeneratorMetadata<TArgs, TLocals, TIntermediates, TStatics>;
}
export function createGeneratorStateMachine<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TStatics extends GeneratorStatics,
  TYield extends Hashable,
  TNext extends Hashable,
  TError extends Hashable,
  TResult,
>(
  generator: GeneratorStateMachineImpl<
    TArgs,
    TLocals,
    TIntermediates,
    TStatics,
    TYield,
    TNext,
    TError,
    TResult
  >,
  metadata: GeneratorMetadata<TArgs, TLocals, TIntermediates, TStatics>,
): GeneratorStateMachine<TArgs, TLocals, TIntermediates, TStatics, TYield, TNext, TError, TResult> {
  const result = generator as GeneratorStateMachine<
    TArgs,
    TLocals,
    TIntermediates,
    TStatics,
    TYield,
    TNext,
    TError,
    TResult
  >;
  result[TYPE] = TYPE_GENERATOR;
  result[TYPE_GENERATOR] = metadata;
  return result;
}

export interface GeneratorContext<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TStatics extends GeneratorStatics,
  TYield extends Hashable,
  TNext extends Hashable,
  TError extends Hashable,
  TResult,
> {
  state: GeneratorState<TArgs, TLocals, TIntermediates, TStatics>;
  sent: TNext;
  next(
    sent: GeneratorContinuation<TNext, TError> | null,
  ): IteratorResult<SuspenseExpression<TResult>, Expression<TResult>>;
  yield(value: TYield): SuspenseExpression<TResult>;
  stop(): ResultExpression<TResult>;
  dispatchException(exception: unknown): void;
  abrupt(type: 'return', arg: unknown): CONTINUE;
  abrupt(type: 'throw', arg: unknown): CONTINUE;
  abrupt(type: 'break', loc: number): CONTINUE;
  abrupt(type: 'continue', loc: number): CONTINUE;
  finish(finallyLoc: number): CONTINUE | void;
  catch(tryLoc: number): unknown;
}

export interface GeneratorState<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TStatics extends GeneratorStatics,
> {
  args: TArgs;
  locals: TLocals;
  intermediates: TIntermediates;
  statics: TStatics;
  prev: number;
  next: number;
}

export type GeneratorContinuation<TNext extends Hashable, TError extends Hashable> =
  | GeneratorSuccessContinuation<TNext>
  | GeneratorErrorContinuation<TError>;

export type GeneratorSuccessContinuation<T extends Hashable> = HashableObject<{
  throw: false;
  value: T;
}>;

export type GeneratorErrorContinuation<T extends Hashable> = HashableObject<{
  throw: true;
  error: T;
}>;

export interface GeneratorArgs {
  [key: string]: Hashable;
}

export interface GeneratorLocals {
  [key: string]: Hashable;
}

export interface GeneratorIntermediates {
  [key: string]: Hashable;
}

export interface GeneratorStatics {
  [key: string]: unknown;
}

export interface GeneratorMetadata<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TStatics extends GeneratorStatics,
> {
  params: Array<Extract<keyof TArgs, string>>;
  locals: Array<Extract<keyof TLocals, string>>;
  intermediates: Array<Extract<keyof TIntermediates, string>>;
  statics: Array<Extract<keyof TStatics, string>>;
  tryLocsList: Array<[number, number?, number?, number?]> | null;
}
