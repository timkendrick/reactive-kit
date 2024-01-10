import {
  DependencyTree,
  Reactive,
  isSignal,
  isStateful,
  SignalSource,
  StateValues,
  PollStatusType,
  SIGNAL,
  StateToken,
  PollStatus,
  SignalSubscription,
  isStatic,
  StatefulValueType,
  DependencyTreeType,
  ConditionTreeType,
  ConditionTree,
  Signal,
} from '@trigger/types';
import { EMPTY_DEPENDENCIES, combineDependencies, flattenConditionTree } from './core';
import { VARIANT } from '@trigger/utils';
import { hash } from './hash';
import { never } from './signal';

const enum SchedulerPhase {
  Idle = 'Idle',
  Working = 'Working',
  Queued = 'Queued',
}

function isEqual<T>(left: T, right: T): boolean {
  return left === right || hash(left) === hash(right);
}

export class Scheduler<T> {
  private root: Reactive<T>;
  private state: StateValues;
  private phase: SchedulerPhase = SchedulerPhase.Idle;
  private activeSignals: Map<StateToken, SignalSubscription | null> = new Map();
  private numEmittingSignals: number = 0;
  private queuedUpdates: StateValues = new Map();
  private pollStatus: PollStatus<T>;

  constructor(root: Reactive<T>, state?: StateValues) {
    this.root = root;
    this.state = state ?? new Map();
    this.pollStatus = isStatic(root) ? PollStatus.Ready(root) : PollStatus.Pending(null);
  }

  // FIXME: pass updated state values to poll method
  public poll(): PollStatus<T> {
    if (this.phase !== SchedulerPhase.Idle) {
      // FIXME: consider returning a stub waker when poll() is called synchronously within a recomputation
      throw new Error('Scheduler is already being polled');
    }
    if (isStatic(this.root)) return this.pollStatus;
    const updatedValues = this.queuedUpdates;
    let hasUpdates = false;
    for (const [stateToken, value] of updatedValues) {
      // Skip any unchanged state values
      if (this.state.has(stateToken) && isEqual(this.state.get(stateToken), value)) continue;
      this.state.set(stateToken, value);
      hasUpdates = true;
    }
    // FIXME: prevent recomputing result when no changes
    // if (!hasUpdates) return this.pollStatus;
    this.queuedUpdates = new Map();
    let combinedDependencies: DependencyTree = EMPTY_DEPENDENCIES;
    this.phase = SchedulerPhase.Queued;
    while (this.phase === SchedulerPhase.Queued) {
      this.phase = SchedulerPhase.Working;
      const subscribedSignals = new Map<StateToken, SignalSource<any>>();
      const unsubscribedSignals = new Array<SignalSubscription>();
      const callStack = new StackTree<Reactive<unknown>>(this.root);
      let input: Reactive<unknown>;
      while ((input = callStack.pop())) {
        if (isStateful(input)) {
          // FIXME: determine whether to recompute stateful values based on updated values
          const { value, dependencies } = input.next(this.state);
          combinedDependencies = combineDependencies(combinedDependencies, dependencies);
          switch (value[VARIANT]) {
            case StatefulValueType.Resolved:
              // The stateful expression has been resolved, so push the result onto the stack and continue execution
              callStack.push(value.value);
              continue;
            case StatefulValueType.Blocked:
              // The stateful expression has not yet been resolved, so queue up the current stack frame again
              // to be resolved again once its conditions have been handled
              callStack.push(input);
              // Push the blocking conditions onto the stack to be processed and continue execution
              switch (value.conditions[VARIANT]) {
                case ConditionTreeType.Unit:
                  // If there is only a single blocking condition, continue on the current thread stack
                  callStack.push(value.conditions.condition);
                  continue;
                case ConditionTreeType.Pair:
                case ConditionTreeType.Multiple:
                  // Otherwise if there are multiple blocking conditions, fork the stack to spawn a new thread for each
                  callStack.fork(...flattenConditionTree(value.conditions));
                  continue;
              }
          }
        } else if (isSignal(input)) {
          const stateToken = input[SIGNAL];
          const status = input.poll();
          const { waker } = status;
          // If the signal is capable of emitting future values,
          // add it to the current dependency tree and the list of actively subscribed signals
          if (waker) {
            const dependencies = DependencyTree.Unit({ value: stateToken });
            combinedDependencies = combineDependencies(combinedDependencies, dependencies);
            if (!this.activeSignals.has(stateToken) && !subscribedSignals.has(stateToken)) {
              subscribedSignals.set(stateToken, waker);
            }
          } else {
            // Otherwise remove the signal from the list of actively subscribed signals
            if (subscribedSignals.has(stateToken)) {
              subscribedSignals.delete(stateToken);
            } else {
              const subscription = this.activeSignals.get(stateToken);
              if (subscription) {
                unsubscribedSignals.push(subscription);
                this.activeSignals.delete(stateToken);
              }
            }
          }
          switch (status[VARIANT]) {
            case PollStatusType.Pending:
              // FIXME: allow catching pending signals
              // The current execution thread is blocked, so move onto the next thread
              callStack.block(input);
              continue;
            case PollStatusType.Ready:
              // The signal has resolved, so push the value onto the stack and continue execution
              callStack.push(status.value);
              continue;
          }
        } else {
          // The thread has resolved to a concrete value
          // If this is the root thread, return the value
          if (callStack.isEmpty()) {
            callStack.push(input);
            break;
          } else {
            // Otherwise continue execution with the next thread
            callStack.switch();
            continue;
          }
        }
      }
      if (callStack.isEmpty()) throw new Error('Scheduler call stack underflow');
      const result = (callStack as StackTree<T>).pop()!;
      this.pollStatus = PollStatus.Ready(result);
      for (const [stateToken, waker] of subscribedSignals.entries()) {
        const subscription = waker.listen({
          pre: (value: unknown) => {
            this.numEmittingSignals++;
            this.queuedUpdates.set(stateToken, value);
          },
          post: () => {
            if (--this.numEmittingSignals > 0) return;
            switch (this.phase) {
              // If the waker has emitted synchronously, queue the next recalculation
              case SchedulerPhase.Working:
                this.phase = SchedulerPhase.Queued;
                return;
              // If another recalculation has already been triggered, nothing more to do
              case SchedulerPhase.Queued:
                return;
              // If the waker has emitted asynchronously, poll for the next result
              case SchedulerPhase.Idle:
                // FIXME: update subscriptions
                const result = this.poll();
                return;
            }
          },
        });
        this.activeSignals.set(stateToken, subscription);
      }
      for (const subscription of unsubscribedSignals) {
        subscription.unsubscribe();
      }
      // If another recalculation has not been synchronously triggered, exit the loop
      if (this.phase === SchedulerPhase.Working) this.phase = SchedulerPhase.Idle;
    }
    return this.pollStatus;
  }
}

class StackTree<T> {
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
  public isEmpty(): boolean {
    return this.values.length === 0;
  }
}
