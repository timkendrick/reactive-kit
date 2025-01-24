import {
  type Binding,
  type BabelPlugin,
  type Node,
  type NodePath,
  type Scope,
  type types as t,
  TraverseOptions,
  PluginPass,
  PluginObj,
} from '@reactive-kit/babel-types';
import { Hash } from '@reactive-kit/hash';
import destructuringTransform from '@babel/plugin-transform-destructuring';
import regeneratorTransform from 'regenerator-transform';
import '../transform-destructuring.d.ts';
import '../regenerator-transform.d.ts';

import { hashAstNode } from '../utils/ast';

const SYMBOL_NAME_HASH = '@reactive-kit/symbols/hash';
const SYMBOL_NAME_TYPE = '@reactive-kit/symbols/type';
const SYMBOL_NAME_TYPE_GENERATOR = '@reactive-kit/symbols/type/generator';
const SYMBOL_NAME_GENERATOR = '@reactive-kit/symbols/generator';
const SYMBOL_NAME_TYPE_EXPRESSION = '@reactive-kit/symbols/type/expression';
const SYMBOL_NAME_EXPRESSION_TYPE = '@reactive-kit/symbols/expression/type';
const SYMBOL_NAME_EXPRESSION_TYPE_ASYNC = '@reactive-kit/symbols/expression/type/async';

export const transformAsyncFunctions: BabelPlugin = (babel): PluginObj<PluginPass> => {
  const { types: t, traverse } = babel;
  const regenerator = regeneratorTransform(babel);
  const destructuring = destructuringTransform(babel, {
    useBuiltIns: true,
  });
  // HACK: Babel plugin types do not expose the `visitSelf` argument
  type TraverseSelf = typeof traverse extends {
    <S>(
      parent: Node,
      opts: TraverseOptions<S>,
      scope: Scope | undefined,
      state: S,
      parentPath?: NodePath,
    ): void;
  }
    ? {
        <S>(
          parent: Node,
          opts: TraverseOptions<S>,
          scope: Scope | undefined,
          state: S,
          parentPath?: NodePath,
          visitSelf?: boolean,
        ): void;
      }
    : never;
  return {
    name: 'transform-async-functions',
    visitor: {
      FunctionDeclaration(path, state) {
        const { node, scope } = path;
        const isAsyncFunction = node.async && !node.generator;
        if (!isAsyncFunction) return;
        const inputHash = hashAstNode(path.node);
        (traverse as TraverseSelf)(
          node,
          destructuring.visitor,
          scope,
          {
            ...state,
            opts: {
              async: true,
              generators: true,
              asyncGenerators: true,
            },
          },
          path,
          true,
        );
        (traverse as TraverseSelf)(
          node,
          regenerator.visitor,
          scope,
          {
            ...state,
            opts: {
              async: true,
              generators: true,
              asyncGenerators: true,
            },
          },
          path,
          true,
        );
        visitAsyncFactoryDeclaration(path, inputHash);
      },
    },
  };

  function parseAsyncFactoryDeclaration(path: NodePath<t.FunctionDeclaration>): {
    localsDeclaration: NodePath<t.VariableDeclaration> | null;
    locals: Array<{ identifier: NodePath<t.Identifier>; binding: Binding }>;
    factory: NodePath<t.CallExpression>;
    factoryArgs: {
      innerFn: NodePath<t.FunctionExpression>;
      // TODO: consider transforming nested async functions
      outerFn: NodePath<t.NullLiteral>;
      // TODO: consider transforming async class/object methods
      self: NodePath<t.NullLiteral>;
      tryLocsList: NodePath<t.ArrayExpression> | NodePath<t.NullLiteral>;
      PromiseImpl: NodePath<t.Expression>;
    };
    contextParam: NodePath<t.Identifier>;
    contextBinding: Binding;
    endCase: NodePath<t.SwitchCase>;
  } | null {
    const blockStatement = path.get('body');
    const statements = blockStatement.get('body');
    if (statements.length < 1 || statements.length > 2) return null;
    const [localsStatement, returnStatement] =
      statements.length === 1 ? [null, statements[0]] : statements;
    if (!returnStatement.isReturnStatement()) return null;
    const localsDeclaration =
      localsStatement != null && localsStatement.isVariableDeclaration() ? localsStatement : null;
    if (localsStatement && !localsDeclaration) return null;
    const factory = returnStatement.get('argument');
    if (!factory.isCallExpression()) return null;

    const localDeclarations = (localsDeclaration?.get('declarations') ?? []).map((declaration) => {
      const id = declaration.get('id');
      return id.isIdentifier() ? id : null;
    });
    const localIdentifiers = localDeclarations.filter(isNonNull);
    if (localIdentifiers.length !== localDeclarations.length) return null;

    const callee = factory.get('callee');
    if (!callee.isMemberExpression()) return null;
    if (!callee.get('object').isIdentifier({ name: 'regeneratorRuntime' })) return null;
    if (!callee.get('property').isIdentifier({ name: 'async' })) return null;

    const factoryArgs = factory.get('arguments');
    if (factoryArgs.length !== 5) return null;
    const [innerFn, outerFn, self, tryLocsList, PromiseImpl] = factoryArgs;
    if (!innerFn.isFunctionExpression()) return null;
    if (!outerFn.isNullLiteral()) return null;
    if (!self.isNullLiteral()) return null;
    if (!tryLocsList.isArrayExpression() && !tryLocsList.isNullLiteral()) return null;
    if (!PromiseImpl.isExpression()) return null;

    const generatorParams = innerFn.get('params');
    if (generatorParams.length !== 1) return null;
    const [contextParam] = generatorParams;
    if (!contextParam.isIdentifier()) return null;
    const generatorBody = innerFn.get('body');
    const generatorBodyScope = generatorBody.scope;
    const generatorBodyStatements = generatorBody.get('body');
    if (generatorBodyStatements.length !== 1) return null;
    const [whileLoop] = generatorBodyStatements;
    if (!whileLoop.isWhileStatement()) return null;
    const switchStatement = whileLoop.get('body');
    if (!switchStatement.isSwitchStatement()) return null;
    const switchCases = switchStatement.get('cases');
    const endCase = switchCases[switchCases.length - 1];
    if (!endCase.get('test').isStringLiteral({ value: 'end' })) return null;
    const contextBinding = generatorBodyScope.getBinding(contextParam.node.name);
    if (!contextBinding) return null;
    const localBindings = localIdentifiers
      .map((identifier) => generatorBodyScope.getBinding(identifier.node.name))
      .filter(isNonNull);
    if (localBindings.length < localIdentifiers.length) return null;
    const locals = zip(localIdentifiers, localBindings).map(([identifier, binding]) => ({
      identifier,
      binding,
    }));

    return {
      localsDeclaration,
      locals,
      factory,
      factoryArgs: {
        innerFn,
        outerFn,
        self,
        tryLocsList,
        PromiseImpl,
      },
      contextParam,
      contextBinding,
      endCase,
    };
  }

  function visitAsyncFactoryDeclaration(path: NodePath<t.FunctionDeclaration>, id: Hash): void {
    const asyncFactory = parseAsyncFactoryDeclaration(path);
    if (!asyncFactory) {
      throw path.buildCodeFrameError('Unexpected regenerator runtime output');
    }
    const {
      localsDeclaration,
      locals,
      factory: factoryExpression,
      factoryArgs: { innerFn: generatorFn, outerFn, tryLocsList },
      contextParam,
      contextBinding,
      endCase,
    } = asyncFactory;
    const generatorHash = t.bigIntLiteral(String(id));
    const functionParamIdentifiers = getFunctionParamIdentifiers(path);
    const generatorFnName =
      generatorFn.node.id ||
      (generatorFn.node.id = outerFn.parentPath.scope.generateUidIdentifier());
    const generatorBody = generatorFn.get('body');

    const [staticDeclarations, intermediateDeclarations] = partition(
      rewriteGeneratorIntermediateValueIdentifiers(contextBinding, path.scope),
      ({ isStaticAssignment }) => isStaticAssignment,
    );
    const staticIdentifiers = staticDeclarations.map(({ identifier }) => identifier);
    const intermediateIdentifiers = intermediateDeclarations.map(({ identifier }) => identifier);
    for (const param of functionParamIdentifiers) {
      rewriteGeneratorArgReferences(generatorBody, param, contextParam);
    }
    for (const { binding } of locals) {
      rewriteGeneratorLocalVariableReferences(binding, contextParam);
    }
    rewriteGeneratorContextAccessors(generatorBody, contextParam);
    endCase.insertBefore(t.switchCase(createHexInteger(Number.MAX_SAFE_INTEGER), []));
    endCase.set('test', null);

    if (localsDeclaration) localsDeclaration.remove();

    factoryExpression.replaceWith(
      t.objectExpression([
        t.objectProperty(
          wellKnownSymbol(SYMBOL_NAME_HASH),
          t.arrowFunctionExpression(
            [t.identifier('_hash')],
            t.callExpression(t.identifier('_hash'), [
              t.stringLiteral(SYMBOL_NAME_EXPRESSION_TYPE_ASYNC),
              generatorHash,
              ...functionParamIdentifiers.map((identifier) => identifier.node),
            ]),
          ),
          true,
        ),
        t.objectProperty(
          wellKnownSymbol(SYMBOL_NAME_TYPE),
          wellKnownSymbol(SYMBOL_NAME_TYPE_EXPRESSION),
          true,
        ),
        t.objectProperty(
          wellKnownSymbol(SYMBOL_NAME_EXPRESSION_TYPE),
          wellKnownSymbol(SYMBOL_NAME_EXPRESSION_TYPE_ASYNC),
          true,
        ),
        t.objectProperty(t.identifier('target'), generatorFnName),
        t.objectProperty(
          t.identifier('args'),
          t.arrayExpression(functionParamIdentifiers.map((id) => id.node)),
        ),
      ]),
    );

    path.insertBefore(generatorFn.node);
    path.insertBefore(
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(generatorFnName, wellKnownSymbol(SYMBOL_NAME_HASH), true),
          t.arrowFunctionExpression(
            [t.identifier('_hash')],
            t.callExpression(t.identifier('_hash'), [
              t.stringLiteral(SYMBOL_NAME_TYPE_GENERATOR),
              generatorHash,
            ]),
          ),
        ),
      ),
    );
    path.insertBefore(
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(generatorFnName, wellKnownSymbol(SYMBOL_NAME_TYPE), true),
          wellKnownSymbol(SYMBOL_NAME_TYPE_GENERATOR),
        ),
      ),
    );
    path.insertBefore(
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(generatorFnName, wellKnownSymbol(SYMBOL_NAME_GENERATOR), true),
          t.objectExpression([
            t.objectProperty(
              t.identifier('params'),
              t.arrayExpression(
                functionParamIdentifiers.map((identifier) => t.stringLiteral(identifier.node.name)),
              ),
            ),
            t.objectProperty(
              t.identifier('locals'),
              t.arrayExpression(
                locals.map(({ identifier }) => t.stringLiteral(identifier.node.name)),
              ),
            ),
            t.objectProperty(
              t.identifier('intermediates'),
              t.arrayExpression(
                intermediateIdentifiers.map((identifier) => t.stringLiteral(identifier.name)),
              ),
            ),
            t.objectProperty(
              t.identifier('statics'),
              t.arrayExpression(
                staticIdentifiers.map((identifier) => t.stringLiteral(identifier.name)),
              ),
            ),
            t.objectProperty(t.identifier('tryLocsList'), tryLocsList.node),
          ]),
        ),
      ),
    );

    function createHexInteger(value: number): t.NumericLiteral {
      return Object.assign(t.numericLiteral(value), {
        extra: { rawValue: value, raw: `0x${value.toString(16)}` },
      });
    }
  }

  function rewriteGeneratorIntermediateValueIdentifiers(
    contextBinding: Binding,
    scope: Scope,
  ): Array<{
    identifier: t.Identifier;
    isStaticAssignment: boolean;
  }> {
    const contextReferences = contextBinding.referencePaths;
    const contextMemberReferences = contextReferences
      .map(
        (
          contextReference,
        ): {
          object: NodePath<t.Expression>;
          property: NodePath<t.Identifier>;
          isStaticAssignment: boolean;
        } | null => {
          if (!contextReference.parentPath || !contextReference.parentPath.isMemberExpression())
            return null;
          if (contextReference.key !== 'object') return null;
          const memberExpression = contextReference.parentPath;
          const object = memberExpression.get('object');
          const property = memberExpression.get('property');
          if (!property.isIdentifier()) return null;
          const isIntermediateReference = /^t\d+$/.test(property.node.name);
          if (!isIntermediateReference) return null;
          const assignmentExpression = memberExpression.parentPath?.isAssignmentExpression()
            ? memberExpression.parentPath
            : null;
          const assignmentTarget =
            assignmentExpression != null &&
            memberExpression.key === 'left' &&
            assignmentExpression.node.operator === '='
              ? assignmentExpression.get('right')
              : null;
          const boundAlias =
            assignmentTarget != null && assignmentTarget.isIdentifier()
              ? assignmentTarget.scope.getBinding(assignmentTarget.node.name)
              : null;
          const isStaticAssignment =
            boundAlias === undefined ||
            (boundAlias != null &&
              boundAlias.scope !== scope &&
              !containsScope(scope, boundAlias.scope));
          return { object, property, isStaticAssignment };
        },
      )
      .filter(isNonNull);
    const staticPropertyNames = new Set(
      contextMemberReferences
        .map(({ property, isStaticAssignment }) => (isStaticAssignment ? property.node.name : null))
        .filter(isNonNull),
    );
    for (const { object, property } of contextMemberReferences) {
      object.replaceWith(
        t.memberExpression(
          t.memberExpression(object.node, t.identifier('state')),
          t.identifier(staticPropertyNames.has(property.node.name) ? 'statics' : 'intermediates'),
        ),
      );
    }
    return uniqBy(
      contextMemberReferences.map(({ property }) => property),
      (property) => property.node.name,
    )
      .map((property) => property.node)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((identifier) => ({
        identifier,
        isStaticAssignment: staticPropertyNames.has(identifier.name),
      }));
  }

  function rewriteGeneratorArgReferences(
    generatorBody: NodePath<t.BlockStatement>,
    identifier: NodePath<t.Identifier>,
    contextParam: NodePath<t.Identifier>,
  ): void {
    const binding = generatorBody.scope.getBinding(identifier.node.name);
    if (!binding) return;
    rewriteVariableReferences(binding, (reference) =>
      t.memberExpression(
        t.memberExpression(
          t.memberExpression(contextParam.node, t.identifier('state')),
          t.identifier('args'),
        ),
        reference.node,
      ),
    );
  }

  function rewriteGeneratorLocalVariableReferences(
    binding: Binding,
    contextParam: NodePath<t.Identifier>,
  ): void {
    rewriteVariableReferences(binding, (reference) =>
      t.memberExpression(
        t.memberExpression(
          t.memberExpression(contextParam.node, t.identifier('state')),
          t.identifier('locals'),
        ),
        reference.node,
      ),
    );
  }

  function rewriteVariableReferences(
    binding: Binding,
    transform: (reference: NodePath<t.Identifier>) => t.Expression,
  ): void {
    const id = binding.identifier.name;
    for (const getterReference of binding.referencePaths) {
      const identifiers = getterReference.isIdentifier()
        ? [getterReference]
        : getterReference.isPatternLike()
        ? getPatternIdentifiers(getterReference).filter((identifier) => identifier.node.name === id)
        : [];
      for (const reference of identifiers) {
        getterReference.replaceWith(transform(reference));
      }
    }
    for (const setterReference of binding.constantViolations) {
      const targets = getAssignmentIdentifiers(setterReference).filter(
        (identifier) => identifier.node.name === id,
      );
      for (const target of targets) {
        target.replaceWith(transform(target));
      }
    }
  }

  function rewriteGeneratorContextAccessors(
    generatorBody: NodePath<t.BlockStatement>,
    contextParam: NodePath<t.Identifier>,
  ): void {
    generatorBody.traverse({
      CallExpression(path) {
        const callee = path.get('callee');
        if (!callee.isMemberExpression()) return;
        const object = callee.get('object');
        const property = callee.get('property');
        const computed = callee.node.computed;
        if (
          object.isIdentifier({ name: 'regeneratorRuntime' }) &&
          property.isIdentifier({ name: 'awrap' }) &&
          !computed
        ) {
          callee.replaceWith(t.memberExpression(contextParam.node, t.stringLiteral('yield'), true));
          return;
        }
      },
      MemberExpression(path) {
        const object = path.get('object');
        const property = path.get('property');
        const computed = path.node.computed;
        if (
          object.isIdentifier({ name: 'regeneratorRuntime' }) &&
          property.isIdentifier({ name: 'awrap' }) &&
          !computed
        ) {
          path.replaceWith(t.memberExpression(contextParam.node, t.stringLiteral('yield'), true));
          return;
        }
        if (object.isIdentifier({ name: contextParam.node.name })) {
          const propertyName = computed
            ? property.isStringLiteral()
              ? property.node.value
              : null
            : property.isIdentifier()
            ? property.node.name
            : null;
          switch (propertyName) {
            case 'prev':
            case 'next': {
              object.replaceWith(t.memberExpression(contextParam.node, t.identifier('state')));
              return;
            }
            default:
              break;
          }
        }
      },
    });
  }

  function wellKnownSymbol(symbolName: string): t.Expression {
    return t.callExpression(t.memberExpression(t.identifier('Symbol'), t.identifier('for')), [
      t.stringLiteral(symbolName),
    ]);
  }

  function isNonNullNode<T>(element: NodePath<T | null>): element is NodePath<T> {
    return element.node != null;
  }

  function getPatternIdentifiers(param: NodePath<t.PatternLike>): Array<NodePath<t.Identifier>> {
    if (param.isIdentifier()) return [param];
    if (param.isAssignmentPattern()) {
      const target = param.get('left');
      if (target.isIdentifier() || target.isPattern()) {
        return getPatternIdentifiers(target);
      }
      return [];
    }
    if (param.isObjectPattern()) {
      return param.get('properties').flatMap((property) => {
        if (property.isObjectProperty()) {
          const target = property.get('value');
          if (!target.isPatternLike()) return [];
          return getPatternIdentifiers(target);
        }
        if (property.isRestElement()) return getPatternIdentifiers(property);
        return [];
      });
    }
    if (param.isArrayPattern()) {
      return param
        .get('elements')
        .filter(isNonNullNode)
        .flatMap((element) => (element.isPatternLike() ? getPatternIdentifiers(element) : []));
    }
    if (param.isRestElement()) {
      const argument = param.get('argument');
      if (!argument.isPatternLike()) return [];
      return getPatternIdentifiers(argument);
    }
    return [];
  }

  function getAssignmentIdentifiers(target: NodePath): Array<NodePath<t.Identifier>> {
    // See https://github.com/babel/babel/blob/main/packages/babel-types/src/retrievers/getAssignmentIdentifiers.ts
    const queue: Array<NodePath> = [target];
    const results = new Array<NodePath<t.Identifier>>();
    let current: NodePath | undefined;
    while ((current = queue.pop())) {
      if (current.isArrayPattern()) {
        queue.push(...current.get('elements').filter(isNonNullNode));
      } else if (current.isAssignmentExpression()) {
        queue.push(current.get('left'));
      } else if (current.isAssignmentPattern()) {
        queue.push(current.get('left'));
      } else if (current.isForInStatement()) {
        queue.push(current.get('left'));
      } else if (current.isForOfStatement()) {
        queue.push(current.get('left'));
      } else if (current.isObjectPattern()) {
        queue.push(...current.get('properties'));
      } else if (current.isObjectProperty()) {
        queue.push(current.get('value'));
      } else if (current.isRestElement()) {
        queue.push(current.get('argument'));
      } else if (current.isUpdateExpression()) {
        queue.push(current.get('argument'));
      } else if (current.isUnaryExpression() && current.node.operator === 'delete') {
        queue.push(current.get('argument'));
      } else if (current.isIdentifier()) {
        results.push(current);
      }
    }
    return results;
  }

  function getFunctionParamIdentifiers(fn: NodePath<t.Function>): Array<NodePath<t.Identifier>> {
    return fn.get('params').flatMap((param) => {
      if (param.isTSParameterProperty()) return getPatternIdentifiers(param.get('parameter'));
      if (param.isPatternLike()) return getPatternIdentifiers(param);
      return [];
    });
  }
};

function containsScope(parent: Scope, child: Scope): boolean {
  let current: Scope | undefined = child;
  while (current != null) {
    if (current === parent) return true;
    current = current.parent;
  }
  return false;
}

function isNonNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

function zip<L, R>(left: Array<L>, right: Array<R>): Array<[L, R]> {
  const length = Math.min(left.length, right.length);
  const results = new Array(length);
  for (let i = 0; i < length; i++) {
    results[i] = [left[i], right[i]];
  }
  return results;
}

function partition<T, V extends T>(
  items: Array<T>,
  predicate: (item: T) => item is V,
): [Array<V>, Array<Exclude<T, V>>];
function partition<T>(items: Array<T>, predicate: (item: T) => boolean): [Array<T>, Array<T>];
function partition<T>(items: Array<T>, predicate: (item: T) => boolean): [Array<T>, Array<T>] {
  const left = new Array<T>();
  const right = new Array<T>();
  for (const item of items) {
    if (predicate(item)) left.push(item);
    else right.push(item);
  }
  return [left, right];
}

function uniqBy<T>(items: Array<T>, key: (item: T) => unknown): Array<T> {
  const seen = new Set();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
