import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    collectConditionTree: lib.collectConditionTree,
    combineDependencies: lib.combineDependencies,
    ConditionTree: lib.ConditionTree,
    DependencyTree: lib.DependencyTree,
    EMPTY_DEPENDENCIES: lib.EMPTY_DEPENDENCIES,
    evaluate: lib.evaluate,
    EvaluationResult: lib.EvaluationResult,
    EvaluationResultType: lib.EvaluationResultType,
    flattenConditionTree: lib.flattenConditionTree,
    flattenDependencyTree: lib.flattenDependencyTree,
    StatefulValue: lib.StatefulValue,
    withDependencies: lib.withDependencies,
  });
});
