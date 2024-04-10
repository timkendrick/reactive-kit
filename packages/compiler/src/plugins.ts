import { type PluginItem } from '@babel/core';
import reactiveFunctions from '@reactive-kit/babel-plugin-reactive-functions';

const plugins: Array<PluginItem> = [reactiveFunctions];

export default plugins;
