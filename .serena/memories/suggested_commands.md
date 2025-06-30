# ReactiveKit Essential Commands

## Development Workflow Commands
- `pnpm run ci` - Full CI pipeline (verify + build) - **Run before committing**
- `pnpm run verify` - Run linting and tests (recommended before committing)
- `pnpm run lint` - Run all linting (ESLint + TypeScript)
- `pnpm run test` - Run all tests with Vitest
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run build` - Build libraries, docs, and coverage

## Package Management (Always use PNPM)
- `pnpm install` - Install dependencies
- `pnpm run --recursive <command>` - Run command across all packages
- `pnpm run --recursive --parallel build` - Build all packages in parallel

## Testing Commands
- `pnpm run test <filepath>` - Run single test file
- `pnpm run coverage` - Run tests with coverage report
- `pnpm run coverage:report` - Generate coverage report

## Build Commands
- `pnpm run build:lib` - Build libraries only
- `pnpm run build:docs` - Generate TypeDoc documentation

## Linting Commands
- `pnpm run lint:eslint` - Run ESLint only
- `pnpm run lint:typescript` - Run TypeScript type checking only

## Code Generation
- `pnpm run generate` - Run Plop code generator

## Darwin System Commands
- `ls` - List files
- `find` - Search files
- `grep` - Search content
- `git` - Version control

## Package-Specific Commands
Each package in `packages/` has consistent scripts:
- `pnpm run build` (in package directory)
- `pnpm run lint` (in package directory)
- `pnpm run test` (in package directory)