import { createEffectHook } from '@reactive-kit/effect';
import { createFetchEffect, type FetchRequest, type FetchResponse } from '../effects';

export function useFetch(request: FetchRequest): Promise<FetchResponse> {
  return createEffectHook<FetchResponse>(createFetchEffect(request));
}
