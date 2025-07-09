import type { types as t } from '@reactive-kit/babel-test-utils';
import {
  type BabelPlugin,
  type NodePath,
  type PluginObj,
  type PluginPass,
  type Scope,
} from '@reactive-kit/babel-types';

/**
 * Hoist all async functions to top-level functions, with free variables passed as arguments
 */
export const hoistAsyncFunctions: BabelPlugin = (babel): PluginObj<PluginPass> => {
  const { types: t } = babel;
  return {
    name: 'hoist-async-functions',
    visitor: {
      Function(path) {
        // Skip non-async functions
        if (!path.node.async) return;
        // Skip top-level functions
        if (path.parentPath.isProgram()) return;
        // Skip method definitions
        // TODO: Support transforming async class/object methods
        if (
          !path.isFunctionDeclaration() &&
          !path.isFunctionExpression() &&
          !path.isArrowFunctionExpression()
        ) {
          return;
        }
        const { node } = path;
        // Get a reference to the top-level node
        const program = path.findParent((parent) =>
          parent.isProgram(),
        ) as NodePath<t.Program> | null;
        if (!program) return;

        // Generate a unique name for the hoisted function
        const functionName = t.isArrowFunctionExpression(node) ? null : node.id;
        const hoistedScope = program.scope;
        const hoistedFunctionName = functionName
          ? hoistedScope.generateUidIdentifierBasedOnNode(functionName)
          : hoistedScope.generateUidIdentifier();

        // Find all free variables within the function body
        const functionBodyScope = getFunctionBodyScope(path);
        const freeVariableNames = new Set<string>();
        path.traverse({
          ReferencedIdentifier(identifier) {
            // Determine if this identifier is a reference to a variable in an outer scope
            const variableName = identifier.node.name;
            const binding = identifier.scope.getBinding(variableName);
            const isFreeVariable =
              !binding || !containsChildScope(functionBodyScope, binding.scope);
            if (isFreeVariable) freeVariableNames.add(variableName);
          },
        });
        const freeVariableIdentifiers = Array.from(freeVariableNames).map((name) =>
          t.identifier(name),
        );

        // Replace the original function path with a wrapper function that invokes the hoisted function,
        // passing any free variables as preceding arguments and providing placeholder identifiers
        // for any unnamed pattern parameters
        const renamedParams = node.params.map((param) =>
          generateNamedParam(param, functionBodyScope),
        );
        const functionWrapper = t.functionDeclaration(
          functionName,
          renamedParams.map(([param]) => param),
          t.blockStatement([
            t.returnStatement(
              t.callExpression(hoistedFunctionName, [
                ...freeVariableIdentifiers,
                ...renamedParams.map(([, arg]) => arg),
              ]),
            ),
          ]),
        );
        path.replaceWith(functionWrapper);

        // Inject the renamed function into the top-level scope, prepending the free variables to the existing function parameters
        node.params.unshift(...freeVariableIdentifiers);
        if (t.isFunctionDeclaration(node)) node.id = hoistedFunctionName;
        program.node.body.unshift(
          t.isFunctionDeclaration(node)
            ? node
            : createVariableDeclarationStatement(hoistedFunctionName, node),
        );
        // Ensure the new function is processed by subsequent visitors
        const newlyInsertedNode = program.get('body')[0];
        newlyInsertedNode.visit();
      },
    },
  };

  type Param = t.FunctionDeclaration['params'][number];
  type Arg = t.CallExpression['arguments'][number];

  /**
   * For a given function function parameter, generate a corresponding argument that can be passed to that function
   */
  function generateNamedParam(param: Param, scope: Scope): [Param, Arg] {
    // If this is a named argument, attempt to extract a named argument from the parameter
    const namedArg = extractNamedArgFromParam(param);
    if (namedArg) return [param, namedArg];
    // Otherwise if this is a pattern-based argument, generate a new identifier to use as the argument
    const argIdentifier = scope.generateUidIdentifierBasedOnNode(param);
    return [argIdentifier, argIdentifier];
  }

  function extractNamedArgFromParam(param: Param): t.Identifier | t.SpreadElement | null {
    switch (param.type) {
      case 'Identifier':
        return param;
      case 'RestElement': {
        let argument: Exclude<t.LVal, t.TSParameterProperty> = param.argument;
        while (true) {
          switch (argument.type) {
            case 'Identifier':
              return t.spreadElement(argument);
            case 'ArrayPattern':
            case 'AssignmentPattern':
            case 'MemberExpression':
            case 'ObjectPattern':
            case 'RestElement':
              return null;
            case 'TSAsExpression':
            case 'TSNonNullExpression':
            case 'TSSatisfiesExpression':
            case 'TSTypeAssertion':
              if (!t.isLVal(argument.expression)) return null;
              argument = argument.expression;
              continue;
          }
        }
      }
      default:
        return null;
    }
  }

  function createVariableDeclarationStatement(
    identifier: t.Identifier,
    value: t.Expression,
  ): t.Statement {
    return t.variableDeclaration('const', [t.variableDeclarator(identifier, value)]);
  }

  function getFunctionBodyScope(path: NodePath<t.Function>): Scope {
    return path.get('body').scope;
  }

  function containsChildScope(parentScope: Scope, childScope: Scope): boolean {
    let currentScope = childScope;
    while (currentScope) {
      if (currentScope === parentScope) return true;
      currentScope = currentScope.parent;
    }
    return false;
  }
};
