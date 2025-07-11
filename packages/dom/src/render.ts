import type { JSX } from '@reactive-kit/component';
import { handlers } from '@reactive-kit/handlers';
import type { Hashable } from '@reactive-kit/hash';
import { Runtime, type RuntimeMessage } from '@reactive-kit/runtime';
import { wrapExpression, type Expression } from '@reactive-kit/types';
import { subscribeAsyncIterator } from '@reactive-kit/utils';

import { consoleLoggerMiddleware } from './middleware';
import { renderDom, type RenderedNode } from './vdom';

export function render(
  root: JSX.Element,
  container: Element | DocumentFragment,
  options?: {
    log?: boolean;
  },
): Promise<null> {
  const { log = false } = options ?? {};
  const runtime = new Runtime(handlers, {
    middleware: log ? consoleLoggerMiddleware<RuntimeMessage>(globalThis.console) : undefined,
  });
  const results = runtime.subscribe(wrapExpression(root) as Expression<JSX.Element & Hashable>);
  return subscribeAsyncIterator(
    results as AsyncIterator<JSX.Element, null, undefined>,
    ((previous: RenderedNode | null) => (template) => {
      previous = renderDom(template, container, previous);
    })(null),
  );
}
