import type { Effect, Reactive, StateToken } from '@reactive-kit/types';
import { Enum, instantiateEnum, VARIANT, type EnumVariant } from '@reactive-kit/utils';

export type StateValues = Map<StateToken, Reactive<unknown>>;

const enum StatefulValueType {
  Resolved = 'Resolved',
  Blocked = 'Blocked',
}

export type StatefulValue<T> = Enum<{
  [StatefulValueType.Resolved]: {
    value: Reactive<T>;
  };
  [StatefulValueType.Blocked]: {
    condition: Effect<unknown> | Array<Effect<unknown>>;
  };
}>;

export const StatefulValue = (() => {
  return {
    [StatefulValueType.Resolved]: Object.assign(
      function Resolved<T>(
        value: Reactive<T>,
      ): EnumVariant<StatefulValue<T>, StatefulValueType.Resolved> {
        return instantiateEnum(StatefulValueType.Resolved, { value });
      },
      {
        [VARIANT]: StatefulValueType.Resolved,
        is: function is<T>(
          value: StatefulValue<T>,
        ): value is EnumVariant<StatefulValue<T>, StatefulValueType.Resolved> {
          return value[VARIANT] === StatefulValueType.Resolved;
        },
      },
    ),
    [StatefulValueType.Blocked]: Object.assign(
      function Blocked<T>(
        condition: Effect<unknown>,
      ): EnumVariant<StatefulValue<T>, StatefulValueType.Blocked> {
        return instantiateEnum(StatefulValueType.Blocked, { condition });
      },
      {
        [VARIANT]: StatefulValueType.Blocked,
        is: function is<T>(
          value: StatefulValue<T>,
        ): value is EnumVariant<StatefulValue<T>, StatefulValueType.Blocked> {
          return value[VARIANT] === StatefulValueType.Blocked;
        },
      },
    ),
  };
})();

const enum ConditionTreeType {
  Unit = 'Unit',
  Pair = 'Pair',
  Multiple = 'Multiple',
}

export type ConditionTree = Enum<{
  [ConditionTreeType.Unit]: {
    condition: Effect<unknown>;
  };
  [ConditionTreeType.Pair]: {
    left: ConditionTree;
    right: ConditionTree;
  };
  [ConditionTreeType.Multiple]: {
    children: Array<ConditionTree>;
  };
}>;

export const ConditionTree = Enum.create<ConditionTree>({
  [ConditionTreeType.Unit]: true,
  [ConditionTreeType.Pair]: true,
  [ConditionTreeType.Multiple]: true,
});
