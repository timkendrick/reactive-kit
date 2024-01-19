import {
  Enum,
  instantiateEnum,
  isGeneratorFunction,
  VARIANT,
  type EnumVariant,
} from '@trigger/utils';
import { type Reactive } from './core';
import { type Effect } from './effect';
import { HASH } from './hash';

export const STATEFUL = Symbol.for('@trigger::stateful');

export interface Stateful<T> {
  [STATEFUL]: StatefulIteratorFactory<T>;
  [HASH](state: bigint): bigint;
}

export interface StatefulIteratorFactory<T> {
  (): StatefulIterator<T>;
}
export type StatefulIterator<T> = Iterator<StatefulYieldValue, T, StatefulNextValue>;
export type StatefulYieldValue = Effect;
export type StatefulNextValue = any;

export function isStateful(value: unknown): value is Stateful<unknown> {
  return value != null && typeof value === 'object' && STATEFUL in value;
}

export type StateValues = Map<StateToken, Reactive<unknown>>;
export type StateToken = bigint;

const enum StatefulValueType {
  Resolved = 'Resolved',
  Blocked = 'Blocked',
}

export type StatefulValue<T> = Enum<{
  [StatefulValueType.Resolved]: {
    value: Reactive<T>;
  };
  [StatefulValueType.Blocked]: {
    condition: Effect | Array<Effect>;
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
        condition: Effect,
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
    condition: Effect;
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
