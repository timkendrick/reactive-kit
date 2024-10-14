export function isNonEmptyArray<T>(items: Array<T>): items is [T, ...Array<T>] {
  return items.length > 0;
}

export function partition<T, V extends T>(
  items: Array<T>,
  predicate: (item: T) => item is V,
): [Array<V>, Array<Exclude<T, V>>];
export function partition<T>(
  items: Array<T>,
  predicate: (item: T) => boolean,
): [Array<T>, Array<T>];
export function partition<T>(
  items: Array<T>,
  predicate: (item: T) => boolean,
): [Array<T>, Array<T>] {
  return items.reduce(
    (results, item) => {
      results[predicate(item) ? 0 : 1].push(item);
      return results;
    },
    [new Array<T>(), new Array<T>()],
  );
}
