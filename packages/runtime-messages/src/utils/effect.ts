import type { Effect, EffectType } from '@reactive-kit/types';

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
