import { hash, HASH, type CustomHashable, type Hashable } from '@reactive-kit/hash';
import { EFFECT, type EffectType, type Effect, type StateToken } from '../types';

export function createEffect<T extends EffectType, P extends Hashable>(
  type: T,
  payload: P,
): Effect<T, P>;
export function createEffect<T extends EffectType, P extends Hashable>(
  id: StateToken,
  type: T,
  payload: P,
): Effect<T, P>;
export function createEffect<T extends EffectType, P extends Hashable>(
  id: StateToken | T,
  type: T | P,
  payload?: P,
): Effect<T, P> {
  if (typeof id === 'string') return createEffect(hash(id, type as Hashable), id as T, type as P);
  return {
    [HASH]: id,
    [EFFECT]: id,
    type: type as T,
    payload: payload as P,
  };
}

export function createEffectHook<T>(effect: Effect): Promise<T> {
  return effect as unknown as Promise<T>;
}

export function groupEffectsByType(effects: Array<Effect>): Map<EffectType, Array<Effect>> {
  return effects.reduce((groupedEffects, effect) => {
    const signalType = effect.type;
    const existingGroup = groupedEffects.get(signalType);
    if (existingGroup) {
      existingGroup.push(effect);
    } else {
      groupedEffects.set(signalType, [effect]);
    }
    return groupedEffects;
  }, new Map<EffectType, Array<Effect>>());
}

export function getTypedEffects<T extends Effect>(
  effectType: T['type'],
  effects: Map<EffectType, Array<Effect>>,
): Array<T> | null {
  return (effects as Map<T['type'], Array<T>>).get(effectType) ?? null;
}

export function transformEffectResult<T, V>(
  effect: Effect,
  transform: ((result: T) => V) & CustomHashable,
) {
  return {
    [HASH]: hash('@reactive-kit/effect/transform', effect, transform),
    [Symbol.for('@reactive-kit/symbols/stateful')]: function* () {
      const value: T = yield effect;
      return transform(value);
    },
  };
}
export function transformHookResult<T, V>(
  hook: Promise<T>,
  transform: ((result: T) => V) & CustomHashable,
): Promise<V> {
  return transformEffectResult(hook as unknown as Effect, transform) as any as Promise<V>;
}
