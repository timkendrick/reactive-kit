import type { Hashable } from '@reactive-kit/hash';
import type { EffectExpression, ResultExpression } from './expression';

export interface InterpreterResult<T> {
  result: EvaluationResult<T>;
  effects: EffectExpression<unknown>[];
}

export type EvaluationResult<T> =
  | EvaluationSuccessResult<T>
  | EvaluationErrorResult
  | EvaluationPendingResult;

export enum EvaluationResultType {
  Success,
  Error,
  Pending,
}

export interface EvaluationSuccessResult<T> {
  type: EvaluationResultType.Success;
  result: ResultExpression<T>;
}
export function createEvaluationSuccessResult<T>(
  result: ResultExpression<T>,
): EvaluationSuccessResult<T> {
  return {
    type: EvaluationResultType.Success,
    result,
  };
}
export function isEvaluationSuccessResult<T>(
  value: EvaluationResult<T>,
): value is EvaluationSuccessResult<T> {
  return value.type === EvaluationResultType.Success;
}

export interface EvaluationErrorResult {
  type: EvaluationResultType.Error;
  error: ResultExpression<Hashable>;
}
export function createEvaluationErrorResult(
  error: ResultExpression<Hashable>,
): EvaluationErrorResult {
  return {
    type: EvaluationResultType.Error,
    error,
  };
}
export function isEvaluationErrorResult(
  value: EvaluationResult<unknown>,
): value is EvaluationErrorResult {
  return value.type === EvaluationResultType.Error;
}

const PENDING: EvaluationPendingResult = {
  type: EvaluationResultType.Pending,
};

export interface EvaluationPendingResult {
  type: EvaluationResultType.Pending;
}
export function createEvaluationPendingResult(): EvaluationPendingResult {
  return PENDING;
}
export function isEvaluationPendingResult(
  value: EvaluationResult<unknown>,
): value is EvaluationPendingResult {
  return value.type === EvaluationResultType.Pending;
}
