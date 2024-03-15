import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    printAst: lib.printAst,
    template: lib.template,
    transform: lib.transform,
    types: lib.types,
  });
});
