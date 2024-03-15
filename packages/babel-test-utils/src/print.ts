import generate from '@babel/generator';
import type { Node } from '@babel/types';

export function printAst(node: Node): string {
  return generate(node).code;
}
