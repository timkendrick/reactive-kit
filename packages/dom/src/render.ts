import type { JSX } from '@reactive-kit/component';
import { handlers } from '@reactive-kit/handlers';
import type { Hashable } from '@reactive-kit/hash';
import { Runtime } from '@reactive-kit/runtime';
import { wrapExpression, type Expression } from '@reactive-kit/types';
import { subscribeAsyncIterator } from '@reactive-kit/utils';
import { renderDom, RenderedNode } from './vdom';

export function render(root: JSX.Element, container: Element | DocumentFragment): Promise<null> {
  const runtime = new Runtime(handlers);
  const results = runtime.subscribe(wrapExpression(root) as Expression<JSX.Element & Hashable>);
  return subscribeAsyncIterator(
    results as AsyncIterator<JSX.Element, null, undefined>,
    ((previous: RenderedNode | null) => (template) => {
      previous = renderDom(template, container, previous);
    })(null),
  );
}
