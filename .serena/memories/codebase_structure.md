# ReactiveKit Codebase Structure

## Root Directory
- **CLAUDE.md**: Project instructions for Claude Code
- **ARCHITECTURE.md**: Architectural documentation 
- **SPEC.md**: Feature specification index
- **package.json**: Root package configuration
- **pnpm-workspace.yaml**: PNPM workspace configuration
- **tsconfig.json**: TypeScript configuration (extends build-config template)
- **vitest.config.ts**: Test configuration

## Key Directories

### `/packages/` - 30+ Packages

**Core Runtime (Reactive Functions):**
- `runtime/` - Main runtime engine for reactive function execution
- `interpreter/` - Reactive function interpreter and evaluation
- `compiler/` - Standalone reactive function compiler
- `babel-plugin-reactive-functions/` - Core Babel plugin for async/await transformation
- `babel-preset-reactive/` - Complete Babel preset

**Actor System (Scripted Workers):**
- `actor/` - Actor system primitives for scripted workers
- `scheduler/` - Message scheduling system
- `scripted-workers/` - **Core scripted worker implementation and VM**

**Intelligent Transport Layer:**
- `handlers/` - Effect handlers for transport layer
- `cache/` - Dependency tracking and caching
- `hash/` - Deterministic hashing for replay

**Framework Features:**
- `component/` - Component system for reactive functions
- `dom/` - DOM rendering integration
- `hooks/` - Built-in hooks (useTime, useWatchFile, etc.)

**Developer Tools:**
- `cli/` - Command line interface
- `loader/` - ESM module loader
- `build-config/` - Shared build configuration templates
- `examples/` - Usage examples and patterns
- `test-utils/` - Testing utilities for both reactive functions and scripted workers

**Plugin System:**
Core plugins extending reactive functions and scripted workers:
- `plugin-fetch` - HTTP transport capabilities
- `plugin-state` - State management primitives
- `plugin-time` - Time-based effects and scheduling
- `plugin-pending` - Pending state handling
- `plugin-evaluate` - Runtime evaluation support
- Plus 25+ additional plugins for various capabilities

**Utility Packages:**
- `types/` - Shared TypeScript types for reactive functions and scripted workers
- `utils/` - General utilities (AsyncQueue, enum helpers, etc.)
- `reactive-utils/` - Effect stream transformations
- `actor-utils/` - Actor system utilities  
- `handler-utils/` - Effect handler utilities
- `babel-types/` - Babel AST type definitions
- `babel-test-utils/` - Testing utilities for compilation

### `/spec/`
- Feature specifications in `.spec.md` files
- Spec-driven development documentation

### `/docs/`
- Generated API documentation
- Usage guides and examples

### `/scripts/`
- Build and development automation scripts

## Configuration Architecture
- **Template-Based**: All configurations extend base templates from `packages/build-config/templates/`
- **Consistent Tooling**: Same ESLint, TypeScript, Vite configs across all packages
- **Templates**: ESLint, TypeScript, Prettier, Vite configurations

## Package Categories by Architecture

### Reactive Functions Stack
- Compiler, babel plugins, interpreter
- Component system, DOM integration, hooks

### Scripted Workers Stack  
- Actor system, scripted-workers VM
- Message-based communication primitives
- State management and control flow

### Shared Infrastructure
- Intelligent transport layer (Runtime, scheduler, handlers, cache, hash)
- Development tools (CLI, loader, build-config)
- Testing utilities for both paradigms
- Plugin ecosystem supporting both reactive functions and scripted workers
