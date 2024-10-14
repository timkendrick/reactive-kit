import { createEffect, type Effect } from '@reactive-kit/types';
import { CustomHashable, HASH, hash, type Hash, type Hashable } from '@reactive-kit/hash';

export const EFFECT_TYPE_ERROR = '@reactive-kit/effect-error';

export interface ErrorEffect extends Effect<never> {
  type: ErrorEffectType;
  payload: ErrorEffectPayload;
}

export type ErrorEffectType = typeof EFFECT_TYPE_ERROR;

export type ErrorEffectPayload = ReactiveError & Hashable;

export function createErrorEffect(errors: ErrorEffectPayload): ErrorEffect {
  return createEffect(EFFECT_TYPE_ERROR, errors);
}

export function isErrorEffect(error: Effect<unknown>): error is ErrorEffect {
  return error.type === EFFECT_TYPE_ERROR;
}

export class ReactiveError extends AggregateError implements CustomHashable {
  private readonly hash: Hash;

  public constructor(errors: Array<Error & Hashable>) {
    super(errors);
    this.hash = hash(errors);
  }

  public get [HASH](): Hash {
    return this.hash;
  }
}
