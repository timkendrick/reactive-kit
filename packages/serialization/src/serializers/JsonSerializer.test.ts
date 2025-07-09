import { describe, expect, it } from 'vitest';

import { JsonSerializer } from './JsonSerializer';

describe('JsonSerializer', () => {
  describe('native JSON type serialization', () => {
    it('should serialize strings correctly', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize('hello')).toBe('"hello"');
    });

    it('should serialize numbers correctly', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize(42)).toBe('42');
      expect(serializer.serialize(3.14)).toBe('3.14');
    });

    it('should serialize booleans correctly', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize(true)).toBe('true');
      expect(serializer.serialize(false)).toBe('false');
    });

    it('should serialize null correctly', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize(null)).toBe('null');
    });

    it('should serialize arrays correctly', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize([1, 2, 3])).toBe('[1,2,3]');
    });

    it('should serialize objects correctly', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
    });

    it('should handle undefined in objects (omit property)', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize({ a: 1, b: undefined, c: 2 })).toBe('{"a":1,"c":2}');
    });

    it('should handle undefined in arrays (convert to null)', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      expect(serializer.serialize([1, undefined, 3])).toBe('[1,null,3]');
    });
  });

  describe('fallback handling', () => {
    it('should call fallback for functions', () => {
      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (typeof value === 'function') {
            return JSON.rawJSON('"<function>"');
          }
          return JSON.rawJSON('"<unknown>"');
        },
      });

      const fn = () => {};
      expect(serializer.serialize(fn)).toBe('"<function>"');
    });

    it('should call fallback for symbols', () => {
      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (typeof value === 'symbol') {
            return JSON.rawJSON('"<symbol>"');
          }
          return JSON.rawJSON('"<unknown>"');
        },
      });

      const sym = Symbol('test');
      expect(serializer.serialize(sym)).toBe('"<symbol>"');
    });

    it('should call fallback for bigints', () => {
      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (typeof value === 'bigint') {
            return JSON.rawJSON(value.toString());
          }
          return JSON.rawJSON('"<unknown>"');
        },
      });

      expect(serializer.serialize(123n)).toBe('123');
    });

    it('should call fallback for dates', () => {
      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (value instanceof Date) {
            return JSON.rawJSON(`"DATE: ${value.toISOString()}"`);
          }
          return JSON.rawJSON('"<unknown>"');
        },
      });

      expect(serializer.serialize(new Date('2000-01-01Z'))).toBe(
        '"DATE: 2000-01-01T00:00:00.000Z"',
      );
    });

    it('should call fallback for custom objects', () => {
      class CustomClass {
        constructor(public value: string) {}
      }

      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (typeof value === 'function') return JSON.rawJSON('"<function>"');
          return JSON.rawJSON('"<unknown>"');
        },
      });

      const instance = new CustomClass('test');
      expect(serializer.serialize(instance)).toBe('"<unknown>"');
    });

    it('should handle fallback returning RawJSON tokens', () => {
      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (typeof value === 'bigint') {
            return JSON.rawJSON(`${value.toString()}e-00`);
          }
          return JSON.rawJSON('null');
        },
      });

      expect(serializer.serialize(123n)).toBe('123e-00');
    });

    it('should handle complex objects with fallback values', () => {
      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (typeof value === 'function') return JSON.rawJSON('"<fn>"');
          if (typeof value === 'symbol') return JSON.rawJSON('"<sym>"');
          return JSON.rawJSON('"<unknown>"');
        },
      });

      const obj = {
        a: 1,
        b: () => {},
        c: Symbol('test'),
        d: [1, Symbol('nested'), 3],
      };

      expect(serializer.serialize(obj)).toBe('{"a":1,"b":"<fn>","c":"<sym>","d":[1,"<sym>",3]}');
    });
  });

  describe('cycle handling without onCycle', () => {
    it('should throw TypeError for simple cycles', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      const a = { name: 'a' };
      const b = { name: 'b', a };
      Object.assign(a, { b });

      expect(() => serializer.serialize(a)).toThrow(TypeError);
    });

    it('should throw TypeError for self-referencing objects', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      const obj = { name: 'self' };
      Object.assign(obj, { self: obj });

      expect(() => serializer.serialize(obj)).toThrow(TypeError);
    });
  });

  describe('cycle handling with onCycle', () => {
    it('should handle simple cycles with onCycle', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
        onCycle: (cycleRoot) => {
          return JSON.rawJSON(`"[Circular: ${cycleRoot.constructor.name}]"`);
        },
      });

      const a = { name: 'a' };
      const b = { name: 'b', a };
      Object.assign(a, { b });

      const result = serializer.serialize(a);
      expect(result).toBe('{"name":"a","b":{"name":"b","a":"[Circular: Object]"}}');
    });

    it('should handle self-referencing objects with onCycle', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
        onCycle: () => JSON.rawJSON('"<circular>"'),
      });

      const obj = { name: 'self' };
      Object.assign(obj, { self: obj });

      const result = serializer.serialize(obj);
      expect(result).toBe('{"name":"self","self":"<circular>"}');
    });

    it('should re-throw TypeError when onCycle returns null', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
        onCycle: () => null,
      });

      const obj = { name: 'self' };
      Object.assign(obj, { self: obj });

      expect(() => serializer.serialize(obj)).toThrow(TypeError);
    });

    it('should handle complex multi-level cycles', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
        onCycle: (cycleRoot) => {
          return JSON.rawJSON(`"[Circular: ${(cycleRoot as { name?: string }).name || 'Object'}]"`);
        },
      });

      const a = { name: 'a' };
      const b = { name: 'b' };
      const c = { name: 'c' };

      Object.assign(a, { b });
      Object.assign(b, { c });
      Object.assign(c, { a }); // Creates a cycle: a -> b -> c -> a

      const result = serializer.serialize(a);
      expect(result).toContain('[Circular: a]');
    });

    it('should handle cycles with arrays', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
        onCycle: () => JSON.rawJSON('"<circular>"'),
      });

      type NumberTree = Array<number | NumberTree>;

      const arr: NumberTree = [1, 2];
      arr.push(arr);

      const result = serializer.serialize(arr);
      expect(result).toBe('[1,2,"<circular>"]');
    });
  });

  describe('error handling', () => {
    it('should propagate errors from fallback function', () => {
      const serializer = new JsonSerializer({
        fallback: () => {
          throw new Error('Fallback error');
        },
      });

      expect(() => serializer.serialize(Symbol('test'))).toThrow('Fallback error');
    });

    it('should propagate errors from onCycle function', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
        onCycle: () => {
          throw new Error('OnCycle error');
        },
      });

      const obj = { name: 'self' };
      Object.assign(obj, { self: obj });

      expect(() => serializer.serialize(obj)).toThrow('OnCycle error');
    });

    it('should handle TypeError from toJSON method without onCycle', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      const obj = {
        toJSON() {
          throw new TypeError('toJSON error');
        },
      };

      expect(() => serializer.serialize(obj)).toThrow('toJSON error');
    });

    it('should handle TypeError from toJSON method with onCycle', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
        onCycle: () => JSON.rawJSON('"<circular>"'),
      });

      const obj = {
        toJSON() {
          throw new TypeError('toJSON error');
        },
      };

      // If no cycle is detected, the original error should propagate
      expect(() => serializer.serialize(obj)).toThrow('toJSON error');
    });
  });

  describe('edge cases', () => {
    it('should handle nested objects with mixed types', () => {
      const serializer = new JsonSerializer({
        fallback: (value) => {
          if (typeof value === 'function') return JSON.rawJSON('"<function>"');
          if (typeof value === 'symbol') return JSON.rawJSON('"<symbol>"');
          return JSON.rawJSON('"<unknown>"');
        },
      });

      const complexObj = {
        data: {
          numbers: [1, 2, 3],
          strings: ['a', 'b', 'c'],
          nested: {
            fn: () => {},
            sym: Symbol('nested'),
            nullValue: null,
            boolValue: true,
          },
        },
      };

      const result = serializer.serialize(complexObj);
      expect(result).toBe(
        '{"data":{"numbers":[1,2,3],"strings":["a","b","c"],"nested":{"fn":"<function>","sym":"<symbol>","nullValue":null,"boolValue":true}}}',
      );
    });

    it('should handle sparse arrays', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      const sparseArray = [1, , 3, , 5]; // eslint-disable-line no-sparse-arrays
      expect(serializer.serialize(sparseArray)).toBe('[1,null,3,null,5]');
    });

    it('should handle objects with numeric keys', () => {
      const serializer = new JsonSerializer({
        fallback: () => JSON.rawJSON('"<fallback>"'),
      });

      const obj = { 1: 'one', 2: 'two', normal: 'value' };
      expect(serializer.serialize(obj)).toBe('{"1":"one","2":"two","normal":"value"}');
    });
  });
});
