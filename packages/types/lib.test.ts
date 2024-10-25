import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    CONTINUE: lib.CONTINUE,
    createAsync: lib.createAsync,
    createEffect: lib.createEffect,
    createEvaluationErrorResult: lib.createEvaluationErrorResult,
    createEvaluationPendingResult: lib.createEvaluationPendingResult,
    createEvaluationSuccessResult: lib.createEvaluationSuccessResult,
    createFallback: lib.createFallback,
    createGeneratorStateMachine: lib.createGeneratorStateMachine,
    createPending: lib.createPending,
    createResult: lib.createResult,
    createSuspense: lib.createSuspense,
    EvaluationResultType: lib.EvaluationResultType,
    EXPRESSION_TYPE_ASYNC: lib.EXPRESSION_TYPE_ASYNC,
    EXPRESSION_TYPE_EFFECT: lib.EXPRESSION_TYPE_EFFECT,
    EXPRESSION_TYPE_FALLBACK: lib.EXPRESSION_TYPE_FALLBACK,
    EXPRESSION_TYPE_PENDING: lib.EXPRESSION_TYPE_PENDING,
    EXPRESSION_TYPE_RESULT: lib.EXPRESSION_TYPE_RESULT,
    EXPRESSION_TYPE_SUSPENSE: lib.EXPRESSION_TYPE_SUSPENSE,
    EXPRESSION_TYPE: lib.EXPRESSION_TYPE,
    isAsyncExpression: lib.isAsyncExpression,
    isEffectExpression: lib.isEffectExpression,
    isEvaluationErrorResult: lib.isEvaluationErrorResult,
    isEvaluationPendingResult: lib.isEvaluationPendingResult,
    isEvaluationSuccessResult: lib.isEvaluationSuccessResult,
    isFallbackExpression: lib.isFallbackExpression,
    isPendingExpression: lib.isPendingExpression,
    isResultExpression: lib.isResultExpression,
    TYPE_EXPRESSION: lib.TYPE_EXPRESSION,
    TYPE_GENERATOR: lib.TYPE_GENERATOR,
    TYPE: lib.TYPE,
    wrapExpression: lib.wrapExpression,
    wrapResult: lib.wrapResult,
  });
});
