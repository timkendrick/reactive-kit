# ReactiveKit Tech Stack

## Languages & Runtime
- **TypeScript/JavaScript**: Primary languages (ES2022 target)
- **Node.js**: Runtime environment (Darwin system)

## Package Management
- **PNPM**: Package manager (v10.0.0)
- **PNPM Workspaces**: Monorepo structure with 30+ packages in `packages/`

## Build & Bundling
- **Vite**: Build tool and bundler
- **TypeScript**: Type checking and compilation
- **Babel**: Code transformation with custom plugins for reactive function compilation

## Testing
- **Vitest**: Test runner with V8 coverage provider
- **@reactive-kit/test-utils**: Custom testing utilities for both reactive functions and scripted workers

## Code Quality
- **ESLint**: Linting with TypeScript, Prettier, and Vitest plugins
- **Prettier**: Code formatting (100 char width, single quotes, trailing commas)
- **TypeScript**: Strict mode enabled

## Documentation
- **TypeDoc**: API documentation generation

## Core Architecture Dependencies

### Reactive Functions
- **Babel Ecosystem**: Custom plugins transform async/await into resumable state machines
- **Runtime Interpreter**: Evaluates reactive functions with dependency tracking
- **Effect System**: Manages reactive dependencies and automatic recomputation

### Scripted Workers
- **Actor System**: Message-passing architecture for deterministic workflows
- **VM Compiler**: Compiles scripted worker definitions into executable operations
- **State Machines**: Stateful, resumable execution model

### Intelligent Transport Layer
- **Event Bus**: Ordered message system coordinating reactive functions and scripted workers
- **Deterministic Hashing**: Ensures reproducible behavior for replay
- **Causal Logging**: Complete traceability across system boundaries

## Development Tools
- **Plop**: Code generation for packages and plugins
- **Build Config Templates**: Shared configuration across packages
- **CLI Runtime**: Command-line execution environment
- **ESM Loader**: Module loading with reactive function compilation

## Plugin Architecture
- **Effect System**: Extensible effects for reactive functions
- **Handler System**: Pluggable handlers for the transport layer
- **Hook System**: Reusable reactive function patterns
- **Message Types**: Standardized communication primitives

## Key Technical Innovations
- **Async/Await Compilation**: Transforms familiar syntax into reactive state machines
- **Fine-grained Dependency Tracking**: Automatic detection of reactive dependencies
- **Deterministic Execution**: Reproducible behavior through event log replay
- **Cross-boundary Causality**: Traces actions across distributed system components
- **Unified Programming Model**: Same paradigms work across frontend and backend