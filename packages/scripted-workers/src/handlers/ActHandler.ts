import {
  HandlerAction,
  type Actor,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';
import type { AsyncTaskId } from '@reactive-kit/handler-utils';
import { isMessage } from '@reactive-kit/message';
import { nonNull, unreachable } from '@reactive-kit/utils';

import { isActHandlerDelayCompleteMessage, type ActHandlerDelayCompleteMessage } from '../messages';
import { createActHandlerDelayTask } from '../tasks/ActHandlerDelayTask';
import type { ActorVmCommand, VmOperation } from '../vm';
import {
  VM_COMMAND_AWAIT_MESSAGE,
  VM_COMMAND_COMPLETE,
  VM_COMMAND_DELAY,
  VM_COMMAND_FAIL,
  VM_COMMAND_KILL,
  VM_COMMAND_SEND,
  VM_COMMAND_SPAWN,
} from '../vm/commands';
import { evaluate } from '../vm/evaluate';

export type ActHandlerInputMessage<T> = T | ActHandlerControlMessage;
export type ActHandlerOutputMessage<T> = T | ActHandlerControlMessage;

type ActHandlerControlMessage = ActHandlerDelayCompleteMessage;

function isActHandlerControlMessage<T>(
  message: ActHandlerInputMessage<T>,
): message is ActHandlerControlMessage {
  if (!isMessage(message)) return false;
  if (isActHandlerDelayCompleteMessage(message)) return true;
  return false;
}

enum ActHandlerStateType {
  Running = 'Running',
  AwaitingMessage = 'AwaitingMessage',
  AwaitingDelay = 'AwaitingDelay',
  Completed = 'Completed',
  Failed = 'Failed',
}

interface ActHandlerRunningState {
  type: ActHandlerStateType.Running;
}

interface ActHandlerAwaitingMessageState {
  type: ActHandlerStateType.AwaitingMessage;
}

interface ActHandlerAwaitingDelayState<T> {
  type: ActHandlerStateType.AwaitingDelay;
  taskId: AsyncTaskId;
  bufferedMessages: Array<ActHandlerInputMessage<T>>;
}

interface ActHandlerCompletedState {
  type: ActHandlerStateType.Completed;
}

interface ActHandlerFailedState {
  type: ActHandlerStateType.Failed;
  error: unknown;
}

type ActHandlerState<T> =
  | ActHandlerRunningState
  | ActHandlerAwaitingMessageState
  | ActHandlerAwaitingDelayState<T>
  | ActHandlerCompletedState
  | ActHandlerFailedState;

export class ActHandler<T> implements Actor<ActHandlerInputMessage<T>, ActHandlerOutputMessage<T>> {
  private readonly interpreter: Generator<ActorVmCommand, void, unknown>;

  private state: ActHandlerState<T> = { type: ActHandlerStateType.Running };
  private nextTaskId = 1;

  public constructor(instructions: Array<VmOperation>) {
    this.interpreter = evaluate(instructions);
  }

  public init(
    context: HandlerContext<ActHandlerInputMessage<T>>,
  ): HandlerResult<ActHandlerOutputMessage<T>> {
    // The actor starts in the running state, so we can immediately process the VM commands
    return this.processVmCommands(context);
  }

  public handle(
    message: ActHandlerInputMessage<T>,
    context: HandlerContext<ActHandlerInputMessage<T>>,
  ): HandlerResult<ActHandlerOutputMessage<T>> {
    // If the actor has completed or failed, ignore any additional incoming messages
    if (this.state.type === ActHandlerStateType.Completed) return null;
    if (this.state.type === ActHandlerStateType.Failed) return null;
    // If the actor is currently awaiting a delay, buffer any incoming messages until the delay completes
    if (
      this.state.type === ActHandlerStateType.AwaitingDelay &&
      !(isDelayCompleteMessage(message) && message.payload.taskId === this.state.taskId)
    ) {
      this.state.bufferedMessages.push(message);
      return null;
    }
    // Handle control messages
    if (isActHandlerControlMessage(message)) {
      if (isActHandlerDelayCompleteMessage(message)) {
        return this.handleDelayComplete(message, context);
      }
      return unreachable(message);
    }
    // Handle external messages
    return this.handleExternalMessage(message, context);
  }

  private handleDelayComplete(
    message: ActHandlerDelayCompleteMessage,
    context: HandlerContext<ActHandlerInputMessage<T>>,
  ): HandlerResult<ActHandlerOutputMessage<T>> {
    const { taskId } = message.payload;
    // Silently ignore if not awaiting delay, or if the provided taskId is not the one we're waiting for
    if (this.state.type !== ActHandlerStateType.AwaitingDelay || this.state.taskId !== taskId) {
      return null;
    }
    const { bufferedMessages } = this.state;
    this.state = { type: ActHandlerStateType.Running };
    const result = this.processVmCommands(context, null);
    if (bufferedMessages.length === 0) return result;
    const actions = [
      ...(result ?? []),
      ...bufferedMessages
        .map((bufferedMessage) => this.handle(bufferedMessage, context))
        .filter(nonNull)
        .flat(),
    ];
    return actions.length > 0 ? actions : null;
  }

  private handleExternalMessage(
    message: T,
    context: HandlerContext<ActHandlerInputMessage<T>>,
  ): HandlerResult<ActHandlerOutputMessage<T>> {
    if (this.state.type === ActHandlerStateType.AwaitingMessage) {
      this.state = { type: ActHandlerStateType.Running };
      return this.processVmCommands(context, message);
    }
    // Silently ignore if not awaiting a message (could be buffered by scheduler)
    return null;
  }

  private processVmCommands(
    context: HandlerContext<ActHandlerInputMessage<T>>,
    resumeValue?: unknown,
  ): HandlerResult<ActHandlerOutputMessage<T>> {
    const interpreter = this.interpreter;
    const actions: Array<HandlerAction<ActHandlerOutputMessage<T>>> = [];
    let nextCommand =
      resumeValue !== undefined ? interpreter.next(resumeValue) : interpreter.next();
    while (!nextCommand.done) {
      const { value: command } = nextCommand;
      const result = this.processVmCommand(command, context);
      if (result.actions) actions.push(...result.actions);
      if (result.blocked) {
        // Update internal state to allow resuming paused operations
        const { nextState } = result;
        this.state = nextState;
        return actions.length > 0 ? actions : null;
      }

      nextCommand = interpreter.next(result.resumeValue);
    }

    // VM completed normally
    this.state = { type: ActHandlerStateType.Completed };
    return actions.length > 0 ? actions : null;
  }

  private processVmCommand(
    command: ActorVmCommand,
    context: HandlerContext<ActHandlerInputMessage<T>>,
  ):
    | { blocked: false; resumeValue: unknown; actions: HandlerResult<ActHandlerOutputMessage<T>> }
    | {
        blocked: true;
        nextState: ActHandlerState<T>;
        actions: HandlerResult<ActHandlerOutputMessage<T>>;
      } {
    switch (command.type) {
      case VM_COMMAND_SEND: {
        const { target, message } = command;
        return {
          blocked: false,
          resumeValue: null,
          actions: [HandlerAction.Send({ target, message })],
        };
      }

      case VM_COMMAND_KILL: {
        const { target } = command;
        return {
          blocked: false,
          resumeValue: null,
          actions: [HandlerAction.Kill({ target })],
        };
      }

      case VM_COMMAND_SPAWN: {
        const { actor } = command;
        const childHandle = context.spawn(actor);
        return {
          blocked: false,
          resumeValue: childHandle,
          actions: [HandlerAction.Spawn({ target: childHandle })],
        };
      }

      case VM_COMMAND_AWAIT_MESSAGE: {
        return {
          blocked: true,
          nextState: { type: ActHandlerStateType.AwaitingMessage },
          actions: null,
        };
      }

      case VM_COMMAND_COMPLETE: {
        const self = context.self();
        return {
          blocked: true,
          nextState: { type: ActHandlerStateType.Completed },
          actions: [HandlerAction.Kill({ target: self })],
        };
      }

      case VM_COMMAND_FAIL: {
        const { error } = command;
        const self = context.self();
        return {
          blocked: true,
          nextState: { type: ActHandlerStateType.Failed, error },
          actions: [HandlerAction.Fail({ target: self, error })],
        };
      }

      case VM_COMMAND_DELAY: {
        const { durationMs } = command;
        const self = context.self();
        const taskId = this.nextTaskId++;
        const controller = new AbortController();
        const taskHandle = context.spawn(
          createActHandlerDelayTask({ durationMs, taskId, controller, output: self }),
        );
        return {
          blocked: true,
          nextState: { type: ActHandlerStateType.AwaitingDelay, taskId, bufferedMessages: [] },
          actions: [HandlerAction.Spawn({ target: taskHandle })],
        };
      }

      default: {
        return unreachable(command);
      }
    }
  }
}

export function isDelayCompleteMessage(
  message: unknown,
): message is ActHandlerDelayCompleteMessage {
  return isMessage(message) && isActHandlerDelayCompleteMessage(message);
}
