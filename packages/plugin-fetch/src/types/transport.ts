import type { Hash, Hashable, HashableObject } from '@reactive-kit/hash';
import type { Uid } from '@reactive-kit/utils';

export type FetchRequest = HashableObject<{
  method: string;
  url: string;
  headers: FetchHeaders | null;
  body: Uint8Array | null;
  token: Hash | null;
}>;

export type FetchResponseState = FetchResponseSuccessState | FetchResponseErrorState;

export type FetchResponseSuccessState = HashableObject<{
  success: true;
  response: FetchResponse;
}>;

export type FetchResponseErrorState = HashableObject<{
  success: false;
  error: Hashable;
  response: FetchResponse | null;
}>;

export type FetchResponse = HashableObject<{
  status: number;
  headers: FetchHeaders;
  body: Uint8Array | null;
  token: Uid;
}>;

export type FetchHeaders = Record<string, string>;
