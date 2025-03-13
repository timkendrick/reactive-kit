# Plugin Architecture

## Overview
The Plugin Architecture is a core component of Reactive Kit that enables extensibility through a standardized plugin system. Each plugin can extend the framework by providing effects, handlers, hooks, and message types while maintaining type safety and deterministic behavior.

## Examples

### Effect Definition
```typescript
export const EFFECT_TYPE_EXAMPLE = '@reactive-kit/effect-example';

export interface ExampleEffect extends EffectExpression<unknown> {
  type: ExampleEffectType;
  payload: ExampleEffectPayload;
}

export type ExampleEffectType = typeof EFFECT_TYPE_EXAMPLE;
export type ExampleEffectPayload = HashableObject<{}>;

export function createExampleEffect(): ExampleEffect {
  return createEffect(EFFECT_TYPE_EXAMPLE, {});
}

export function isExampleEffect(effect: EffectExpression<unknown>): effect is ExampleEffect {
  return effect.type === EFFECT_TYPE_EXAMPLE;
}
```

### Handler Implementation
```typescript
export class ExampleHandler extends EffectHandler<ExampleEffect, ExampleHandlerInternalMessage> {
  constructor(next: ActorHandle<EffectHandlerOutputMessage>) {
    super(EFFECT_TYPE_EXAMPLE, next);
  }

  protected override getInitialValue(effect: ExampleEffect): Expression<any> | null {
    return null;
  }

  protected override onSubscribe(
    effect: ExampleEffect,
    context: HandlerContext<EffectHandlerInput<ExampleHandlerInternalMessage>>,
  ): EffectHandlerOutput<ExampleHandlerInternalMessage> {
    return null;
  }

  protected override onUnsubscribe(
    effect: ExampleEffect,
    context: HandlerContext<EffectHandlerInput<ExampleHandlerInternalMessage>>,
  ): EffectHandlerOutput<ExampleHandlerInternalMessage> {
    return null;
  }
}
```

### Hook Usage
```typescript
export function useExample(options: {}): Promise<unknown> {
  return useReactive(createExampleEffect());
}
```

## Related Specs
- [Dual Realm Architecture](./dual-realm-architecture.spec.md)
- [Runtime Scheduler](./runtime-scheduler.spec.md)
- [Actor System](./actor-system.spec.md)
- [Dependency Tracking](./dependency-tracking.spec.md) 
