import type { PluginItem } from '@babel/core';
import reactiveFunctions from '@reactive-kit/babel-plugin-reactive-functions';
import reactiveJsx from '@reactive-kit/babel-plugin-reactive-jsx';

const plugins: Array<PluginItem> = [reactiveJsx, reactiveFunctions];

export default plugins;
