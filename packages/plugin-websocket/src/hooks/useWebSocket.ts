import { HASH, assignCustomHash, hash, type CustomHashable, type Hash } from '@reactive-kit/hash';
import { map, useReactive } from '@reactive-kit/reactive-utils';
import type { Uid } from '@reactive-kit/utils';
import { createWebSocketEffect } from '../effects';
import type { WebSocketRequest, WebSocketResponse, WebSocketResponseState } from '../types';

type WebSocketRequestInit = Pick<WebSocketRequest, RequiredKeys> &
  Partial<Omit<WebSocketRequest, RequiredKeys>>;

type RequiredKeys = Extract<keyof WebSocketRequest, 'url'>;

interface WebSocketResult extends WebSocketResponse {
  text(): string;
  json(): unknown;
}

const handleWebSocketResponse = assignCustomHash(
  hash('@reactive-kit/hook-fetch/useWebSocket/handleWebSocketResponse'),
  (response: WebSocketResponseState): WebSocketResult => {
    if (!response.success) {
      // FIXME: Determine error throwing behavior
      throw response.error;
    } else {
      return new WebSocketResult(response.response);
    }
  },
);

export function useWebSocket(request: string | WebSocketRequestInit): Promise<WebSocketResult> {
  const init = typeof request === 'string' ? { url: request } : request;
  const effect = createWebSocketEffect({
    url: init.url,
    token: init.token ?? null,
  });
  return useReactive(map(effect, handleWebSocketResponse));
}

class WebSocketResult implements CustomHashable {
  private readonly response: WebSocketResponse;
  private readonly hash: Hash;

  constructor(response: WebSocketResponse) {
    this.response = response;
    this.hash = hash(response);
  }

  public get [HASH](): Hash {
    return this.hash;
  }

  public get token(): Uid {
    return this.response.token;
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
