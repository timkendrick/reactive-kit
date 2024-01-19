import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_NEVER: lib.EFFECT_TYPE_NEVER,
    never: lib.never,
    EFFECT_TYPE_VARIABLE_GET: lib.EFFECT_TYPE_VARIABLE_GET,
    EFFECT_TYPE_VARIABLE_SET: lib.EFFECT_TYPE_VARIABLE_SET,
    variable: lib.variable,
    getVariable: lib.getVariable,
    setVariable: lib.setVariable,
    flattenConditionTree: lib.flattenConditionTree,
    collectConditionTree: lib.collectConditionTree,
    EMPTY_DEPENDENCIES: lib.EMPTY_DEPENDENCIES,
    combineDependencies: lib.combineDependencies,
    flattenDependencyTree: lib.flattenDependencyTree,
    createEffect: lib.createEffect,
    groupEffectsByType: lib.groupEffectsByType,
    evaluate: lib.evaluate,
    HASH: lib.HASH,
    hash: lib.hash,
  });
});
