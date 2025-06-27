import type { EffectExpression, EffectType } from '@reactive-kit/types';

export function groupEffectsByType(
  effects: Iterable<EffectExpression<unknown>>,
): Map<EffectType, Array<EffectExpression<unknown>>> {
  return (Array.isArray(effects) ? effects : Array.from(effects)).reduce(
    (groupedEffects, effect) => {
      const signalType = effect.type;
      const existingGroup = groupedEffects.get(signalType);
      if (existingGroup) {
        existingGroup.push(effect);
      } else {
        groupedEffects.set(signalType, [effect]);
      }
      return groupedEffects;
    },
    new Map<EffectType, Array<EffectExpression<unknown>>>(),
  );
}

export function getTypedEffects<T extends EffectExpression<unknown>>(
  effectType: T['type'],
  effects: Map<EffectType, Array<EffectExpression<unknown>>>,
): Array<T> | null {
  return (effects as Map<T['type'], Array<T>>).get(effectType) ?? null;
}
