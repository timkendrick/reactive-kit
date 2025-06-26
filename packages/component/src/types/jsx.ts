import type * as Preact from 'preact';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type IntrinsicElements = {
    [T in keyof Preact.JSX.IntrinsicElements]: ConvertChildren<
      ExcludeSignals<Preact.JSX.IntrinsicElements[T]>
    >;
  };

  export type HTMLAttributes<RefType extends EventTarget = EventTarget> = ExcludeSignals<
    Preact.JSX.HTMLAttributes<RefType>
  >;
  export type SVGAttributes<RefType extends EventTarget = EventTarget> = ExcludeSignals<
    Preact.JSX.SVGAttributes<RefType>
  >;
  export type MathMLAttributes<RefType extends EventTarget = EventTarget> = ExcludeSignals<
    Preact.JSX.MathMLAttributes<RefType>
  >;

  export type IntrinsicElementType = keyof IntrinsicElements;

  export type ElementType = IntrinsicElementType | Component<object>;

  export type Key = string | number | bigint | boolean | null;

  export interface Ref<T extends ElementType = ElementType> {
    current: ElementDomNode<T> | null;
  }

  export interface Element<T extends ElementType = ElementType> {
    type: T;
    props: ElementProps<T>;
    key?: Key | undefined;
    ref?: Ref<T> | undefined;
  }

  export type ElementProps<T extends ElementType> =
    T extends Component<infer P>
      ? P
      : T extends keyof IntrinsicElements
        ? IntrinsicElements[T]
        : object;

  export type ElementDomNode<T extends ElementType> = T extends keyof JSX.IntrinsicElements
    ? JSX.IntrinsicElements[T] extends JSX.HTMLAttributes<infer E>
      ? E
      : never
    : never;

  export interface Component<P extends object> {
    (props: P): Promise<ChildNode>;
  }

  export type ChildNode = Element | string | number | bigint | boolean | null | undefined;

  export type Children = ChildNode | Array<ChildNode>;

  type ExcludeSignals<T extends object> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof T]: Exclude<T[K], Preact.JSX.SignalLike<any>>;
  };

  type ConvertChildren<T extends object> = {
    [K in keyof T]: K extends 'children'
      ? T[K] extends Preact.ComponentChildren
        ? Children
        : T[K]
      : T[K];
  };
}
