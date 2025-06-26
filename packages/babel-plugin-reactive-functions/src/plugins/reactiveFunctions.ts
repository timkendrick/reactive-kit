import { type BabelPlugin, type PluginObj, type PluginPass } from '@reactive-kit/babel-types';

import { hoistAsyncFunctions } from './hoistAsyncFunctions';
import { transformAsyncFunctions } from './transformAsyncFunctions';

/**
 * Transform async functions into reactive functions
 */
export const reactiveFunctions: BabelPlugin = (babel): PluginObj<PluginPass> => {
  return {
    name: 'reactive-functions',
    inherits: hoistAsyncFunctions,
    visitor: transformAsyncFunctions(babel).visitor,
  };
};
