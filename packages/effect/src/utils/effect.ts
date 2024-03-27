import { createHasher, hash, type Hashable, HASH } from '@reactive-kit/utils';
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
    [HASH]: hash(id),
    [EFFECT]: id,
    type: type as T,
    payload: payload as P,
  };
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
