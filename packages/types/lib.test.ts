import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    isStatic: lib.isStatic,
    DependencyTree: lib.DependencyTree,
    SIGNAL: lib.SIGNAL,
    isEffect: lib.isEffect,
    EvaluationResult: lib.EvaluationResult,
    HandlerAction: lib.HandlerAction,
    isStateful: lib.isStateful,
    StatefulValue: lib.StatefulValue,
    ConditionTree: lib.ConditionTree,
  });
});
