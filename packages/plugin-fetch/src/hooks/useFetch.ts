import { HASH, assignCustomHash, hash, type CustomHashable, type Hash } from '@reactive-kit/hash';
import { map, useReactive } from '@reactive-kit/reactive-utils';
import type { Uid } from '@reactive-kit/utils';

import { createFetchEffect, type FetchEffectValue } from '../effects';
import type { FetchRequest, FetchResponse } from '../types';

type FetchRequestInit = Pick<FetchRequest, RequiredKeys> &
  Partial<Omit<FetchRequest, RequiredKeys | keyof CoercedInitValues>> &
  Partial<CoercedInitValues>;

type RequiredKeys = Extract<keyof FetchRequest, 'url'>;

interface CoercedInitValues {
  body: string | Uint8Array | null;
}

interface FetchResultPayload extends FetchResponse {
  text(): string;
  json(): unknown;
}

const handleFetchResponse = assignCustomHash(
  hash('@reactive-kit/hook-fetch/useFetch/handleFetchResponse'),
  (value: FetchEffectValue): FetchResult => {
    if (!value.success) {
      // FIXME: Determine error throwing behavior
      throw value.error;
    } else {
      return new FetchResult(value.response);
    }
  },
);

export function useFetch(request: string | FetchRequestInit): Promise<FetchResultPayload> {
  const init = typeof request === 'string' ? { url: request } : request;
  const effect = createFetchEffect({
    url: init.url,
    method: init.method ?? 'GET',
    headers: init.headers ?? {},
    body:
      init.body != null
        ? typeof init.body === 'string'
          ? new TextEncoder().encode(init.body)
          : init.body
        : null,
    token: init.token ?? null,
  });
  return useReactive(map(effect, handleFetchResponse));
}

class FetchResult implements CustomHashable, FetchResultPayload {
  private readonly response: FetchResponse;
  private readonly hash: Hash;

  constructor(response: FetchResponse) {
    this.response = response;
    this.hash = hash(response);
  }

  public get [HASH](): Hash {
    return this.hash;
  }

  public get status(): number {
    return this.response.status;
  }

  public get headers(): Record<string, string> {
    return this.response.headers;
  }

  public get token(): Uid {
    return this.response.token;
  }

  public get body(): Uint8Array | null {
    return this.response.body;
  }

  public text(): string {
    return this.response.body ? new TextDecoder('utf-8').decode(this.response.body) : '';
  }

  public json(): unknown {
    const text = this.text();
    // FIXME: Determine JSON response error behavior
    return JSON.parse(text);
  }
}
