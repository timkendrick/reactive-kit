export const HASH: unique symbol = Symbol.for('@trigger::hash');

export type Hash = bigint;

export type Hashable =
  | string
  | number
  | boolean
  | null
  | undefined
  | bigint
  | Array<Hashable>
  | { [key: string]: Hashable }
  | { [HASH](state: Hash): Hash };

export type HashableObject<T extends { [K in keyof T]: Hashable }> = T;
