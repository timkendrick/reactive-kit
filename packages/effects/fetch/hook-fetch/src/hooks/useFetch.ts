import { createEffectHook, transformHookResult } from '@reactive-kit/effect';
import {
  createFetchEffect,
  type FetchRequest,
  type FetchResponse,
  type FetchResponseState,
} from '@reactive-kit/effect-fetch';
import { HASH, assignCustomHash, hash, type CustomHashable, type Hash } from '@reactive-kit/hash';
import type { Uid } from '@reactive-kit/utils';

type FetchRequestInit = Pick<FetchRequest, RequiredKeys> &
  Partial<Omit<FetchRequest, RequiredKeys>>;
type RequiredKeys = Extract<keyof FetchRequest, 'url'>;

interface FetchResult extends FetchResponse {
  text(): string;
  json(): unknown;
}

export function useFetch(request: string | FetchRequestInit): Promise<FetchResult> {
  const init = typeof request === 'string' ? { url: request } : request;
  return transformHookResult(
    createEffectHook<FetchResponseState>(
      createFetchEffect({
        url: init.url,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body ?? null,
        token: init.token ?? null,
      }),
    ),
    assignCustomHash(hash('@reactive-kit/hook-fetch/useFetch'), (response) => {
      if (!response.success) {
        // FIXME: Determine error throwing behavior
        throw response.error;
      } else {
        return new FetchResult(response.response);
      }
    }),
  );
}

class FetchResult implements CustomHashable {
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

  public text(): string {
    return this.response.body ?? '';
  }

  public json(): unknown {
    if (!this.response.body) return null;
    return JSON.parse(this.response.body);
  }
}
