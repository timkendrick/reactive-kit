import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    collectConditionTree: lib.collectConditionTree,
    combineDependencies: lib.combineDependencies,
    createEffect: lib.createEffect,
    createHasher: lib.createHasher,
    EFFECT_TYPE_NEVER: lib.EFFECT_TYPE_NEVER,
    EFFECT_TYPE_VARIABLE_GET: lib.EFFECT_TYPE_VARIABLE_GET,
    EFFECT_TYPE_VARIABLE_SET: lib.EFFECT_TYPE_VARIABLE_SET,
    EMPTY_DEPENDENCIES: lib.EMPTY_DEPENDENCIES,
    evaluate: lib.evaluate,
    flattenConditionTree: lib.flattenConditionTree,
    flattenDependencyTree: lib.flattenDependencyTree,
    getVariable: lib.getVariable,
    getTypedEffects: lib.getTypedEffects,
    groupEffectsByType: lib.groupEffectsByType,
    hash: lib.hash,
    never: lib.never,
    setVariable: lib.setVariable,
    variable: lib.variable,
  });
});
