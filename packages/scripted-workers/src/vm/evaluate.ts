import { isActorHandle, type ActorHandle } from '@reactive-kit/actor';
import { unreachable } from '@reactive-kit/utils';

import {
  isComputeStateValueResolver,
  isReadStateValueResolver,
  isSpawnedActorValueResolver,
  isStateRefValueResolver,
  isValueResolver,
  type ComputeStateValueResolver,
  type ReadStateValueResolver,
  type SpawnedActorResolver,
  type StateRef,
  type ValueRef,
} from '../types';

import type { ActorVmCommand } from './command';
import {
  awaitMessageVmCommand,
  completeVmCommand,
  delayVmCommand,
  failVmCommand,
  killVmCommand,
  sendVmCommand,
  spawnVmCommand,
} from './commands';
import type { VmOperation } from './operation';
import {
  OP_TYPE_ACTOR_KILL,
  OP_TYPE_ACTOR_SEND,
  OP_TYPE_ACTOR_SPAWN,
  OP_TYPE_BLOCK_BREAK,
  OP_TYPE_BLOCK_BREAK_IF,
  OP_TYPE_BLOCK_ENTER,
  OP_TYPE_BLOCK_ENTER_AWAIT,
  OP_TYPE_BLOCK_ENTER_STATE,
  OP_TYPE_DELAY,
  OP_TYPE_LOOP_CONTINUE,
  OP_TYPE_LOOP_ENTER,
  OP_TYPE_LOOP_EXIT,
  OP_TYPE_NOOP,
  OP_TYPE_STATE_UPDATE,
  OP_TYPE_TASK_COMPLETE,
  OP_TYPE_TASK_FAIL,
} from './operations';

// Base interface for all context stack frames
interface StackFrame<T extends symbol> {
  type: T;
  /** IP of the first instruction of the block/loop body. */
  startIp: number;
  /** The IP of the instruction immediately AFTER this block/loop conceptually ends. */
  endIp: number;
  /** Index into the `valueStack` if this block introduced a value (state or message). */
  valueStackIndex: number | null;
}

const STACK_FRAME_BLOCK = Symbol.for('@reactive-kit/actor/vm/stack-frame/block');
interface BlockStackFrame extends StackFrame<typeof STACK_FRAME_BLOCK> {}

const STACK_FRAME_LOOP = Symbol.for('@reactive-kit/actor/vm/stack-frame/loop');
interface LoopStackFrame extends StackFrame<typeof STACK_FRAME_LOOP> {}

type VmStackFrame = BlockStackFrame | LoopStackFrame;

// Types of values that can be on the VM's operational value stack
type StackValue = unknown;

type SpawnedActorId = number;

interface VmExecutionContext<TIncomingMessage> {
  instructions: ReadonlyArray<VmOperation>;
  currentInstructionPointer: number;
  valueStack: Array<StackValue>;
  contextStack: Array<VmStackFrame>;
  lastValueFromRunner: TIncomingMessage | ActorHandle<unknown> | null; // Can also be an ActorHandle
  nextSpawnedActorIndex: SpawnedActorId;
  spawnedActorHandles: Map<SpawnedActorId, ActorHandle<unknown>>;
  spawnedActorIds: Map<ActorHandle<unknown>, SpawnedActorId>;
}

/**
 * Executes a compiled sequence of VM operations.
 * @param instructions The array of VM operations to execute.
 * @returns A generator that yields ActorVmCommand objects and expects TIncomingMessage | null to be passed from the runner via generator.next().
 */
export function* evaluate<TIncomingMessage>(
  instructions: ReadonlyArray<VmOperation>,
): Generator<ActorVmCommand, void, TIncomingMessage | ActorHandle<unknown> | null> {
  const context: VmExecutionContext<TIncomingMessage> = {
    instructions,
    currentInstructionPointer: 0,
    valueStack: [],
    contextStack: [],
    lastValueFromRunner: null,
    nextSpawnedActorIndex: 0,
    spawnedActorHandles: new Map(),
    spawnedActorIds: new Map(),
  };
  while (context.currentInstructionPointer < context.instructions.length) {
    const instruction = context.instructions[context.currentInstructionPointer];

    switch (instruction.type) {
      case OP_TYPE_NOOP: {
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_TASK_COMPLETE: {
        context.lastValueFromRunner = yield completeVmCommand();
        return; // Terminate task immediately
      }

      case OP_TYPE_TASK_FAIL: {
        const { error } = instruction;
        context.lastValueFromRunner = yield failVmCommand(error);
        return; // Terminate task immediately
      }

      case OP_TYPE_DELAY: {
        const { durationMs } = instruction;
        const duration = resolveStateValue(durationMs, context);
        context.lastValueFromRunner = yield delayVmCommand(duration);
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_BLOCK_ENTER: {
        const { length } = instruction;
        const startIp = context.currentInstructionPointer + 1;
        const endIp = startIp + length;
        context.contextStack.push({
          type: STACK_FRAME_BLOCK,
          startIp,
          endIp,
          valueStackIndex: null,
        });
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_BLOCK_ENTER_STATE: {
        const { initialState, length } = instruction;
        const startIp = context.currentInstructionPointer + 1;
        const endIp = startIp + length;
        const initialStateFn = resolveStateValue(initialState, context);
        const initialStateValue = initialStateFn();
        context.valueStack.push(initialStateValue);
        context.contextStack.push({
          type: STACK_FRAME_BLOCK,
          startIp,
          endIp,
          valueStackIndex: context.valueStack.length - 1,
        });
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_BLOCK_ENTER_AWAIT: {
        const { length } = instruction;
        const startIp = context.currentInstructionPointer + 1;
        const endIp = startIp + length;
        const receivedValue = yield awaitMessageVmCommand();
        context.lastValueFromRunner = receivedValue;
        context.valueStack.push(receivedValue);
        context.contextStack.push({
          type: STACK_FRAME_BLOCK,
          startIp,
          endIp,
          valueStackIndex: context.valueStack.length - 1,
        });
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_BLOCK_BREAK:
      case OP_TYPE_BLOCK_BREAK_IF: {
        const { blockIndex } = instruction;
        const shouldBreak =
          instruction.type === OP_TYPE_BLOCK_BREAK_IF
            ? resolveStateValue(instruction.predicate, context)
            : true;
        if (!shouldBreak) {
          // Advance to the next instruction.
          context.currentInstructionPointer++;
          break;
        }

        const targetBlock = findTargetStackFrame(context, blockIndex);
        if (targetBlock === null) {
          throw new RangeError(
            `VM Error: BLOCK_BREAK target block for blockIndex ${blockIndex} not found.`,
          );
        }
        const { frame: targetBlockFrame, index: targetBlockIndex } = targetBlock;
        const currentStackIndex = context.contextStack.length - 1;
        const targetStackIndex = targetBlockIndex - 1; // Pop to the parent of the block
        const framesToPop = currentStackIndex - targetStackIndex;
        if (framesToPop > 0) unwindStack(context, framesToPop);

        // Advance to the next instruction.
        context.currentInstructionPointer = targetBlockFrame.endIp;
        break;
      }

      case OP_TYPE_LOOP_ENTER: {
        const { length } = instruction;
        const startIp = context.currentInstructionPointer + 1;
        const endIp = startIp + length;
        context.contextStack.push({
          type: STACK_FRAME_LOOP,
          startIp,
          endIp,
          valueStackIndex: null,
        });
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_LOOP_CONTINUE: {
        const { loopIndex } = instruction;
        const targetLoop = findTargetLoopFrame(context, loopIndex);

        if (targetLoop === null) {
          throw new RangeError(
            `VM Error: LOOP_CONTINUE target loop for loopIndex ${loopIndex} not found.`,
          );
        }

        const { frame: targetLoopFrame, index: targetLoopIndex } = targetLoop;
        const currentStackIndex = context.contextStack.length - 1;
        const targetStackIndex = targetLoopIndex; // Pop to the loop, not its parent
        const framesToPop = currentStackIndex - targetStackIndex;
        if (framesToPop > 0) unwindStack(context, framesToPop);

        // Advance to the next instruction.
        context.currentInstructionPointer = targetLoopFrame.startIp;
        break;
      }

      case OP_TYPE_LOOP_EXIT: {
        const { loopIndex } = instruction;
        const targetLoop = findTargetLoopFrame(context, loopIndex);

        if (targetLoop === null) {
          throw new RangeError(
            `VM Error: LOOP_EXIT target loop for loopIndex ${loopIndex} not found.`,
          );
        }

        const { frame: targetLoopFrame, index: targetLoopIndex } = targetLoop;
        const currentStackIndex = context.contextStack.length - 1;
        const targetStackIndex = targetLoopIndex - 1; // Pop to the parent of the loop
        const framesToPop = currentStackIndex - targetStackIndex;
        if (framesToPop > 0) unwindStack(context, framesToPop);

        // Advance to the next instruction.
        context.currentInstructionPointer = targetLoopFrame.endIp;
        break;
      }

      case OP_TYPE_STATE_UPDATE: {
        const { stateHandle, updater } = instruction;
        const updaterFn = resolveStateValue(updater, context);
        updateStateValue(stateHandle, updaterFn, context);
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_ACTOR_SPAWN: {
        const { factory } = instruction;

        // The compiler assigns a unique sequential index to each spawn operation.
        // This index is used to retrieve the handle when processing subsequent instructions.
        const spawnId = context.nextSpawnedActorIndex++;
        const childActor = resolveStateValue(factory, context);

        // Expect the runner to provide an ActorHandle in response to the SPAWN command
        const spawnedHandle = yield spawnVmCommand(childActor);
        context.lastValueFromRunner = spawnedHandle;
        if (!isActorHandle(spawnedHandle)) {
          throw new Error(
            `VM Error: SPAWN for id ${spawnId} did not receive a valid ActorHandle from runner`,
          );
        }
        // Record the received handle for use in subequent instructions.
        context.spawnedActorHandles.set(spawnId, spawnedHandle);
        context.spawnedActorIds.set(spawnedHandle, spawnId);
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_ACTOR_SEND: {
        const { target, message } = instruction;
        const targetActor = resolveActorHandle(target, context);
        const messageToSend = resolveStateValue(message, context);
        context.lastValueFromRunner = yield sendVmCommand(targetActor, messageToSend);
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      case OP_TYPE_ACTOR_KILL: {
        const { target } = instruction;
        const targetToKill = resolveActorHandle(target, context);
        context.lastValueFromRunner = yield killVmCommand(targetToKill);
        const targetSpawnId = context.spawnedActorIds.get(targetToKill);
        // If the target handle was spawned by this actor, delete the corresponding record to prevent memory leaks.
        if (targetSpawnId !== undefined) {
          context.spawnedActorHandles.delete(targetSpawnId);
          context.spawnedActorIds.delete(targetToKill);
        }
        // Advance to the next instruction.
        context.currentInstructionPointer++;
        break;
      }

      default: {
        // Ensures all operation types are handled.
        // If an VmOperation type is added without a case here, TypeScript will error.
        return unreachable(instruction);
      }
    }
  }

  // All instructions having been executed implies successful completion.
  context.lastValueFromRunner = yield completeVmCommand();
  return;
}

function findTargetStackFrame(
  context: VmExecutionContext<unknown>,
  blockIndex: number,
): { frame: VmStackFrame; index: number } | null {
  if (blockIndex < 0 || blockIndex >= context.contextStack.length) {
    return null;
  }
  const currentStackIndex = context.contextStack.length - 1;
  const frame = context.contextStack[currentStackIndex - blockIndex];
  return { frame, index: currentStackIndex - blockIndex };
}

function findTargetLoopFrame(
  context: VmExecutionContext<unknown>,
  loopIndex: number,
): { frame: LoopStackFrame; index: number } | null {
  let numLoopsEncountered = 0;
  const currentStackIndex = context.contextStack.length - 1;
  for (let i = currentStackIndex; i >= 0; i--) {
    const frame = context.contextStack[i];
    if (frame.type === STACK_FRAME_LOOP) {
      if (numLoopsEncountered === loopIndex) return { frame, index: i };
      numLoopsEncountered++;
    }
  }
  return null;
}

function unwindStack(context: VmExecutionContext<unknown>, numberOfFramesToPop: number): void {
  if (numberOfFramesToPop < 0 || numberOfFramesToPop > context.contextStack.length) {
    throw new RangeError(
      `Invalid number of frames to pop from VM stack: ${numberOfFramesToPop} (current stack depth: ${context.contextStack.length}).`,
    );
  }
  for (let i = 0; i < numberOfFramesToPop; i++) {
    const frame = context.contextStack.pop()!;
    if (isStatefulFrame(frame)) popValueStack(context);
  }
}

function popValueStack(context: VmExecutionContext<unknown>): void {
  if (context.valueStack.length === 0) {
    throw new RangeError('Attempted to pop value from empty VM value stack.');
  }
  context.valueStack.pop();
}

/** Resolves a ValueRef<V> to its runtime value V. */
function resolveStateValue<V>(ref: ValueRef<V>, context: VmExecutionContext<unknown>): V {
  if (!isValueResolver(ref)) return ref;
  if (isStateRefValueResolver(ref)) return resolveStateRefValue(ref, context);
  if (isReadStateValueResolver(ref)) return resolveReadStateValue(ref, context);
  if (isComputeStateValueResolver(ref)) return resolveComputeStateValue(ref, context);
  if (isSpawnedActorValueResolver(ref)) return resolveSpawnedActorHandle(ref, context) as V;
  return unreachable(ref);
}

function resolveActorHandle<T>(
  ref: ActorHandle<T> | SpawnedActorResolver<T>,
  context: VmExecutionContext<unknown>,
): ActorHandle<T> {
  if (!isValueResolver(ref)) return ref;
  return resolveSpawnedActorHandle<T>(ref, context);
}

function resolveStateRefValue<V>(ref: StateRef<V>, context: VmExecutionContext<unknown>): V {
  const { index: stateIndex } = ref;
  return context.valueStack[stateIndex] as V;
}

function resolveReadStateValue<S, V>(
  ref: ReadStateValueResolver<S, V>,
  context: VmExecutionContext<unknown>,
): V {
  const { ref: stateRef, compute } = ref;
  const value = resolveStateValue(stateRef, context);
  return compute(value);
}

function resolveComputeStateValue<S extends Array<unknown>, V>(
  ref: ComputeStateValueResolver<S, V>,
  context: VmExecutionContext<unknown>,
): V {
  const { inputs, combine } = ref;
  const values = inputs.map((input: ValueRef<S[number]>): S[number] =>
    resolveStateValue(input, context),
  ) as S;
  return combine(...values);
}

function resolveSpawnedActorHandle<T>(
  ref: SpawnedActorResolver<T>,
  context: VmExecutionContext<unknown>,
): ActorHandle<T> {
  const { index: actorIndex } = ref;
  const handle = context.spawnedActorHandles.get(actorIndex);
  if (handle === undefined) {
    throw new RangeError(`VM Error: Unable to retrieve spawned actor with index ${actorIndex}`);
  }
  return handle as ActorHandle<T>;
}

/** Updates a state value on the valueStack. */
function updateStateValue<S>(
  stateRef: StateRef<S>,
  updater: (currentState: S, context: VmExecutionContext<unknown>) => S,
  context: VmExecutionContext<unknown>,
): void {
  const { index: stateIndex } = stateRef;
  if (stateIndex < 0 || stateIndex >= context.valueStack.length) {
    throw new RangeError(
      `Invalid state index: ${stateIndex} (current value stack depth: ${context.valueStack.length}).`,
    );
  }
  const currentState = context.valueStack[stateIndex] as S;
  context.valueStack[stateIndex] = updater(currentState, context);
}

function isStatefulFrame(
  frame: VmStackFrame,
): frame is BlockStackFrame & { valueStackIndex: NonNullable<BlockStackFrame['valueStackIndex']> } {
  return frame.type === STACK_FRAME_BLOCK ? frame.valueStackIndex !== null : false;
}
