import {
  EffectExpression,
  Expression,
  InterpreterResult,
  createPending,
} from '@reactive-kit/types';
import { EvaluationCache } from './types';
import { evaluate } from './evaluate';
import { DependencyGraph } from '@reactive-kit/cache';
import { gc } from './gc';
import { HASH, hash, Hash } from '@reactive-kit/hash';

export class Interpreter {
  private cache: EvaluationCache;
  private subscriptions: Array<InterpreterSubscription<any>>;

  public constructor() {
    this.subscriptions = [];
    this.cache = new DependencyGraph();
  }

  public subscribe<T>(root: Expression<T>): InterpreterSubscription<T> {
    const subscription = new InterpreterSubscription(root);
    this.subscriptions.push(subscription);
    return subscription;
  }

  public unsubscribe<T>(
    subscriptions: Iterable<InterpreterSubscription<T>>,
  ): Set<EffectExpression<unknown>> {
    const unsubscribedRoots = new Array<Expression<T>>();
    for (const subscription of subscriptions) {
      const index = this.subscriptions.indexOf(subscription);
      if (index === -1) {
        throw new Error('Subscription is no longer active');
      }
      this.subscriptions.splice(index, 1);
      unsubscribedRoots.push(subscription.root);
    }
    return gc(this.cache, unsubscribedRoots, { major: true });
  }

  public invalidate(effectId: Hash): void {
    // TODO: Invalidate cache based on effect expression for simpler cache ID resolution
    const cacheId = hash({ [HASH]: effectId });
    const cacheEntry = this.cache.get(cacheId);
    if (cacheEntry != null) this.cache.invalidate(cacheEntry);
  }

  public evaluate<T>(
    subscription: InterpreterSubscription<T>,
    // TODO: Consider allowing caller to provide a function to resolve state values
    state: Map<Hash, Expression<unknown>>,
  ): InterpreterResult<T> {
    if (!this.subscriptions.includes(subscription)) {
      throw new Error('Subscription is no longer active');
    }
    const unresolvedEffects = new Array<EffectExpression<unknown>>();
    const generator = evaluate(subscription.root, this.cache);
    let current = generator.next();
    while (!current.done) {
      const effect = current.value;
      const stateValue = state.get(effect.id);
      if (stateValue) {
        current = generator.next(stateValue);
      } else {
        unresolvedEffects.push(effect);
        // TODO: Consider handling external effects synchronously
        current = generator.next(createPending());
      }
    }
    return {
      result: current.value,
      effects: unresolvedEffects,
    };
  }

  public gc(): Set<EffectExpression<unknown>> {
    const roots = this.subscriptions.map((subscription) => subscription.root);
    return gc(this.cache, roots, { major: false });
  }
}

export class InterpreterSubscription<T> {
  public readonly root: Expression<T>;

  public constructor(root: Expression<T>) {
    this.root = root;
  }
}
