import { type HashableObject } from '@reactive-kit/hash';
import { createEffect, type EffectExpression } from '@reactive-kit/types';

export const EFFECT_TYPE_{{ constantCase pluginName }} = '@reactive-kit/effect-{{ pluginName }}';

export interface {{ pascalCase pluginName }}Effect extends EffectExpression<unknown> {
  type: {{ pascalCase pluginName }}EffectType;
  payload: {{ pascalCase pluginName }}EffectPayload;
}

export type {{ pascalCase pluginName }}EffectType = typeof EFFECT_TYPE_{{ constantCase pluginName }};

export type {{ pascalCase pluginName }}EffectPayload = HashableObject<{}>;

export function create{{ pascalCase pluginName }}Effect(): {{ pascalCase pluginName }}Effect {
  return createEffect(EFFECT_TYPE_{{ constantCase pluginName }}, {});
}

export function is{{ pascalCase pluginName }}Effect(effect: EffectExpression<unknown>): effect is {{ pascalCase pluginName }}Effect {
  return effect.type === EFFECT_TYPE_{{ constantCase pluginName }};
}
