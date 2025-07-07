import { expect, test } from 'vitest';

import * as lib from './hooks';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    use{{ pascalCase pluginName }}: lib.use{{ pascalCase pluginName }},
  });
});
