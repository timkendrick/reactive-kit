import { expect, test } from 'vitest';

import * as lib from './handlers.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    {{ pascalCase pluginName }}Handler: lib.{{ pascalCase pluginName }}Handler,
  });
});
