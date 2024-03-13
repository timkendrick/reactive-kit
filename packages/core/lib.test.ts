import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    BroadcastActor: lib.BroadcastActor,
    collectConditionTree: lib.collectConditionTree,
    combineDependencies: lib.combineDependencies,
    createEffect: lib.createEffect,
    createHasher: lib.createHasher,
    EFFECT_TYPE_NEVER: lib.EFFECT_TYPE_NEVER,
    EFFECT_TYPE_VARIABLE_GET: lib.EFFECT_TYPE_VARIABLE_GET,
    EFFECT_TYPE_VARIABLE_SET: lib.EFFECT_TYPE_VARIABLE_SET,
    EMPTY_DEPENDENCIES: lib.EMPTY_DEPENDENCIES,
    evaluate: lib.evaluate,
    flow: lib.flow,
    FilterActor: lib.FilterActor,
    FlatMapActor: lib.FlatMapActor,
    MapActor: lib.MapActor,
    ScanActor: lib.ScanActor,
    chain: lib.chain,
    flattenConditionTree: lib.flattenConditionTree,
    flattenDependencyTree: lib.flattenDependencyTree,
    fromCancelablePromiseFactory: lib.fromCancelablePromiseFactory,
    fromPromiseFactory: lib.fromPromiseFactory,
    getVariable: lib.getVariable,
    getTypedEffects: lib.getTypedEffects,
    groupEffectsByType: lib.groupEffectsByType,
    hash: lib.hash,
    never: lib.never,
    pipe: lib.pipe,
    setVariable: lib.setVariable,
    variable: lib.variable,
  });
});
