import type { Pattern, Predicate, TypeNarrowingPredicate } from '../types';

declare const RefTypeTag: unique symbol;

export type RefHandle<T> = symbol & {
  readonly [RefTypeTag]: T;
};

export interface WithRefsHelpers {
  createRef: CreateRefHelper;
  refPredicate: RefPredicateHelper;
  captureRef: CaptureRefHelper;
  retrieveRef: RetrieveRefHelper;
  ref: RefHelper;
}

interface CreateRefHelper {
  <T>(): RefHandle<T>;
}

interface RefPredicateHelper {
  <T>(predicate: Predicate<T>): Pattern<T>;
}

interface CaptureRefHelper {
  <T, V extends T>(ref: RefHandle<V>, predicate: TypeNarrowingPredicate<T, V>): Predicate<T>;
  <T>(ref: RefHandle<T>, predicate: Predicate<T>): Predicate<T>;
}

interface RetrieveRefHelper {
  <T>(ref: RefHandle<T>): T;
}

interface RefHelper {
  <T>(ref: RefHandle<T>): Predicate<T>;
}

export function withRefs<T>(factory: (helpers: WithRefsHelpers) => Pattern<T>): Pattern<T> {
  throw new Error('Not implemented');
}
