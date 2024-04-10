import type { BabelPlugin, Types } from '@reactive-kit/babel-types';

export const reactiveJsx: BabelPlugin = (babel) => {
  const { types: t } = babel;
  return {
    name: 'reactive-jsx',
    visitor: {
      JSXElement(path) {
        path.replaceWith(transformJsxElement(path.node));
      },
      JSXFragment(path) {
        path.replaceWith(transformJsxFragment(path.node));
      },
      JSXText(path) {
        path.replaceWith(transformJsxText(path.node));
      },
    },
  };

  function transformJsxElement(node: Types.JSXElement): Types.Expression {
    const elementIdentifier = node.openingElement.name;
    switch (elementIdentifier.type) {
      case 'JSXIdentifier':
        if (isIntrinsicElementIdentifier(elementIdentifier)) {
          return transformJsxIntrinsicElement(elementIdentifier, node);
        } else {
          return transformJsxCustomElement(elementIdentifier, node);
        }
      case 'JSXMemberExpression':
        return transformJsxCustomElement(elementIdentifier, node);
      case 'JSXNamespacedName':
      default:
        return node;
    }
  }

  function isIntrinsicElementIdentifier(elementName: Types.JSXIdentifier) {
    return /^[a-z]/.test(elementName.name);
  }

  function transformJsxIntrinsicElement(
    elementName: Types.JSXIdentifier,
    element: Types.JSXElement,
  ): Types.Expression {
    const { key, ref, props } = parseJsxElementAttributes(element);
    return t.objectExpression([
      t.objectProperty(t.stringLiteral('type'), t.stringLiteral(elementName.name)),
      ...(key ? [t.objectProperty(t.stringLiteral('key'), key)] : []),
      ...(ref ? [t.objectProperty(t.stringLiteral('ref'), ref)] : []),
      t.objectProperty(t.stringLiteral('props'), props),
    ]);
  }

  function transformJsxCustomElement(
    type: Types.JSXIdentifier | Types.JSXMemberExpression,
    element: Types.JSXElement,
  ): Types.Expression {
    const elementType = parseJsxCustomElementName(type);
    const { key, ref, props } = parseJsxElementAttributes(element);
    const elementExpression = t.awaitExpression(t.callExpression(elementType, [props]));
    if (!key && !ref) return elementExpression;
    return t.objectExpression([
      ...(key ? [t.objectProperty(t.stringLiteral('key'), key)] : []),
      ...(ref ? [t.objectProperty(t.stringLiteral('ref'), ref)] : []),
      t.spreadElement(elementExpression),
    ]);
  }

  function parseJsxCustomElementName(
    identifier: Types.JSXIdentifier | Types.JSXMemberExpression,
  ): Types.Expression {
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

  function transformJsxFragment(node: Types.JSXFragment): Types.Expression {
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

  function transformJsxText(node: Types.JSXText): Types.Expression {
    return t.stringLiteral(node.value);
  }

  function transformJsxExpressionContainer(node: Types.JSXExpressionContainer): Types.Expression {
    const { expression } = node;
    if (t.isJSXEmptyExpression(expression)) return t.nullLiteral();
    return expression;
  }

  function parseJsxElementAttributes(element: Types.JSXElement): {
    key: Types.Expression | null;
    ref: Types.Expression | null;
    props: Types.ObjectExpression;
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
        key: null as Types.Expression | null,
        ref: null as Types.Expression | null,
        props: new Array<Types.ObjectProperty | Types.SpreadElement>(),
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

  function parseJsxAttributeValue(value: Types.JSXAttribute['value']): Types.Expression {
    if (!value) return t.nullLiteral();
    switch (value.type) {
      case 'JSXExpressionContainer':
        return transformJsxExpressionContainer(value);
      default:
        return value;
    }
  }

  function parseJsxElementChildren(children: Types.JSXElement['children']): Types.Expression {
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
    children: Types.JSXElement['children'],
  ): Types.JSXElement['children'] {
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

  function isJsxWhitespaceElement(element: Types.JSXText): boolean {
    return /^\s*$/.test(element.value);
  }
};

function findLastIndex<T>(items: Array<T>, predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) return i;
  }
  return -1;
}
