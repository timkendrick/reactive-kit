import type { JSX } from '@reactive-kit/component';
import { hash, type Hashable } from '@reactive-kit/hash';

export type RenderedNode =
  | RenderedEmptyPlaceholder
  | RenderedPrimitive
  | RenderedIntrinsicElement
  | RenderedNodeList;

export interface RenderedEmptyPlaceholder {
  type: 'empty';
  node: null | undefined | JSX.Element<JSX.Component<object>>;
  dom: EmptyDomPlaceholder;
}

export interface RenderedPrimitive {
  type: 'primitive';
  node: string | number | bigint | boolean;
  dom: Text;
}

export interface RenderedIntrinsicElement {
  type: 'intrinsic';
  node: JSX.Element<JSX.IntrinsicElementType>;
  dom: Element;
  children: Array<RenderedNode> | null;
}

export interface RenderedNodeList {
  type: 'list';
  node: Array<JSX.ChildNode>;
  dom: RenderedDomRange;
  items: Array<RenderedNode>;
}

export interface RenderedDomRange {
  start: EmptyDomPlaceholder;
  end: EmptyDomPlaceholder;
}

export type EmptyDomPlaceholder = Comment;

/**
 * Render the contents of a Virtual DOM node into the target DOM node container
 * @param previous Previous Virtual DOM node
 * @param node Updated Virtual DOM node
 * @param container Target DOM element
 */
export function renderDom(
  node: JSX.Children,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
): RenderedNode {
  return renderDomNode(node, container, previous, null);
}

function renderDomNode(
  node: JSX.Children,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
  nextSibling: Node | RenderedDomRange | null,
): RenderedNode {
  if (previous && nodesAreEqual(previous.node, node)) return previous;
  if (node == null) return renderEmpty(node, container, previous, nextSibling);
  if (Array.isArray(node)) return renderNodeList(node, container, previous, nextSibling);
  if (typeof node === 'object') return renderElement(node, container, previous, nextSibling);
  return renderPrimitive(node, container, previous, nextSibling);
}

function renderEmpty(
  node: null | undefined | JSX.Element<JSX.Component<object>>,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
  nextSibling: Node | RenderedDomRange | null,
): RenderedEmptyPlaceholder {
  const dom = createEmptyDomPlaceholder();
  if (previous?.dom) {
    replaceDomNode(container, previous.dom, dom);
  } else {
    insertDomNode(container, dom, nextSibling);
  }
  return {
    type: 'empty',
    node: node,
    dom,
  };
}

function renderPrimitive(
  node: string | number | bigint | boolean,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
  nextSibling: Node | RenderedDomRange | null,
): RenderedPrimitive {
  const stringValue = formatPrimitiveValue(node);
  if (previous?.type === 'primitive') {
    previous.dom.nodeValue = stringValue;
    return {
      type: 'primitive',
      node,
      dom: previous.dom,
    };
  }
  const dom = document.createTextNode(stringValue);
  if (previous?.dom) {
    replaceDomNode(container, previous.dom, dom);
  } else {
    insertDomNode(container, dom, nextSibling);
  }
  return {
    type: 'primitive',
    node,
    dom,
  };
}

function renderElement(
  node: JSX.Element<JSX.ElementType>,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
  nextSibling: Node | RenderedDomRange | null,
): RenderedIntrinsicElement | RenderedEmptyPlaceholder {
  if (isIntrinsicElement(node)) {
    return renderIntrinsicElement(node, container, previous, nextSibling);
  } else {
    return renderEmpty(
      node as JSX.Element<JSX.Component<object>>,
      container,
      previous,
      nextSibling,
    );
  }
}

function renderIntrinsicElement(
  updated: JSX.Element<JSX.IntrinsicElementType>,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
  nextSibling: Node | RenderedDomRange | null,
): RenderedIntrinsicElement {
  // If the existing DOM element is an intrinsic element of the same type, update its attributes,
  // otherwise create a new element with the correct attributes
  const prevElement = previous?.type === 'intrinsic' ? previous : null;
  const element =
    prevElement && prevElement.node.type === updated.type
      ? modifyIntrinsicElementDomAttributes(updated, prevElement)
      : renderIntrinsicElementDomNode(updated, container, previous, nextSibling);

  // Render the element's children
  const children = updated.props.children;
  const childNodes = children ? (Array.isArray(children) ? children : [children]) : null;
  const renderedChildren = childNodes
    ? renderChildNodes(childNodes, element, prevElement?.children ?? null, null)
    : null;

  return {
    type: 'intrinsic',
    node: updated,
    dom: element,
    children: renderedChildren,
  };
}

function renderIntrinsicElementDomNode(
  updated: JSX.Element<JSX.IntrinsicElementType>,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
  nextSibling: Node | RenderedDomRange | null,
): Element {
  const element = document.createElement(updated.type);
  for (const [key, value] of Object.entries(updated.props)) {
    if (key !== 'children') {
      setDomElementAttribute(
        element,
        key as keyof JSX.ElementProps<JSX.IntrinsicElementType>,
        value,
      );
    }
  }
  if (previous?.dom) {
    replaceDomNode(container, previous.dom, element);
  } else {
    insertDomNode(container, element, nextSibling);
  }
  return element;
}

function modifyIntrinsicElementDomAttributes(
  updated: JSX.Element<JSX.IntrinsicElementType>,
  previous: RenderedIntrinsicElement,
): Element {
  const element = previous.dom;
  // Update attributes
  for (const [key, value] of Object.entries(updated.props)) {
    if (key === 'children') continue;
    const propName = key as keyof JSX.ElementProps<JSX.IntrinsicElementType>;
    if (key in previous.node.props && previous.node.props[propName] === value) continue;
    setDomElementAttribute(element, propName, value);
  }
  // Remove old attributes
  for (const key of Object.keys(previous.node.props)) {
    if (key === 'children') continue;
    if (key in updated.props) continue;
    const propName = key as keyof JSX.ElementProps<JSX.IntrinsicElementType>;
    setDomElementAttribute(element, propName, null);
  }
  return element;
}

function renderNodeList(
  node: Array<JSX.ChildNode>,
  container: Element | DocumentFragment,
  previous: RenderedNode | null,
  nextSibling: Node | RenderedDomRange | null,
): RenderedNodeList {
  const previousList = previous?.type === 'list' ? previous : null;
  // Ensure the correct insertion position by keeping track of an insertion marker DOM node.
  // Rendered list nodes are inserted immediately before the insertion marker.
  // This will be the rendered output of the sibling immediately following the current node
  // (use the existing list end marker if there is one)
  const dom = previousList?.dom ?? insertDomRange(container, previous?.dom ?? null, nextSibling);
  const previousItems = previousList?.items ?? null;
  const endInsertionMarker = dom.end;
  return {
    type: 'list',
    node: node,
    dom,
    items: renderChildNodes(node, container, previousItems, endInsertionMarker),
  };
}

function renderChildNodes(
  node: Array<JSX.ChildNode>,
  container: Element | DocumentFragment,
  previousItems: Array<RenderedNode> | null,
  nextSibling: Node | RenderedDomRange | null,
): Array<RenderedNode> {
  const isUnchanged =
    previousItems != null &&
    previousItems.length === node.length &&
    childNodeListsAreEqual(
      previousItems.map(({ node }) => node),
      node,
    );
  if (isUnchanged) return previousItems;

  // Index existing nodes by key
  const existingKeyedItems = new Map<JSX.Key, RenderedNode>();
  const existingUnkeyedItems = new Map<number, RenderedNode>();
  if (previousItems) {
    for (const [index, item] of previousItems.entries()) {
      const key = getNodeKey(item.node);
      if (key !== undefined) {
        existingKeyedItems.set(key, item);
      } else {
        existingUnkeyedItems.set(index, item);
      }
    }
  }

  // Render nodes in reverse order (for ease of maintaining nextSibling insertion marker)
  const renderedItems: Array<RenderedNode> = new Array(node.length);
  let currentNextSibling: Node | null = nextSibling ? getDomNodeStart(nextSibling) : null;
  for (let i = node.length - 1; i >= 0; i--) {
    const itemNode = node[i];

    // Attempt to retrieve an existing node by key, or by index if no key is present
    const key = getNodeKey(itemNode);
    const existingItem =
      key !== undefined
        ? (existingKeyedItems.get(key) ?? null)
        : (existingUnkeyedItems.get(i) ?? null);
    // Mark the key as used
    if (key !== undefined) {
      existingKeyedItems.delete(key);
    } else {
      existingUnkeyedItems.delete(i);
    }

    // Render the updated node
    // (if updating a keyed node that has been reordered, this will initially be rendered in the
    // old position before being moved into the correct position)
    const renderedItem = renderDomNode(itemNode, container, existingItem, currentNextSibling);
    renderedItems[i] = renderedItem;

    // Move the rendered DOM node into the correct position
    // (this is only necessary if a keyed node has been reordered)
    const itemDom = renderedItem.dom;
    if (getDomNodeEnd(itemDom).nextSibling !== currentNextSibling) {
      insertDomNode(container, itemDom, currentNextSibling);
    }

    // Use the rendered node as the insertion marker for the preceding list item
    currentNextSibling = getDomNodeStart(renderedItem.dom);
  }

  // Remove unused items (any re-used nodes will have been removed from the lookup table)
  for (const existingItem of existingKeyedItems.values()) {
    removeDomNode(container, existingItem.dom);
  }
  for (const existingItem of existingUnkeyedItems.values()) {
    removeDomNode(container, existingItem.dom);
  }

  return renderedItems;
}

function getNodeKey(node: JSX.Children): JSX.Key | undefined {
  return typeof node === 'object' && !Array.isArray(node) ? node?.key : undefined;
}

function isIntrinsicElement(
  node: JSX.Element<JSX.ElementType>,
): node is JSX.Element<JSX.IntrinsicElementType> {
  return typeof node.type === 'string';
}

function insertDomRange(
  parent: Element | DocumentFragment,
  existing: Node | RenderedDomRange | null,
  nextSibling: Node | RenderedDomRange | null,
): RenderedDomRange {
  const fragment = document.createDocumentFragment();
  const start = fragment.appendChild(createEmptyDomPlaceholder());
  const end = fragment.appendChild(createEmptyDomPlaceholder());
  if (existing) {
    replaceDomNode(parent, existing, fragment);
  } else {
    insertDomNode(parent, fragment, nextSibling);
  }
  return { start, end };
}

function replaceDomNode<T extends Node>(
  parent: Element | DocumentFragment,
  existing: Node | RenderedDomRange,
  updated: T,
): T {
  if (existing instanceof Node) {
    parent.replaceChild(updated, existing);
    return updated;
  } else {
    // Remove all nodes between the start and end markers
    let current: Node | null = existing.start;
    while (current && current !== existing.end) {
      const node: Node = current;
      current = node.nextSibling;
      parent.removeChild(node);
    }
    // Replace the remaining end marker with the updated node
    parent.replaceChild(updated, existing.end);
    return updated;
  }
}

function insertDomNode<T extends Node | RenderedDomRange>(
  parent: Element | DocumentFragment,
  node: T,
  insertBefore: Node | RenderedDomRange | null,
): T {
  const nextSibling = insertBefore ? getDomNodeStart(insertBefore) : null;
  if (node instanceof Node) {
    return parent.insertBefore(node, nextSibling);
  } else {
    const rangeFragment = removeDomNode(parent, node);
    parent.insertBefore(rangeFragment, nextSibling);
    return node;
  }
}

function removeDomNode(container: Element | DocumentFragment, node: Node | RenderedDomRange): Node {
  if (node instanceof Node) return container.removeChild(node);
  const fragment = document.createDocumentFragment();
  let current: Node | null = node.start;
  while (current && current !== node.end) {
    const next: Node | null = current.nextSibling;
    fragment.appendChild(current);
    current = next;
  }
  fragment.appendChild(node.end);
  return fragment;
}

function createEmptyDomPlaceholder(): EmptyDomPlaceholder {
  return document.createComment('');
}

function setDomElementAttribute<K extends keyof JSX.ElementProps<JSX.IntrinsicElementType>>(
  element: Element,
  key: K,
  value: JSX.ElementProps<JSX.IntrinsicElementType>[K],
): void {
  switch (key) {
    case 'className':
      return setDomElementAttribute(element, 'class', value);
    case 'htmlFor':
      return setDomElementAttribute(element, 'for', value);
    default:
      return setGenericDomElementAttribute(element, key, value);
  }
}

function setGenericDomElementAttribute(element: Element, key: string, value: unknown): void {
  // FIXME: assign different attribute values depending on the key
  switch (typeof value) {
    case 'boolean':
      if (value) {
        element.setAttribute(key, '');
      } else {
        element.removeAttribute(key);
      }
      return;
    case 'string':
      element.setAttribute(key, value);
      return;
    case 'number':
    case 'bigint':
      element.setAttribute(key, formatPrimitiveValue(value));
      return;
    case 'undefined':
      element.removeAttribute(key);
      return;
    case 'object':
      if (value === null) element.removeAttribute(key);
      return;
    case 'symbol':
    case 'function':
      return;
  }
}

function getDomNodeStart(node: Node | RenderedDomRange): Node {
  return node instanceof Node ? node : node.start;
}

function getDomNodeEnd(node: Node | RenderedDomRange): Node {
  return node instanceof Node ? node : node.end;
}

function nodesAreEqual(previous: JSX.Children, updated: JSX.Children) {
  return previous === updated || hash(previous as Hashable) === hash(updated as Hashable);
}

function childNodeListsAreEqual(left: Array<JSX.Children>, right: Array<JSX.Children>) {
  if (left === right) return true;
  return hash(left as Hashable) === hash(right as Hashable);
}

function formatPrimitiveValue(value: string | number | bigint | boolean): string {
  return String(value);
}
