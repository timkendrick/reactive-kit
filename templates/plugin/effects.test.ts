import { expect, test } from 'vitest';

import * as lib from './effects.lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    EFFECT_TYPE_{{ constantCase pluginName }}: lib.EFFECT_TYPE_{{ constantCase pluginName }},
    create{{ pascalCase pluginName }}Effect: lib.create{{ pascalCase pluginName }}Effect,
    is{{ pascalCase pluginName }}Effect: lib.is{{ pascalCase pluginName }}Effect,
  });
});
