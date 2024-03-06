import { Enum, EnumVariant, VARIANT, instantiateEnum } from '@trigger/utils';
import { type ConditionTree } from './state';
import { type DependencyTree } from './dependency';
import { type Reactive } from './core';

const enum EvaluationResultType {
  Pending = 'Pending',
  Ready = 'Ready',
}

export type EvaluationResult<T> = Enum<{
  [EvaluationResultType.Pending]: {
    conditions: ConditionTree;
    dependencies: DependencyTree;
  };
  [EvaluationResultType.Ready]: {
    value: Reactive<T>;
    dependencies: DependencyTree;
  };
}>;

export const EvaluationResult = {
  [EvaluationResultType.Pending]: Object.assign(
    function Pending<T>(
      conditions: ConditionTree,
      dependencies: DependencyTree,
    ): EnumVariant<EvaluationResult<T>, EvaluationResultType.Pending> {
      return instantiateEnum(EvaluationResultType.Pending, { conditions, dependencies });
    },
    {
      [VARIANT]: EvaluationResultType.Pending,
      is: function is<T>(
        value: EvaluationResult<T>,
      ): value is EnumVariant<EvaluationResult<T>, EvaluationResultType.Pending> {
        return value[VARIANT] === EvaluationResultType.Pending;
      },
    },
  ),
  [EvaluationResultType.Ready]: Object.assign(
    function Ready<T>(
      value: T,
      dependencies: DependencyTree,
    ): EnumVariant<EvaluationResult<T>, EvaluationResultType.Ready> {
      return instantiateEnum(EvaluationResultType.Ready, { value, dependencies });
    },
    {
      [VARIANT]: EvaluationResultType.Ready,
      is: function is<T>(
        value: EvaluationResult<T>,
      ): value is EnumVariant<EvaluationResult<T>, EvaluationResultType.Ready> {
        return value[VARIANT] === EvaluationResultType.Ready;
      },
    },
  ),
};
