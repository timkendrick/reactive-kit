import { beforeEach, describe, expect, it } from 'vitest';

import { partitionAsyncIterator } from './partitionAsyncIterator';

describe(partitionAsyncIterator, () => {
  describe('given an async iterator that completes successfully', () => {
    let trueIterator: AsyncIterator<number, string, undefined>;
    let falseIterator: AsyncIterator<number, string, undefined>;
    beforeEach(() => {
      const input = (async function* (): AsyncGenerator<number, string, undefined> {
        await Promise.resolve();
        yield 1;
        await Promise.resolve();
        yield 2;
        await Promise.resolve();
        yield 3;
        await Promise.resolve();
        return 'done';
      })();
      const predicate = (value: number) => value % 2 === 0;
      const [trueIterable, falseIterable] = partitionAsyncIterator(input, predicate);
      trueIterator = trueIterable[Symbol.asyncIterator]();
      falseIterator = falseIterable[Symbol.asyncIterator]();
    });

    it('should allow both iterators to be used sequentially', async () => {
      {
        const result = await trueIterator.next();
        expect(result).toEqual({ value: 2, done: false });
      }
      {
        const result = await trueIterator.next();
        expect(result).toEqual({ value: 'done', done: true });
      }
      {
        const result = await trueIterator.next();
        expect(result).toEqual({ value: 'done', done: true });
      }
      {
        const result = await falseIterator.next();
        expect(result).toEqual({ value: 1, done: false });
      }
      {
        const result = await falseIterator.next();
        expect(result).toEqual({ value: 3, done: false });
      }
      {
        const result = await falseIterator.next();
        expect(result).toEqual({ value: 'done', done: true });
      }
      {
        const result = await falseIterator.next();
        expect(result).toEqual({ value: 'done', done: true });
      }
    });

    it('should allow both iterators to be used concurrently', async () => {
      {
        const [trueResult, falseResult] = await Promise.all([
          trueIterator.next(),
          falseIterator.next(),
        ]);
        expect(trueResult).toEqual({ value: 2, done: false });
        expect(falseResult).toEqual({ value: 1, done: false });
      }
      {
        const [trueResult, falseResult] = await Promise.all([
          trueIterator.next(),
          falseIterator.next(),
        ]);
        expect(trueResult).toEqual({ value: 'done', done: true });
        expect(falseResult).toEqual({ value: 3, done: false });
      }
      {
        const [trueResult, falseResult] = await Promise.all([
          trueIterator.next(),
          falseIterator.next(),
        ]);
        expect(trueResult).toEqual({ value: 'done', done: true });
        expect(falseResult).toEqual({ value: 'done', done: true });
      }
    });

    it('should support multiple iterator instances from the same iterable', async () => {
      const [trueIterable, falseIterable] = partitionAsyncIterator(
        (async function* (): AsyncGenerator<number, string, undefined> {
          yield 1;
          yield 2;
          yield 3;
          return 'done';
        })(),
        (value: number) => value % 2 === 0,
      );

      const trueIterator1 = trueIterable[Symbol.asyncIterator]();
      const trueIterator2 = trueIterable[Symbol.asyncIterator]();
      const falseIterator1 = falseIterable[Symbol.asyncIterator]();
      const falseIterator2 = falseIterable[Symbol.asyncIterator]();

      // First iterators consume all values
      expect(await trueIterator1.next()).toEqual({ value: 2, done: false });
      expect(await trueIterator1.next()).toEqual({ value: 'done', done: true });
      expect(await falseIterator1.next()).toEqual({ value: 1, done: false });
      expect(await falseIterator1.next()).toEqual({ value: 3, done: false });
      expect(await falseIterator1.next()).toEqual({ value: 'done', done: true });

      // Second iterators should get done immediately since values were consumed
      expect(await trueIterator2.next()).toEqual({ value: 'done', done: true });
      expect(await falseIterator2.next()).toEqual({ value: 'done', done: true });
    });

    it('should handle early return of one iterator', async () => {
      // Get first value from true iterator
      expect(await trueIterator.next()).toEqual({ value: 2, done: false });

      // Return the true iterator early
      if (trueIterator.return) {
        expect(await trueIterator.return('returned')).toEqual({ value: 'returned', done: true });
      }

      // False iterator should continue working
      expect(await falseIterator.next()).toEqual({ value: 1, done: false });
      expect(await falseIterator.next()).toEqual({ value: 3, done: false });
      expect(await falseIterator.next()).toEqual({ value: 'done', done: true });

      // True iterator should be done
      expect(await trueIterator.next()).toEqual({ value: 'returned', done: true });
    });
  });

  describe('given an async iterator that completes with an error', () => {
    let trueIterator: AsyncIterator<number, string, undefined>;
    let falseIterator: AsyncIterator<number, string, undefined>;
    beforeEach(() => {
      const input = (async function* (): AsyncGenerator<number, string, undefined> {
        await Promise.resolve();
        yield 1;
        await Promise.resolve();
        yield 2;
        await Promise.resolve();
        yield 3;
        await Promise.resolve();
        throw new Error('uh-oh');
      })();
      const predicate = (value: number) => value % 2 === 0;
      const [trueIterable, falseIterable] = partitionAsyncIterator(input, predicate);
      trueIterator = trueIterable[Symbol.asyncIterator]();
      falseIterator = falseIterable[Symbol.asyncIterator]();
    });

    it('should allow both iterators to be used sequentially', async () => {
      {
        const result = await trueIterator.next();
        expect(result).toEqual({ value: 2, done: false });
      }
      {
        await expect(trueIterator.next()).rejects.toThrow('uh-oh');
      }
      {
        await expect(trueIterator.next()).rejects.toThrow('uh-oh');
      }
      {
        const result = await falseIterator.next();
        expect(result).toEqual({ value: 1, done: false });
      }
      {
        const result = await falseIterator.next();
        expect(result).toEqual({ value: 3, done: false });
      }
      {
        await expect(falseIterator.next()).rejects.toThrow('uh-oh');
      }
      {
        await expect(falseIterator.next()).rejects.toThrow('uh-oh');
      }
    });

    it('should handle concurrent error propagation', async () => {
      // Get initial values
      expect(await trueIterator.next()).toEqual({ value: 2, done: false });
      expect(await falseIterator.next()).toEqual({ value: 1, done: false });
      expect(await falseIterator.next()).toEqual({ value: 3, done: false });

      // Both iterators waiting for next value should get error
      await expect(Promise.all([trueIterator.next(), falseIterator.next()])).rejects.toThrow(
        'uh-oh',
      );
    });

    it('should handle throw method', async () => {
      // Get initial values
      expect(await trueIterator.next()).toEqual({ value: 2, done: false });
      expect(await falseIterator.next()).toEqual({ value: 1, done: false });

      // Throw via iterator
      if (trueIterator.throw) {
        const customError = new Error('custom error');
        await expect(trueIterator.throw(customError)).rejects.toThrow('custom error');
        // False iterator should also get the error
        await expect(falseIterator.next()).rejects.toThrow('custom error');
      }
    });

    it('should handle uneven queue draining after error', async () => {
      // Queue up values in true iterator by consuming false iterator first
      expect(await falseIterator.next()).toEqual({ value: 1, done: false });
      expect(await falseIterator.next()).toEqual({ value: 3, done: false });
      await expect(falseIterator.next()).rejects.toThrow('uh-oh');

      // True iterator should still get its queued value before error
      expect(await trueIterator.next()).toEqual({ value: 2, done: false });
      await expect(trueIterator.next()).rejects.toThrow('uh-oh');
    });
  });
});
