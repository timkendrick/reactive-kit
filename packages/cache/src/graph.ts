export type GenerationId = number;

export interface DependencyGraphNode<V> {
  value: V;
  children: Set<DependencyGraphNode<V>>;
  parents: Set<DependencyGraphNode<V>>;
  created: GenerationId;
  visited: GenerationId;
  isDirty: boolean;
}

export class DependencyGraph<K, V> {
  generation: GenerationId = 0;
  entries: Map<K, DependencyGraphNode<V>> = new Map();

  public advance(): number {
    return ++this.generation;
  }

  public createNode(value: V): DependencyGraphNode<V> {
    return {
      value,
      children: new Set(),
      parents: new Set(),
      created: this.generation,
      visited: this.generation,
      isDirty: false,
    };
  }

  public get(key: K): DependencyGraphNode<V> | undefined {
    return this.entries.get(key);
  }

  public set(key: K, node: DependencyGraphNode<V>): DependencyGraphNode<V> {
    this.delete(key);
    this.entries.set(key, node);
    return node;
  }

  public delete(key: K): DependencyGraphNode<V> | undefined {
    const node = this.entries.get(key);
    if (!node) return undefined;
    for (const parent of node.parents) {
      parent.children.delete(node);
    }
    for (const child of node.children) {
      child.parents.delete(node);
    }
    return node;
  }

  public addEdge(parent: DependencyGraphNode<V>, child: DependencyGraphNode<V>): void {
    const existingSize = parent.children.size;
    const added = parent.children.add(child).size > existingSize;
    if (!added) return;
    child.parents.add(parent);
  }

  public removeEdge(parent: DependencyGraphNode<V>, child: DependencyGraphNode<V>): void {
    const removed = parent.children.delete(child);
    if (!removed) return;
    child.parents.delete(parent);
  }

  /**
   * Mark the given node as visited during this generation, but not its children
   */
  public visit(node: DependencyGraphNode<V>): void {
    node.visited = this.generation;
  }

  /**
   * Mark all nodes reachable from the given node as visited during this generation, optionally skipping nodes with a generation less than the given minimum.
   * The `minGeneration` parameter is useful for e.g. only marking nodes that were last visited in the same generation as the given node.
   */
  public visitAll(node: DependencyGraphNode<V>, minGeneration: number = 0): void {
    if (node.visited === this.generation) return;
    const queue = [node];
    let current: DependencyGraphNode<V> | undefined;
    while ((current = queue.pop())) {
      if (current.visited === this.generation || current.visited < minGeneration) continue;
      current.visited = this.generation;
      queue.push(...current.children);
    }
  }

  /**
   * Mark the given node and all its ancestors as dirty
   */
  public invalidate(node: DependencyGraphNode<V>): void {
    // If the node is already dirty, nothing to do
    if (node.isDirty) return;
    // Mark the node and all of its ancestors as dirty
    const queue = [node];
    let current: DependencyGraphNode<V> | undefined;
    while ((current = queue.pop())) {
      if (current.isDirty) continue;
      current.isDirty = true;
      queue.push(...current.parents);
    }
  }

  /**
   * Redetermine the dirty status of the given node and all its ancestors based on whether any of its children are dirty.
   */
  public revalidate(node: DependencyGraphNode<V>): void {
    // If the node is already valid, nothing to do
    if (!node.isDirty) return;
    // Recompute the validity status for the node and all its ancestors
    const queue = [node];
    let current: DependencyGraphNode<V> | undefined;
    while ((current = queue.pop())) {
      // If the current node is already valid, skip it
      if (!current.isDirty) continue;
      // Revalidate the current node based on whether any of its children are dirty
      current.isDirty = false;
      for (const child of current.children) {
        if (child.isDirty) current.isDirty = true;
      }
      // If the current node has been determined to no longer be dirty, revalidate its parents
      if (!current.isDirty) queue.push(...current.parents);
    }
  }

  /**
   * Perform a partial garbage collection of all nodes reachable from the given node,
   * removing all nodes that were last visited prior to `minGeneration` (defaulting to the generation of the provided node)
   * optionally collecting and transforming values that are found to be outdated.
   */
  public prune<T extends V, O>(
    root: DependencyGraphNode<V>,
    keySelector: (value: V) => K,
    collect: (value: V) => value is T,
    transform: (value: T) => O,
    minGeneration: number = this.generation,
  ): Set<O> {
    const results = new Set<O>();
    const queue = [root];
    let current: DependencyGraphNode<V> | undefined;
    while ((current = queue.pop())) {
      if (current.visited < minGeneration) {
        if (collect(current.value)) results.add(transform(current.value));
        const key = keySelector(current.value);
        this.entries.delete(key);
        for (const parent of current.parents) {
          parent.children.delete(current);
        }
        for (const child of current.children) {
          child.parents.delete(current);
        }
      }
      queue.push(...current.children);
    }
    return results;
  }

  /**
   * Perform a full garbage collection of all nodes in the graph,
   * removing all nodes that were last visited prior to `minGeneration` (defaulting to the current generation)
   * optionally collecting and transforming values that are found to be outdated.
   */
  public gc<T extends V, O>(
    collect: (value: V) => value is T,
    transform: (value: T) => O,
    minGeneration?: number,
  ): Set<O>;
  public gc<O>(
    collect: (value: V) => boolean,
    transform: (value: V) => O,
    minGeneration?: number,
  ): Set<O>;
  public gc<O>(
    collect: (value: V) => boolean,
    transform: (value: V) => O,
    minGeneration: number = this.generation,
  ): Set<O> {
    const results = new Set<O>();
    for (const [key, node] of this.entries) {
      if (node.visited < minGeneration) {
        if (collect(node.value)) results.add(transform(node.value));
        this.entries.delete(key);
        for (const parent of node.parents) {
          parent.children.delete(node);
        }
        for (const child of node.children) {
          child.parents.delete(node);
        }
      }
    }
    return results;
  }
}
