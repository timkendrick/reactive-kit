import type { ActorHandle, AsyncTaskFactory } from '@reactive-kit/actor';
import type { Brand } from '@reactive-kit/utils';

import type { ActorAction } from './action';

/**
 * A definition for an actor. Instances of this interface can be used to spawn new actors.
 * @template I The type of incoming messages handled by the actor.
 * @template O The type of outgoing messages emitted by the actor.
 */
export type ActorDefinition<I, O = I> = AsyncTaskFactory<ActorHandle<I>, I, O>;

/**
 * A branded base type for all specific declarative action commands.
 * This applies a common brand to ensure nominal typing for all action commands.
 * @template T The primary message type associated with the command's context.
 * @template TActionTypeString Literal string type for the action's 'type' property.
 * @template TProps The type of the properties specific to this particular action command.
 */
export type ActionBase<T, TActionTypeString extends string, TProps extends object> = Brand<
  {
    /** The type of the action. */
    type: TActionTypeString;
    /** The specific properties for this action. */
    options: TProps;
    /** Internal marker for the message type context of the command. */
    readonly [ACTION_TYPE]?: T;
  },
  typeof ACTION_TYPE
>;
declare const ACTION_TYPE: unique symbol;

/**
 * Internal helper function to create a branded action object.
 *
 * @template TAction - The specific, fully-formed action type (e.g., SendAction<MsgType>) being created.
 * @template T - The message type context for the ActionBase (e.g., MsgType).
 * @template TActionTypeString - The literal string type for the action's 'type' property.
 * @template TProps - The type of the properties specific to this particular action command.
 *
 * @param type - The action type string.
 * @param options - The specific properties for this action.
 * @returns A branded action object of type TAction.
 */
export function createAction<
  TAction extends ActionBase<T, TActionTypeString, TProps>,
  T,
  TActionTypeString extends string,
  TProps extends object,
>(type: TActionTypeString, options: TProps): TAction {
  return { type, options } as TAction;
}

/**
 * An opaque command representing a unit of behavior in an actor definition.
 * Command combinators return instances of ActorCommand.
 * @template T The union type of messages relevant to this command's context.
 */
export type ActorCommand<T> = ActorAction<T>;

/**
 * A reference to a runtime value exposed to the VM execution stack.
 * This can be a static value, a reference to a state handle, or a state value resolver.
 * @template V The type of the value stored in the reference.
 */
export type ValueRef<V> = V | RuntimeValueResolver<V>;

interface ValueResolver<T, V> {
  readonly [VALUE_RESOLVER_TYPE]: T;
  readonly [VALUE_RESOLVER_VALUE_TYPE]?: V;
}
export const VALUE_RESOLVER_TYPE = Symbol.for('@reactive-kit/scripted-workers/value-resolver-type');
declare const VALUE_RESOLVER_VALUE_TYPE: unique symbol;

/* eslint-disable @typescript-eslint/no-explicit-any */
export type RuntimeValueResolver<V> =
  | StateRef<V>
  | ReadStateValueResolver<any, V>
  | ComputeStateValueResolver<any, V>
  | SpawnedActorResolver<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function isValueResolver<V>(value: ValueRef<V>): value is RuntimeValueResolver<V> {
  return typeof value === 'object' && value !== null && VALUE_RESOLVER_TYPE in value;
}

/**
 * An opaque handle to a piece of state managed within an actor.
 * @template V The type of the state.
 */
export interface StateRef<V> extends ValueResolver<typeof STATE_HANDLE_VALUE_RESOLVER_TYPE, V> {
  /** The index of the state handle in the VM execution stack. */
  index: number;
  /** The type of the value stored in the state handle. */
  readonly [STATE_HANDLE_VALUE_TYPE]?: V;
}
export const STATE_HANDLE_VALUE_RESOLVER_TYPE = Symbol.for(
  '@reactive-kit/scripted-workers/value-resolver/state-handle',
);
declare const STATE_HANDLE_VALUE_TYPE: unique symbol;

/**
 * Checks if a value is a state reference.
 * @param value - The value to check.
 * @returns True if the value is a state reference, false otherwise.
 */
export function isStateRefValueResolver<V>(value: RuntimeValueResolver<V>): value is StateRef<V> {
  return value[VALUE_RESOLVER_TYPE] === STATE_HANDLE_VALUE_RESOLVER_TYPE;
}

/**
 * Creates a state reference.
 * @param index - The index of the state reference.
 * @returns A state reference.
 */
export function createStateRef<V>(index: number): StateRef<V> {
  return {
    [VALUE_RESOLVER_TYPE]: STATE_HANDLE_VALUE_RESOLVER_TYPE,
    index,
  };
}

/**
 * A reference to a value derived from a single piece of actor state.
 * @template S The type of the value stored in state.
 * @template V The type of the value to be computed from the state.
 */
export interface ReadStateValueResolver<S, V>
  extends ValueResolver<typeof READ_STATE_VALUE_RESOLVER_TYPE, V> {
  ref: ValueRef<S>;
  compute: (state: S) => V;
}
export const READ_STATE_VALUE_RESOLVER_TYPE = Symbol.for(
  '@reactive-kit/scripted-workers/value-resolver/read-state',
);

/**
 * Checks if a value is a read state value resolver.
 * @param value - The value to check.
 * @returns True if the value is a read state value resolver, false otherwise.
 */
export function isReadStateValueResolver<S, V>(
  value: RuntimeValueResolver<V>,
): value is ReadStateValueResolver<S, V> {
  return value[VALUE_RESOLVER_TYPE] === READ_STATE_VALUE_RESOLVER_TYPE;
}

/**
 * Creates a read state value resolver.
 * @param ref - The state reference.
 * @param compute - The function to compute the value from the state.
 * @returns A read state value resolver.
 */
export function createReadStateValueResolver<S, V>(
  ref: ValueRef<S>,
  compute: (state: S) => V,
): ReadStateValueResolver<S, V> {
  return {
    [VALUE_RESOLVER_TYPE]: READ_STATE_VALUE_RESOLVER_TYPE,
    ref,
    compute,
  };
}

/**
 * A reference to a value derived from multiple runtime values managed within the VM execution stack.
 * @template S A tuple type representing the types of the input values.
 * @template V The type of the value to be computed from the input values.
 */
export interface ComputeStateValueResolver<S extends Array<unknown>, V>
  extends ValueResolver<typeof COMPUTE_STATE_VALUE_RESOLVER_TYPE, V> {
  inputs: { [K in keyof S]: ValueRef<S[K]> };
  combine: (...values: S) => V;
}
export const COMPUTE_STATE_VALUE_RESOLVER_TYPE = Symbol.for(
  '@reactive-kit/scripted-workers/value-resolver/compute-state',
);

/**
 * Checks if a value is a compute state value resolver.
 * @param value - The value to check.
 * @returns True if the value is a compute state value resolver, false otherwise.
 */
export function isComputeStateValueResolver<S extends Array<unknown>, V>(
  value: RuntimeValueResolver<V>,
): value is ComputeStateValueResolver<S, V> {
  return value[VALUE_RESOLVER_TYPE] === COMPUTE_STATE_VALUE_RESOLVER_TYPE;
}

/**
 * Creates a compute state value resolver.
 * @param inputs - The input values.
 * @param combine - The function to compute the result value from the input values.
 * @returns A compute state value resolver.
 */
export function createComputeStateValueResolver<S extends Array<unknown>, V>(
  inputs: { [K in keyof S]: ValueRef<S[K]> },
  combine: (...values: S) => V,
): ComputeStateValueResolver<S, V> {
  return {
    [VALUE_RESOLVER_TYPE]: COMPUTE_STATE_VALUE_RESOLVER_TYPE,
    inputs,
    combine,
  };
}

/**
 * A reference to a child actor spawned by the current actor.
 * @template T The type of the message handled by the spawned actor.
 */
export interface SpawnedActorResolver<T>
  extends ValueResolver<typeof SPAWNED_ACTOR_VALUE_RESOLVER_TYPE, T> {
  /** The index of the spawned actor in the VM execution stack. */
  index: number;
  /** The type of the message handled by the spawned actor. */
  readonly [SPAWNED_ACTOR_TYPE]?: T;
}
export const SPAWNED_ACTOR_VALUE_RESOLVER_TYPE = Symbol.for(
  '@reactive-kit/scripted-workers/value-resolver/spawned-actor',
);
declare const SPAWNED_ACTOR_TYPE: unique symbol;

/**
 * Checks if a value is a spawned actor value resolver.
 * @param value - The value to check.
 * @returns True if the value is a spawned actor value resolver, false otherwise.
 */
export function isSpawnedActorValueResolver<T>(
  value: RuntimeValueResolver<T>,
): value is SpawnedActorResolver<T> {
  return value[VALUE_RESOLVER_TYPE] === SPAWNED_ACTOR_VALUE_RESOLVER_TYPE;
}

/**
 * Creates a spawned actor value resolver.
 * @param index - The index of the spawned actor.
 * @returns A spawned actor value resolver.
 */
export function createSpawnedActorValueResolver<T>(index: number): SpawnedActorResolver<T> {
  return {
    [VALUE_RESOLVER_TYPE]: SPAWNED_ACTOR_VALUE_RESOLVER_TYPE,
    index,
  };
}
