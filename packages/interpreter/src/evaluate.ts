import { Hash, hash, Hashable, HashableError, isHashable } from '@reactive-kit/hash';
import {
  createEvaluationErrorResult,
  createEvaluationPendingResult,
  createEvaluationSuccessResult,
  EffectExpression,
  EvaluationResult,
  EvaluationResultType,
  EXPRESSION_TYPE_ASYNC,
  EXPRESSION_TYPE_EFFECT,
  EXPRESSION_TYPE_FALLBACK,
  EXPRESSION_TYPE_PENDING,
  EXPRESSION_TYPE_RESULT,
  EXPRESSION_TYPE_SUSPENSE,
  EXPRESSION_TYPE,
  Expression,
  GeneratorContinuation,
  ResultExpression,
  createResult,
  EvaluationErrorResult,
  SuspenseExpression,
  createSuspense,
} from '@reactive-kit/types';
import { EvaluationCache, EvaluationCacheNode } from './types';
import { createAsyncState, updateAsyncState, next } from './generator';

/*
A simple TypeScript interpreter / evaluation engine implementation for an asynchronous fiber-based task scheduling system.

The interpreter is implemented as a generator function that accepts two mandatory arguments: the expression to be evaluated, and a cache of intermediate results from the previous evaluation

The generator function body will evaluate the input expression, until it encounters an Effect value representing a side-effect that must be resolved before evaluation can continue. At this point the generator blocks, yielding the Effect to the caller, which must provide the result of the side-effect via the generator's `next()` method, allowing the generator to resume evaluation.

Once all necessary Effect values have been resolved, the generator will return its final Result value (or an Error value if an exception was encountered).

Internally, the interpreter evaluates each expression in its own fiber. Multiple fibers can be evaluated concurrently via a fork/join model, whereby results of each child fiber are aggregated into a single list, which is then passed to the parent fiber to continue evaluation.

If an exception is thrown when evaluating a child fiber, the interpreter will unwind the stack, allowing the exception to be caught by a parent fiber. If an exception is thrown within a forked child fiber, all sibling fibers will run to completion and the first error result from the list of sibling fibers will be used to assign an Error result for the overall fiber (which can be caught in a parent fiber).

The interpreter keeps track of concurrent fibers by maintaining a stack of in-progress fiber evaluations, with each stack frame representing evaluation of a single expression. The fiber stack frame contains a reference to the fiber's root expression, a reference to the parent fiber that spawned it (for non-root fibers), a list of intermediate results from in child fibers spawned by this fiber, and whether the fiber is on the critical path of evaluation or a fork point for a child fiber. The result of the fiber evaluation is stored in the result cache, keyed by the hash of the fiber's root expression, allowing the interpreter to quickly retrieve results for a previously-encountered expression by reusing the existing fiber's cache node.

This result cache is retained across multiple evaluations, allowing the interpreter to avoid recomputing results for any fibers whose results are unaffected by changes since the previous evaluation. Between evaluations, nodes in the result cache can be invalidated, causing the results to be re-computed on the next evaluation. The interpreter will re-evaluate all affected fibers, updating the cache with the new results. If during the re-evaluation the interpreter encounters a fiber whose result is identical to that of a previous evaluation as determined by the hash, it will reuse the cached result, avoiding unnecessary recomputation. The result cache can also be garbage-collected between evaluations to remove any nodes that are no longer relevant to the overall computation of the root expression.

All expression types can be cheaply hashed via an imported `hash(expression)` function. Hash equality is taken as an indication that two expressions are equivalent: hash collisions are considered unlikely and are not handled in favour of performance.

See the `Expression` type for a list of expressions supported by the interpreter.
 */

interface Fiber {
  expression: Expression<any>;
  expressionHash: Hash;
  // Fiber that spawned this fiber, either via a fork or a tail call
  parent: Fiber | null;
  // Whether this is the root of the current fiber unwind stack
  // (this will be true when forking a new fiber, and false when evaluating a tail call)
  root: boolean;
  // Depth of the current fiber within the overall tail call stack
  depth: number;
  // List of intermediate results encountered during evaluation of child fibers
  intermediateResults: Array<EvaluationCacheNode<Hashable>>;
  // State of a fiber that is currently awaiting the results of a set of forked child fibers
  suspended: SuspenseResults | null;
}

type SuspenseResults = PendingSuspenseResults | ErrorSuspenseResults;

const enum SuspenseResultsType {
  Pending,
  Error,
}

interface PendingSuspenseResults {
  type: SuspenseResultsType.Pending;
  results: Array<EvaluationCacheNode<Hashable>>;
}

interface ErrorSuspenseResults {
  type: SuspenseResultsType.Error;
  error: EvaluationErrorResult;
}

export class InterpreterError extends Error {
  name = 'InterpreterError';
}

export const DEFAULT_SUSPENDED_FIBER_LIMIT = 1024;
export const DEFAULT_TAIL_CALL_LIMIT = 65536;

export function* evaluate<T>(
  expression: Expression<T> & Hashable,
  cache: EvaluationCache,
  options?: {
    maxSuspendedFibers?: number;
    maxTailCallDepth?: number;
  },
): Generator<EffectExpression<unknown>, EvaluationResult<T>, Expression<unknown>> {
  const {
    maxSuspendedFibers = DEFAULT_SUSPENDED_FIBER_LIMIT,
    maxTailCallDepth = DEFAULT_TAIL_CALL_LIMIT,
  } = options ?? {};
  // Begin a new cache tick
  // (this allows the garbage collector to track which nodes have been visited during the current evaluation)
  cache.advance();
  // The stack represents the backlog of suspended fibers awaiting evaluation,
  // with the currently active fiber on top of the stack.
  // Tail calls cause the currently active stack frame to be replaced with a new stack frame representing the tail call.
  // (tail call fibers contain a reference to the parent fiber that spawned the tail call)
  const stack = new Array<Fiber>();
  // Push the root expression onto the stack to begin evaluation
  pushStackFrame(createRootStackFrame(expression), stack);
  loop: while (true) {
    const currentFiber = stack.pop();
    if (currentFiber === undefined) throw new InterpreterError('Thread stack underflow');
    if (stack.length > maxSuspendedFibers) throw new InterpreterError('Thread stack overflow');
    if (currentFiber.depth > maxTailCallDepth) {
      throw new InterpreterError('Tail call limit exceeded');
    }

    let fiberResult: EvaluationCacheNode<Hashable>;
    const { expressionHash, expression } = currentFiber;
    // Determine whether the current expression has already been evaluated,
    // either in a preceding branch of the current evaluation, or in a previous evaluation
    const cachedResult = cache.get(expressionHash);
    result: {
      // If the cached fiber originates from the current evaluation, we can safely reuse the result
      // Otherwise if it originates from a previous evaluation, we can only reuse results that are still valid
      if (cachedResult && !cachedResult.isDirty) {
        fiberResult = cachedResult;
        // Mark the cached node and all its active dependencies as having been visited in this tick
        cache.visitAll(cachedResult, cachedResult.visited);
        break result;
      }

      // Resolve the current expression to a value
      try {
        switch (expression[EXPRESSION_TYPE]) {
          case EXPRESSION_TYPE_RESULT:
          case EXPRESSION_TYPE_PENDING: {
            // If the current expression is an atomic expression, we can return the result immediately
            const result: EvaluationResult<unknown> =
              expression[EXPRESSION_TYPE] === EXPRESSION_TYPE_PENDING
                ? createEvaluationPendingResult()
                : createEvaluationSuccessResult(expression);
            fiberResult = cache.createNode({
              id: expressionHash,
              expression,
              result,
            });
            break result;
          }

          case EXPRESSION_TYPE_EFFECT: {
            // Yield the effect to the caller, halting execution until a corresponding value is provided by the caller
            const effectValue = yield expression;
            // Evaluate the tail expression
            pushStackFrame(createTailCallStackFrame(effectValue, currentFiber), stack);
            continue loop;
          }

          case EXPRESSION_TYPE_ASYNC: {
            // Initialize the async generator to generate the first result
            const asyncState = createAsyncState(expression);
            const resultValue = next(expression, asyncState, null);
            // Evaluate the tail expression
            pushStackFrame(createTailCallStackFrame(resultValue, currentFiber), stack);
            continue loop;
          }

          case EXPRESSION_TYPE_SUSPENSE: {
            const childExpressions = expression.dependencies;
            const suspendedFiberState = currentFiber.suspended;
            switch (suspendedFiberState?.type) {
              // If this is the first time we're encountering the suspense expression,
              // we need to evaluate the child expressions before we can continue
              case undefined: {
                if (childExpressions.length === 0) {
                  // If there are no child expressions to evaluate, we can continue evaluation immediately with an empty list of results
                  const childValues = new Array<Hashable>();
                  // TODO: Allow resolving multiple generator values simultaneously
                  const [arg] = childValues;
                  const continuation: GeneratorContinuation<Hashable, Hashable> = {
                    throw: false,
                    value: arg,
                  };
                  const resultValue = next(expression.parent, expression.state, continuation);
                  // Evaluate the tail expression
                  pushStackFrame(createTailCallStackFrame(resultValue, currentFiber), stack);
                  continue loop;
                } else {
                  // Otherwise re-queue a clone of the current fiber in an awaiting state,
                  // to be resumed after all child fibers have been evaluated
                  const continuationFiber = pushStackFrame(
                    createSuspendedStackFrame(currentFiber),
                    stack,
                  );
                  // Evaluate each child expression in its own fiber
                  for (const childExpression of childExpressions) {
                    const childStackFrame = createFiberRootStackFrame(
                      childExpression,
                      continuationFiber,
                    );
                    pushStackFrame(childStackFrame, stack);
                  }
                  // Abandon the current fiber, continuing with evaluation of the child fibers
                  // (the clone of the current fiber will be revisited once all child fibers have been evaluated)
                  continue loop;
                }
              }
              // Otherwise if we are revisiting a suspended expression, its child results have now been resolved,
              // so we can pop the child results from the continuation stack and resume evaluation
              case SuspenseResultsType.Pending: {
                const { results: yieldedResults } = suspendedFiberState;
                if (yieldedResults.length !== childExpressions.length) {
                  throw new InterpreterError('Invalid continuation stack frame');
                }
                currentFiber.intermediateResults.push(...yieldedResults);
                // Determine whether any of the child fibers threw an exception or are still pending
                // (in which case we need to propagate the result appropriately)
                const childResults = new Array<ResultExpression<Hashable>>();
                let pendingResult: EvaluationResult<never> | null = null;
                for (const yieldedResult of yieldedResults.reverse()) {
                  const {
                    value: { result },
                  } = yieldedResult;
                  switch (result.type) {
                    case EvaluationResultType.Success: {
                      childResults.push(result.result);
                      break;
                    }
                    case EvaluationResultType.Error: {
                      // Only the first encountered error will be propagated
                      throw result.error.value;
                    }
                    case EvaluationResultType.Pending: {
                      pendingResult = result;
                      break;
                    }
                  }
                }
                // If any of the child fibers are pending, the overall result will be pending
                if (pendingResult != null) {
                  // Cache node children will be populated during the unwinding process
                  fiberResult = cache.createNode({
                    id: expressionHash,
                    expression,
                    result: pendingResult,
                  });
                  break result;
                }
                // Otherwise if all child fibers have resolved successfully,
                // we can continue evaluating the async expression
                const childValues = childResults.map(({ value }) => value);
                // TODO: Allow resolving multiple generator values simultaneously
                const [arg] = childValues;
                const continuation: GeneratorContinuation<Hashable, Hashable> = {
                  throw: false,
                  value: arg,
                };
                const resultValue = next(expression.parent, expression.state, continuation);
                // Evaluate the tail expression
                pushStackFrame(createTailCallStackFrame(resultValue, currentFiber), stack);
                continue loop;
              }
              case SuspenseResultsType.Error: {
                const { error } = suspendedFiberState;
                const continuation: GeneratorContinuation<Hashable, Hashable> = {
                  throw: true,
                  error: error.error.value,
                };
                const resultValue = next(expression.parent, expression.state, continuation);
                // Evaluate the tail expression
                pushStackFrame(createTailCallStackFrame(resultValue, currentFiber), stack);
                continue loop;
              }
            }
          }

          case EXPRESSION_TYPE_FALLBACK: {
            const { attempt: attemptedExpression } = expression;
            // Evaluate the inner expression (the fallback expression will be evaluated during stack unwinding
            // only if the inner expression evaluates to a Pending value)
            pushStackFrame(createTailCallStackFrame(attemptedExpression, currentFiber), stack);
            continue loop;
          }
        }
      } catch (error) {
        const result = createEvaluationErrorResult(createResult(createHashableError(error)));
        // Cache node children will be populated during the unwinding process
        fiberResult = cache.createNode({
          id: expressionHash,
          expression,
          result,
        });
      }
    }

    // Now that we have reached a fully-resolved result, we can update the cached result for the current expression
    // If we arrived at the same result as an existing invalidated cached state, the invalidated state can still be reused,
    // so clear any invalidations attributed to the input expression further up the result chain
    if (
      cachedResult &&
      cachedResult.isDirty &&
      fiberResultsAreEqual(cachedResult.value.result, fiberResult.value.result)
    ) {
      // Mark the re-evaluated result as a dependency of the cached result
      cache.addEdge(cachedResult, fiberResult);
      // Mark the cached node (but not its dependencies) as having been visited in this tick
      // The dependencies as not marked as visited as they might contain stale results from previous evaluations
      // that happened to produce the same result via a different unrelated path
      cache.visit(cachedResult);
      // Mark the cached node (and potentially its ancestors) as valid
      cache.revalidate(cachedResult);
    } else if (cachedResult === undefined || fiberResult !== cachedResult) {
      cache.set(expressionHash, fiberResult);
    }

    // Unwind the tail call stack, updating any parent fibers with the result of the current fiber
    // Each fiber gets its own result cache node, which is updated with the result of the fiber and any linked dependencies
    let stackUnwindFiber = currentFiber;
    let currentResult = fiberResult;
    const {
      value: { result },
    } = currentResult;
    const isPendingResult = result.type === EvaluationResultType.Pending;
    const isErrorResult = result.type === EvaluationResultType.Error;
    unwind: while (true) {
      const { intermediateResults } = stackUnwindFiber;
      // If we encounter any intermediate results while unwinding the tail call stack,
      // mark them as dependencies of the cache node
      for (const intermediateResult of intermediateResults) {
        cache.addEdge(currentResult, intermediateResult);
      }
      const parentFiber = stackUnwindFiber.parent;
      // If the result of the current fiber is a pending value, and we have reached a fallback expression,
      // reattempt evaluation with the fallback value instead of the original fallback expression
      if (
        isPendingResult &&
        stackUnwindFiber.expression[EXPRESSION_TYPE] === EXPRESSION_TYPE_FALLBACK
      ) {
        const { fallback } = stackUnwindFiber.expression;
        const fallbackFiber = createFallbackStackFrame(stackUnwindFiber, fallback);
        // Ensure the attempted fiber result is marked as a dependency of the fallback fiber
        // Note that we can't mark the result as a dependency of the parent fiber, as the parent fiber's cache node
        // may not yet exist, so we add it as an intermediate result instead
        // (the dependency will eventually be registered during tail call stack unwinding by picking up the results
        // from the list of intermediate dependencies)
        fallbackFiber.intermediateResults.push(currentResult);
        pushStackFrame(fallbackFiber, stack);
        continue loop;
      }
      // If the result of the current fiber is an error value, and we have reached a suspense expression,
      // throw the error into the suspense continuation so that it can potentially be caught in a try/catch block
      if (
        isErrorResult &&
        stackUnwindFiber.expression[EXPRESSION_TYPE] === EXPRESSION_TYPE_SUSPENSE &&
        !(
          stackUnwindFiber.suspended?.type === SuspenseResultsType.Error &&
          hash(stackUnwindFiber.suspended.error.error) === hash(result.error)
        )
      ) {
        // Re-attempt evaluation of the suspense expression with the thrown error
        const throwFiber = createThrowStackFrame(
          stackUnwindFiber,
          stackUnwindFiber.expression,
          result,
        );
        pushStackFrame(throwFiber, stack);
        continue loop;
      }
      // If the tail call stack has been unwound as far as the root fiber, we can return the final result
      if (!parentFiber) return result as EvaluationResult<T>;
      if (stackUnwindFiber.root) {
        // If the current fiber represents a forked thread root, store the result in the current continuation stack frame
        // Note that we can't mark the result as a dependency of the parent fiber that spawned the thread, as the parent
        // fiber's cache node may not yet exist, so we add it as an intermediate result instead
        // (the dependency will eventually be registered during tail call stack unwinding by picking up the results
        // from the list of intermediate dependencies)
        if (parentFiber.suspended?.type !== SuspenseResultsType.Pending) {
          throw new InterpreterError('Invalid fork/join parent thread');
        }
        parentFiber.suspended.results.push(currentResult);
        parentFiber.intermediateResults.push(currentResult);
        // Continue execution of the next suspended stack frame (which will be either another awaited expression or
        // the parent suspense expression's 'join' frame, depending on whether this is the final awaited expression
        // of its sibling group)
        continue loop;
      }
      // Otherwise if the current fiber represents a tail call for a parent fiber, update the result cache for the parent fiber,
      // attempting to reuse any existing parent result node if it is still valid (either from the current evaluation or a previous evaluation)
      const existingParentResult = cache.get(parentFiber.expressionHash);
      const existingValidParentResult =
        existingParentResult &&
        (!existingParentResult.isDirty ||
          fiberResultsAreEqual(existingParentResult.value.result, result))
          ? existingParentResult
          : null;
      const parentResult =
        existingValidParentResult ??
        cache.set(
          parentFiber.expressionHash,
          cache.createNode({
            id: parentFiber.expressionHash,
            expression: parentFiber.expression,
            result,
          }),
        );
      // If the existing parent result is still valid, mark its ancestors as valid
      if (existingValidParentResult) {
        if (existingValidParentResult.isDirty) {
          // Mark the re-evaluated result as a dependency of the cached result
          cache.addEdge(existingValidParentResult, currentResult);
          // TODO: determine whether this path is ever taken, given that all ancestors of the leaf node should have already been revalidated
          // Mark the cached node (but not its dependencies) as having been visited in this tick
          // The dependencies as not marked as visited as they might contain stale results from previous evaluations
          // that happened to produce the same result via a different unrelated path
          cache.visit(existingValidParentResult);
          // Mark the parent node (and potentially its ancestors) as valid
          cache.revalidate(existingValidParentResult);
        } else {
          // Mark the cached node and all its active dependencies as having been visited in this tick
          cache.visitAll(existingValidParentResult, existingValidParentResult.visited);
        }
      }
      // Mark the current node as a dependency of the parent node
      cache.addEdge(parentResult, currentResult);
      // Continue unwinding the tail call stack
      currentResult = parentResult;
      stackUnwindFiber = parentFiber;
      continue unwind;
    }
  }
}

function createRootStackFrame<T>(expression: Expression<T>): Fiber {
  return {
    expressionHash: hash(expression),
    expression,
    parent: null,
    root: true,
    depth: 0,
    intermediateResults: [],
    suspended: null,
  };
}

function createTailCallStackFrame<T>(expression: Expression<T>, parentFiber: Fiber): Fiber {
  return {
    expressionHash: hash(expression),
    expression,
    parent: parentFiber,
    root: false,
    depth: parentFiber ? parentFiber.depth + 1 : 0,
    intermediateResults: [],
    suspended: null,
  };
}

function createFiberRootStackFrame<T>(expression: Expression<T>, parentFiber: Fiber): Fiber {
  return {
    expressionHash: hash(expression),
    expression,
    parent: parentFiber,
    root: true,
    depth: parentFiber ? parentFiber.depth + 1 : 0,
    intermediateResults: [],
    suspended: null,
  };
}

function createSuspendedStackFrame(existingFiber: Fiber): Fiber {
  return {
    expressionHash: existingFiber.expressionHash,
    expression: existingFiber.expression,
    parent: existingFiber.parent,
    root: existingFiber.root,
    depth: existingFiber.depth,
    intermediateResults: existingFiber.intermediateResults,
    suspended: { type: SuspenseResultsType.Pending, results: [] },
  };
}

function createFallbackStackFrame(existingFiber: Fiber, fallback: Expression<any>): Fiber {
  return {
    expressionHash: hash(fallback),
    expression: fallback,
    parent: existingFiber.parent,
    root: existingFiber.root,
    depth: existingFiber.depth,
    intermediateResults: existingFiber.intermediateResults,
    suspended: existingFiber.suspended,
  };
}

function createThrowStackFrame<T>(
  existingFiber: Fiber,
  expression: SuspenseExpression<T>,
  error: EvaluationErrorResult,
): Fiber {
  const updatedExpression = createSuspense(
    expression.dependencies,
    expression.parent,
    updateAsyncState(expression.state, { throw: true, error: error.error.value }),
  );
  return {
    expressionHash: hash(updatedExpression),
    expression: updatedExpression,
    parent: existingFiber.parent,
    root: existingFiber.root,
    depth: existingFiber.depth,
    intermediateResults: existingFiber.intermediateResults,
    suspended: { type: SuspenseResultsType.Error, error },
  };
}

function pushStackFrame<T>(fiber: T, stack: Array<T>): T {
  stack.push(fiber);
  return fiber;
}

function createHashableError(exception: unknown): Hashable {
  if (isHashable(exception)) return exception;
  if (exception instanceof Error) return new HashableError(exception);
  throw new InterpreterError('Exception is not hashable', {
    cause: exception,
  });
}

function fiberResultsAreEqual<T>(left: EvaluationResult<T>, right: EvaluationResult<T>): boolean {
  if (left === right) return true;
  switch (left.type) {
    case EvaluationResultType.Pending:
      return right.type === EvaluationResultType.Pending;
    case EvaluationResultType.Success:
      return (
        right.type === EvaluationResultType.Success && resultsAreEqual(left.result, right.result)
      );
    case EvaluationResultType.Error:
      return right.type === EvaluationResultType.Error && errorsAreEqual(left.error, right.error);
  }
}

function resultsAreEqual<T>(left: ResultExpression<T>, right: ResultExpression<T>): boolean {
  if (left === right) return true;
  return hash(left) === hash(right);
}

function errorsAreEqual(left: Hashable, right: Hashable): boolean {
  if (left === right) return true;
  return hash(left) === hash(right);
}
