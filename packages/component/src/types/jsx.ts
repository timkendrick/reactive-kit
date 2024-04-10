import type * as Preact from 'preact';

export namespace JSX {
  export type IntrinsicElements = {
    [T in keyof Preact.JSX.IntrinsicElements]: ExcludeSignals<Preact.JSX.IntrinsicElements[T]>;
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

  type ExcludeSignals<T extends object> = {
    [K in keyof T]: Exclude<T[K], Preact.JSX.SignalLike<any>>;
  };
}
