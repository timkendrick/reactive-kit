import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    collectConditionTree: lib.collectConditionTree,
    combineDependencies: lib.combineDependencies,
    ConditionTree: lib.ConditionTree,
    createStatefulGenerator: lib.createStatefulGenerator,
    DependencyTree: lib.DependencyTree,
    EMPTY_DEPENDENCIES: lib.EMPTY_DEPENDENCIES,
    evaluate: lib.evaluate,
    EvaluationResult: lib.EvaluationResult,
    flattenConditionTree: lib.flattenConditionTree,
    flattenDependencyTree: lib.flattenDependencyTree,
    isStateful: lib.isStateful,
    isStatic: lib.isStatic,
    STATEFUL: lib.STATEFUL,
    StatefulValue: lib.StatefulValue,
  });
});
