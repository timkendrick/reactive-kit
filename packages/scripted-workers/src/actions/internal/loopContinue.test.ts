import { describe, expect, it } from 'vitest';

import { compile } from '../../vm/compile';
import { OP_TYPE_LOOP_CONTINUE, OP_TYPE_LOOP_ENTER } from '../../vm/operations';
import { whileLoop } from '../whileLoop';

import { loopContinue } from './loopContinue';

describe(loopContinue, () => {
  describe(compile, () => {
    it('should throw an error when used within the root scope', () => {
      expect(() => compile(loopContinue(0))).toThrowError(
        'Invalid loopContinue() call: no active loops.',
      );

      expect(() => compile(loopContinue(1))).toThrowError(
        'Invalid loopContinue() call: no active loops.',
      );
    });

    it('should throw an error when attempting to break out of a non-existent loop', () => {
      expect(() => compile(whileLoop<unknown>((_controls) => loopContinue(1)))).toThrowError(
        'Invalid loopContinue() call: target loop index 1 is inaccessible from loop index 0.',
      );

      expect(() => compile(whileLoop<unknown>((_controls) => loopContinue(2)))).toThrowError(
        'Invalid loopContinue() call: target loop index 2 is inaccessible from loop index 0.',
      );
    });

    it('should allow continuing a loop', () => {
      const command = whileLoop<unknown>((_controls) => loopContinue(0));
      const compiled = compile(command);
      expect(compiled).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 2 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
      ]);
    });

    it('should allow continuing a parent loop', () => {
      const command = whileLoop<unknown>((_controls) => {
        return whileLoop<unknown>((_controls) => loopContinue(0));
      });
      const compiled = compile(command);
      expect(compiled).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 4 },
        { type: OP_TYPE_LOOP_ENTER, length: 2 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 1 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
      ]);
    });
  });
});
