/// <reference lib="dom" />
import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskFactory,
  type AsyncTaskHandle,
  type HandlerContext,
} from '@reactive-kit/actor';
import { fromCancelablePromiseFactory } from '@reactive-kit/actor-utils';
import {
  EffectHandler,
  EffectHandlerOutputMessage,
  type EffectHandlerInput,
  type EffectHandlerOutput,
} from '@reactive-kit/handler-utils';
import { hash, HASH, HashableError, type CustomHashable, type Hash } from '@reactive-kit/hash';
import type { Message } from '@reactive-kit/runtime-messages';
import { createResult, type Expression, type EffectId } from '@reactive-kit/types';
import { generateUid } from '@reactive-kit/utils';
import { EFFECT_TYPE_FETCH, type FetchEffect } from '../effects';
import {
  createFetchHandlerResponseMessage,
  isFetchHandlerResponseMessage,
  type FetchHandlerResponseMessage,
  type TaskId,
} from '../messages';
import type { FetchHeaders, FetchRequest, FetchResponse, FetchResponseState } from '../types';

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

type FetchHandlerInternalMessage = FetchHandlerResponseMessage;

interface FetchSubscription {
  handle: AsyncTaskHandle;
  effect: FetchEffect;
  controller: AbortController;
}

export class FetchHandler extends EffectHandler<FetchEffect, FetchHandlerInternalMessage> {
  private subscriptions: Map<EffectId, TaskId> = new Map();
  private requests: Map<TaskId, FetchSubscription> = new Map();
  private nextTaskId: TaskId = 1;

  public constructor(next: ActorHandle<EffectHandlerOutputMessage>) {
    super(EFFECT_TYPE_FETCH, next);
  }

  protected override getInitialValue(effect: FetchEffect): Expression<any> | null {
    return null;
  }

  protected onSubscribe(
    effect: FetchEffect,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const stateToken = effect.id;
    if (this.subscriptions.has(stateToken)) return null;
    const taskId = ++this.nextTaskId;
    this.subscriptions.set(stateToken, taskId);
    const controller = new AbortController();
    const factory = createFetchTaskFactory(taskId, effect, controller, context.self());
    const handle = context.spawnAsync(factory);
    this.requests.set(taskId, {
      handle,
      effect,
      controller,
    });
    return [HandlerAction.Spawn(handle)];
  }

  protected onUnsubscribe(
    effect: FetchEffect,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const stateToken = effect.id;
    const taskId = this.subscriptions.get(stateToken);
    if (taskId === undefined) return null;
    this.subscriptions.delete(stateToken);
    const requestState = this.requests.get(taskId);
    if (!requestState) return null;
    this.requests.delete(taskId);
    const { handle, controller } = requestState;
    controller.abort();
    return [HandlerAction.Kill(handle)];
  }

  protected acceptInternal(message: Message<unknown>): message is FetchHandlerInternalMessage {
    if (isFetchHandlerResponseMessage(message)) return true;
    return false;
  }

  protected handleInternal(
    message: Message<unknown>,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    if (isFetchHandlerResponseMessage(message)) {
      return this.handleFetchHandlerResponse(message, context);
    }
    return null;
  }

  private handleFetchHandlerResponse(
    message: FetchHandlerResponseMessage,
    context: HandlerContext<EffectHandlerInput<FetchHandlerInternalMessage>>,
  ): EffectHandlerOutput<FetchHandlerInternalMessage> {
    const { taskId, response } = message;
    const subscription = this.requests.get(taskId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const stateToken = effect.id;
    this.requests.delete(taskId);
    this.subscriptions.delete(stateToken);
    const effectValue = createResult(response);
    const action = this.emit(new Map([[stateToken, effectValue]]));
    return [action];
  }
}

function createFetchTaskFactory(
  taskId: number,
  effect: FetchEffect,
  controller: AbortController,
  output: ActorHandle<FetchHandlerInternalMessage>,
): AsyncTaskFactory<never, FetchHandlerInternalMessage> {
  const { signal } = controller;
  return fromCancelablePromiseFactory<FetchHandlerInternalMessage>(() => ({
    result: fetchRequest(effect.payload, signal).then((response) => [
      HandlerAction.Send(output, createFetchHandlerResponseMessage(taskId, response)),
    ]),
    abort: controller,
  }));
}

function fetchRequest(request: FetchRequest, signal: AbortSignal): Promise<FetchResponseState> {
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
