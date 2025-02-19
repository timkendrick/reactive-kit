import type { HashableObject } from '@reactive-kit/hash';
import { createEffect, type EffectExpression } from '@reactive-kit/types';
import type { FetchRequest, FetchResponseState } from '../types';

export const EFFECT_TYPE_FETCH = '@reactive-kit/effect-fetch';

export interface FetchEffect extends EffectExpression<FetchEffectValue> {
  type: FetchEffectType;
  payload: FetchEffectPayload;
}

export type FetchEffectType = typeof EFFECT_TYPE_FETCH;

export type FetchEffectPayload = HashableObject<FetchRequest>;

export type FetchEffectValue = FetchResponseState;

export function createFetchEffect(request: FetchRequest): FetchEffect {
  return createEffect(EFFECT_TYPE_FETCH, request);
}

export function isFetchEffect(error: EffectExpression<unknown>): error is FetchEffect {
  return error.type === EFFECT_TYPE_FETCH;
}
