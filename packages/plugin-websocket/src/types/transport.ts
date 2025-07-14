import type { Hash, Hashable, HashableObject } from '@reactive-kit/hash';
import type { Uid } from '@reactive-kit/utils';

export type WebSocketResponseState = WebSocketResponseSuccessState | WebSocketResponseErrorState;

export interface WebSocketResponseSuccessState
  extends HashableObject<{
    success: true;
    response: WebSocketResponse;
  }> {}

export interface WebSocketResponseErrorState
  extends HashableObject<{
    success: false;
    error: Hashable;
  }> {}

export interface WebSocketRequest
  extends HashableObject<{
    url: string;
    token: Hash | null;
  }> {}

export interface WebSocketResponse
  extends HashableObject<{
    body: Uint8Array | null;
    token: Uid;
  }> {}

export interface FetchHeaders extends Record<string, string> {}
