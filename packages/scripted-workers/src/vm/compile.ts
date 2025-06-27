import { unreachable } from '@reactive-kit/utils';

import {
  ACTION_TYPE_DELAY,
  ACTION_TYPE_KILL,
  ACTION_TYPE_MODIFY_STATE,
  ACTION_TYPE_NOOP,
  ACTION_TYPE_SEND,
  ACTION_TYPE_SEQUENCE,
  ACTION_TYPE_SPAWN,
  ACTION_TYPE_WITH_STATE,
  type DelayAction,
  type KillAction,
  type ModifyStateAction,
  type NoopAction,
  type SendAction,
  type SequenceAction,
  type SpawnAction,
  type WithStateAction,
} from '../actions';
import {
  ACTION_TYPE_COMPLETE,
  ACTION_TYPE_DONE,
  ACTION_TYPE_FAIL,
  ACTION_TYPE_LOOP_BREAK,
  ACTION_TYPE_LOOP_CONTINUE,
  done,
  loopBreak,
  loopContinue,
  type CompleteAction,
  type DoneAction,
  type FailAction,
  type LoopBreakAction,
  type LoopContinueAction,
} from '../actions/internal';
import { ACTION_TYPE_WAIT_FOR, type WaitForAction } from '../actions/waitFor';
import { ACTION_TYPE_WHEN, type WhenAction } from '../actions/when';
import { ACTION_TYPE_WHEN_STATE, type WhenStateAction } from '../actions/whenState';
import {
  ACTION_TYPE_WHILE_LOOP,
  type WhileLoopAction,
  type WhileLoopControls,
} from '../actions/whileLoop';
import { computeState } from '../state/computeState';
import {
  createSpawnedActorValueResolver,
  createStateRef,
  type ActorCommand,
  type ValueRef,
} from '../types';

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
  type BlockEnterAwaitOp,
  type BlockEnterOp,
  type BlockEnterStateOp,
  type LoopEnterOp,
} from './operations';

const BLOCK_LENGTH_PLACEHOLDER = -1;

/**
 * Compiles an actor command into the corresponding list of VM operations.
 *
 * @param command - The actor command to compile.
 * @returns The compiled VM operations.
 */
export function compile<T>(command: ActorCommand<T>): Array<VmOperation> {
  const context: CompilerContext = {
    operations: [],
    nextBlockIndex: 0,
    nextStateIndex: 0,
    nextSpawnedActorIndex: 0,
    nextLoopIndex: 0,
  };
  compileCommand(command, context);
  return context.operations;
}

/**
 * Internal context for the compilation process.
 */
interface CompilerContext {
  /** Output of the compilation process: flat list of compiled VM operations. */
  operations: Array<VmOperation>;
  /** Index of the next block scope to be compiled (root scope effectively has index -1). */
  nextBlockIndex: number;
  /** Index of the next loop scope to be compiled (root scope effectively has index -1). */
  nextLoopIndex: number;
  /** Index of the next state scope to be compiled (root scope effectively has index -1). */
  nextStateIndex: number;
  /** Index of the next spawned actor to be compiled. */
  nextSpawnedActorIndex: number;
}

function compileCommand<T>(command: ActorCommand<T>, context: CompilerContext): void {
  switch (command.type) {
    case ACTION_TYPE_WITH_STATE: {
      compileWithStateCommand(command, context);
      break;
    }
    case ACTION_TYPE_MODIFY_STATE: {
      compileModifyStateCommand(command, context);
      break;
    }
    case ACTION_TYPE_SEQUENCE: {
      compileSequenceCommand(command, context);
      break;
    }
    case ACTION_TYPE_DONE: {
      compileDoneCommand(command, context);
      break;
    }
    case ACTION_TYPE_WHILE_LOOP: {
      compileWhileLoopCommand(command, context);
      break;
    }
    case ACTION_TYPE_LOOP_CONTINUE: {
      compileLoopContinueCommand(command, context);
      break;
    }
    case ACTION_TYPE_LOOP_BREAK: {
      compileLoopBreakCommand(command, context);
      break;
    }
    case ACTION_TYPE_WHEN_STATE: {
      compileWhenStateCommand(command, context);
      break;
    }
    case ACTION_TYPE_WHEN: {
      compileWhenCommand<T, T>(command, context);
      break;
    }
    case ACTION_TYPE_WAIT_FOR: {
      compileWaitForCommand<T>(command, context);
      break;
    }
    case ACTION_TYPE_DELAY: {
      compileDelayCommand(command, context);
      break;
    }
    case ACTION_TYPE_SEND: {
      compileSendCommand(command, context);
      break;
    }
    case ACTION_TYPE_SPAWN: {
      compileSpawnCommand(command, context);
      break;
    }
    case ACTION_TYPE_KILL: {
      compileKillCommand(command, context);
      break;
    }
    case ACTION_TYPE_COMPLETE: {
      compileCompleteCommand(command, context);
      break;
    }
    case ACTION_TYPE_FAIL: {
      compileFailCommand(command, context);
      break;
    }
    case ACTION_TYPE_NOOP: {
      compileNoopCommand(command, context);
      break;
    }
    default: {
      unreachable(command);
    }
  }
}

function compileWithStateCommand<T, S>(
  command: WithStateAction<T, S>,
  context: CompilerContext,
): void {
  const { initialState, factory } = command.options;
  const stateHandle = createStateRef<S>(context.nextStateIndex);
  // Outer block for B_STATE
  compileBlock(
    {
      enterOp: { type: OP_TYPE_BLOCK_ENTER_STATE, length: BLOCK_LENGTH_PLACEHOLDER, initialState },
      finalOp: { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 },
    },
    context,
    (blockContext: CompilerContext) => {
      const nestedCommand = factory(stateHandle);
      compileCommand(nestedCommand, blockContext);
    },
  );
}

function compileModifyStateCommand<T, S>(
  command: ModifyStateAction<T, S>,
  context: CompilerContext,
): void {
  const { stateHandle, updater } = command.options;
  context.operations.push({ type: OP_TYPE_STATE_UPDATE, stateHandle, updater });
}

function compileSequenceCommand<T>(command: SequenceAction<T>, context: CompilerContext): void {
  const { actions: factory } = command.options;
  // Outer block for B_SEQUENCE
  compileBlock(
    {
      enterOp: { type: OP_TYPE_BLOCK_ENTER, length: BLOCK_LENGTH_PLACEHOLDER },
      finalOp: { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 },
    },
    context,
    (blockContext: CompilerContext) => {
      const sequenceBlockIndex = blockContext.nextBlockIndex - 1;
      const sequenceCommands = factory({
        done(): ActorCommand<T> {
          return done(sequenceBlockIndex);
        },
      });
      for (const cmd of sequenceCommands) {
        compileCommand(cmd, blockContext);
      }
    },
  );
}

function compileDoneCommand(command: DoneAction, context: CompilerContext): void {
  const { blockIndex: targetBlockIndex } = command.options;
  if (!isValidBlockIndex(targetBlockIndex)) {
    throw new RangeError(`Invalid done() call: invalid target block index ${targetBlockIndex}`);
  }
  if (context.nextBlockIndex === 0) {
    throw new RangeError(`Invalid done() call: cannot break out of the root scope`);
  }
  const currentBlockIndex = context.nextBlockIndex - 1;
  const relativeBlockIndex = currentBlockIndex - targetBlockIndex;
  if (relativeBlockIndex < 0) {
    throw new RangeError(
      `Invalid done() call: target block index ${targetBlockIndex} is inaccessible from block index ${currentBlockIndex}.`,
    );
  }
  context.operations.push({ type: OP_TYPE_BLOCK_BREAK, blockIndex: relativeBlockIndex });
}

function compileWhileLoopCommand<T>(command: WhileLoopAction<T>, context: CompilerContext): void {
  const { factory } = command.options;
  compileBlock(
    {
      enterOp: { type: OP_TYPE_LOOP_ENTER, length: -1 },
      finalOp: { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
    },
    context,
    (blockContext: CompilerContext) => {
      const loopIndex = blockContext.nextLoopIndex - 1;
      const loopControls: WhileLoopControls<T> = {
        break: (): ActorCommand<T> => loopBreak<T>(loopIndex),
        continue: (): ActorCommand<T> => loopContinue<T>(loopIndex),
      };
      const loopBodyCommand = factory(loopControls);
      compileCommand(loopBodyCommand, blockContext);
    },
  );
}

function compileLoopContinueCommand<T>(
  command: LoopContinueAction<T>,
  context: CompilerContext,
): void {
  const { loopIndex: targetLoopIndex } = command.options;
  if (!isValidBlockIndex(targetLoopIndex)) {
    throw new RangeError(
      `Invalid loopContinue() call: invalid target loop index ${targetLoopIndex}`,
    );
  }
  if (context.nextLoopIndex === 0) {
    throw new RangeError(`Invalid loopContinue() call: no active loops.`);
  }
  const currentLoopIndex = context.nextLoopIndex - 1;
  const relativeLoopIndex = currentLoopIndex - targetLoopIndex;
  if (relativeLoopIndex < 0 || targetLoopIndex > currentLoopIndex) {
    throw new RangeError(
      `Invalid loopContinue() call: target loop index ${targetLoopIndex} is inaccessible from loop index ${currentLoopIndex}.`,
    );
  }
  context.operations.push({ type: OP_TYPE_LOOP_CONTINUE, loopIndex: relativeLoopIndex });
}

function compileLoopBreakCommand<T>(command: LoopBreakAction<T>, context: CompilerContext): void {
  const { loopIndex: targetLoopIndex } = command.options;
  if (!isValidBlockIndex(targetLoopIndex)) {
    throw new RangeError(`Invalid loopBreak() call: invalid target loop index ${targetLoopIndex}`);
  }
  if (context.nextLoopIndex === 0) {
    throw new RangeError(`Invalid loopBreak() call: no active loops.`);
  }
  const currentLoopIndex = context.nextLoopIndex - 1;
  const relativeLoopIndex = currentLoopIndex - targetLoopIndex;
  if (relativeLoopIndex < 0 || targetLoopIndex > currentLoopIndex) {
    throw new RangeError(
      `Invalid loopBreak() call: target loop index ${targetLoopIndex} is inaccessible from loop index ${currentLoopIndex}.`,
    );
  }
  context.operations.push({ type: OP_TYPE_LOOP_EXIT, loopIndex: relativeLoopIndex });
}

function compileWhenStateCommand<T>(command: WhenStateAction<T>, context: CompilerContext): void {
  const { predicate, commandIfTrue, commandIfFalse } = command.options;
  // Outer block for B_CONDITIONAL
  compileBlock(
    {
      enterOp: { type: OP_TYPE_BLOCK_ENTER, length: BLOCK_LENGTH_PLACEHOLDER },
      finalOp: { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 },
    },
    context,
    (blockContext) => {
      compileConditionalBlock(
        {
          predicate,
          ifTrue: commandIfTrue,
          ifFalse: commandIfFalse,
        },
        blockContext,
      );
    },
  );
}

function compileWhenCommand<TOverall, TNarrowed extends TOverall>(
  command: WhenAction<TOverall, TNarrowed>,
  context: CompilerContext,
): void {
  const { predicate, commandIfTrue, commandIfFalse } = command.options;
  // Outer block for B_AWAIT
  compileBlock(
    {
      enterOp: { type: OP_TYPE_BLOCK_ENTER_AWAIT, length: BLOCK_LENGTH_PLACEHOLDER },
      finalOp: { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 },
    },
    context,
    (awaitBlockContext) => {
      const messageStateIndex = awaitBlockContext.nextStateIndex - 1;

      const messageHandleForPredicate = createStateRef<TOverall>(messageStateIndex);
      const messageHandleForTrueFactory = createStateRef<TNarrowed>(messageStateIndex);
      const messageHandleForFalseFactory = createStateRef<TOverall>(messageStateIndex);

      const opPredicateForConditional = computeState(
        [messageHandleForPredicate, predicate as ValueRef<(msg: TOverall) => boolean>],
        (msg: TOverall, actualPredicateFn: (m: TOverall) => boolean) => actualPredicateFn(msg),
      );

      const cmdForTruePath = commandIfTrue(messageHandleForTrueFactory);
      const cmdForFalsePath = commandIfFalse
        ? commandIfFalse(messageHandleForFalseFactory)
        : undefined;

      compileConditionalBlock(
        {
          predicate: opPredicateForConditional,
          ifTrue: cmdForTruePath,
          ifFalse: cmdForFalsePath,
        },
        awaitBlockContext,
      );
    },
  );
}

function compileWaitForCommand<T>(command: WaitForAction<T, T>, context: CompilerContext): void {
  const { predicate, commandIfTrue } = command.options;
  // Outer loop for L_OUTER_LOOP
  compileBlock(
    {
      enterOp: { type: OP_TYPE_LOOP_ENTER, length: BLOCK_LENGTH_PLACEHOLDER },
      finalOp: { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
    },
    context,
    (loopContext) => {
      // Inner block for B_AWAIT
      compileBlock(
        {
          enterOp: { type: OP_TYPE_BLOCK_ENTER_AWAIT, length: BLOCK_LENGTH_PLACEHOLDER },
          finalOp: { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 },
        },
        loopContext,
        (awaitBlockContext) => {
          const messageStateIndex = awaitBlockContext.nextStateIndex - 1;
          const messageHandle = createStateRef<T>(messageStateIndex);
          const dynamicPredicate = computeState(
            [messageHandle, predicate as ValueRef<(msg: T) => boolean>],
            (msg: T, actualPredicateFn: (m: T) => boolean) => actualPredicateFn(msg),
          );

          const truePathCommands: Array<ActorCommand<T>> = [];
          if (commandIfTrue) {
            truePathCommands.push(commandIfTrue(messageHandle));
          }
          truePathCommands.push(loopBreak<T>(0));

          compileConditionalBlock(
            {
              predicate: dynamicPredicate,
              ifTrue: truePathCommands,
              ifFalse: undefined,
            },
            awaitBlockContext,
          );
        },
      );
    },
  );
}

function compileDelayCommand<T>(command: DelayAction<T>, context: CompilerContext): void {
  const { durationMs } = command.options;
  context.operations.push({ type: OP_TYPE_DELAY, durationMs });
}

function compileSendCommand<T, TTarget>(
  command: SendAction<T, TTarget>,
  context: CompilerContext,
): void {
  const { target, message } = command.options;
  context.operations.push({ type: OP_TYPE_ACTOR_SEND, target, message });
}

function compileSpawnCommand<C, T, I, O>(
  command: SpawnAction<C, T, I, O>,
  context: CompilerContext,
): void {
  const { actor, next } = command.options;
  const resolver = createSpawnedActorValueResolver<I>(context.nextSpawnedActorIndex);
  context.operations.push({ type: OP_TYPE_ACTOR_SPAWN, factory: actor });
  context.nextSpawnedActorIndex++;
  compileCommand(next(resolver), context);
}

function compileKillCommand<T>(command: KillAction<T>, context: CompilerContext): void {
  const { target } = command.options;
  context.operations.push({ type: OP_TYPE_ACTOR_KILL, target });
}

function compileCompleteCommand<T>(_command: CompleteAction<T>, context: CompilerContext): void {
  context.operations.push({ type: OP_TYPE_TASK_COMPLETE });
}

function compileFailCommand<T>(command: FailAction<T>, context: CompilerContext): void {
  const { error } = command.options;
  context.operations.push({ type: OP_TYPE_TASK_FAIL, error });
}

function compileNoopCommand<T>(_command: NoopAction<T>, context: CompilerContext): void {
  context.operations.push({ type: OP_TYPE_NOOP });
}

function isValidBlockIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0;
}

type BlockEnterOperation =
  | BlockEnterOp
  | BlockEnterStateOp<unknown>
  | BlockEnterAwaitOp
  | LoopEnterOp;

interface CompileBlockOptions {
  /** The VM operation that initiates the block (e.g., BLOCK_ENTER, LOOP_ENTER). */
  enterOp: BlockEnterOperation & {
    length: typeof BLOCK_LENGTH_PLACEHOLDER;
  };
  /** The VM operation that terminates or continues this block (e.g., BLOCK_BREAK, LOOP_CONTINUE). */
  finalOp: VmOperation;
}

/**
 * Compiles a block of operations, managing nesting depths and calculating the block's length.
 * This helper adds a block wrapper around the innerFactory, managing lexical scopes and other compiler context.
 *
 * @param options Configuration for the block compilation, including enter/term operations and depth management.
 * @param context The compiler context.
 * @param factory A callback to compile the instructions within this block.
 *                    It's called after depths are incremented. The passed context will have updated depths.
 */
function compileBlock(
  options: CompileBlockOptions,
  context: CompilerContext,
  factory: (context: CompilerContext) => void,
): void {
  const { enterOp, finalOp } = options;

  const managesLoopDepth = enterOp.type === OP_TYPE_LOOP_ENTER;
  const managesStateDepth =
    enterOp.type === OP_TYPE_BLOCK_ENTER_STATE || enterOp.type === OP_TYPE_BLOCK_ENTER_AWAIT;

  const mutableEnterOp: BlockEnterOperation = enterOp;
  context.operations.push(mutableEnterOp);
  const bodyStartIndex = context.operations.length;

  if (managesLoopDepth) {
    context.nextLoopIndex++;
  } else {
    context.nextBlockIndex++;
  }

  if (managesStateDepth) {
    context.nextStateIndex++;
  }

  factory(context); // Pass context, which now has updated depth(s)

  context.operations.push(finalOp);
  const bodyEndIndex = context.operations.length;

  // Update the length on the original enterOp object
  mutableEnterOp.length = bodyEndIndex - bodyStartIndex;

  if (managesLoopDepth) {
    context.nextLoopIndex--;
  } else {
    context.nextBlockIndex--;
  }

  if (managesStateDepth) {
    context.nextStateIndex--;
  }
}

/**
 * Compiles the internal logic of a conditional operation (the "else" block with its
 * conditional skip, and the "then" command).
 *
 * Important: This function assumes it is being called within an existing block context,
 * with the 'else' branch breaking out of the current block context.
 */
function compileConditionalBlock<T>(
  options: {
    predicate: ValueRef<boolean>;
    ifTrue: ActorCommand<T> | Array<ActorCommand<T>>;
    ifFalse: ActorCommand<T> | Array<ActorCommand<T>> | undefined;
  },
  context: CompilerContext,
): void {
  const { predicate, ifTrue, ifFalse } = options;

  // --- B_ELSE_inner block ---
  compileBlock(
    {
      enterOp: { type: OP_TYPE_BLOCK_ENTER, length: BLOCK_LENGTH_PLACEHOLDER },
      // Break out of B_ELSE_inner block's parent block (i.e. the existing outer block context)
      finalOp: { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 },
    },
    context,
    (blockContext) => {
      blockContext.operations.push({
        type: OP_TYPE_BLOCK_BREAK_IF,
        predicate,
        blockIndex: 0, // Target B_ELSE_inner
      });

      // --- Else Path Instructions ---
      if (ifFalse) {
        if (Array.isArray(ifFalse)) {
          for (const cmd of ifFalse) {
            compileCommand(cmd, blockContext);
          }
        } else {
          compileCommand(ifFalse, blockContext);
        }
      }
    },
  );

  // --- Then Path Instructions ---
  // Executed if predicate was true (causing B_ELSE_inner to be broken by BLOCK_BREAK_IF).
  if (Array.isArray(ifTrue)) {
    for (const cmd of ifTrue) {
      compileCommand(cmd, context);
    }
  } else {
    compileCommand(ifTrue, context);
  }
}
