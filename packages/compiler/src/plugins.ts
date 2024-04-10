import { type PluginItem } from '@babel/core';
import reactiveJsx from '@reactive-kit/babel-plugin-reactive-jsx';
import reactiveFunctions from '@reactive-kit/babel-plugin-reactive-functions';

const plugins: Array<PluginItem> = [reactiveJsx, reactiveFunctions];

export default plugins;
