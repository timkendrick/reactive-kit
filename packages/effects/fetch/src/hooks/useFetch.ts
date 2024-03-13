import { createEffect, type Effect } from '@reactive-kit/effect';
import { type HashableObject } from '@reactive-kit/utils';

export const EFFECT_TYPE_FETCH = 'http::fetch';

export interface FetchEffect extends Effect<FetchEffectType, FetchEffectPayload> {}

export type FetchEffectType = typeof EFFECT_TYPE_FETCH;

export type FetchEffectPayload = HashableObject<FetchRequest>;

export interface FetchRequest
  extends HashableObject<{
    method: string;
    url: string;
    headers: FetchHeaders | null;
    body: string | null;
  }> {}

export interface FetchResponse
  extends HashableObject<{
    status: number;
    headers: FetchHeaders;
    body: string;
  }> {}

export interface FetchHeaders extends Record<string, string> {}

export function useFetch(request: FetchRequest): FetchEffect {
  return createEffect(EFFECT_TYPE_FETCH, request);
}
