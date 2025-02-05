import { useReactive } from '@reactive-kit/reactive-utils';
import { create{{ pascalCase pluginName }}Effect } from '../effects';

export function use{{ pascalCase pluginName }}(options: {}): Promise<unknown> {
  const {} = options;
  return useReactive(create{{ pascalCase pluginName }}Effect());
}
