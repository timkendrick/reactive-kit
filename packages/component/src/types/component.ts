import type { JSX } from './jsx';

export interface Component<P extends {}> {
  (props: P): Promise<TemplateNode>;
}

export type TemplateNode =
  | Element
  | Array<TemplateNode>
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined;

export interface Element<T extends ElementType = ElementType> {
  type: T;
  props: ElementProps<T>;
  key?: Key | undefined;
  ref?: Ref<T> | undefined;
}

export type Key = string | number;

export interface Ref<T extends ElementType = ElementType> {
  current: ElementNode<T> | null;
}

export type ElementType = IntrinsicElementType | Component<{}>;

export type IntrinsicElementType = keyof JSX.IntrinsicElements;

export type ElementProps<T extends ElementType> = T extends Component<infer P>
  ? P
  : T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : {};

export type ElementNode<T extends ElementType> = T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T] extends JSX.HTMLAttributes<infer E>
    ? E
    : never
  : never;
