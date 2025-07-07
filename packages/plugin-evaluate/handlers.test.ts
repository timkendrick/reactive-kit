import { expect, test } from 'vitest';

import * as lib from './handlers';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    ACTOR_TYPE_EVALUATE_HANDLER: lib.ACTOR_TYPE_EVALUATE_HANDLER,
    EvaluateHandler: lib.EvaluateHandler,
  });
});
