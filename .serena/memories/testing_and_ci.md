# ReactiveKit Testing & CI Workflow

## Test Framework
- **Vitest**: Primary test runner with ES modules support
- **V8 Coverage**: Coverage provider for accurate coverage reports
- **Workspace Testing**: Tests run across all packages in the monorepo

## Test Configuration
- **Root Config**: `vitest.config.ts` extends base template
- **Workspace Config**: `vitest.workspace.ts` for multi-package testing
- **Coverage Exclusions**: Excludes `**__fixtures__/**` from coverage

## Testing Patterns
- **Actor System Testing**: Message sequence predicates for async flows
- **Pattern Matching**: Test utilities provide pattern matching for async message flows
- **Integration Tests**: Test entire reactive function flows
- **Unit Tests**: Test individual components and functions

## CI Pipeline Commands
```bash
pnpm run ci          # Full CI: verify + build
pnpm run verify      # Lint + test (pre-commit check)
pnpm run lint        # ESLint + TypeScript checking
pnpm run test        # Run all tests
pnpm run build       # Build all packages + docs + coverage
```

## Development Testing
```bash
pnpm run test:watch         # Watch mode for development
pnpm run test <filepath>    # Run specific test file
pnpm run coverage          # Generate coverage report
pnpm run coverage:report   # Generate detailed coverage report
```

## Test Structure
- **Per Package**: Each package has its own test suite
- **Parallel Execution**: Tests can run in parallel across packages
- **Deterministic**: Tests verify deterministic behavior of reactive functions

## Pre-Commit Workflow
1. Run `pnpm run verify` (lint + test)
2. Fix any linting or test failures
3. Run `pnpm run ci` for full verification
4. Commit with conventional commit format

## Coverage Reports
- **Providers**: V8 coverage provider
- **Formats**: LCOV and text reports
- **Integration**: Coverage generated as part of build process