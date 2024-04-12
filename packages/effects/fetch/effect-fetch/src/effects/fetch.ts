import type { HashableObject } from '@reactive-kit/hash';
import { createEffect, type Effect } from '@reactive-kit/types';
import type { FetchRequest } from '../types';

export const EFFECT_TYPE_FETCH = '@reactive-kit/effect-fetch';

export interface FetchEffect extends Effect<FetchEffectType, FetchEffectPayload> {}

export type FetchEffectType = typeof EFFECT_TYPE_FETCH;

export type FetchEffectPayload = HashableObject<FetchRequest>;

export function createFetchEffect(request: FetchRequest): FetchEffect {
  return createEffect(EFFECT_TYPE_FETCH, request);
}
