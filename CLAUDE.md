# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReactiveKit is an experimental, lightweight reactive runtime framework for building deterministic, real-time full-stack JavaScript/TypeScript applications. It extends the reactive paradigm beyond just UI to the entire application stack using a dual-realm architecture.

## Essential Commands

### Development Workflow
- `pnpm run ci` - Full CI pipeline (verify + build)
- `pnpm run verify` - Run linting and tests (recommended before committing)
- `pnpm run lint` - Run all linting (ESLint + TypeScript)
- `pnpm run test` - Run all tests with Vitest
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run build` - Build libraries, docs, and coverage

### Package Management
- Uses PNPM workspaces - always use `pnmp` instead of `npm`
- `pnpm run --recursive <command>` - Run command across all packages
- Individual packages have consistent scripts: `build`, `lint`, `test`

### Testing
- Single test file: `pnpm run test <filepath>`
- Coverage: `pnpm run coverage`
- Test utilities available in `packages/test-utils/`

## Architecture Overview

### Core Concepts
ReactiveKit implements a **dual-realm architecture**:

1. **Synchronous Realm ('Micro')**: Pure reactive functions with deterministic computation
   - Uses `async/await` syntax compiled to resumable state machines
   - Fine-grained dependency tracking and cache invalidation

2. **Asynchronous Realm ('Macro')**: Actor-based system for side effects and I/O
   - Message passing between actors
   - Bridge between sync and async realms via effects

### Key Directories Structure

**Core Runtime:**
- `packages/runtime/` - Main runtime engine
- `packages/actor/` - Actor system primitives  
- `packages/scheduler/` - Message scheduling system
- `packages/interpreter/` - Reactive function interpreter

**Compilation Pipeline:**
- `packages/compiler/` - Standalone reactive function compiler
- `packages/babel-plugin-reactive-functions/` - Core Babel plugin
- `packages/babel-preset-reactive/` - Complete Babel preset

**Framework Features:**
- `packages/component/` - Component system
- `packages/dom/` - DOM rendering
- `packages/hooks/` - Built-in hooks (useTime, useWatchFile, etc.)
- `packages/handlers/` - Message handlers

**Plugins:** 30+ plugins in `packages/plugin-*` for various capabilities (fetch, state, time, etc.)

**Developer Tools:**
- `packages/cli/` - Command line interface
- `packages/build-config/` - Shared build configuration templates
- `packages/test-utils/` - Testing utilities and predicates

### Configuration Architecture

The project uses **template-based configuration**:
- Templates in `packages/build-config/templates/`
- Each package extends base configs (ESLint, TypeScript, Vite, etc.)
- Consistent tooling across all 30+ packages

### Key Files for Understanding Codebase
- `packages/examples/src/` - Usage examples and patterns
- `packages/runtime/src/` - Core runtime implementation
- `packages/babel-plugin-reactive-functions/` - Compilation logic
- `packages/test-utils/src/` - Testing patterns and utilities

## Architecture Requirements

### Always Consult ARCHITECTURE.md
- **Critical**: Review `ARCHITECTURE.md` before any feature planning or implementation
- All changes must align with the dual-realm architecture (sync 'micro' + async 'macro')
- Document architectural impacts and update `ARCHITECTURE.md` if needed

### Feature Development Workflow
- **Golden Rule**: Always ask before making changes - summarize and get confirmation
- Follow spec-driven development in `spec/` directories
- Use `SPEC.md` files as feature indexes with `.spec.md` files for individual features
- Create packages for new features when appropriate

### Memory Bank Context (Required)
Before any task, read all memory bank files in order:
- `memory-bank/projectbrief.md`
- `memory-bank/productContext.md` 
- `memory-bank/activeContext.md`
- `memory-bank/systemPatterns.md`
- `memory-bank/techContext.md`
- `memory-bank/progress.md`

## Development Notes

### TypeScript Conventions
- Prefer functional over imperative code (except: prefer loops over `.forEach()`)
- Always annotate function return types
- Prefer `null` over `undefined` for missing values
- Use `import type {}` for type-only imports
- Use `Array<T>` instead of `T[]` for type annotations
- Use JSDoc summary instead of inline comments
- Prefer `function foo() {}` over `const foo = () => {}`

### Testing Patterns
- Vitest for unit and integration tests
- Actor system testing with message sequence predicates
- Test utilities provide pattern matching for async message flows
- Coverage with V8 provider

### Reactive Function Patterns
- Use `async/await` syntax for reactive functions
- Functions are compiled to state machines at build time
- Hooks like `useTime`, `useWatchFile` provide reactive capabilities
- Effects bridge sync reactive functions with async actor system
- Only hashable values can cross `await` boundaries (JSON-serializable rule of thumb)

### Git Commit Requirements
- **Auto-commit**: All changes must be committed using Conventional Commits format
- Format: `type(scope): description` with detailed body including user requirements
- Use `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf` types