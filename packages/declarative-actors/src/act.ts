import { type Actor, type ActorHandle, type SyncActorFactory } from '@reactive-kit/actor';

import { complete, fail } from './actions/internal';
import {
  ActHandler,
  type ActHandlerInputMessage,
  type ActHandlerOutputMessage,
} from './handlers/ActHandler';
import type { ActorCommand } from './types';
import { compile } from './vm/compile';
// ActorDefinition might be removed or changed depending on its usage elsewhere.
// For now, assuming its primary role was the return type of act.

// Define a type for declarative scripted actors
export const ACTOR_TYPE_SCRIPTED_ACTOR = '@reactive-kit/declarative-actors/scripted-actor';

/**
 * Helper utilities provided to the actor definition function.
 * @template T The union type of messages for the actor context.
 */
export interface ActorContextHelpers<T> {
  // We need `outbox`, `complete`, `fail` specifically for the declarative user factory.
  outbox: ActorHandle<T>;
  complete: () => ActorCommand<T>;
  fail: (error: Error) => ActorCommand<T>;
  self: () => ActorHandle<T>; // Adding self here, as it's standard in actor contexts
}

/**
 * Creates a synchronous actor factory for a declarative actor.
 *
 * @template T The union type of messages the declarative actor can handle and send.
 * @param factory A function that defines the actor's behavior using declarative commands.
 *        It receives the actor's own `self` handle and `helpers` (including `outbox`, `complete`, `fail`).
 * @returns A `SyncActorFactory` that, when provided with an `outbox` handle (as config) and a `self` handle,
 *          creates an `ActHandler` instance.
 */
export function act<T>(
  factory: (self: ActorHandle<T>, helpers: ActorContextHelpers<T>) => ActorCommand<T>,
): SyncActorFactory<ActorHandle<T>, T, T> {
  return {
    type: ACTOR_TYPE_SCRIPTED_ACTOR,
    async: false,
    factory: (outbox: ActorHandle<T>, self: ActorHandle<T>): Actor<T, T> => {
      const helpers: ActorContextHelpers<T> = {
        outbox,
        complete: () => complete(self),
        fail: (error: Error) => fail(self, error),
        self: () => self,
      };
      const command = factory(self, helpers);
      const instructions = compile(command);
      const actor = new ActHandler<T>(instructions) as Actor<T, T>;
      return actor;
    },
  };
}
