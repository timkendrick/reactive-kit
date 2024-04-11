import type { BabelPlugin, Scope, Types } from '@reactive-kit/babel-types';
import { hashAstNode } from '../utils/ast';

const SYMBOL_NAME_HASH = '@reactive-kit/symbols/hash';
const SYMBOL_NAME_STATEFUL = '@reactive-kit/symbols/stateful';

export const reactiveFunctions: BabelPlugin = (babel) => {
  const { types: t } = babel;
  return {
    name: 'reactive-functions',
    visitor: {
      Function(path) {
        if (!path.node.async) return;
        path.replaceWith(transformFunction(path.node, path.scope));
      },
      AwaitExpression(path) {
        const isTopLevelAwait = !path.getFunctionParent();
        if (isTopLevelAwait) return;
        path.replaceWith(transformAwaitExpression(path.node));
      },
    },
  };

  function transformFunction(node: Types.Function, scope: Scope): Types.Function {
    const result = createStatefulGenerator(node, scope);
    if (t.isArrowFunctionExpression(node)) {
      return {
        ...node,
        expression: true,
        generator: false,
        async: false,
        returnType: undefined,
        body: result,
      };
    } else {
      return {
        ...node,
        generator: false,
        async: false,
        returnType: undefined,
        body: t.blockStatement([t.returnStatement(result)]),
      };
    }
  }

  function createStatefulGenerator(node: Types.Function, scope: Scope): Types.Expression {
    const astHash = hashAstNode(node);
    return t.objectExpression([
      t.objectProperty(
        wellKnownSymbol(SYMBOL_NAME_HASH),
        node.params.length === 0
          ? t.bigIntLiteral(astHash.toString())
          : ((hash) =>
              t.arrowFunctionExpression(
                [hash],
                t.callExpression(hash, [
                  t.bigIntLiteral(astHash.toString()),
                  ...node.params.map((param) => instantiateParam(param)),
                ]),
              ))(scope.generateUidIdentifier('hash')),
        true,
      ),
      t.objectProperty(
        wellKnownSymbol(SYMBOL_NAME_STATEFUL),
        Object.assign(
          t.isArrowFunctionExpression(node)
            ? t.arrowFunctionExpression([], node.body)
            : t.functionExpression(getFunctionIdentifier(node, scope), [], node.body),
          { generator: true },
          node.returnType
            ? {
                returnType: node.returnType && transformAsyncFunctionReturnType(node.returnType),
              }
            : undefined,
        ),
        true,
      ),
    ]);
  }

  function instantiateParam(param: Types.LVal): Types.Expression {
    switch (param.type) {
      case 'Identifier':
        return param;
      case 'ArrayPattern': {
        const { elements } = param;
        return t.arrayExpression(
          elements
            .map((element) => {
              if (!element) return null;
              return instantiateParam(element);
            })
            .filter(nonNull),
        );
      }
      case 'ObjectPattern': {
        const { properties } = param;
        return t.objectExpression(
          properties.map((property) => {
            switch (property.type) {
              case 'ObjectProperty': {
                const { key, value, computed, shorthand } = property;
                return t.objectProperty(key, value, computed, shorthand);
              }
              case 'RestElement': {
                const { argument } = property;
                return t.spreadElement(instantiateParam(argument));
              }
            }
          }),
        );
      }
      case 'RestElement': {
        const { argument } = param;
        return t.arrayExpression([instantiateParam(argument)]);
      }
      case 'AssignmentPattern': {
        const { left } = param;
        switch (left.type) {
          case 'Identifier':
          case 'ArrayPattern':
          case 'ObjectPattern':
            return instantiateParam(left);
          case 'MemberExpression':
            return left;
          case 'TSAsExpression':
          case 'TSSatisfiesExpression':
          case 'TSTypeAssertion':
          case 'TSNonNullExpression': {
            const { expression } = left;
            return expression;
          }
        }
      }
      case 'MemberExpression':
        return param;
      case 'TSParameterProperty': {
        const { parameter: fieldDefinition } = param;
        const fieldIdentifier = ((fieldDefinition) => {
          switch (fieldDefinition.type) {
            case 'Identifier': {
              return fieldDefinition;
            }
            case 'AssignmentPattern': {
              const { left: assignmentTarget } = fieldDefinition;
              switch (assignmentTarget.type) {
                case 'Identifier':
                  return assignmentTarget;
                case 'ArrayPattern':
                case 'ObjectPattern':
                case 'MemberExpression':
                case 'TSAsExpression':
                case 'TSSatisfiesExpression':
                case 'TSTypeAssertion':
                case 'TSNonNullExpression':
                  return null;
              }
            }
          }
        })(fieldDefinition);
        if (!fieldIdentifier) return t.nullLiteral();
        return t.memberExpression(t.thisExpression(), fieldIdentifier);
      }
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSTypeAssertion':
      case 'TSNonNullExpression': {
        const { expression } = param;
        return expression;
      }
    }
  }

  function transformAsyncFunctionReturnType(
    returnType: NonNullable<Types.FunctionDeclaration['returnType']>,
  ): NonNullable<Types.FunctionDeclaration['returnType']> {
    if (!t.isTSTypeAnnotation(returnType)) return returnType;
    const typeParameter = parsePromiseTypeAnnotation(returnType.typeAnnotation);
    const iteratorResultYieldType = t.tsAnyKeyword();
    const iteratorResultReturnType =
      typeParameter || inferPromiseTypeAnnotation(returnType.typeAnnotation);
    return {
      ...returnType,
      typeAnnotation: createIteratorResultType(iteratorResultYieldType, iteratorResultReturnType),
    };
  }

  function createPromiseTypeAnnotation(typeParameter: Types.TSType): Types.TSTypeReference {
    return t.tsTypeReference(
      t.identifier('Promise'),
      t.tsTypeParameterInstantiation([typeParameter]),
    );
  }

  function parsePromiseTypeAnnotation(typeAnnotation: Types.TSType): Types.TSType | null {
    if (!t.isTSTypeReference(typeAnnotation)) return null;
    if (!isNamedTypeIdentifier('Promise', typeAnnotation.typeName)) return null;
    const typeParameters = typeAnnotation.typeParameters?.params;
    if (!typeParameters || typeParameters.length !== 1) return null;
    return typeParameters[0];
  }

  function inferPromiseTypeAnnotation(typeAnnotation: Types.TSType): Types.TSType {
    return t.tsConditionalType(
      typeAnnotation,
      createPromiseTypeAnnotation(t.tsInferType(t.tsTypeParameter(null, null, '$T'))),
      t.tsTypeReference(t.identifier('$T')),
      t.tsAnyKeyword(),
    );
  }

  function createIteratorResultType(
    yieldType: Types.TSType,
    returnType: Types.TSType,
  ): Types.TSTypeReference {
    return t.tsTypeReference(
      t.identifier('IteratorResult'),
      t.tsTypeParameterInstantiation([yieldType, returnType]),
    );
  }

  function isNamedTypeIdentifier(name: string, node: Types.TSEntityName): boolean {
    return t.isIdentifier(node) && node.name === name;
  }

  function transformAwaitExpression(node: Types.AwaitExpression): Types.YieldExpression {
    return t.yieldExpression(node.argument);
  }

  function getFunctionIdentifier(node: Types.Function, scope: Scope): Types.Identifier | null {
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        return node.id ?? null;
      case 'ClassMethod':
      case 'ObjectMethod': {
        const key = getStaticPropertyKey(node.key, node.computed);
        if (key == null) return null;
        return t.identifier(key);
      }
      case 'ClassPrivateMethod':
        return scope.generateUidIdentifier(node.key.id.name);
      case 'ArrowFunctionExpression':
      default:
        return null;
    }
  }

  function getStaticPropertyKey(key: Types.Expression, computed: boolean): string | null {
    if (t.isIdentifier(key)) return computed ? null : key.name;
    if (t.isLiteral(key)) return getLiteralPropertyKey(key);
    return null;
  }

  function getLiteralPropertyKey(key: Types.Literal): string | null {
    switch (key.type) {
      case 'StringLiteral':
        return key.value;
      case 'NumericLiteral':
      case 'BooleanLiteral':
      case 'BigIntLiteral':
      case 'DecimalLiteral':
        return String(key.value);
      case 'NullLiteral':
        return String(null);
      case 'TemplateLiteral':
        return key.expressions.length === 0 && key.quasis.length === 1
          ? key.quasis[0].value.cooked ?? key.quasis[0].value.raw
          : null;
      case 'RegExpLiteral':
        return null;
    }
  }

  function wellKnownSymbol(symbolName: string): Types.PrivateName | Types.Expression {
    return t.callExpression(t.memberExpression(t.identifier('Symbol'), t.identifier('for')), [
      t.stringLiteral(symbolName),
    ]);
  }
};

function nonNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}
