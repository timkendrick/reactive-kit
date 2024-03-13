import { describe, expect, test } from 'vitest';
import { isGenerator, isGeneratorFunction } from './generator';

describe(isGeneratorFunction, () => {
  test('identifies generator functions correctly', () => {
    expect(isGeneratorFunction(function () {})).toBe(false);
    expect(isGeneratorFunction(function* () {})).toBe(true);
    expect(isGeneratorFunction((function* () {})())).toBe(false);
  });
});

describe(isGenerator, () => {
  test('identifies generators correctly', () => {
    expect(isGenerator((function* () {})())).toBe(true);
    expect(isGenerator(new Set().values())).toBe(false);
    expect(isGenerator(function* () {})).toBe(false);
  });
});
