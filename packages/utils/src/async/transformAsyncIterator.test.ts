import { describe, expect, it } from 'vitest';

import { transformAsyncIterator } from './transformAsyncIterator';

describe(transformAsyncIterator, () => {
  it('should transform the input iterator', async () => {
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
    const output = transformAsyncIterator(input, (value) => value * 2);
    {
      const result = await output.next();
      expect(result).toEqual({ value: 2, done: false });
    }
    {
      const result = await output.next();
      expect(result).toEqual({ value: 4, done: false });
    }
    {
      const result = await output.next();
      expect(result).toEqual({ value: 6, done: false });
    }
    {
      const result = await output.next();
      expect(result).toEqual({ value: 'done', done: true });
    }
    {
      const result = await output.next();
      expect(result).toMatchObject({ done: true });
    }
  });

  it('should handle transform function errors', async () => {
    const input = (async function* () {
      yield 1;
      yield 2;
    })();
    const output = transformAsyncIterator(input, (value) => {
      if (value === 2) {
        throw new Error('Transform error');
      }
      return value * 2;
    });

    const result1 = await output.next();
    expect(result1).toEqual({ value: 2, done: false });

    await expect(output.next()).rejects.toThrow('Transform error');
  });

  it('should handle early termination via return()', async () => {
    const input = (async function* () {
      yield 1;
      yield 2;
      yield 3;
      return 'natural-end';
    })();
    const output = transformAsyncIterator(input, (value) => value * 2);

    const result1 = await output.next();
    expect(result1).toEqual({ value: 2, done: false });

    const returnResult = await output.return!('early-return');
    expect(returnResult).toEqual({ value: 'early-return', done: true });

    // Subsequent calls should return done: true
    const result2 = await output.next();
    expect(result2).toMatchObject({ done: true });
  });

  it('should handle error injection via throw()', async () => {
    const input = (async function* () {
      try {
        yield 1;
        yield 2;
        yield 3;
      } catch (_error) {
        yield 999; // Error recovery
        return 'recovered';
      }
    })();
    const output = transformAsyncIterator(input, (value) => value * 2);

    const result1 = await output.next();
    expect(result1).toEqual({ value: 2, done: false });

    const throwResult = await output.throw!(new Error('Injected error'));
    expect(throwResult).toEqual({ value: 1998, done: false }); // 999 * 2

    const finalResult = await output.next();
    expect(finalResult).toEqual({ value: 'recovered', done: true });
  });

  it('should handle iterators without return method', async () => {
    const basicIterator: AsyncIterator<number, string, undefined> = {
      async next() {
        return { value: 42, done: false };
      },
    };
    const output = transformAsyncIterator(basicIterator, (value) => value * 2);

    const returnResult = await output.return!('forced-return');
    expect(returnResult).toEqual({ value: 'forced-return', done: true });
  });

  it('should handle iterators without throw method', async () => {
    const basicIterator: AsyncIterator<number, string, undefined> = {
      async next() {
        return { value: 42, done: false };
      },
    };
    const output = transformAsyncIterator(basicIterator, (value) => value * 2);

    await expect(output.throw!(new Error('Test error'))).rejects.toThrow('Test error');
  });

  it('should handle empty iterator', async () => {
    // eslint-disable-next-line require-yield
    const input = (async function* (): AsyncGenerator<number, string, undefined> {
      return 'empty-result';
    })();
    const output = transformAsyncIterator(input, (value) => value * 2);

    const result = await output.next();
    expect(result).toEqual({ value: 'empty-result', done: true });
  });

  it('should handle iterator that throws during iteration', async () => {
    const input = (async function* () {
      yield 1;
      throw new Error('Iterator error');
    })();
    const output = transformAsyncIterator(input, (value) => value * 2);

    const result1 = await output.next();
    expect(result1).toEqual({ value: 2, done: false });

    await expect(output.next()).rejects.toThrow('Iterator error');
  });

  it('should handle type transformations', async () => {
    const input = (async function* (): AsyncGenerator<number, boolean, undefined> {
      yield 1;
      yield 2;
      yield 0;
      return true;
    })();
    const output = transformAsyncIterator(input, (value: number): string =>
      value > 0 ? 'positive' : 'zero',
    );

    const result1 = await output.next();
    expect(result1).toEqual({ value: 'positive', done: false });

    const result2 = await output.next();
    expect(result2).toEqual({ value: 'positive', done: false });

    const result3 = await output.next();
    expect(result3).toEqual({ value: 'zero', done: false });

    const finalResult = await output.next();
    expect(finalResult).toEqual({ value: true, done: true });
  });

  it('should pass arguments to next() method', async () => {
    const input = (async function* (): AsyncGenerator<string, void, number> {
      const arg1 = yield 'first';
      const arg2 = yield `received: ${arg1}`;
      yield `received: ${arg2}`;
    })();
    const output = transformAsyncIterator(input, (value: string) => value.toUpperCase());

    const result1 = await output.next();
    expect(result1).toEqual({ value: 'FIRST', done: false });

    const result2 = await output.next(42);
    expect(result2).toEqual({ value: 'RECEIVED: 42', done: false });

    const result3 = await output.next(100);
    expect(result3).toEqual({ value: 'RECEIVED: 100', done: false });

    const finalResult = await output.next();
    expect(finalResult).toEqual({ value: undefined, done: true });
  });
});
