import type { Hash, HashableObject } from '@reactive-kit/hash';
import type { Uid } from '@reactive-kit/utils';

export type FetchResponseState =
  | { success: true; response: FetchResponse }
  | { success: false; error: Error; response: FetchResponse | null };

export interface FetchRequest
  extends HashableObject<{
    method: string;
    url: string;
    headers: FetchHeaders | null;
    body: string | null;
    token: Hash | null;
  }> {}

export interface FetchResponse
  extends HashableObject<{
    status: number;
    headers: FetchHeaders;
    body: string | null;
    token: Uid;
  }> {}

export interface FetchHeaders extends Record<string, string> {}
