/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { IsEqual, Simplify } from './type';

export const VARIANT = '@@type';
export type VARIANT = typeof VARIANT;

export const Enum = {
  create: enumConstructor,
  match,
};

export type Enum<T extends { [K in keyof T]: object | void } & AssertValidEnumFields<T>> = {
  [K in keyof T]: Simplify<
    { readonly [VARIANT]: K } & (T[K] extends object ? { readonly [P in keyof T[K]]: T[K][P] } : {})
  >;
}[keyof T];

type AssertValidEnumFields<T> =
  true extends HasExistingDiscriminantField<T>
    ? 'Invalid enum definition: one or more variants declares an invalid property'
    : unknown;

type HasExistingDiscriminantField<T> = keyof T extends infer K
  ? K extends keyof T
    ? VARIANT extends keyof T[K]
      ? true
      : false
    : never
  : never;

export interface GenericEnumBase<N extends number> {
  readonly instance: EnumBase;
  readonly numParams: N;
}

export interface GenericEnum1 extends GenericEnumBase<1> {
  readonly T1: unknown;
}

export interface GenericEnum2 extends GenericEnumBase<2> {
  readonly T1: unknown;
  readonly T2: unknown;
}

export interface GenericEnum3 extends GenericEnumBase<3> {
  readonly T1: unknown;
  readonly T2: unknown;
  readonly T3: unknown;
}

export type GenericEnum<N extends 1 | 2 | 3> = N extends 1
  ? GenericEnum1
  : N extends 2
    ? GenericEnum2
    : N extends 3
      ? GenericEnum3
      : never;

export type TypedEnum<
  E extends GenericEnum<1 | 2 | 3>,
  T1 = unknown,
  T2 = unknown,
  T3 = unknown,
> = (E & {
  readonly T1: T1;
  readonly T2: T2;
  readonly T3: T3;
})['instance'];

interface EnumBase {
  readonly [VARIANT]: string;
}

type EnumDiscriminant<E extends EnumBase> = E[VARIANT];

export type EnumVariant<E extends EnumBase, K extends EnumDiscriminant<E>> = Extract<
  E,
  { readonly [VARIANT]: K }
>;

export type EnumConstructor<E extends EnumBase> = {
  readonly [K in EnumDiscriminant<E>]: EnumVariantConstructor<E, K>;
};

interface EnumVariantConstructor<E extends EnumBase, K extends EnumDiscriminant<E>> {
  (
    args: IsEqual<Omit<EnumVariant<E, K>, VARIANT>, {}> extends true
      ? void
      : {
          readonly [P in keyof Omit<EnumVariant<E, K>, VARIANT> as P]: EnumVariant<E, K>[P];
        },
  ): Simplify<EnumVariant<E, K>>;
  is(value: E): value is EnumVariant<E, K>;
  readonly Type: K;
}

type GenericEnumVariantConstructor1<E extends GenericEnum<1>, K extends E['instance'][VARIANT]> = {
  <T1>(
    args: EnumVariantConstructorArgs<
      TypedEnum<E, T1>,
      K,
      Extract<
        TypedEnum<E, T1>,
        {
          readonly [VARIANT]: K;
        }
      >
    >,
  ): Simplify<EnumVariant<TypedEnum<E, T1>, K>>;
  is<T1>(value: TypedEnum<E, T1>): value is EnumVariant<TypedEnum<E, T1>, K>;
  readonly Type: K;
};

type GenericEnumVariantConstructor2<E extends GenericEnum<2>, K extends E['instance'][VARIANT]> = {
  <T1, T2>(
    args: EnumVariantConstructorArgs<
      TypedEnum<E, T1, T2>,
      K,
      Extract<
        TypedEnum<E, T1, T2>,
        {
          readonly [VARIANT]: K;
        }
      >
    >,
  ): Simplify<EnumVariant<TypedEnum<E, T1, T2>, K>>;
  is<T1, T2>(value: TypedEnum<E, T1, T2>): value is EnumVariant<TypedEnum<E, T1, T2>, K>;
  readonly Type: K;
};

type GenericEnumVariantConstructor3<E extends GenericEnum<3>, K extends E['instance'][VARIANT]> = {
  <T1, T2, T3>(
    args: EnumVariantConstructorArgs<
      TypedEnum<E, T1, T2, T3>,
      K,
      Extract<
        TypedEnum<E, T1, T2, T3>,
        {
          readonly [VARIANT]: K;
        }
      >
    >,
  ): Simplify<EnumVariant<TypedEnum<E, T1, T2, T3>, K>>;
  is<T1, T2, T3>(
    value: TypedEnum<E, T1, T2, T3>,
  ): value is EnumVariant<TypedEnum<E, T1, T2, T3>, K>;
  readonly Type: K;
};

export type EnumVariantConstructorArgs<
  E extends EnumBase,
  K extends EnumDiscriminant<E>,
  V = Extract<E, { readonly [VARIANT]: K }>,
> = { readonly [K in keyof Omit<V, VARIANT>]: V[K] } extends infer T
  ? {} extends T
    ? void
    : T
  : never;

type EnumVariantMap<E extends EnumBase> = {
  [K in EnumDiscriminant<E>]: true;
};

function enumConstructor<E extends GenericEnum<1>>(
  variants: EnumVariantMap<E['instance']>,
): Simplify<{
  readonly [K in E['instance'][VARIANT]]: GenericEnumVariantConstructor1<E, K>;
}>;
function enumConstructor<E extends GenericEnum<2>>(
  variants: EnumVariantMap<E['instance']>,
): Simplify<{
  readonly [K in E['instance'][VARIANT]]: GenericEnumVariantConstructor2<E, K>;
}>;
function enumConstructor<E extends GenericEnum<3>>(
  variants: EnumVariantMap<E['instance']>,
): Simplify<{
  readonly [K in E['instance'][VARIANT]]: GenericEnumVariantConstructor3<E, K>;
}>;
function enumConstructor<E extends EnumBase>(variants: EnumVariantMap<E>): EnumConstructor<E>;
function enumConstructor(variants: Record<PropertyKey, true>): EnumConstructor<EnumBase> {
  return Object.fromEntries(
    Object.keys(variants).map((key) => [key, enumVariantConstructor<EnumBase, typeof key>(key)]),
  ) as EnumConstructor<EnumBase>;
}

function enumVariantConstructor<E extends EnumBase, K extends EnumDiscriminant<E>>(
  key: K,
): EnumVariantConstructor<E, K> {
  return Object.assign(
    (args: Parameters<EnumVariantConstructor<E, K>>[0]): ReturnType<EnumVariantConstructor<E, K>> =>
      ({ ...args, [VARIANT]: key }) as { readonly [VARIANT]: K } as Simplify<EnumVariant<E, K>>,
    {
      is: (value: E): value is EnumVariant<E, K> => value[VARIANT] === key,
      Type: key,
    },
  ) satisfies EnumVariantConstructor<E, K>;
}

export type EnumMatchCases<E extends EnumBase> = {
  [K in EnumDiscriminant<E>]: EnumMatchCase<E, K>;
};

export type EnumMatchCase<E extends EnumBase, T extends EnumDiscriminant<E>> = (
  value: EnumVariant<E, T>,
) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

function match<E extends EnumBase, T extends EnumMatchCases<E>>(
  value: EnumVariant<E, EnumDiscriminant<E>>,
  cases: T,
): ReturnType<T[keyof T]> {
  return cases[value[VARIANT]](value);
}
