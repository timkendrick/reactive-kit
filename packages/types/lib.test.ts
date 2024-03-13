import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ConditionTree: lib.ConditionTree,
    DependencyTree: lib.DependencyTree,
    EFFECT: lib.EFFECT,
    EvaluationResult: lib.EvaluationResult,
    HandlerAction: lib.HandlerAction,
    HandlerActionType: lib.HandlerActionType,
    HASH: lib.HASH,
    isEffect: lib.isEffect,
    isStateful: lib.isStateful,
    isStatic: lib.isStatic,
    STATEFUL: lib.STATEFUL,
    StatefulValue: lib.StatefulValue,
  });
});
