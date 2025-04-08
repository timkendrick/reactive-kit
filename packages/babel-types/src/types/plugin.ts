import type { PluginObj, PluginOptions, PluginPass } from '@babel/core';
import type * as BabelCore from '@babel/core';

export type { Scope, Binding, TraverseOptions } from '@babel/traverse';
export type { PluginObj, PluginPass } from '@babel/core';

export type * as types from '@babel/types';

export type Babel = typeof BabelCore;
export type BabelPlugin<S = PluginPass, O = never> = (babel: Babel, options?: O) => PluginObj<S>;
export type BabelPluginWithOptions<S = PluginPass, T extends PluginOptions = object> = [
  BabelPlugin<S>,
  T,
];

export type Node = BabelCore.Node;
export type NodePath<T = Node> = BabelCore.NodePath<T>;
