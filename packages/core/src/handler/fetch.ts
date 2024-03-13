import {
  ActorHandle,
  HandlerContext,
  HandlerResult,
  Actor,
  HandlerAction,
  HandlerActionType,
  EFFECT,
  StateToken,
  AsyncTaskHandle,
} from '@trigger/types';
import { nonNull } from '@trigger/utils';
import { getTypedEffects } from '../utils';
import {
  createEmitEffectValuesMessage,
  EmitEffectValuesMessage,
  isSubscribeEffectsMessage,
  isUnsubscribeEffectsMessage,
  MESSAGE_SUBSCRIBE_EFFECTS,
  MESSAGE_UNSUBSCRIBE_EFFECTS,
  SubscribeEffectsMessage,
  UnsubscribeEffectsMessage,
} from '../message';
import { EFFECT_TYPE_FETCH, FetchEffect, FetchRequest, FetchResponse } from '../effect/fetch';
import { type Message } from '../message/message';
import { fromCancelablePromiseFactory } from '../utils/actor/promise';

type FetchHandlerInputMessage =
  | SubscribeEffectsMessage
  | UnsubscribeEffectsMessage
  | FetchHandlerInternalMessage;
type FetchHandlerOutputMessage = EmitEffectValuesMessage | FetchHandlerInternalMessage;
type FetchHandlerInternalMessage = FetchHandlerReadyMessage;

type FetchHandlerInput = FetchHandlerInputMessage;
type FetchHandlerOutput = HandlerResult<FetchHandlerOutputMessage>;

const MESSAGE_FETCH_HANDLER_READY = 'http::fetch::ready';

type FetchResponseState =
  | { success: true; response: FetchResponse }
  | { success: false; error: Error };

interface FetchHandlerReadyMessage extends Message<typeof MESSAGE_FETCH_HANDLER_READY> {
  requestId: RequestId;
  response: FetchResponseState;
}

function createFetchHandlerReadyMessage(
  requestId: RequestId,
  response: FetchResponseState,
): FetchHandlerReadyMessage {
  return { type: MESSAGE_FETCH_HANDLER_READY, requestId, response };
}

type RequestId = number;

interface FetchSubscription {
  handle: AsyncTaskHandle;
  effect: FetchEffect;
  controller: AbortController;
}

export class FetchHandler implements Actor<FetchHandlerInput> {
  private readonly next: ActorHandle<FetchHandlerOutputMessage>;
  private subscriptions: Map<StateToken, RequestId> = new Map();
  private requests: Map<RequestId, FetchSubscription> = new Map();
  private nextRequestId: RequestId = 1;

  constructor(options: { next: ActorHandle<FetchHandlerOutputMessage> }) {
    const { next } = options;
    this.next = next;
  }

  public accept(message: Message<unknown>): message is FetchHandlerInput {
    if (isSubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_FETCH);
    if (isUnsubscribeEffectsMessage(message)) return message.effects.has(EFFECT_TYPE_FETCH);
    return false;
  }

  public handle(
    message: FetchHandlerInput,
    context: HandlerContext<FetchHandlerInput>,
  ): FetchHandlerOutput {
    switch (message.type) {
      case MESSAGE_SUBSCRIBE_EFFECTS:
        return this.handleSubscribeEffects(message, context);
      case MESSAGE_UNSUBSCRIBE_EFFECTS:
        return this.handleUnsubscribeEffects(message, context);
      case MESSAGE_FETCH_HANDLER_READY:
        return this.handleFetchHandlerReady(message, context);
    }
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
        const requestId = ++this.nextRequestId;
        this.subscriptions.set(stateToken, requestId);
        const controller = new AbortController();
        const { signal } = controller;
        const handle = context.spawnAsync(
          fromCancelablePromiseFactory<FetchHandlerInputMessage>(() => ({
            result: fetchRequest(effect.payload, signal).then((response) => [
              HandlerAction.Send(self, createFetchHandlerReadyMessage(requestId, response)),
            ]),
            abort: controller,
          })),
        );
        this.requests.set(requestId, {
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
        const requestId = this.subscriptions.get(stateToken);
        if (requestId === undefined) return null;
        this.subscriptions.delete(stateToken);
        const requestState = this.requests.get(requestId);
        if (!requestState) return null;
        this.requests.delete(requestId);
        const { handle, controller } = requestState;
        controller.abort();
        return HandlerAction.Kill(handle);
      })
      .filter(nonNull);
    if (actions.length === 0) return null;
    return actions;
  }

  private handleFetchHandlerReady(
    message: FetchHandlerReadyMessage,
    context: HandlerContext<FetchHandlerInput>,
  ): FetchHandlerOutput {
    const { requestId, response } = message;
    const subscription = this.requests.get(requestId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const stateToken = effect[EFFECT];
    this.requests.delete(requestId);
    this.subscriptions.delete(stateToken);
    const effectValues = new Map([[stateToken, response]]);
    const emitMessage = createEmitEffectValuesMessage(effectValues);
    const action = HandlerAction.Send(this.next, emitMessage);
    return [action];
  }
}

function fetchRequest(request: FetchRequest, signal: AbortSignal): Promise<FetchResponseState> {
  throw new Error('Method not implemented.');
}
