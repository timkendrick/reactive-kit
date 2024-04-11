import type {
  Component,
  Element as ElementNode,
  ElementProps,
  ElementType,
  IntrinsicElementType,
  TemplateNode,
} from '@reactive-kit/component';
import { handlers } from '@reactive-kit/handlers';
import type { Hashable } from '@reactive-kit/hash';
import type { Reactive } from '@reactive-kit/interpreter';
import { Runtime } from '@reactive-kit/runtime';
import { subscribeAsyncIterator } from '@reactive-kit/utils';

export function render(root: Component<{}>, container: Element | DocumentFragment): Promise<null> {
  const runtime = new Runtime(handlers);
  const results = runtime.subscribe(root({}) as unknown as Reactive<Hashable>);
  return subscribeAsyncIterator(
    results as AsyncIterator<TemplateNode, null, undefined>,
    (template) => {
      // FIXME: carry over existing DOM nodes
      clearDomContainer(container);
      renderDom(template, container);
    },
  );
}

function renderDom(node: TemplateNode, container: Element | DocumentFragment): void {
  switch (typeof node) {
    case 'object':
      if (node === null) return renderDomPrimitive(node, container);
      if (Array.isArray(node)) return renderDomNodeList(node, container);
      if (!isPrimitiveElement(node)) return renderDomPrimitive(null, container);
      return renderDomElement(node, container);
    default:
      return renderDomPrimitive(node, container);
  }
}

function renderDomPrimitive(
  node: string | number | bigint | boolean | null | undefined,
  container: Element | DocumentFragment,
): void {
  if (node == null || node === false) {
    return;
  } else {
    return renderDomText(String(node), container);
  }
}

function renderDomText(text: string, container: Element | DocumentFragment): void {
  container.appendChild(document.createTextNode(text));
}

function clearDomContainer(container: Element | DocumentFragment): void {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function renderDomNodeList(
  nodes: Array<TemplateNode>,
  container: Element | DocumentFragment,
): void {
  for (const node of nodes) {
    renderDom(node, container);
  }
}

function renderDomElement<T extends IntrinsicElementType>(
  node: ElementNode<T>,
  container: Element | DocumentFragment,
): void {
  const {
    type,
    props: { children, ...attributes },
  } = node;
  const element = document.createElement(type);
  for (const [key, value] of Object.entries(attributes) as Array<
    [
      keyof ElementProps<IntrinsicElementType>,
      ElementProps<IntrinsicElementType>[keyof ElementProps<IntrinsicElementType>],
    ]
  >) {
    setDomElementAttribute(element, key, value);
  }
  if (children) {
    for (const child of Array.isArray(children) ? children : [children]) {
      renderDom(child, element);
    }
  }
  container.appendChild(element);
}

function setDomElementAttribute<K extends keyof ElementProps<IntrinsicElementType>>(
  element: HTMLElement,
  key: K,
  value: ElementProps<IntrinsicElementType>[K],
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

function setGenericDomElementAttribute(element: HTMLElement, key: string, value: unknown): void {
  // FIXME: assign different attribute values depending on the key
  switch (typeof value) {
    case 'boolean':
      element.setAttribute(key, '');
      return;
    case 'string':
      element.setAttribute(key, value);
    case 'number':
    case 'bigint':
      element.setAttribute(key, String(value));
      return;
    case 'symbol':
    case 'undefined':
    case 'object':
    case 'function':
      return;
  }
}

function isPrimitiveElement(
  node: ElementNode<ElementType>,
): node is ElementNode<IntrinsicElementType> {
  return typeof node.type === 'string';
}
