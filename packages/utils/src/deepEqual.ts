export function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null) return left === right;
  if (typeof left === 'undefined') return left === right;
  if (typeof left === 'string') return left === right;
  if (typeof left === 'number') return left === right;
  if (typeof left === 'boolean') return left === right;
  if (typeof left === 'symbol') return left === right;
  if (typeof left === 'bigint') return left === right;
  if (typeof left === 'function') return left === right;
  if (typeof left === 'object') {
    if (right === null) return false;
    return typeof right === 'object' && deepEqualObject(left, right);
  }
  return false;
}

function deepEqualObject(left: object, right: object): boolean {
  if (Array.isArray(left)) {
    return Array.isArray(right) && deepEqualArray(left, right);
  }
  if (left instanceof Date) {
    return right instanceof Date && deepEqualDate(left, right);
  }
  if (left instanceof RegExp) {
    return right instanceof RegExp && deepEqualRegExp(left, right);
  }
  if (left instanceof Set) {
    return right instanceof Set && deepEqualSet(left, right);
  }
  if (left instanceof Map) {
    return right instanceof Map && deepEqualMap(left, right);
  }
  return deepEqualDynamicObject(left, right);
}

function deepEqualArray(left: Array<unknown>, right: Array<unknown>): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => deepEqual(value, right[index]));
}

function deepEqualSet(left: Set<unknown>, right: Set<unknown>): boolean {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
}

function deepEqualMap(left: Map<unknown, unknown>, right: Map<unknown, unknown>): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (!right.has(key) || !deepEqual(value, right.get(key))) return false;
  }
  return true;
}

function deepEqualDate(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime();
}

function deepEqualRegExp(left: RegExp, right: RegExp): boolean {
  return left.source === right.source && left.flags === right.flags;
}

function deepEqualDynamicObject(left: object, right: object): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key) =>
      key in right && deepEqual(left[key as keyof typeof left], right[key as keyof typeof right]),
  );
}
