import type { Hash, Hashable, HashableObject } from '@reactive-kit/hash';
import type { Uid } from '@reactive-kit/utils';

export type FetchResponseState = FetchResponseSuccessState | FetchResponseErrorState;

export interface FetchResponseSuccessState
  extends HashableObject<{
    success: true;
    response: FetchResponse;
  }> {}

export interface FetchResponseErrorState
  extends HashableObject<{
    success: false;
    error: Hashable;
    response: FetchResponse | null;
  }> {}

export interface FetchRequest
  extends HashableObject<{
    method: string;
    url: string;
    headers: FetchHeaders | null;
    body: Uint8Array | null;
    token: Hash | null;
  }> {}

export interface FetchResponse
  extends HashableObject<{
    status: number;
    headers: FetchHeaders;
    body: Uint8Array | null;
    token: Uid;
  }> {}

export interface FetchHeaders extends Record<string, string> {}
