import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    Interpreter: lib.Interpreter,
    InterpreterSubscription: lib.InterpreterSubscription,
  });
});
