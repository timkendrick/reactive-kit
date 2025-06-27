import {
  HASH,
  HashError,
  hash,
  isHashable,
  type CustomHashable,
  type Hashable,
} from '@reactive-kit/hash';

import type {
  GeneratorArgs,
  GeneratorContinuation,
  GeneratorIntermediates,
  GeneratorLocals,
  GeneratorStateMachine,
  GeneratorStatics,
} from './generator';
import { TYPE } from './type';

/*
The following kinds of expressions are supported by the interpreter:

Result - a value that represents a fully-evaluated expression result.
Effect - a value that represents a potentially asynchronous side-effect external to the system. On encountering an Effect, the current fiber is suspended, spawning a child fiber that awaits an externally-provided value returned to the interpreter via the generator's `next()` method. Effects can be resolved with any expression type.
Async - a value representing a lazy evaluation thunk that holds a reference to a function and a key/value object containing arguments to be bound to the function. The function is a pure function (not a generator function) whereby intermediate yielded values are returned as reified Suspense objects. The function defines parameters for the pre-bound arguments as well as a context object representing intermediate internal generator state. The function returns either a Suspense, representing an intermediate result, or any other expression type, indicating that the function has completed.
Suspense - a value that represents an intermediate generator result. This holds a list of expressions that must be evaluated in their own separate forked child fibers before evaluation can proceed. Once all child fibers have run to completion, the results are joined into a list (aggregating any errors and unwinding the stackif an exception was encountered). In order to resume the generator once the child expressions have been evaluated, the Suspense object also contains a reference to its parent Async value, as well as a context object that represents any internal generator state. The function referenced in the Async value will be reinvoked with the suspense object and the list of evaluated expression results.
Pending - a value that represents a blocked fiber, which is a placeholder for a fiber that has been suspended due to an unresolved Effect. In addition to allowing parallel execution of sibling fibers while waiting for the blocked fiber to be resolved, blocked fibers can be caught by a Fallback expression in a parent fiber when unwinding the stack, which allows the parent fiber to continue evaluation with a placeholder value to use while the blocking effect is resolved.
Fallback - a value that represents a placeholder value that allows a fiber to continue evaluation in the presence of blocked child fibers that have resulted in Pending expressions. Once the blocking effects are resolved, the placeholder expression is replaced with the actual result of the fiber.
*/

export type Expression<T> =
  | ResultExpression<T>
  | EffectExpression<T>
  | AsyncExpression<T>
  | SuspenseExpression<T>
  | PendingExpression
  | FallbackExpression<T, T>;

export const TYPE_EXPRESSION: unique symbol = Symbol.for('@reactive-kit/symbols/type/expression');
export type TYPE_EXPRESSION = typeof TYPE_EXPRESSION;

export const EXPRESSION_TYPE: unique symbol = Symbol.for('@reactive-kit/symbols/expression/type');
export type EXPRESSION_TYPE = typeof EXPRESSION_TYPE;

declare const RESULT_TYPE: unique symbol;

function withResultType<T>(): <V>(value: V) => V & { [RESULT_TYPE]: T } {
  return <V>(value: V) => value as V & { [RESULT_TYPE]: T };
}

export interface ResultExpression<T> extends CustomHashable {
  [TYPE]: TYPE_EXPRESSION;
  [EXPRESSION_TYPE]: EXPRESSION_TYPE_RESULT;
  value: T;
}
export const EXPRESSION_TYPE_RESULT: unique symbol = Symbol.for(
  '@reactive-kit/symbols/expression/type/result',
);
export type EXPRESSION_TYPE_RESULT = typeof EXPRESSION_TYPE_RESULT;
export function createResult<T extends Hashable>(value: T): ResultExpression<T> {
  return {
    [HASH]: hash('@reactive-kit/symbols/expression/type/result', value),
    [TYPE]: TYPE_EXPRESSION,
    [EXPRESSION_TYPE]: EXPRESSION_TYPE_RESULT,
    value,
  };
}
export function isResultExpression<T>(value: Expression<T>): value is ResultExpression<T> {
  return value[EXPRESSION_TYPE] === EXPRESSION_TYPE_RESULT;
}

export type EffectType = string;
export type EffectId = bigint;

export interface EffectExpression<T> extends CustomHashable {
  [TYPE]: TYPE_EXPRESSION;
  [EXPRESSION_TYPE]: EXPRESSION_TYPE_EFFECT;
  [RESULT_TYPE]: T;
  id: EffectId;
  type: EffectType;
  payload: unknown;
}
export const EXPRESSION_TYPE_EFFECT: unique symbol = Symbol.for(
  '@reactive-kit/symbols/expression/type/effect',
);
export type EXPRESSION_TYPE_EFFECT = typeof EXPRESSION_TYPE_EFFECT;
export function createEffect<T extends EffectType, P extends Hashable, V>(
  type: T,
  payload: P,
): EffectExpression<V> & {
  type: T;
  payload: P;
} {
  const id = hash('@reactive-kit/symbols/expression/type/effect', type, payload);
  return withResultType<V>()({
    [HASH]: id,
    [TYPE]: TYPE_EXPRESSION,
    [EXPRESSION_TYPE]: EXPRESSION_TYPE_EFFECT,
    id,
    type,
    payload,
  });
}
export function isEffectExpression<T>(value: Expression<T>): value is EffectExpression<T> {
  return value[EXPRESSION_TYPE] === EXPRESSION_TYPE_EFFECT;
}

export interface AsyncExpression<T> extends CustomHashable {
  [TYPE]: TYPE_EXPRESSION;
  [EXPRESSION_TYPE]: EXPRESSION_TYPE_ASYNC;
  [RESULT_TYPE]: T;
  target: GeneratorStateMachine<
    GeneratorArgs,
    GeneratorLocals,
    GeneratorIntermediates,
    GeneratorStatics,
    Hashable,
    Hashable,
    Hashable,
    T
  >;
  args: Array<Hashable>;
}
export const EXPRESSION_TYPE_ASYNC: unique symbol = Symbol.for(
  '@reactive-kit/symbols/expression/type/async',
);
export type EXPRESSION_TYPE_ASYNC = typeof EXPRESSION_TYPE_ASYNC;
export function createAsync<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TStatics extends GeneratorStatics,
  TYield extends Hashable,
  TNext extends Hashable,
  TError extends Hashable,
  TResult extends Hashable,
>(
  target: GeneratorStateMachine<
    TArgs,
    TLocals,
    TIntermediates,
    TStatics,
    TYield,
    TNext,
    TError,
    TResult
  > &
    Hashable,
  args: Array<TArgs[Extract<keyof TArgs, string>]>,
): AsyncExpression<TResult> {
  return withResultType<TResult>()({
    [HASH]: hash('@reactive-kit/symbols/expression/type/async', target, args),
    [TYPE]: TYPE_EXPRESSION,
    [EXPRESSION_TYPE]: EXPRESSION_TYPE_ASYNC,
    target: target as unknown as GeneratorStateMachine<
      GeneratorArgs,
      GeneratorLocals,
      GeneratorIntermediates,
      GeneratorStatics,
      Hashable,
      Hashable,
      Hashable,
      TResult
    >,
    args,
  }) as AsyncExpression<TResult>;
}
export function isAsyncExpression<T>(value: Expression<T>): value is AsyncExpression<T> {
  return value[EXPRESSION_TYPE] === EXPRESSION_TYPE_ASYNC;
}

export interface SuspenseExpression<T> extends CustomHashable {
  [TYPE]: TYPE_EXPRESSION;
  [EXPRESSION_TYPE]: EXPRESSION_TYPE_SUSPENSE;
  dependencies: Array<Expression<unknown>>;
  parent: AsyncExpression<T>;
  state: SuspenseState;
}
export const EXPRESSION_TYPE_SUSPENSE: unique symbol = Symbol.for(
  '@reactive-kit/symbols/expression/type/suspense',
);
export type EXPRESSION_TYPE_SUSPENSE = typeof EXPRESSION_TYPE_SUSPENSE;
export function createSuspense<T>(
  dependencies: Array<Expression<unknown>>,
  parent: AsyncExpression<T>,
  state: SuspenseState,
): SuspenseExpression<T> & {
  dependencies: typeof dependencies;
  parent: typeof parent;
  state: typeof state;
} {
  return withResultType<T>()({
    [HASH]: hash('@reactive-kit/symbols/expression/type/suspense', dependencies, parent, state),
    [TYPE]: TYPE_EXPRESSION,
    [EXPRESSION_TYPE]: EXPRESSION_TYPE_SUSPENSE,
    dependencies,
    parent,
    state,
  });
}

export interface PendingExpression extends CustomHashable {
  [TYPE]: TYPE_EXPRESSION;
  [EXPRESSION_TYPE]: EXPRESSION_TYPE_PENDING;
}
export const EXPRESSION_TYPE_PENDING: unique symbol = Symbol.for(
  '@reactive-kit/symbols/expression/type/pending',
);
export type EXPRESSION_TYPE_PENDING = typeof EXPRESSION_TYPE_PENDING;
const PENDING: PendingExpression = {
  [HASH]: hash('@reactive-kit/symbols/expression/type/pending'),
  [TYPE]: TYPE_EXPRESSION,
  [EXPRESSION_TYPE]: EXPRESSION_TYPE_PENDING,
};
export function createPending(): PendingExpression {
  return PENDING;
}
export function isPendingExpression<T>(value: Expression<T>): value is PendingExpression {
  return value[EXPRESSION_TYPE] === EXPRESSION_TYPE_PENDING;
}

export interface FallbackExpression<T, V> extends CustomHashable {
  [TYPE]: TYPE_EXPRESSION;
  [EXPRESSION_TYPE]: EXPRESSION_TYPE_FALLBACK;
  attempt: Expression<T>;
  fallback: Expression<V>;
}
export const EXPRESSION_TYPE_FALLBACK: unique symbol = Symbol.for(
  '@reactive-kit/symbols/expression/type/fallback',
);
export type EXPRESSION_TYPE_FALLBACK = typeof EXPRESSION_TYPE_FALLBACK;
export function createFallback<T, V>(
  attempt: Expression<T>,
  fallback: Expression<V>,
): FallbackExpression<T, V> {
  return {
    [HASH]: hash('@reactive-kit/symbols/expression/type/fallback', attempt, fallback),
    [TYPE]: TYPE_EXPRESSION,
    [EXPRESSION_TYPE]: EXPRESSION_TYPE_FALLBACK,
    attempt,
    fallback,
  };
}
export function isFallbackExpression<T>(value: Expression<T>): value is FallbackExpression<T, T> {
  return value[EXPRESSION_TYPE] === EXPRESSION_TYPE_FALLBACK;
}

export interface AsyncContext {
  state: SuspenseState;
}

export interface SuspenseState extends CustomHashable {
  args: Record<string, Hashable>;
  locals: Record<string, Hashable>;
  intermediates: Record<string, Hashable>;
  statics: Record<string, unknown>;
  prev: number;
  next: number;
  sent: GeneratorContinuation<Hashable, Hashable> | null;
}

export function wrapExpression(value: unknown): Expression<unknown> {
  if (
    typeof value === 'object' &&
    value != null &&
    TYPE in value &&
    value[TYPE] === TYPE_EXPRESSION
  ) {
    return value as Expression<unknown>;
  }
  if (!isHashable(value)) throw new HashError(`Unable to hash value: ${value}`, value);
  return createResult(value);
}

export function wrapResult<T>(value: T): ResultExpression<T> {
  if (!isHashable(value)) throw new HashError(`Unable to hash value: ${value}`, value);
  return createResult(value);
}
