import type { PluginPass, PluginObj, PluginOptions } from '@babel/core';
export type { Scope } from '@babel/traverse';
import type * as BabelCore from '@babel/core';

export type * as Types from '@babel/types';

export type Babel = typeof BabelCore;
export type BabelPlugin<S = PluginPass> = (babel: Babel) => PluginObj<S>;
export type BabelPluginWithOptions<S = PluginPass, T extends PluginOptions = object> = [
  BabelPlugin<S>,
  T,
];

export type NodePath = BabelCore.NodePath;
