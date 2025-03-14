import type { BabelPlugin, Scope, types as t } from '@reactive-kit/babel-types';

export const reactiveJsx: BabelPlugin = (babel) => {
  const { types: t } = babel;
  return {
    name: 'reactive-jsx',
    visitor: {
      JSXElement(path) {
        path.replaceWith(transformJsxElement(path.node, path.scope));
      },
      JSXFragment(path) {
        path.replaceWith(transformJsxFragment(path.node));
      },
      JSXText(path) {
        path.replaceWith(transformJsxText(path.node));
      },
    },
  };

  function transformJsxElement(node: t.JSXElement, scope: Scope): t.Expression {
    const elementIdentifier = node.openingElement.name;
    switch (elementIdentifier.type) {
      case 'JSXIdentifier':
        if (isIntrinsicElementIdentifier(elementIdentifier)) {
          return transformJsxIntrinsicElement(elementIdentifier, node);
        } else {
          return transformJsxCustomElement(elementIdentifier, node, scope);
        }
      case 'JSXMemberExpression':
        return transformJsxCustomElement(elementIdentifier, node, scope);
      case 'JSXNamespacedName':
      default:
        return node;
    }
  }

  function isIntrinsicElementIdentifier(elementName: t.JSXIdentifier) {
    return /^[a-z]/.test(elementName.name);
  }

  function transformJsxIntrinsicElement(
    elementName: t.JSXIdentifier,
    element: t.JSXElement,
  ): t.Expression {
    const { key, ref, props } = parseJsxElementAttributes(element);
    return t.objectExpression([
      t.objectProperty(t.stringLiteral('type'), t.stringLiteral(elementName.name)),
      ...(key ? [t.objectProperty(t.stringLiteral('key'), key)] : []),
      ...(ref ? [t.objectProperty(t.stringLiteral('ref'), ref)] : []),
      t.objectProperty(t.stringLiteral('props'), props),
    ]);
  }

  function transformJsxCustomElement(
    type: t.JSXIdentifier | t.JSXMemberExpression,
    element: t.JSXElement,
    scope: Scope,
  ): t.Expression {
    const elementType = parseJsxCustomElementName(type);
    const { key, ref, props } = parseJsxElementAttributes(element);
    const elementExpression = t.callExpression(elementType, [props]);
    const expression = isAsyncScope(scope)
      ? t.awaitExpression(elementExpression)
      : elementExpression;
    if (!key && !ref) return expression;
    return t.objectExpression([
      ...(key ? [t.objectProperty(t.stringLiteral('key'), key)] : []),
      ...(ref ? [t.objectProperty(t.stringLiteral('ref'), ref)] : []),
      t.spreadElement(expression),
    ]);
  }

  function parseJsxCustomElementName(
    identifier: t.JSXIdentifier | t.JSXMemberExpression,
  ): t.Expression {
    switch (identifier.type) {
      case 'JSXIdentifier':
        return t.identifier(identifier.name);
      case 'JSXMemberExpression':
        return t.memberExpression(
          parseJsxCustomElementName(identifier.object),
          t.identifier(identifier.property.name),
        );
    }
  }

  function transformJsxFragment(node: t.JSXFragment): t.Expression {
    return t.arrayExpression(
      node.children.map((child) => {
        switch (child.type) {
          case 'JSXFragment':
          case 'JSXElement':
            return child;
          case 'JSXText':
            return transformJsxText(child);
          case 'JSXExpressionContainer':
            return transformJsxExpressionContainer(child);
          case 'JSXSpreadChild':
            return t.spreadElement(child.expression);
          default:
            return t.nullLiteral();
        }
      }),
    );
  }

  function transformJsxText(node: t.JSXText): t.Expression {
    return t.stringLiteral(node.value);
  }

  function transformJsxExpressionContainer(node: t.JSXExpressionContainer): t.Expression {
    const { expression } = node;
    if (t.isJSXEmptyExpression(expression)) return t.nullLiteral();
    return expression;
  }

  function parseJsxElementAttributes(element: t.JSXElement): {
    key: t.Expression | null;
    ref: t.Expression | null;
    props: t.ObjectExpression;
  } {
    const {
      openingElement: { attributes },
      children,
    } = element;
    const { key, ref, props } = attributes.reduce(
      (acc, attribute) => {
        switch (attribute.type) {
          case 'JSXAttribute': {
            const { name: attributeIdentifier, value: attributeValue } = attribute;
            switch (attributeIdentifier.type) {
              case 'JSXIdentifier': {
                const { name: attributeName } = attributeIdentifier;
                switch (attributeName) {
                  case 'key':
                    acc.key = parseJsxAttributeValue(attributeValue);
                    return acc;
                  case 'ref':
                    acc.ref = parseJsxAttributeValue(attributeValue);
                    return acc;
                  default:
                    acc.props.push(
                      t.objectProperty(
                        t.stringLiteral(attributeName),
                        parseJsxAttributeValue(attributeValue),
                      ),
                    );
                    return acc;
                }
              }
              case 'JSXNamespacedName':
              default:
                return acc;
            }
          }
          case 'JSXSpreadAttribute':
            acc.props.push(t.spreadElement(attribute.argument));
            return acc;
          default:
            return acc;
        }
      },
      {
        key: null as t.Expression | null,
        ref: null as t.Expression | null,
        props: new Array<t.ObjectProperty | t.SpreadElement>(),
      },
    );
    const childrenProp = element.closingElement ? parseJsxElementChildren(children) : null;
    return {
      key,
      ref,
      props: t.objectExpression(
        childrenProp
          ? [...props, t.objectProperty(t.stringLiteral('children'), childrenProp)]
          : props,
      ),
    };
  }

  function parseJsxAttributeValue(value: t.JSXAttribute['value']): t.Expression {
    if (!value) return t.nullLiteral();
    switch (value.type) {
      case 'JSXExpressionContainer':
        return transformJsxExpressionContainer(value);
      default:
        return value;
    }
  }

  function parseJsxElementChildren(children: t.JSXElement['children']): t.Expression {
    const elements = stripJsxWhitespaceChildren(children).map((child) => {
      switch (child.type) {
        case 'JSXElement':
        case 'JSXFragment':
          return child;
        case 'JSXText':
          return transformJsxText(child);
        case 'JSXExpressionContainer':
          return transformJsxExpressionContainer(child);
        case 'JSXSpreadChild':
          return t.spreadElement(child.expression);
        default:
          return child;
      }
    });
    switch (elements.length) {
      case 0:
        return t.nullLiteral();
      case 1: {
        const [element] = elements;
        if (t.isSpreadElement(element)) return element.argument;
        return element;
      }
      default:
        return t.arrayExpression(elements);
    }
  }

  function stripJsxWhitespaceChildren(
    children: t.JSXElement['children'],
  ): t.JSXElement['children'] {
    const startIndex = children.findIndex(
      (element) => !(t.isJSXText(element) && isJsxWhitespaceElement(element)),
    );
    if (startIndex === -1) return [];
    const endIndex = findLastIndex(
      children,
      (element) => !(t.isJSXText(element) && isJsxWhitespaceElement(element)),
    );
    return children.slice(startIndex, endIndex + 1);
  }

  function isJsxWhitespaceElement(element: t.JSXText): boolean {
    return /^\s*$/.test(element.value);
  }
};

function findLastIndex<T>(items: Array<T>, predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) return i;
  }
  return -1;
}

function isAsyncScope(scope: Scope): boolean {
  const functionScope = scope.getFunctionParent();
  if (!functionScope) return false;
  const { path: fn } = functionScope;
  if (!fn.isFunction()) return false;
  return Boolean(fn.node.async);
}
