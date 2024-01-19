import { SIGNAL, EffectType, type Effect, type StateToken } from '@trigger/types';
import { Hashable, hash } from './hash';

export function createEffect<T extends EffectType, V extends Hashable>(
  type: T,
  data: V,
): Effect<T, V>;
export function createEffect<T extends EffectType, V>(
  id: StateToken,
  type: T,
  data: V,
): Effect<T, V>;
export function createEffect<T extends EffectType, V>(
  id: StateToken | T,
  type: T | V,
  data?: V,
): Effect<T> {
  if (typeof id === 'string') return createEffect(hash(id, type as Hashable), id, type);
  return {
    [SIGNAL]: id,
    type: type as T,
    data,
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
