import { Actor, ActorHandle, HandlerContext } from '@trigger/types';

type PipedActorFactory<I extends T, O extends T, T = I | O> = (
  next: ActorHandle<O>,
  context: HandlerContext<T>,
) => ActorHandle<I>;

export function pipe<I extends T, O extends T, T = I | O>(
  factory: (next: ActorHandle<O>) => Actor<I, O>,
): PipedActorFactory<I, O, T> {
  return (next, context) => context.spawn(() => factory(next));
}

export function chain<T0 extends T, T1 extends T, T2 extends T, T = T0 | T1 | T2>(
  left: PipedActorFactory<T0, T1>,
  right: PipedActorFactory<T1, T2>,
): PipedActorFactory<T0, T2, T> {
  return (next: ActorHandle<T2>, context): ActorHandle<T0> => left(right(next, context), context);
}

export function flow<T extends [AnyPipedActorFactory, ...Array<AnyPipedActorFactory>]>(
  ...factories: T
): PipedActorFactory<
  PipedActorFactoryInput<T[0]>,
  FlowReturn<T, PipedActorFactoryInput<T[0]>>,
  FlowMessageTypes<T, never>
> {
  return (next, context) => factories.reduceRight((next, factory) => factory(next, context), next);
}

/* eslint-disable prettier/prettier */
type AnyPipedActorFactory = PipedActorFactory<any, any, any>;

type PipedActorFactoryInput<T extends AnyPipedActorFactory> =
  T extends PipedActorFactory<infer I, any, any> ? I : never;

type FlowReturn<T extends Array<AnyPipedActorFactory>, TInput> =
  T extends [PipedActorFactory<TInput, infer TOutput, any>, ...infer TRest]
    ? TRest extends Array<AnyPipedActorFactory>
      ? FlowReturn<TRest, TOutput>
      : never
    : TInput;

type FlowMessageTypes<T extends Array<AnyPipedActorFactory>, TMessage> =
  T extends [PipedActorFactory<any, any, infer M>, ...infer TRest]
    ? TRest extends Array<AnyPipedActorFactory>
      ? FlowMessageTypes<TRest, TMessage | M>
      : never
    : TMessage;
/* eslint-enable prettier/prettier */
