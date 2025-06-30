# ReactiveKit Code Style & Conventions

## TypeScript Conventions
- **Return Type Annotations**: Always annotate function return types
- **Import Types**: Use `import type {}` for type-only imports
- **Array Types**: Use `Array<T>` instead of `T[]` for type annotations
- **Null vs Undefined**: Prefer `null` over `undefined` for missing values
- **Function Declarations**: Prefer `function foo() {}` over `const foo = () => {}`
- **Functional Style**: Prefer functional over imperative code (except: prefer loops over `.forEach()`)

## Code Style (Prettier)
- **Print Width**: 100 characters
- **Quotes**: Single quotes
- **Semicolons**: Always use semicolons
- **Indentation**: 2 spaces (no tabs)
- **Trailing Commas**: Always include trailing commas

## ESLint Rules
- **No Console**: `console` statements are errors
- **Object Shorthand**: Always use object shorthand notation
- **Array Type**: Use generic array type `Array<T>`
- **Consistent Type Imports**: Prefer type imports with separate style
- **Import Order**: Alphabetical with newlines between groups
- **No Unused Vars**: Error on unused variables (use `_` prefix for ignored)

## File Structure
- **Template-Based Config**: All packages extend base configurations from `packages/build-config/templates/`
- **Consistent Scripts**: Each package has consistent `build`, `lint`, `test` scripts
- **Index Files**: Use `index.ts` for barrel exports

## Reactive Function Patterns
- **Async/Await Syntax**: Use for reactive functions (compiled to state machines)
- **Hooks**: Use built-in hooks like `useTime`, `useWatchFile` for reactive capabilities
- **JSON-Serializable**: Only hashable values can cross `await` boundaries
- **Effects**: Bridge sync reactive functions with async actor system

## Documentation
- **JSDoc**: Use JSDoc summary instead of inline comments
- **No Inline Comments**: Avoid inline comments, prefer JSDoc