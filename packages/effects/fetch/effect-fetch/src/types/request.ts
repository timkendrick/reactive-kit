import type { Hash, HashableObject } from '@reactive-kit/hash';
import type { Uid } from '@reactive-kit/utils';

export type FetchResponseState = FetchResponseSuccessState | FetchResponseErrorState;

export interface FetchResponseSuccessState {
  success: true;
  response: FetchResponse;
}

export interface FetchResponseErrorState {
  success: false;
  error: Error;
  response: FetchResponse | null;
}

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
