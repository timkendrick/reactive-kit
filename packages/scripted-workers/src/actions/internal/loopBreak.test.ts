import { describe, expect, it } from 'vitest';

import { compile } from '../../vm/compile';
import { OP_TYPE_LOOP_CONTINUE, OP_TYPE_LOOP_ENTER, OP_TYPE_LOOP_EXIT } from '../../vm/operations';
import { whileLoop } from '../whileLoop';

import { loopBreak } from './loopBreak';

describe(loopBreak, () => {
  describe(compile, () => {
    it('should throw an error when used within the root scope', () => {
      expect(() => compile(loopBreak(0))).toThrowError(
        'Invalid loopBreak() call: no active loops.',
      );

      expect(() => compile(loopBreak(1))).toThrowError(
        'Invalid loopBreak() call: no active loops.',
      );
    });

    it('should throw an error when attempting to break out of a non-existent loop', () => {
      expect(() => compile(whileLoop<unknown>((_controls) => loopBreak(1)))).toThrowError(
        'Invalid loopBreak() call: target loop index 1 is inaccessible from loop index 0.',
      );

      expect(() => compile(whileLoop<unknown>((_controls) => loopBreak(2)))).toThrowError(
        'Invalid loopBreak() call: target loop index 2 is inaccessible from loop index 0.',
      );
    });

    it('should allow breaking out of a loop', () => {
      const command = whileLoop<unknown>((_controls) => loopBreak(0));
      const compiled = compile(command);
      expect(compiled).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 2 },
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 0 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
      ]);
    });

    it('should allow breaking out of a parent loop', () => {
      const command = whileLoop<unknown>((_controls) => {
        return whileLoop<unknown>((_controls) => loopBreak(0));
      });
      const compiled = compile(command);
      expect(compiled).toEqual([
        { type: OP_TYPE_LOOP_ENTER, length: 4 },
        { type: OP_TYPE_LOOP_ENTER, length: 2 },
        { type: OP_TYPE_LOOP_EXIT, loopIndex: 1 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
        { type: OP_TYPE_LOOP_CONTINUE, loopIndex: 0 },
      ]);
    });
  });
});
