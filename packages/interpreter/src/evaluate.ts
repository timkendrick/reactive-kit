import {
  createSignal,
  EFFECT,
  isEffect,
  isSignal,
  isStateful,
  Signal,
  type Effect,
  type Reactive,
  type Stateful,
  type StatefulGenerator,
} from '@reactive-kit/types';
import { Enum, EnumVariant, VARIANT, nonNull } from '@reactive-kit/utils';
import { ConditionTree, DependencyTree, EvaluationResult, StateValues } from './types';
import { collectConditionTree, createEffectLookup, flattenConditionTree } from './utils/condition';
import { combineDependencies, EMPTY_DEPENDENCIES } from './utils/dependency';
import { isCatcher } from '@reactive-kit/types/src/types/catcher';

class MutableStack<T> {
  private values: Array<T>;
  public constructor(...values: Array<T>) {
    this.values = values;
  }
  public push(value: T): void {
    this.values.push(value);
  }
  public pop(): T | undefined {
    return this.values.pop();
  }
  public overwrite(value: T, depth: number): void {
    if (depth > this.values.length - 1) throw new Error('Stack underflow');
    this.values[this.values.length - 1 - depth] = value;
  }
}

/**
 * A stack frame represents a single step in the execution of a stateful expression
 */
type StackFrame = Enum<{
  // Initiate evaluation of a stateful expression
  Evaluate: {
    expression: Stateful<unknown>;
  };
  // Resume an in-progress stateful expression evaluation
  Resume: {
    evaluation: StatefulGenerator<unknown>;
  };
  // Handle a condition
  Handle: {
    condition: Effect<unknown>;
  };
  // Record the fully-resolved evaluation result for the current thread
  Result: {
    value: unknown;
  };
  // Copy the contents of the result register to a position lower down the stack,
  // overwriting the stack frame at the target position
  Copy: {
    // A depth of 0 refers to the frame immediately below the Copy frame
    depth: number;
  };
  // Combine the preceding `count` stack frames into a single frame
  // If any of the stack frames are Halt frames, they will be replaced with a single Halt frame containing all the combined conditions
  // If all of the stack frames are Result frames, they will be replaced with a single Result frame whose value is an array of all the result values
  // Otherwise if there is a mix of stack frame types, the stack frames will be replaced with a single Result frame whose value is an empty array
  Squash: {
    count: number;
  };
  // Block the current thread with an unhandled condition
  Halt: {
    conditions: ConditionTree;
  };
  // Prevent the current thread from unwinding any further upon encountering an unhandled condition
  Catch: {
    // If there is no handler function specified, any halt stack frame will remain in the result register,
    // but no further stack unwinding will take place, allowing execution to continue with the preceding stack frame.
    // If there is a handler function specified, if the value returned by the handler function is a condition tree it
    // will be re-thrown, otherwise the result will be immediately executed
    handler: ((condition: Signal) => Reactive<unknown> | Signal) | null;
  };
  // Terminate the execution
  Terminate: void;
  // Placeholder stack frame (typically overwritten by later Copy frames)
  Noop: void;
}>;

const StackFrame = Enum.create<StackFrame>({
  Evaluate: true,
  Resume: true,
  Handle: true,
  Result: true,
  Copy: true,
  Squash: true,
  Halt: true,
  Catch: true,
  Terminate: true,
  Noop: true,
});

type ThreadResultStackFrame = EnumVariant<StackFrame, 'Result'> | EnumVariant<StackFrame, 'Halt'>;
const THREAD_RESULT_UNDEFINED_PLACEHOLDER = StackFrame.Result({ value: undefined });

const STACK_FRAME_PLACEHOLDER = StackFrame.Noop({});

// TODO: consider passing newly-updated state values to evaluate method
export function evaluate<T>(expression: Reactive<T>, state: StateValues): EvaluationResult<T> {
  let combinedDependencies: DependencyTree = EMPTY_DEPENDENCIES;
  const stack = new MutableStack<StackFrame>(StackFrame.Terminate({}));
  executeExpression(expression, stack);
  let stackFrame: StackFrame | undefined;
  let threadResultRegister: ThreadResultStackFrame = THREAD_RESULT_UNDEFINED_PLACEHOLDER;
  loop: while ((stackFrame = stack.pop())) {
    switch (stackFrame[VARIANT]) {
      case 'Evaluate': {
        const { expression } = stackFrame;
        // Instantiate a new stateful iteration
        const evaluation = expression[Symbol.iterator]();
        // TODO: determine whether to reuse cached stateful values based on updated state values
        // Store a dummy value in the result register to kick off the evaluation iterator
        threadResultRegister = THREAD_RESULT_UNDEFINED_PLACEHOLDER;
        // Proceed with the evaluation iteration
        stack.push(StackFrame.Resume({ evaluation }));
        continue loop;
      }
      case 'Resume': {
        const { evaluation } = stackFrame;
        // If we are resuming an in-progress evaluation, get the current resolved effect value from the result register
        // (if this is the first step of the generator, the result register will contain the undefined result)
        const continuationValue = StackFrame.Result.is(threadResultRegister)
          ? threadResultRegister.value
          : undefined;
        // Evaluate the next step of the expression, providing the retrieved effect value
        let result = evaluation.next(continuationValue);
        // Continue evaluating the expression, providing any fully-resolved effect values as required
        while (!result.done) {
          const { value: yieldedValue } = result;
          // TODO: allow pushing multiple unresolved expressions onto the stack simultaneously
          if (isStateful(yieldedValue)) {
            // The expression evaluation has emitted a chained stateful value, so queue up the current stack frame again
            // to be resolved again once the inner generator has completed
            stack.push(stackFrame);
            // Initiate a new evaluation stack for evaluating the inner expression
            stack.push(StackFrame.Evaluate({ expression: yieldedValue }));
            continue loop;
          } else if (isEffect(yieldedValue)) {
            if (!state.has(yieldedValue[EFFECT])) {
              // The expression evaluation has reached a halt condition, so queue up the current stack frame again
              // to be resolved again once the condition has been handled
              stack.push(stackFrame);
              // Initiate a new evaluation stack for handling the condition
              stack.push(StackFrame.Handle({ condition: yieldedValue }));
              continue loop;
            }
            const condition = yieldedValue;
            const stateToken = condition[EFFECT];
            // Register the condition as a dependency of this evaluation
            combinedDependencies = combineDependencies(
              combinedDependencies,
              DependencyTree.Unit({ value: stateToken }),
            );
            const stateValue = state.get(stateToken);
            // Continue evaluating the stateful value
            result = { done: false, value: stateValue };
          } else {
            // Otherwise if the yielded value is fully resolved, provide the value to continue evaluation of the expression
            result = evaluation.next(yieldedValue);
          }
        }
        // The stateful expression has completed successfully, so push the result onto the stack and continue execution
        stack.push(StackFrame.Result({ value: result.value }));
        continue loop;
      }
      case 'Handle': {
        const condition = stackFrame.condition;
        const stateToken = condition[EFFECT];
        // Register the signal as a dependency of this evaluation
        combinedDependencies = combineDependencies(
          combinedDependencies,
          DependencyTree.Unit({ value: stateToken }),
        );
        if (state.has(stateToken)) {
          // A value has been resolved for the signal, so push the value onto the stack and continue execution
          const value = state.get(stateToken);
          executeExpression(value, stack);
          continue;
        } else {
          // The current execution thread is blocked, so push the halting condition onto the stack
          // and continue executing the next thread
          stack.push(StackFrame.Halt({ conditions: ConditionTree.Unit({ condition }) }));
          continue;
        }
      }
      case 'Result': {
        // The thread has resolved to a concrete value, so store the value in the result register
        // and continue executing the next thread
        threadResultRegister = stackFrame;
        continue;
      }
      case 'Copy': {
        // Copy the result register into the specified stack frame further down the stack
        stack.overwrite(threadResultRegister, stackFrame.depth);
        continue;
      }
      case 'Squash': {
        // Combine the results of the preceding `count` stack values into a single frame
        const threadResults = Array.from({ length: stackFrame.count }, () => stack.pop())
          .filter(nonNull)
          .reverse();
        if (threadResults.length < stackFrame.count) {
          throw new Error('Insufficient items on execution stack');
        }
        const result = collectThreadResults(threadResults);
        // Push the combined result onto the stack and continue execution
        stack.push(result);
        continue;
      }
      case 'Halt': {
        // The thread has executed as far as possible, so store the value in the result register
        threadResultRegister = stackFrame;
        // Unwind the stack until one of the following control flow frames is encountered:
        // - a Catch frame, in which case the thread will resume executing
        // - a Terminate frame, in which case execution will terminate
        let next: StackFrame | undefined;
        while ((next = stack.pop())) {
          switch (next[VARIANT]) {
            case 'Catch': {
              const { handler } = next;
              const { conditions } = threadResultRegister;
              // If there is a handler specified, resume evaluation with the handler result
              if (handler) {
                const signal = createSignal(flattenConditionTree(conditions));
                const handlerResult = handler(signal);
                executeExpression(handlerResult, stack);
              }
              // If there is no handler specified, resume evaluation with the Halt stack frame in the thread result register
              // Resume evaluation on the main loop
              continue loop;
            }
            case 'Terminate': {
              // Push the frame back onto the stack for processing via the main loop
              stack.push(next);
              continue loop;
            }
            default:
              // Continue unwinding the stack
              continue;
          }
        }
      }
      case 'Terminate': {
        // Break out of the execution loop
        break loop;
      }
    }
  }
  return StackFrame.Halt.is(threadResultRegister)
    ? EvaluationResult.Pending(threadResultRegister.conditions, combinedDependencies)
    : EvaluationResult.Ready(threadResultRegister.value as T, combinedDependencies);
}

function executeExpression(expression: Reactive<unknown>, stack: MutableStack<StackFrame>) {
  // Append the relevant sequence of stack frames to evaluate the given expression
  if (isStateful(expression)) {
    stack.push(StackFrame.Evaluate({ expression }));
  } else if (isEffect(expression)) {
    stack.push(StackFrame.Handle({ condition: expression }));
  } else if (isSignal(expression)) {
    stack.push(StackFrame.Halt({ conditions: collectConditionTree(expression.effects) }));
  } else if (isCatcher(expression)) {
    stack.push(StackFrame.Catch({ handler: expression.fallback }));
    executeExpression(expression.target, stack);
  } else {
    stack.push(StackFrame.Result({ value: expression }));
  }
}

function collectThreadResults(threads: Array<StackFrame>): ThreadResultStackFrame {
  const completedThreads = threads
    .map((frame) => (StackFrame.Result.is(frame) ? frame : null))
    .filter(nonNull)
    .map((frame) => frame.value);
  if (completedThreads.length === threads.length) {
    return StackFrame.Result({ value: completedThreads });
  }
  const blockedThreads = threads
    .map((frame) => (StackFrame.Halt.is(frame) ? frame : null))
    .filter(nonNull);
  const deduplicatedConditions = createEffectLookup(
    ConditionTree.Multiple({ children: blockedThreads.map((frame) => frame.conditions) }),
  );
  const conditions = collectConditionTree(Array.from(deduplicatedConditions.values()));
  if (!conditions) return StackFrame.Result({ value: [] });
  return StackFrame.Halt({ conditions });
}

function resolveConditions(conditions: ConditionTree, stack: MutableStack<StackFrame>): void {
  // Push the blocking conditions onto the stack to be processed and continue execution
  switch (conditions[VARIANT]) {
    case ConditionTree.Unit[VARIANT]: {
      // If there is only a single blocking condition, continue on the current thread stack
      // Push the condition onto the stack to be handled
      stack.push(StackFrame.Handle({ condition: conditions.condition }));
      return;
    }
    case ConditionTree.Pair[VARIANT]:
    case ConditionTree.Multiple[VARIANT]: {
      // Otherwise if there are multiple blocking conditions, push each onto the stack to be executed in its own thread
      const effects = flattenConditionTree(conditions);
      // Insert placeholder cells to store copies of the condition values once they have been handled
      for (let i = 0; i < effects.length; i++) stack.push(STACK_FRAME_PLACEHOLDER);
      // Push an instruction onto the stack that will combine the values stored in the preceding condition placeholders into a single stack frame
      stack.push(StackFrame.Squash({ count: effects.length }));
      // Push each condition onto the stack to be processed and continue execution
      for (let i = 0; i < effects.length; i++) {
        const condition = effects[i];
        // Copy the condition into the preassigned placeholder once it has been handled
        // (bearing in mind a depth of 1 for the immediately preceding Squash frame,
        // and 2 additional Catch / Handle stack frames for every effect)
        stack.push(StackFrame.Copy({ depth: 1 + (effects.length - 1) + i * 2 }));
        stack.push(StackFrame.Catch({ handler: null }));
        // Handle the condition
        stack.push(StackFrame.Handle({ condition }));
      }
      return;
    }
  }
}

function hasUnmetCondition(
  condition: Effect<unknown> | Array<Effect<unknown>>,
  state: StateValues,
): boolean {
  if (Array.isArray(condition)) {
    return condition.some((condition) => hasUnmetCondition(condition, state));
  }
  const stateToken = condition[EFFECT];
  return !state.has(stateToken);
}

function getResolvedConditionValues(
  condition: Effect<unknown>,
  state: StateValues,
): unknown | undefined;
function getResolvedConditionValues(
  condition: Array<Effect<unknown>>,
  state: StateValues,
): Array<unknown | undefined>;
function getResolvedConditionValues(
  condition: Effect<unknown> | Array<Effect<unknown>>,
  state: StateValues,
): unknown | undefined | Array<unknown | undefined>;
function getResolvedConditionValues(
  condition: Effect<unknown> | Array<Effect<unknown>>,
  state: StateValues,
): unknown | undefined | Array<unknown | undefined> {
  if (Array.isArray(condition)) {
    return condition.map((condition) => getResolvedConditionValues(condition, state));
  }
  const stateToken = condition[EFFECT];
  return state.get(stateToken);
}
