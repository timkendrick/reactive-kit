import { hash, HASH, Hashable } from '@reactive-kit/hash';
import {
  AsyncExpression,
  CONTINUE,
  createSuspense,
  Expression,
  GeneratorArgs,
  GeneratorContext,
  GeneratorContinuation,
  GeneratorIntermediates,
  GeneratorLocals,
  GeneratorState,
  GeneratorStateMachine,
  ResultExpression,
  SuspenseExpression,
  SuspenseState,
  TYPE_GENERATOR,
  wrapExpression,
  wrapResult,
} from '@reactive-kit/types';

export function createAsyncState<T>(expression: AsyncExpression<T>): SuspenseState {
  const metadata = expression.target[TYPE_GENERATOR];
  return assignGeneratorStateHash(
    {
      args: Object.fromEntries(
        zip(metadata.params, expression.args).map(([arg, value]) => [arg, value]),
      ),
      locals: Object.fromEntries(metadata.locals.map((name) => [name, undefined])),
      intermediates: Object.fromEntries(metadata.intermediates.map((name) => [name, undefined])),
      prev: 0,
      next: 0,
    },
    null,
  );
}

export function updateAsyncState<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TNext extends Hashable,
  TError extends Hashable,
>(
  state: GeneratorState<TArgs, TLocals, TIntermediates>,
  sent: { throw: false; value: TNext } | { throw: true; error: TError },
): SuspenseState {
  return assignGeneratorStateHash(
    {
      args: state.args,
      locals: state.locals,
      intermediates: state.intermediates,
      prev: state.prev,
      next: state.next,
    },
    sent,
  );
}

export function next<T>(
  expression: AsyncExpression<T>,
  state: SuspenseState,
  arg: GeneratorContinuation<Hashable, Hashable> | null,
): Expression<T> | SuspenseExpression<T> {
  const context = new AsyncGeneratorContext(expression, {
    args: state.args,
    locals: state.locals,
    intermediates: state.intermediates,
    prev: state.prev,
    next: state.next,
  });
  const result: IteratorResult<Expression<T> | SuspenseExpression<T>> = context.next(arg);
  if (result.done) return result.value;
  return result.value;
}

interface TryEntry {
  /** The start location of a try block */
  tryLoc: number;
  /** The location to jump to in case of an error */
  catchLoc: number | null;
  /** The location to jump to for finalization */
  finallyLoc: number | null;
  /** The location to jump to after finalization */
  afterLoc: number | null;
  completion: CompletionRecord;
}

type CompletionRecord =
  | NormalCompletion
  | ThrowCompletion
  | ReturnCompletion
  | BreakCompletion
  | ContinueCompletion;

interface NormalCompletion {
  type: 'normal';
  arg: unknown | undefined;
}

interface ThrowCompletion {
  type: 'throw';
  arg: unknown;
}

interface ReturnCompletion {
  type: 'return';
  arg: unknown;
}

interface BreakCompletion {
  type: 'break';
  arg: number;
}

interface ContinueCompletion {
  type: 'continue';
  arg: number;
}

const ROOT_LOC = -1;
const END_LOC = 0x1fffffffffffff;

const enum IteratorMethod {
  Next,
  Return,
  Throw,
}

class AsyncGeneratorContext<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TYield extends Hashable,
  TNext extends Hashable,
  TError extends Hashable,
  TResult,
> implements GeneratorContext<TArgs, TLocals, TIntermediates, TYield, TNext, TError, TResult>
{
  public state: GeneratorState<TArgs, TLocals, TIntermediates>;
  public sent: TNext = undefined as never;
  private arg: unknown | undefined = undefined;
  private method: IteratorMethod = IteratorMethod.Next;
  private done: boolean = false;

  private tryEntries: Array<TryEntry> = [];
  private generator: AsyncExpression<TResult>;
  private rval: TResult | undefined = undefined;

  public constructor(
    expression: AsyncExpression<TResult>,
    state: GeneratorState<TArgs, TLocals, TIntermediates>,
  ) {
    const metadata = expression.target[TYPE_GENERATOR];
    // TODO: Avoid recreating try entries on each context creation
    const rootLoc: TryEntry = {
      tryLoc: ROOT_LOC,
      catchLoc: null,
      finallyLoc: null,
      afterLoc: null,
      completion: { type: 'normal', arg: undefined },
    };
    this.generator = expression;
    this.tryEntries = [
      rootLoc,
      ...(metadata.tryLocsList ?? []).map(
        ([tryLoc, catchLoc, finallyLoc, afterLoc]): TryEntry => ({
          tryLoc,
          catchLoc: catchLoc ?? null,
          finallyLoc: finallyLoc ?? null,
          afterLoc: afterLoc ?? null,
          completion: { type: 'normal', arg: undefined },
        }),
      ),
    ];
    this.state = createMutableGeneratorState(state);
  }

  public next(
    sent: GeneratorContinuation<TNext, TError> | null,
  ): IteratorResult<SuspenseExpression<TResult>, Expression<TResult>> {
    const innerFn = this.generator.target;
    const method = sent?.throw ? IteratorMethod.Throw : IteratorMethod.Next;
    const arg = sent?.throw ? sent.error : sent == null ? undefined : sent.value;

    const enum GenState {
      SuspendedStart,
      Executing,
      SuspendedYield,
      Completed,
    }

    this.method = method;
    this.arg = arg;
    let state: GenState = this.state.next == 0 ? GenState.SuspendedStart : GenState.SuspendedYield;

    while (true) {
      const method = this.method as IteratorMethod;
      switch (method) {
        case IteratorMethod.Next: {
          this.sent = this.arg as TNext;
          break;
        }
        case IteratorMethod.Throw: {
          if (state === GenState.SuspendedStart) {
            state = GenState.Completed;
            throw this.arg;
          }
          this.dispatchException(this.arg);
          break;
        }
        case IteratorMethod.Return: {
          this.abrupt('return', this.arg);
          break;
        }
      }

      const record = tryCatch(innerFn, this);
      if (record.success) {
        // If an exception is thrown from innerFn, we leave state ===
        // GenState.Executing and loop back for another invocation.
        state = this.done ? GenState.Completed : GenState.SuspendedYield;

        if (record.value === CONTINUE) {
          continue;
        }

        if (this.done) {
          return { done: true, value: record.value as Expression<TResult> };
        } else {
          return { done: false, value: record.value as SuspenseExpression<TResult> };
        }
      } else {
        state = GenState.Completed;
        // Dispatch the exception by looping back around to the
        // context.dispatchException(context.arg) call above.
        this.method = IteratorMethod.Throw;
        this.arg = record.error;
      }
    }
  }

  public yield(value: TYield): SuspenseExpression<TResult> {
    // TODO: Allow resolving multiple generator values simultaneously
    const values = [value];
    const dependencies = values.map((value) => wrapExpression(value));
    return createSuspense(
      dependencies,
      this.generator,
      assignGeneratorStateHash(
        {
          args: this.state.args,
          locals: this.state.locals,
          intermediates: this.state.intermediates,
          prev: this.state.prev,
          next: this.state.next,
        },
        null,
      ),
    );
  }

  public stop(): ResultExpression<TResult> {
    this.done = true;
    const rootEntry = this.tryEntries[0];
    const rootRecord = rootEntry.completion;
    if (rootRecord.type === 'throw') {
      throw rootRecord.arg;
    }
    return wrapResult(this.rval!);
  }

  public dispatchException(exception: unknown): void {
    if (this.done) {
      throw exception;
    }

    for (let i = this.tryEntries.length - 1; i >= 0; --i) {
      const entry = this.tryEntries[i];

      if (entry.tryLoc === ROOT_LOC) {
        // Exception thrown outside of any try block that could handle
        // it, so set the completion value of the entire function to
        // throw the exception.
        return this.handle(exception, entry, END_LOC, false);
      }

      if (entry.tryLoc <= this.state.prev) {
        if (entry.catchLoc !== null && entry.finallyLoc !== null) {
          if (this.state.prev < entry.catchLoc) {
            return this.handle(exception, entry, entry.catchLoc, true);
          } else if (this.state.prev < entry.finallyLoc) {
            return this.handle(exception, entry, entry.finallyLoc, false);
          }
        } else if (entry.catchLoc !== null) {
          if (this.state.prev < entry.catchLoc) {
            return this.handle(exception, entry, entry.catchLoc, true);
          }
        } else if (entry.finallyLoc !== null) {
          if (this.state.prev < entry.finallyLoc) {
            return this.handle(exception, entry, entry.finallyLoc, false);
          }
        } else {
          throw new Error('try statement without catch or finally');
        }
      }
    }
  }

  private handle(exception: unknown, entry: TryEntry, loc: number, caught: boolean): void {
    entry.completion = { type: 'throw', arg: exception };
    this.state.next = loc;

    if (caught) {
      // If the dispatched exception was caught by a catch block,
      // then let that catch block handle the exception normally.
      this.method = IteratorMethod.Next;
      this.arg = undefined;
    }
  }

  public abrupt(type: 'return', arg: unknown): CONTINUE;
  public abrupt(type: 'throw', arg: unknown): CONTINUE;
  public abrupt(type: 'break', loc: number): CONTINUE;
  public abrupt(type: 'continue', loc: number): CONTINUE;
  public abrupt(type: 'return' | 'throw' | 'break' | 'continue', arg: unknown): CONTINUE {
    let finallyEntry: (TryEntry & { finallyLoc: NonNullable<TryEntry['finallyLoc']> }) | null =
      null;
    for (let i = this.tryEntries.length - 1; i >= 0; --i) {
      const entry = this.tryEntries[i];
      if (
        entry.tryLoc <= this.state.prev &&
        entry.finallyLoc !== null &&
        this.state.prev < entry.finallyLoc
      ) {
        finallyEntry = entry as TryEntry & { finallyLoc: NonNullable<TryEntry['finallyLoc']> };
        break;
      }
    }

    if (
      finallyEntry &&
      (type === 'break' || type === 'continue') &&
      typeof arg === 'number' &&
      finallyEntry.tryLoc <= arg &&
      arg <= finallyEntry.finallyLoc
    ) {
      // Ignore the finally entry if control is not jumping to a
      // location outside the try/catch block.
      finallyEntry = null;
    }

    if (finallyEntry) {
      const record = finallyEntry.completion;
      record.type = type;
      record.arg = arg;
      this.method = IteratorMethod.Next;
      this.state.next = finallyEntry.finallyLoc;
      return CONTINUE;
    }

    return this.complete({ type, arg } as CompletionRecord, null);
  }

  public finish(finallyLoc: number): CONTINUE | void {
    for (let i = this.tryEntries.length - 1; i >= 0; --i) {
      const entry = this.tryEntries[i];
      if (entry.finallyLoc === finallyLoc) {
        this.complete(entry.completion, entry.afterLoc);
        resetTryEntry(entry);
        return CONTINUE;
      }
    }
    return;
  }

  public catch(tryLoc: number): unknown {
    for (let i = this.tryEntries.length - 1; i >= 0; --i) {
      const entry = this.tryEntries[i];
      if (entry.tryLoc === tryLoc) {
        const record = entry.completion;
        if (record.type === 'throw') {
          var thrown = record.arg;
          resetTryEntry(entry);
        }
        return thrown;
      }
    }
    // The context.catch method must only be called with a location
    // argument that corresponds to a known catch block.
    throw new Error('illegal catch attempt');
  }

  private complete(record: CompletionRecord, afterLoc: number | null): CONTINUE {
    if (record.type === 'throw') {
      throw record.arg;
    }
    if ((record.type === 'break' || record.type === 'continue') && typeof record.arg === 'number') {
      this.state.next = record.arg;
    } else if (record.type === 'return') {
      this.rval = this.arg = record.arg as TResult;
      this.method = IteratorMethod.Return;
      this.state.next = END_LOC;
    } else if (record.type === 'normal' && afterLoc !== null) {
      this.state.next = afterLoc;
    }
    return CONTINUE;
  }
}

function resetTryEntry(entry: TryEntry): void {
  if (entry.completion) {
    entry.completion.type = 'normal';
    entry.completion.arg = undefined;
  } else {
    entry.completion = { type: 'normal', arg: undefined };
  }
}

function tryCatch<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TYield extends Hashable,
  TNext extends Hashable,
  TError extends Hashable,
  TResult,
>(
  fn: GeneratorStateMachine<TArgs, TLocals, TIntermediates, TYield, TNext, TError, TResult>,
  context: GeneratorContext<TArgs, TLocals, TIntermediates, TYield, TNext, TError, TResult>,
):
  | { success: true; value: Expression<unknown> | Expression<TResult> | CONTINUE }
  | { success: false; error: unknown } {
  try {
    return { success: true, value: fn(context) };
  } catch (err) {
    return { success: false, error: err };
  }
}

function createMutableGeneratorState<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
>(
  state: GeneratorState<TArgs, TLocals, TIntermediates>,
): GeneratorState<TArgs, TLocals, TIntermediates> {
  return {
    args: { ...state.args },
    locals: { ...state.locals },
    intermediates: { ...state.intermediates },
    prev: state.prev,
    next: state.next,
  };
}

function assignGeneratorStateHash<
  TArgs extends GeneratorArgs,
  TLocals extends GeneratorLocals,
  TIntermediates extends GeneratorIntermediates,
  TNext extends Hashable,
  TError extends Hashable,
>(
  state: GeneratorState<TArgs, TLocals, TIntermediates>,
  sent: GeneratorContinuation<TNext, TError> | null,
): SuspenseState {
  return Object.assign(state, {
    [HASH]: hash(state.args, state.locals, state.intermediates, state.prev, state.next, sent),
    sent,
  });
}

function zip<L, R>(left: Array<L>, right: Array<R>): Array<[L, R]> {
  const length = Math.min(left.length, right.length);
  const results = new Array<[L, R]>(length);
  for (let i = 0; i < length; i++) {
    results[i] = [left[i], right[i]];
  }
  return results;
}
