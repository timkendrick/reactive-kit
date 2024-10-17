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
  public size(): number {
    return this.values.length;
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
    handler: (condition: Signal) => Reactive<unknown> | Signal;
  };
  // Marker frame that indicates the start of a new thread
  Spawn: void;
  // Marker frame that indicates the end of the active thread
  Terminate: void;
  // Collect the preceding `count` thread result stack frames into a single frame
  // All of the stack frames must be either Halt or Result frames
  // If all of the stack frames are Result frames, they will be replaced with a single Result frame whose value is an array of all the result values
  // If any of the stack frames are Halt frames, they will be replaced with a single Halt frame containing all the combined conditions
  Join: {
    count: number;
  };
  // Placeholder stack frame (typically overwritten by later Copy frames)
  Noop: void;
}>;

const StackFrame = Enum.create<StackFrame>({
  Evaluate: true,
  Resume: true,
  Handle: true,
  Result: true,
  Copy: true,
  Halt: true,
  Catch: true,
  Spawn: true,
  Terminate: true,
  Join: true,
  Noop: true,
});

type ThreadResultStackFrame = EnumVariant<StackFrame, 'Result'> | EnumVariant<StackFrame, 'Halt'>;
const THREAD_RESULT_UNDEFINED_PLACEHOLDER = StackFrame.Result({ value: undefined });

const STACK_FRAME_PLACEHOLDER = StackFrame.Noop({});

// TODO: consider passing newly-updated state values to evaluate method
export function evaluate<T>(expression: Reactive<T>, state: StateValues): EvaluationResult<T> {
  let combinedDependencies: DependencyTree = EMPTY_DEPENDENCIES;
  // Enqueue the initial stack frames necessary to evaluate the main thread
  const stack = new MutableStack<StackFrame>(StackFrame.Terminate({}));
  executeExpression(expression, stack);
  stack.push(StackFrame.Spawn({}));
  // Create registers to keep track of the result of the current thread
  let numActiveThreads = 0;
  let threadResultRegister: ThreadResultStackFrame = THREAD_RESULT_UNDEFINED_PLACEHOLDER;
  // Stack interpreter main loop
  let stackFrame: StackFrame | undefined;
  loop: while ((stackFrame = stack.pop())) {
    switch (stackFrame[VARIANT]) {
      case 'Spawn': {
        numActiveThreads++;
        continue loop;
      }
      case 'Terminate': {
        if (numActiveThreads === 0) {
          throw new Error('Thread underflow');
        }
        // If this is the final thread, break out of the execution loop
        if (--numActiveThreads === 0) {
          break loop;
        }
        // Otherwise continue executing the next thread
        continue loop;
      }
      case 'Result': {
        // The thread has resolved to a concrete value, so store the value in the result register
        // and continue execution the next thread
        threadResultRegister = stackFrame;
        continue loop;
      }
      case 'Evaluate': {
        const { expression } = stackFrame;
        // Instantiate a new stateful iteration
        const evaluation = expression[Symbol.iterator]();
        // TODO: determine whether to reuse cached stateful values based on updated state values
        // Store an undefined result in the result register to initialize the evaluation iterator
        threadResultRegister = THREAD_RESULT_UNDEFINED_PLACEHOLDER;
        // Proceed with the evaluation iteration
        stack.push(StackFrame.Resume({ evaluation }));
        continue loop;
      }
      case 'Resume': {
        const { evaluation } = stackFrame;
        // If we are resuming an in-progress evaluation, there must be an intermediate result in the result register
        // (if this is the first step of the generator, the result register will contain the undefined result)
        if (!StackFrame.Result.is(threadResultRegister)) {
          throw new Error('Invalid intermediate generator value');
        }
        // Get the current resolved effect value from the result register
        // Evaluate the next step of the expression, providing the retrieved continuation value
        let result = evaluation.next(threadResultRegister.value);
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
          } else if (isSignal(yieldedValue)) {
            // The expression has reached an unresolvable halting condition
            stack.push(StackFrame.Halt({ conditions: collectConditionTree(yieldedValue.effects) }));
            continue loop;
          } else if (isCatcher(yieldedValue)) {
            // The expression evaluation has emitted a chained stateful value, so queue up the current stack frame again
            // to be resolved again once the inner expression has been handled
            stack.push(stackFrame);
            executeExpression(yieldedValue, stack);
            continue loop;
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
          continue loop;
        } else {
          // The current execution thread is blocked, so push the halting condition onto the stack
          // and continue executing the next thread
          stack.push(StackFrame.Halt({ conditions: ConditionTree.Unit({ condition }) }));
          continue loop;
        }
      }
      case 'Copy': {
        // Copy the result register into the specified stack frame further down the stack
        stack.overwrite(threadResultRegister, stackFrame.depth);
        continue loop;
      }
      case 'Join': {
        // Collect the results of the preceding threads
        const completedThreads = new Array<EnumVariant<StackFrame, 'Result'>>();
        const blockedThreads = new Array<EnumVariant<StackFrame, 'Halt'>>();
        for (let i = 0; i < stackFrame.count; i++) {
          const threadResult = stack.pop();
          if (!threadResult) throw new Error('Insufficient thread results on execution stack');
          switch (threadResult[VARIANT]) {
            case 'Result': {
              completedThreads.push(threadResult);
              break;
            }
            case 'Halt': {
              blockedThreads.push(threadResult);
              break;
            }
            default:
              throw new Error('Invalid thread result');
          }
        }
        // Push the combined result onto the stack
        switch (blockedThreads.length) {
          case 0: {
            stack.push(StackFrame.Result({ value: completedThreads.reverse() }));
            break;
          }
          case 1: {
            const [result] = blockedThreads;
            stack.push(result);
          }
          case 2: {
            const [left, right] = blockedThreads;
            stack.push(
              StackFrame.Halt({
                conditions: ConditionTree.Pair({ left: left.conditions, right: right.conditions }),
              }),
            );
            break;
          }
          default: {
            stack.push(
              StackFrame.Halt({
                conditions: ConditionTree.Multiple({
                  children: blockedThreads.map(({ conditions }) => conditions),
                }),
              }),
            );
            break;
          }
        }
        // Continue execution with the combined result
        continue loop;
      }
      case 'Halt': {
        // Unwind the stack until one of the following control flow frames is encountered:
        // - a Catch frame, in which case the current thread will resume executing
        // - a Terminate frame, in which case evaluation will start on the next thread
        let next: StackFrame | undefined;
        while ((next = stack.pop())) {
          switch (next[VARIANT]) {
            case 'Catch': {
              const { handler } = next;
              // Handle the condition, resuming evaluation with the handler result
              const { conditions } = stackFrame;
              const signal = createSignal(flattenConditionTree(conditions));
              const handlerResult = handler(signal);
              executeExpression(handlerResult, stack);
              continue loop;
            }
            case 'Terminate': {
              // The current thread has unwound its stack completely,
              // so store the halt condition in the thread result register and process the terminate instruction
              threadResultRegister = stackFrame;
              stack.push(next);
              continue loop;
            }
            default:
              // For all other intermediate frames, continue unwinding the stack
              continue;
          }
        }
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

function fork(expressions: Array<Reactive<unknown>>, stack: MutableStack<StackFrame>): void {
  switch (expressions.length) {
    // If there are no threads to spawn, simulate joining an empty list of thread results
    // and continue evaluation on the current thread stack
    case 0: {
      stack.push(StackFrame.Result({ value: [] }));
      return;
    }
    // If there is only a single thread to spawn, evaluate it directly on the current thread stack
    case 1: {
      const [expression] = expressions;
      executeExpression(expression, stack);
      return;
    }
    // If there are multiple threads to spawn, evaluate each expression in its own thread
    // and join the results into a single result stack frame
    default: {
      // Keep track of the desired stack offset at which to store the evaluation results
      const resultStackOffset = stack.size();
      // Insert placeholder cells to store copies of the fully-evaluated expression results
      for (let i = 0; i < expressions.length; i++) stack.push(STACK_FRAME_PLACEHOLDER);
      // Push an instruction onto the stack that will collect the resolved values from
      // the preceding result placeholder stack frames into a single stack frame
      stack.push(StackFrame.Join({ count: expressions.length }));
      // Evaluate each expression in its own thread, copying the result into the corresponding placeholder stack frame
      for (let i = 0; i < expressions.length; i++) {
        const expression = expressions[i];
        // Determine the target placeholder stack frame offset to store the result of the evaluation
        const targetStackOffset = resultStackOffset + i;
        // Insert an instruction to copy the expression result into the preassigned placeholder once it has been handled
        stack.push(StackFrame.Copy({ depth: stack.size() - targetStackOffset }));
        // Evaluate the expression in its own thread
        stack.push(StackFrame.Terminate({}));
        executeExpression(expression, stack);
        stack.push(StackFrame.Spawn({}));
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
