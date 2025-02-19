import { generateUid } from '@reactive-kit/utils';
import { FetchHeaders, FetchRequest, FetchResponse, FetchResponseState } from '../types';
import { CustomHashable, hash, HASH, Hash, HashableError } from '@reactive-kit/hash';

class FetchResponseError extends Error implements CustomHashable {
  public readonly response: FetchResponse;
  public [HASH]: Hash;

  constructor(response: FetchResponse) {
    super(`HTTP error ${response.status}`);
    this.name = 'FetchResponseError';
    this.response = response;
    this[HASH] = hash(this.name, this.response);
  }
}

export function fetchRequest(
  request: FetchRequest,
  signal: AbortSignal,
): Promise<FetchResponseState> {
  return fetch(request.url, {
    method: request.method,
    headers: parseRequestHeaders(request.headers),
    body: request.body,
    signal,
  })
    .then((response) => {
      const { status } = response;
      const headers = parseResponseHeaders(response.headers);
      const token = generateUid();
      if (response.ok) {
        return response.arrayBuffer().then(
          (body): FetchResponseState => ({
            success: true,
            response: {
              status,
              headers,
              body: new Uint8Array(body),
              token,
            },
          }),
          (err): FetchResponseState => ({
            success: false,
            error: parseResponseError(err),
            response: {
              status,
              headers,
              body: null,
              token,
            },
          }),
        );
      } else {
        return response.arrayBuffer().then(
          (body): FetchResponseState => {
            const response: FetchResponse = {
              status,
              headers,
              body: new Uint8Array(body),
              token,
            };
            return {
              success: false,
              error: new FetchResponseError(response),
              response: response,
            };
          },
          (err): FetchResponseState => ({
            success: false,
            error: parseResponseError(err),
            response: {
              status,
              headers,
              body: null,
              token,
            },
          }),
        );
      }
    })
    .catch((err) => ({
      success: false,
      error: parseResponseError(err),
      response: null,
    }));
}

function parseRequestHeaders(headers: FetchHeaders | null | undefined): Headers {
  const result = new Headers();
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      result.set(key, value);
    }
  }
  return result;
}

function parseResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function parseResponseError(err: unknown): HashableError {
  return new HashableError(err instanceof Error ? err : new Error(String(err), { cause: err }));
}
