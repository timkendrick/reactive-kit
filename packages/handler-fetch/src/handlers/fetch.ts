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
import { EFFECT, getTypedEffects, type StateToken } from '@reactive-kit/effect';
import {
  EFFECT_TYPE_FETCH,
  type FetchEffect,
  type FetchHeaders,
  type FetchRequest,
} from '@reactive-kit/effect-fetch';
import {
  createEmitEffectValuesMessage,
  isSubscribeEffectsMessage,
  isUnsubscribeEffectsMessage,
  MESSAGE_SUBSCRIBE_EFFECTS,
  MESSAGE_UNSUBSCRIBE_EFFECTS,
  type EmitEffectValuesMessage,
  type Message,
  type SubscribeEffectsMessage,
  type UnsubscribeEffectsMessage,
} from '@reactive-kit/runtime-messages';
import { nonNull } from '@reactive-kit/utils';
import {
  createFetchHandlerResponseMessage,
  isFetchHandlerResponseMessage,
  MESSAGE_FETCH_HANDLER_RESPONSE,
  type FetchHandlerResponseMessage,
  type FetchResponseState,
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
  private subscriptions: Map<StateToken, TaskId> = new Map();
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
        return this.handleFetchHandlerReady(message, context);
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
    const actions = typedEffects
      .map((effect) => {
        const stateToken = effect[EFFECT];
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
    if (actions.length === 0) return null;
    return actions;
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
        const stateToken = effect[EFFECT];
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

  private handleFetchHandlerReady(
    message: FetchHandlerResponseMessage,
    context: HandlerContext<FetchHandlerInput>,
  ): FetchHandlerOutput {
    const { taskId, response } = message;
    const subscription = this.requests.get(taskId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const stateToken = effect[EFFECT];
    this.requests.delete(taskId);
    this.subscriptions.delete(stateToken);
    const effectValues = new Map([[EFFECT_TYPE_FETCH, new Map([[stateToken, response]])]]);
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
  }).then((response) => {
    if (response.ok) {
      return response.text().then(
        (body): FetchResponseState => ({
          success: true,
          response: {
            status: response.status,
            headers: parseResponseHeaders(response.headers),
            body,
          },
        }),
        (err): FetchResponseState => {
          return { success: false, error: parseResponseError(err), body: null };
        },
      );
    } else {
      return response.text().then(
        (body): FetchResponseState => ({
          success: false,
          error: new Error(`HTTP error ${response.status}: ${response.statusText}`),
          body,
        }),
        (err): FetchResponseState => {
          return { success: false, error: parseResponseError(err), body: null };
        },
      );
    }
  });
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

function parseResponseError(err: any): Error {
  if (err instanceof Error) return err;
  return new Error(String(err), { cause: err });
}
