import {
  EFFECT,
  isEffect,
  isStateful,
  type Effect,
  type Reactive,
  type Stateful,
  type StatefulGenerator,
} from '@reactive-kit/types';
import { Enum, EnumVariant, VARIANT, nonNull } from '@reactive-kit/utils';
import { ConditionTree, DependencyTree, EvaluationResult, StateValues } from './types';
import { collectConditionTree, flattenConditionTree } from './utils/condition';
import { combineDependencies, EMPTY_DEPENDENCIES } from './utils/dependency';

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
    condition: Effect;
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
  // Combine the preceding `count` stack values into a single frame, according to the provided combining function
  Squash: {
    count: number;
    combine: (values: Array<StackFrame>) => StackFrame;
  };
  // Block the current thread with an unhandled condition
  Halt: {
    conditions: ConditionTree;
  };
  // Prevent the current thread from unwinding any further upon encountering an unhandled condition
  Catch: void;
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
  stack.push(
    isStateful(expression)
      ? StackFrame.Evaluate({ expression })
      : isEffect(expression)
      ? StackFrame.Handle({ condition: expression })
      : StackFrame.Result({ value: expression }),
  );
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
        // FIXME: allow pushing multiple state dependencies onto the stack simultaneously
        while (!result.done) {
          const { value: yieldedValue } = result;
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
          stack.push(
            isStateful(value)
              ? StackFrame.Evaluate({ expression: value })
              : isEffect(value)
              ? StackFrame.Handle({ condition: value })
              : StackFrame.Result({ value }),
          );
          continue;
        } else {
          // The current execution thread is blocked, so push the halting condition onto the stack
          // and continue executing the next thread
          // FIXME: allow defining catch handlers for unresolved signals
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

// FIXME: allow pushing multiple state dependencies onto the stack simultaneously
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
      const effects = Array.from(flattenConditionTree(conditions).values());
      // Insert placeholder cells to store copies of the condition values once they have been handled
      for (const condition of effects) stack.push(STACK_FRAME_PLACEHOLDER);
      // Push an instruction onto the stack that will combine the values stored in the preceding condition placeholders into a single stack frame
      stack.push(
        StackFrame.Squash({
          count: effects.length,
          combine: collectThreadResults,
        }),
      );
      // Push each condition onto the stack to be processed and continue execution
      for (const condition of effects) {
        // Copy the condition into the preassigned placeholder once it has been handled
        // (bearing in mind a depth of 1 for the immediately preceding Squash frame)
        stack.push(StackFrame.Copy({ depth: 1 + effects.length }));
        stack.push(StackFrame.Catch({}));
        // Handle the condition
        stack.push(StackFrame.Handle({ condition }));
      }
      return;
    }
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
  const conditions = blockedThreads
    .map((frame) => flattenConditionTree(frame.conditions))
    .reduce((combinedConditions, conditions) => {
      for (const [key, value] of combinedConditions) {
        combinedConditions.set(key, value);
      }
      return combinedConditions;
    }, new Map());
  const combinedConditions = collectConditionTree(Array.from(conditions.values()));
  if (!combinedConditions) return StackFrame.Result({ value: [] });
  return StackFrame.Halt({ conditions: combinedConditions });
}

function hasUnmetCondition(condition: Effect | Array<Effect>, state: StateValues): boolean {
  if (Array.isArray(condition))
    return condition.some((condition) => hasUnmetCondition(condition, state));
  const stateToken = condition[EFFECT];
  return !state.has(stateToken);
}

function getResolvedConditionValues<T>(condition: Effect, state: StateValues): T | undefined;
function getResolvedConditionValues<T>(
  condition: Array<Effect>,
  state: StateValues,
): Array<T | undefined>;
function getResolvedConditionValues(
  condition: Effect | Array<Effect>,
  state: StateValues,
): unknown | undefined | Array<unknown | undefined>;
function getResolvedConditionValues(
  condition: Effect | Array<Effect>,
  state: StateValues,
): unknown | undefined | Array<unknown | undefined> {
  if (Array.isArray(condition))
    return condition.map((condition) => getResolvedConditionValues(condition, state));
  const stateToken = condition[EFFECT];
  return state.get(stateToken);
}
