/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, expect, it } from 'vitest';

import { ExtendedJsonSerializer } from './ExtendedJsonSerializer';

describe('ExtendedJsonSerializer', () => {
  // Helper function to create a basic serializer for testing
  const createBasicSerializer = () => {
    const functionIds = new Map<Function, bigint>();
    let nextFunctionId = 0n;

    return new ExtendedJsonSerializer({
      getFunctionId: (fn: Function) => {
        if (!functionIds.has(fn)) {
          functionIds.set(fn, nextFunctionId++);
        }
        return functionIds.get(fn)!;
      },
      getSymbolId: (sym: symbol) => {
        const key = Symbol.keyFor(sym);
        return key ? BigInt(key.length) : -1n;
      },
      fallback: (value: object) => (value as { toJSON?: () => unknown }).toJSON?.() ?? null,
    });
  };

  describe('extended type serialization', () => {
    it('should serialize bigint values correctly', () => {
      const serializer = createBasicSerializer();

      expect(serializer.serialize(123n)).toBe('123e-00');
      expect(serializer.serialize(0n)).toBe('0e-00');
      expect(serializer.serialize(-456n)).toBe('-456e-00');
    });

    it('should serialize Date objects correctly', () => {
      const serializer = createBasicSerializer();
      const date = new Date('2024-01-01T12:00:00.000Z');

      const result = serializer.serialize(date);
      expect(result).toBe('{"__type":"Date","value":"2024-01-01T12:00:00.000Z"}');
    });

    it('should serialize Map objects correctly', () => {
      const serializer = createBasicSerializer();
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      const result = serializer.serialize(map);
      expect(result).toBe('{"__type":"Map","value":[["key1","value1"],["key2","value2"]]}');
    });

    it('should serialize Set objects correctly', () => {
      const serializer = createBasicSerializer();
      const set = new Set(['value1', 'value2', 'value3']);

      const result = serializer.serialize(set);
      expect(result).toBe('{"__type":"Set","value":["value1","value2","value3"]}');
    });

    it('should serialize ArrayBuffer objects correctly', () => {
      const serializer = createBasicSerializer();
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);
      view[0] = 72; // 'H'
      view[1] = 101; // 'e'
      view[2] = 108; // 'l'
      view[3] = 108; // 'l'

      const result = serializer.serialize(buffer);
      expect(result).toBe('{"__type":"ArrayBuffer","value":"SGVsbA=="}');
    });

    it('should serialize function objects correctly', () => {
      const serializer = createBasicSerializer();
      const fn = () => 'test';

      const result = serializer.serialize(fn);
      expect(result).toBe('{"__type":"function","value":0e-00}');
    });

    it('should serialize symbol objects correctly', () => {
      const serializer = createBasicSerializer();
      const sym = Symbol.for('test');

      const result = serializer.serialize(sym);
      expect(result).toBe('{"__type":"symbol","value":4e-00}');
    });

    it('should serialize unregistered symbols correctly', () => {
      const serializer = createBasicSerializer();
      const sym = Symbol('unregistered');

      const result = serializer.serialize(sym);
      expect(result).toBe('{"__type":"symbol","value":-1e-00}');
    });
  });

  describe('function ID generation', () => {
    it('should generate consistent IDs for the same function', () => {
      const serializer = createBasicSerializer();
      const fn = () => 'test';

      const result1 = serializer.serialize(fn);
      const result2 = serializer.serialize(fn);

      expect(result1).toBe(result2);
      expect(result1).toBe('{"__type":"function","value":0e-00}');
    });

    it('should generate different IDs for different functions', () => {
      const serializer = createBasicSerializer();
      const fn1 = () => 'test1';
      const fn2 = () => 'test2';

      const result1 = serializer.serialize(fn1);
      const result2 = serializer.serialize(fn2);

      expect(result1).toBe('{"__type":"function","value":0e-00}');
      expect(result2).toBe('{"__type":"function","value":1e-00}');
    });

    it('should handle errors from getFunctionId callback', () => {
      const serializer = new ExtendedJsonSerializer({
        getFunctionId: () => {
          throw new Error('Function ID error');
        },
        getSymbolId: () => 0n,
        fallback: () => null,
      });

      const fn = () => 'test';
      expect(() => serializer.serialize(fn)).toThrow('Function ID error');
    });
  });

  describe('symbol ID generation', () => {
    it('should handle errors from getSymbolId callback', () => {
      const serializer = new ExtendedJsonSerializer({
        getFunctionId: () => 0n,
        getSymbolId: () => {
          throw new Error('Symbol ID error');
        },
        fallback: () => null,
      });

      const sym = Symbol('test');
      expect(() => serializer.serialize(sym)).toThrow('Symbol ID error');
    });
  });

  describe('nested and recursive serialization', () => {
    it('should handle nested objects with mixed types', () => {
      const serializer = createBasicSerializer();
      const fn = () => 'test';

      const complexObj = {
        bigintValue: 123n,
        dateValue: new Date('2024-01-01T00:00:00.000Z'),
        mapValue: new Map([['key', 'value']]),
        setValue: new Set(['item1', 'item2']),
        functionValue: fn,
        symbolValue: Symbol.for('test'),
        nestedObject: {
          innerBigint: 456n,
          innerArray: [1, 2, 3],
        },
      };

      const result = serializer.serialize(complexObj);

      const expectedFields = [
        '"bigintValue":123e-00',
        '"dateValue":{"__type":"Date","value":"2024-01-01T00:00:00.000Z"}',
        '"mapValue":{"__type":"Map","value":[["key","value"]]}',
        '"setValue":{"__type":"Set","value":["item1","item2"]}',
        '"functionValue":{"__type":"function","value":0e-00}',
        '"symbolValue":{"__type":"symbol","value":4e-00}',
        '"nestedObject":{"innerBigint":456e-00,"innerArray":[1,2,3]}',
      ];
      const expected = `{${expectedFields.join(',')}}`;

      expect(result).toBe(expected);
    });

    it('should handle Map with complex keys and values', () => {
      const serializer = createBasicSerializer();
      const map = new Map<Date | bigint, Set<string> | { nested: string }>([
        [new Date('2024-01-01'), new Set(['value1', 'value2'])],
        [123n, { nested: 'object' }],
      ]);

      const result = serializer.serialize(map);

      const expected =
        '{"__type":"Map","value":[[{"__type":"Date","value":"2024-01-01T00:00:00.000Z"},{"__type":"Set","value":["value1","value2"]}],[123e-00,{"nested":"object"}]]}';

      expect(result).toBe(expected);
    });

    it('should handle Set with complex values', () => {
      const serializer = createBasicSerializer();
      const set = new Set([
        123n,
        new Date('2024-01-01'),
        new Map([['key', 'value']]),
        { nested: 'object' },
      ]);

      const result = serializer.serialize(set);

      const expectedFields = [
        '"__type":"Set"',
        '"value":[123e-00,{"__type":"Date","value":"2024-01-01T00:00:00.000Z"},{"__type":"Map","value":[["key","value"]]},{"nested":"object"}]',
      ];
      const expected = `{${expectedFields.join(',')}}`;

      expect(result).toBe(expected);
    });
  });

  describe('cycle handling', () => {
    it('should handle cycles with onCycle callback', () => {
      const serializer = new ExtendedJsonSerializer({
        getFunctionId: () => 0n,
        getSymbolId: () => 0n,
        fallback: () => null,
        onCycle: (cycleRoot) => {
          return JSON.rawJSON(`"[Circular: ${cycleRoot.constructor.name}]"`);
        },
      });

      const obj: Record<string, unknown> = { name: 'test', bigintValue: 123n };
      obj.self = obj;

      const result = serializer.serialize(obj);
      expect(result).toBe('{"name":"test","bigintValue":123e-00,"self":"[Circular: Object]"}');
    });

    it('should handle cycles with extended types', () => {
      const serializer = new ExtendedJsonSerializer({
        getFunctionId: () => 0n,
        getSymbolId: () => 0n,
        fallback: () => null,
        onCycle: () => JSON.rawJSON('"<circular>"'),
      });

      const map = new Map<string, unknown>();
      map.set('key1', 'value1');
      map.set('key2', map); // Create cycle

      const result = serializer.serialize(map);
      expect(result).toBe('{"__type":"Map","value":[["key1","value1"],["key2","<circular>"]]}');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty Map', () => {
      const serializer = createBasicSerializer();
      const emptyMap = new Map();

      const result = serializer.serialize(emptyMap);
      expect(result).toBe('{"__type":"Map","value":[]}');
    });

    it('should handle empty Set', () => {
      const serializer = createBasicSerializer();
      const emptySet = new Set();

      const result = serializer.serialize(emptySet);
      expect(result).toBe('{"__type":"Set","value":[]}');
    });

    it('should handle empty ArrayBuffer', () => {
      const serializer = createBasicSerializer();
      const emptyBuffer = new ArrayBuffer(0);

      const result = serializer.serialize(emptyBuffer);
      expect(result).toBe('{"__type":"ArrayBuffer","value":""}');
    });

    it('should handle unsupported types by returning null', () => {
      const serializer = createBasicSerializer();
      const regex = /test/;

      const result = serializer.serialize(regex);
      expect(result).toBe('null');
    });

    it('should handle native JSON types normally', () => {
      const serializer = createBasicSerializer();

      expect(serializer.serialize('string')).toBe('"string"');
      expect(serializer.serialize(42)).toBe('42');
      expect(serializer.serialize(true)).toBe('true');
      expect(serializer.serialize(null)).toBe('null');
      expect(serializer.serialize([1, 2, 3])).toBe('[1,2,3]');
      expect(serializer.serialize({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
    });

    it('should handle arrays with mixed types', () => {
      const serializer = createBasicSerializer();
      const fn = () => 'test';

      const mixedArray = [1, 'string', 123n, new Date('2024-01-01'), fn, Symbol.for('test')];

      const result = serializer.serialize(mixedArray);

      // Test that the JSON string contains the expected array serialization
      expect(result).toBe(
        '[1,"string",123e-00,{"__type":"Date","value":"2024-01-01T00:00:00.000Z"},{"__type":"function","value":0e-00},{"__type":"symbol","value":4e-00}]',
      );
    });

    it('should handle Date edge cases', () => {
      const serializer = createBasicSerializer();

      // Invalid date - toISOString() throws, so it should be handled as null
      const invalidDate = new Date('invalid');
      const result = serializer.serialize(invalidDate);
      expect(result).toBe('null');

      // Edge dates
      const epochDate = new Date(0);
      const epochResult = serializer.serialize(epochDate);
      expect(epochResult).toBe('{"__type":"Date","value":"1970-01-01T00:00:00.000Z"}');
    });
  });

  describe('examples', () => {
    it('should allow serializing objects with mixed field types', () => {
      const functionIds = new Map<Function, bigint>();
      let nextFunctionId = 0n;

      const serializer = new ExtendedJsonSerializer({
        getFunctionId: (fn: Function) => {
          if (!functionIds.has(fn)) {
            functionIds.set(fn, nextFunctionId++);
          }
          return functionIds.get(fn)!;
        },
        getSymbolId: (sym: symbol) => {
          const key = Symbol.keyFor(sym);
          return key ? BigInt(key.length) : -1n;
        },
        fallback: () => null,
      });

      const myCallback = () => {};

      const data = {
        id: 12345n,
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
        metadata: new Map([['key', 'value']]),
        tags: new Set(['a', 'b']),
        action: myCallback,
        anotherAction: myCallback, // Same function, should have same ID
      };

      const result = serializer.serialize(data);

      const expectedFields = [
        '"id":12345e-00',
        '"createdAt":{"__type":"Date","value":"2024-01-01T12:00:00.000Z"}',
        '"metadata":{"__type":"Map","value":[["key","value"]]}',
        '"tags":{"__type":"Set","value":["a","b"]}',
        '"action":{"__type":"function","value":0e-00}',
        '"anotherAction":{"__type":"function","value":0e-00}',
      ];
      const expected = `{${expectedFields.join(',')}}`;

      expect(result).toBe(expected);
    });
  });
});
