/// <reference lib="dom" />
import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type AsyncTaskHandle,
  type HandlerContext,
  type HandlerResult,
  AsyncTaskFactory,
} from '@reactive-kit/actor';
import { fromCancelablePromiseFactory } from '@reactive-kit/actor-utils';
import {
  EFFECT_TYPE_FETCH,
  FetchResponse,
  type FetchEffect,
  type FetchHeaders,
  type FetchRequest,
  type FetchResponseState,
} from '@reactive-kit/effect-fetch';
import {
  createEmitEffectValuesMessage,
  getTypedEffects,
  isSubscribeEffectsMessage,
  isUnsubscribeEffectsMessage,
  MESSAGE_SUBSCRIBE_EFFECTS,
  MESSAGE_UNSUBSCRIBE_EFFECTS,
  type EmitEffectValuesMessage,
  type Message,
  type SubscribeEffectsMessage,
  type UnsubscribeEffectsMessage,
} from '@reactive-kit/runtime-messages';
import { createPending, createResult, EffectId, PendingExpression } from '@reactive-kit/types';
import { nonNull, generateUid } from '@reactive-kit/utils';
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

import {
  createFetchHandlerResponseMessage,
  isFetchHandlerResponseMessage,
  MESSAGE_FETCH_HANDLER_RESPONSE,
  type FetchHandlerResponseMessage,
  type TaskId,
} from '../messages';

export type FetchHandlerInputMessage = SubscribeEffectsMessage | UnsubscribeEffectsMessage;
export type FetchHandlerOutputMessage = EmitEffectValuesMessage;

type FetchHandlerInternalMessage = FetchHandlerResponseMessage;
type FetchHandlerInput = FetchHandlerInputMessage | FetchHandlerInternalMessage;
type FetchHandlerOutput = HandlerResult<FetchHandlerOutputMessage | FetchHandlerInternalMessage>;

interface FetchSubscription {
  handle: AsyncTaskHandle;
  effect: FetchEffect;
  controller: AbortController;
}

export class FetchHandler implements Actor<Message<unknown>> {
  private readonly next: ActorHandle<FetchHandlerOutputMessage>;
  private subscriptions: Map<EffectId, TaskId> = new Map();
  private requests: Map<TaskId, FetchSubscription> = new Map();
  private nextTaskId: TaskId = 1;

  constructor(next: ActorHandle<FetchHandlerOutputMessage>) {
    this.next = next;
  }

  public handle(
    message: Message<unknown>,
    context: HandlerContext<FetchHandlerInput>,
  ): FetchHandlerOutput {
    if (!this.accept(message)) return null;
    switch (message.type) {
      case MESSAGE_SUBSCRIBE_EFFECTS:
        return this.handleSubscribeEffects(message, context);
      case MESSAGE_UNSUBSCRIBE_EFFECTS:
        return this.handleUnsubscribeEffects(message, context);
      case MESSAGE_FETCH_HANDLER_RESPONSE:
        return this.handleFetchHandlerResponse(message, context);
    }
  }

  private accept(message: Message<unknown>): message is FetchHandlerInput {
    if (isSubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_FETCH);
    if (isUnsubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_FETCH);
    if (isFetchHandlerResponseMessage(message)) return true;
    return false;
  }

  private handleSubscribeEffects(
    message: SubscribeEffectsMessage,
    context: HandlerContext<FetchHandlerInput>,
  ): FetchHandlerOutput {
    const { effects } = message;
    const typedEffects = getTypedEffects<FetchEffect>(EFFECT_TYPE_FETCH, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const self = context.self();
    const pendingValues = new Map(
      typedEffects
        .map((effect): [EffectId, PendingExpression] | null => {
          const stateToken = effect.id;
          if (this.subscriptions.has(stateToken)) return null;
          return [stateToken, createPending()];
        })
        .filter(nonNull),
    );
    const actions = typedEffects
      .map((effect) => {
        const stateToken = effect.id;
        if (this.subscriptions.has(stateToken)) return null;
        const taskId = ++this.nextTaskId;
        this.subscriptions.set(stateToken, taskId);
        const controller = new AbortController();
        const factory = createFetchTaskFactory(taskId, effect, controller, self);
        const handle = context.spawnAsync(factory);
        this.requests.set(taskId, {
          handle,
          effect,
          controller,
        });
        return HandlerAction.Spawn(handle);
      })
      .filter(nonNull);
    const pendingPlaceholdersMessage =
      pendingValues.size === 0
        ? null
        : createEmitEffectValuesMessage(new Map([[EFFECT_TYPE_FETCH, pendingValues]]));
    const pendingPlaceholderActions =
      pendingPlaceholdersMessage != null
        ? [HandlerAction.Send(this.next, pendingPlaceholdersMessage)]
        : [];
    const combinedActions = [...pendingPlaceholderActions, ...actions];
    return combinedActions.length === 0 ? null : combinedActions;
  }

  private handleUnsubscribeEffects(
    message: UnsubscribeEffectsMessage,
    context: HandlerContext<FetchHandlerInput>,
  ): FetchHandlerOutput {
    const { effects } = message;
    const typedEffects = getTypedEffects<FetchEffect>(EFFECT_TYPE_FETCH, effects);
    if (!typedEffects || typedEffects.length === 0) return null;
    const actions = typedEffects
      .map((effect) => {
        const stateToken = effect.id;
        const taskId = this.subscriptions.get(stateToken);
        if (taskId === undefined) return null;
        this.subscriptions.delete(stateToken);
        const requestState = this.requests.get(taskId);
        if (!requestState) return null;
        this.requests.delete(taskId);
        const { handle, controller } = requestState;
        controller.abort();
        return HandlerAction.Kill(handle);
      })
      .filter(nonNull);
    if (actions.length === 0) return null;
    return actions;
  }

  private handleFetchHandlerResponse(
    message: FetchHandlerResponseMessage,
    context: HandlerContext<FetchHandlerInput>,
  ): FetchHandlerOutput {
    const { taskId, response } = message;
    const subscription = this.requests.get(taskId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const stateToken = effect.id;
    this.requests.delete(taskId);
    this.subscriptions.delete(stateToken);
    const effectValue = createResult(response);
    const effectValues = new Map([[EFFECT_TYPE_FETCH, new Map([[stateToken, effectValue]])]]);
    const emitMessage = createEmitEffectValuesMessage(effectValues);
    const action = HandlerAction.Send(this.next, emitMessage);
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
