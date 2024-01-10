import { Enum, instantiateEnum, VARIANT, type EnumVariant } from '@trigger/utils';
import { type Reactive } from './core';
import { type Signal } from './signal';

export const STATEFUL = Symbol.for('@trigger::stateful');

export interface Stateful<T> {
  [STATEFUL]: true;
  next(state: StateValues): StatefulResult<T>;
}

export function isStateful<T>(value: Reactive<T>): value is Stateful<T> {
  return (
    value != null && typeof value === 'object' && STATEFUL in value && value[STATEFUL] === true
  );
}

export type StateValues = Map<StateToken, any>;
export type StateToken = symbol | number;

export interface StatefulResult<T> {
  value: StatefulValue<T>;
  dependencies: DependencyTree;
}

export const enum StatefulValueType {
  Resolved = 'Resolved',
  Blocked = 'Blocked',
}

export type StatefulValue<T> = Enum<{
  [StatefulValueType.Resolved]: {
    value: Reactive<T>;
  };
  [StatefulValueType.Blocked]: {
    conditions: ConditionTree;
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
        is: function is<T>(
          value: StatefulValue<T>,
        ): value is EnumVariant<StatefulValue<T>, StatefulValueType.Resolved> {
          return value[VARIANT] === StatefulValueType.Resolved;
        },
      },
    ),
    [StatefulValueType.Blocked]: Object.assign(
      function Blocked<T>(
        conditions: ConditionTree,
      ): EnumVariant<StatefulValue<T>, StatefulValueType.Blocked> {
        return instantiateEnum(StatefulValueType.Blocked, { conditions });
      },
      {
        is: function is<T>(
          value: StatefulValue<T>,
        ): value is EnumVariant<StatefulValue<T>, StatefulValueType.Blocked> {
          return value[VARIANT] === StatefulValueType.Blocked;
        },
      },
    ),
  };
})();

export const enum DependencyTreeType {
  Empty = 'Empty',
  Unit = 'Unit',
  Pair = 'Pair',
  Multiple = 'Multiple',
}

export type DependencyTree = Enum<{
  [DependencyTreeType.Empty]: void;
  [DependencyTreeType.Unit]: {
    value: StateToken;
  };
  [DependencyTreeType.Pair]: {
    left: DependencyTree;
    right: DependencyTree;
  };
  [DependencyTreeType.Multiple]: {
    values: Array<DependencyTree>;
  };
}>;

export const DependencyTree = Enum.create<DependencyTree>({
  [DependencyTreeType.Empty]: true,
  [DependencyTreeType.Unit]: true,
  [DependencyTreeType.Pair]: true,
  [DependencyTreeType.Multiple]: true,
});

export const enum ConditionTreeType {
  Unit = 'Unit',
  Pair = 'Pair',
  Multiple = 'Multiple',
}

export type ConditionTree = Enum<{
  [ConditionTreeType.Unit]: {
    condition: Signal<unknown>;
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
