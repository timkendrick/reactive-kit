import {
  hashSeed,
  writeByteHash,
  writeNullHash,
  writeStringHash,
  writeValueHash,
  type Hash,
  type Hashable,
} from '@reactive-kit/hash';
import {
  NODE_FIELDS,
  VISITOR_KEYS,
  type FieldOptions,
  type types as t,
} from '@reactive-kit/babel-types';

type AstNode = t.Node;
type AstNodeType = AstNode['type'];
type AstNodePropertyKey = keyof AstNode;

type AstNodePropertyFieldValue = Hashable;
type AstNodeChildFieldValue = AstNode | Array<AstNode> | null | undefined;

interface AstNodeTraversalKeys {
  properties: Array<AstNodePropertyKey>;
  children: Array<AstNodePropertyKey>;
}

const TRAVERSAL_KEYS: Record<AstNodeType, AstNodeTraversalKeys> = Object.fromEntries(
  (
    Object.entries(NODE_FIELDS) as Array<[AstNodeType, Record<AstNodePropertyKey, FieldOptions>]>
  ).map(([nodeType, fields]): [AstNodeType, AstNodeTraversalKeys] => {
    const visitorKeys =
      (VISITOR_KEYS as Record<AstNodeType, Array<AstNodePropertyKey>>)[nodeType] ?? [];
    return [
      nodeType,
      (Object.keys(fields) as Array<AstNodePropertyKey>).reduce(
        (acc, key) => {
          (visitorKeys.includes(key) ? acc.children : acc.properties).push(key);
          return acc;
        },
        { properties: new Array<AstNodePropertyKey>(), children: new Array<AstNodePropertyKey>() },
      ),
    ];
  }),
) as Record<AstNodeType, AstNodeTraversalKeys>;

export function hashAstNode(node: AstNode): Hash {
  return writeAstNodeHash(hashSeed(), node);
}

export function writeAstNodeHash(state: Hash, value: AstNode): Hash {
  return writeAstNodeFieldsHash(writeAstNodeTypeHash(state, value), value);
}

function writeAstNodeTypeHash(state: Hash, node: AstNode): Hash {
  return writeStringHash(state, node.type);
}

function writeAstNodeFieldsHash(state: Hash, node: AstNode): Hash {
  const nodeKeys = TRAVERSAL_KEYS[node.type];
  if (!nodeKeys) throw new Error(`Unknown node type: ${node.type}`);
  const { properties, children } = nodeKeys;
  return writeAstNodeChildFieldsHash(
    writeAstNodePropertyFieldsHash(state, node, properties),
    node,
    children,
  );
}

function writeAstNodePropertyFieldsHash(
  state: Hash,
  node: AstNode,
  keys: AstNodeTraversalKeys['properties'],
): Hash {
  return keys.reduce(
    (state, key) => writeAstNodePropertyFieldHash(state, node[key] as AstNodePropertyFieldValue),
    state,
  );
}

function writeAstNodeChildFieldsHash(
  state: Hash,
  node: AstNode,
  keys: AstNodeTraversalKeys['children'],
): Hash {
  return keys.reduce(
    (state, key) => writeAstNodeChildFieldHash(state, node[key] as AstNodeChildFieldValue),
    state,
  );
}

function writeAstNodePropertyFieldHash(state: Hash, value: AstNodePropertyFieldValue): Hash {
  return writeValueHash(state, value);
}

function writeAstNodeChildFieldHash(state: Hash, value: AstNodeChildFieldValue): Hash {
  if (value == null) return writeNullHash(writeByteHash(state, 0));
  if (!Array.isArray(value)) return writeAstNodeHash(writeByteHash(state, 1), value);
  return writeAstNodeListHash(writeByteHash(state, 2), value);
}

function writeAstNodeListHash(state: Hash, value: Array<AstNode>): Hash {
  return value.reduce(
    (state, child) => writeAstNodeHash(state, child),
    writeByteHash(state, value.length),
  );
}
