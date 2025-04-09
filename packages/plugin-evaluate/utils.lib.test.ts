import { expect, test } from 'vitest';

import * as lib from './utils.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    getTypedEffects: lib.getTypedEffects,
    groupEffectsByType: lib.groupEffectsByType,
  });
});
