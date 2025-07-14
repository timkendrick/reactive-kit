/// <reference lib="dom" />
import {
  HandlerAction,
  type ActorHandle,
  type AsyncTaskFactory,
  type AsyncTaskHandle,
  type AsyncTaskResult,
  type HandlerContext,
  type SyncActorFactory,
} from '@reactive-kit/actor';
import { fromAsyncIteratorFactory } from '@reactive-kit/actor-utils';
import {
  EffectHandler,
  type EffectHandlerInput,
  type EffectHandlerOutput,
  type EffectHandlerOutputMessage,
} from '@reactive-kit/handler-utils';
import { HashableError } from '@reactive-kit/hash';
import type { Message } from '@reactive-kit/message';
import type {
  SubscribeEffectsMessage,
  UnsubscribeEffectsMessage,
} from '@reactive-kit/plugin-evaluate';
import { createResult, type EffectId, type Expression } from '@reactive-kit/types';
import { createAsyncTrigger, generateUid, type AsyncTrigger } from '@reactive-kit/utils';

import { EFFECT_TYPE_WEB_SOCKET, type WebSocketEffect } from '../effects';
import {
  createWebSocketResponseMessage,
  isWebSocketResponseMessage,
  type TaskId,
  type WebSocketResponseMessage,
} from '../messages';
import type { WebSocketRequest, WebSocketResponseState } from '../types';

export const ACTOR_TYPE_WEB_SOCKET_HANDLER = '@reactive-kit/actor/web-socket-handler';

export type WebSocketHandlerInputMessage = SubscribeEffectsMessage | UnsubscribeEffectsMessage;

export type WebSocketHandlerInternalMessage = WebSocketResponseMessage;
type WebSocketHandlerInput = WebSocketHandlerInputMessage | WebSocketHandlerInternalMessage;

export interface WebSocketHandlerConfig {
  next: ActorHandle<EffectHandlerOutputMessage>;
}

interface WebSocketSubscription {
  handle: AsyncTaskHandle;
  effect: WebSocketEffect;
  controller: AbortController;
}

export class WebSocketHandler extends EffectHandler<
  WebSocketEffect,
  WebSocketHandlerInternalMessage
> {
  private subscriptions: Map<EffectId, TaskId> = new Map();
  private requests: Map<TaskId, WebSocketSubscription> = new Map();
  private nextTaskId: TaskId = 1;

  public static readonly FACTORY: SyncActorFactory<
    WebSocketHandlerConfig,
    Message<unknown, unknown>,
    EffectHandlerOutputMessage | WebSocketHandlerInternalMessage
  > = {
    type: ACTOR_TYPE_WEB_SOCKET_HANDLER,
    async: false,
    factory: (config: WebSocketHandlerConfig, _self: ActorHandle<Message<unknown, unknown>>) =>
      new WebSocketHandler(config),
  };

  public constructor(config: WebSocketHandlerConfig) {
    const { next } = config;
    super(EFFECT_TYPE_WEB_SOCKET, next);
  }

  protected override getInitialValue(_effect: WebSocketEffect): Expression<unknown> | null {
    return null;
  }

  protected override onSubscribe(
    effect: WebSocketEffect,
    context: HandlerContext<EffectHandlerInput<WebSocketHandlerInternalMessage>>,
  ): EffectHandlerOutput<WebSocketHandlerInternalMessage> {
    const taskId = ++this.nextTaskId;
    const controller = new AbortController();
    const factory = createWebSocketTaskFactory(taskId, effect, controller, context.self());
    const handle = context.spawn({ actor: factory, config: effect });
    this.requests.set(taskId, { handle, effect, controller });
    this.subscriptions.set(effect.id, taskId);
    return [HandlerAction.Spawn({ target: handle })];
  }

  protected override onUnsubscribe(
    effect: WebSocketEffect,
    _context: HandlerContext<EffectHandlerInput<WebSocketHandlerInternalMessage>>,
  ): EffectHandlerOutput<WebSocketHandlerInternalMessage> {
    const taskId = this.subscriptions.get(effect.id);
    if (taskId === undefined) return null;
    this.subscriptions.delete(effect.id);
    const requestState = this.requests.get(taskId);
    if (!requestState) return null;
    this.requests.delete(taskId);
    requestState.controller.abort();
    return [HandlerAction.Kill({ target: requestState.handle })];
  }

  protected override acceptInternal(
    message: Message<unknown, unknown>,
  ): message is WebSocketHandlerInternalMessage {
    if (isWebSocketResponseMessage(message)) return true;
    return false;
  }

  protected override handleInternal(
    message: Message<unknown, unknown>,
    context: HandlerContext<EffectHandlerInput<WebSocketHandlerInternalMessage>>,
  ): EffectHandlerOutput<WebSocketHandlerInternalMessage> {
    if (isWebSocketResponseMessage(message)) {
      return this.handleWebSocketResponse(message, context);
    }
    return null;
  }

  private handleWebSocketResponse(
    message: WebSocketResponseMessage,
    _context: HandlerContext<WebSocketHandlerInput>,
  ): EffectHandlerOutput<WebSocketHandlerInternalMessage> {
    const { taskId, response } = message.payload;
    const subscription = this.requests.get(taskId);
    if (!subscription) return null;
    const effect = subscription.effect;
    const stateToken = effect.id;
    const effectValue = createResult(response);
    const action = this.emit(effect.type, new Map([[stateToken, effectValue]]));
    return [action];
  }
}

function createWebSocketTaskFactory(
  taskId: number,
  effect: WebSocketEffect,
  controller: AbortController,
  output: ActorHandle<WebSocketHandlerInternalMessage>,
): AsyncTaskFactory<WebSocketEffect, never, WebSocketHandlerInternalMessage> {
  const request = effect.payload;
  const { signal } = controller;
  return fromAsyncIteratorFactory<WebSocketEffect, WebSocketHandlerInternalMessage>(
    EFFECT_TYPE_WEB_SOCKET,
    () => {
      let activeConnection: WebSocket | undefined;
      const requestQueue = new Array<AsyncTrigger<WebSocketResponseState>['emit']>();
      const resultQueue = new Array<WebSocketResponseState>();
      return {
        next(): Promise<IteratorResult<AsyncTaskResult<WebSocketHandlerInternalMessage>>> {
          if (!activeConnection) activeConnection = onSubscribe(request, signal, onEmit);
          return next().then((response) => ({
            done: false,
            value: [
              HandlerAction.Send({
                target: output,
                message: createWebSocketResponseMessage(taskId, response),
              }),
            ],
          }));
        },
        return(): Promise<IteratorResult<AsyncTaskResult<WebSocketHandlerInternalMessage>>> {
          if (activeConnection != null) onUnsubscribe(activeConnection);
          requestQueue.length = 0;
          resultQueue.length = 0;
          return Promise.resolve({ done: true, value: null });
        },
        throw(): Promise<IteratorResult<AsyncTaskResult<WebSocketHandlerInternalMessage>>> {
          if (activeConnection != null) onUnsubscribe(activeConnection);
          requestQueue.length = 0;
          resultQueue.length = 0;
          return Promise.resolve({ done: true, value: null });
        },
      };

      function onSubscribe(
        request: WebSocketRequest,
        signal: AbortSignal,
        onEmit: (value: WebSocketResponseState) => void,
      ): WebSocket {
        const socket = new WebSocket(request.url);
        socket.addEventListener('message', (event) => {
          const data: Blob = event.data;
          data
            .arrayBuffer()
            .catch()
            .then(
              (bytes) => {
                onEmit({
                  success: true,
                  response: { body: new Uint8Array(bytes), token: generateUid() },
                });
              },
              (error) => {
                onEmit({
                  success: false,
                  error: new HashableError(parseResponseError(error)),
                });
              },
            );
        });
        socket.addEventListener('error', (event) => {
          onEmit({
            success: false,
            error: parseResponseError(event),
          });
        });
        signal.addEventListener('abort', handleAbort);
        socket.addEventListener('close', () => {
          signal.removeEventListener('abort', handleAbort);
        });
        return socket;

        function handleAbort(): void {
          socket.close();
        }
      }

      function onEmit(value: WebSocketResponseState): void {
        const pendingRequest = requestQueue.shift();
        if (pendingRequest) {
          pendingRequest(value);
        } else {
          resultQueue.push(value);
        }
      }

      function onUnsubscribe(socket: WebSocket): void {
        socket.close();
      }

      function next(): Promise<WebSocketResponseState> {
        const queuedResult = resultQueue.shift();
        if (queuedResult != null) {
          return Promise.resolve(queuedResult);
        } else {
          const { signal, emit } = createAsyncTrigger<WebSocketResponseState>();
          requestQueue.push(emit);
          return signal;
        }
      }
    },
  );
}

function parseResponseError(err: unknown): HashableError {
  return new HashableError(err instanceof Error ? err : new Error(String(err), { cause: err }));
}
