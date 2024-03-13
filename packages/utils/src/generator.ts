const GeneratorFunction = function* () {}.constructor;

export function isGeneratorFunction(value: unknown): value is GeneratorFunction {
  return (value as any)?.constructor === GeneratorFunction;
}

export function isGenerator(value: unknown): value is Generator {
  return (value as any)?.__proto__?.__proto__ === GeneratorFunction.prototype.prototype;
}
