import { describe, expect, it } from 'vitest';

import { compile } from '../../vm/compile';
import { OP_TYPE_BLOCK_BREAK } from '../../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_ENTER } from '../../vm/operations/blockEnter';
import { sequence } from '../sequence';

import { done } from './done';

describe(done, () => {
  describe(compile, () => {
    it('should throw an error when used within the root scope', () => {
      expect(() => compile(done(0))).toThrowError(
        'Invalid done() call: cannot break out of the root scope',
      );

      expect(() => compile(done(1))).toThrowError(
        'Invalid done() call: cannot break out of the root scope',
      );
    });

    it('should throw an error when attempting to break out of a non-existent parent block', () => {
      // Attempting to break block 1 when only block 0 (the sequence itself) exists.
      expect(() => compile(sequence<unknown>(() => [done(1)]))).toThrowError(
        'Invalid done() call: target block index 1 is inaccessible from block index 0.',
      );

      // Attempting to break block 2 from within a single sequence.
      expect(() => compile(sequence<unknown>(() => [done(2)]))).toThrowError(
        'Invalid done() call: target block index 2 is inaccessible from block index 0.',
      );
    });

    it('should compile done(0) within a sequence to a BLOCK_BREAK instruction with blockIndex 0', () => {
      const blockIndex = 0;
      const command = sequence<unknown>(() => [done(blockIndex)]);
      const instructions = compile(command);

      expect(instructions).toEqual([
        { type: OP_TYPE_BLOCK_ENTER, length: 2 }, // sequence block
        { type: OP_TYPE_BLOCK_BREAK, blockIndex }, // done(0)
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Implicit break for the sequence block
      ]);
    });

    it('should compile done(0) within a nested sequence to a BLOCK_BREAK instruction with blockIndex 1', () => {
      const blockIndex = 0; // Targets the outer sequence
      const command = sequence<unknown>(() => [sequence<unknown>(() => [done(blockIndex)])]);
      const instructions = compile(command);

      expect(instructions).toEqual([
        { type: OP_TYPE_BLOCK_ENTER, length: 4 }, // Outer sequence
        { type: OP_TYPE_BLOCK_ENTER, length: 2 }, // Inner sequence
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 1 }, // done(0) targeting outer sequence
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Implicit break for inner sequence
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Implicit break for outer sequence
      ]);
    });

    it('should compile done with a higher blockIndex within deeply nested sequences', () => {
      const targetBlockIndex = 0; // Targets the outermost sequence
      const command = sequence<unknown>(() => [
        sequence<unknown>(() => [sequence<unknown>(() => [done(targetBlockIndex)])]),
      ]);
      const instructions = compile(command);

      expect(instructions).toEqual([
        { type: OP_TYPE_BLOCK_ENTER, length: 6 }, // Outermost sequence (block 2 relative to done)
        { type: OP_TYPE_BLOCK_ENTER, length: 4 }, // Middle sequence (block 1 relative to done)
        { type: OP_TYPE_BLOCK_ENTER, length: 2 }, // Innermost sequence (block 0 relative to done)
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 2 }, // done(0) targeting outermost sequence
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Implicit break for innermost sequence
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Implicit break for middle sequence
        { type: OP_TYPE_BLOCK_BREAK, blockIndex: 0 }, // Implicit break for outermost sequence
      ]);
    });
  });
});
