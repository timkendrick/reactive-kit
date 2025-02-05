import {
  type ActorHandle,
  type HandlerContext,
} from '@reactive-kit/actor';
import {
  EffectHandler,
  EffectHandlerInput,
  EffectHandlerOutput,
  EffectHandlerOutputMessage,
} from '@reactive-kit/handler-utils';
import type { Message } from '@reactive-kit/runtime-messages';
import type { Expression } from '@reactive-kit/types';
import { EFFECT_TYPE_{{ constantCase pluginName }}, type {{ pascalCase pluginName }}Effect } from '../effects';

type {{ pascalCase pluginName }}HandlerInternalMessage = never;

export class {{ pascalCase pluginName }}Handler extends EffectHandler<{{ pascalCase pluginName }}Effect, {{ pascalCase pluginName }}HandlerInternalMessage> {
  public constructor(next: ActorHandle<EffectHandlerOutputMessage>) {
    super(EFFECT_TYPE_{{ constantCase pluginName }}, next);
  }

  protected override getInitialValue(effect: {{ pascalCase pluginName }}Effect): Expression<any> | null {
    return null;
  }

  protected override onSubscribe(
    effect: {{ pascalCase pluginName }}Effect,
    context: HandlerContext<EffectHandlerInput<{{ pascalCase pluginName }}HandlerInternalMessage>>,
  ): EffectHandlerOutput<{{ pascalCase pluginName }}HandlerInternalMessage> {
    return null;
  }

  protected override onUnsubscribe(
    effect: {{ pascalCase pluginName }}Effect,
    context: HandlerContext<EffectHandlerInput<{{ pascalCase pluginName }}HandlerInternalMessage>>,
  ): EffectHandlerOutput<{{ pascalCase pluginName }}HandlerInternalMessage> {
    return null;
  }

  protected override acceptInternal(
    message: Message<unknown>,
  ): message is {{ pascalCase pluginName }}HandlerInternalMessage {
    return false;
  }

  protected override handleInternal(
    message: Message<unknown>,
    context: HandlerContext<EffectHandlerInput<{{ pascalCase pluginName }}HandlerInternalMessage>>,
  ): EffectHandlerOutput<{{ pascalCase pluginName }}HandlerInternalMessage> {
    return null;
  }
}
