# Technical Context

## Technology Stack
- Primary Language: TypeScript
- Package Management: pnpm (workspace/monorepo setup)
- Build Tools: Vite, Babel

## Package Architecture

### Core Runtime Packages
- `packages/runtime`: Top-level runtime scheduler
- `packages/interpreter`: Core interpreter implementation
- `packages/compiler`: Standalone reactive function compiler
- `packages/babel-preset-reactive`: Babel preset for compilation (based on Regenerator)

### Actor System
- `packages/actor`: Core actor framework types
- `packages/actor-utils`: Actor utility helpers
- `packages/scheduler`: Actor scheduler implementation
- `packages/runtime-messages`: Well-known runtime message types

### Development Tools
- `packages/cli`: CLI runtime environment
- `packages/loader`: ESM loader
- `packages/build-config`: Shared build configuration

### UI Integration
- `packages/component`: JSX component system helpers
- `packages/dom`: DOM renderer runtime environment

### Plugin System
Core Plugins:
- `packages/plugin-evaluate`: Runtime implementation
- `packages/plugin-fetch`: HTTP transport
- `packages/plugin-fs`: Filesystem operations
- `packages/plugin-pending`: Pending state fallbacks
- `packages/plugin-state`: Stateful variables
- `packages/plugin-time`: Time-related effects

### Utility Packages
- `packages/handler-utils`: Effect Handler utilities
- `packages/handlers`: All-in-one handler package
- `packages/hooks`: All-in-one hooks package
- `packages/hash`: Hash utility library
- `packages/reactive-utils`: Effect stream transformations
- `packages/types`: Shared core types
- `packages/utils`: General utilities

## Development Setup

### Package Generation
Two types of package templates available via `pnpm generate`:
1. Basic Package (`pnpm generate package`)
   - Basic TypeScript package setup
   - Standard build configuration
   - Test infrastructure

2. Plugin Package (`pnpm generate plugin`)
   - Extends basic package template
   - Adds plugin-specific exports:
     - effects
     - handlers
     - hooks
     - messages
     - types
   - Automatically adds required dependencies
   - Updates hooks and handlers packages

### Plugin Development
Plugins must implement standardized interfaces:
- Effects: Define new effect types
- Handlers: Implement effect handling logic
- Hooks: Provide reactive function integration

Plugin Constraints:
- All asynchronous behavior must be message-based
- Must follow actor system patterns
- Must integrate with dependency tracking system

### Build System
- Uses Vite for modern build tooling
- Babel integration for reactive function compilation
- Workspace-aware dependency management
- Standardized build configs across packages

### Testing Infrastructure
Currently implementing:
1. Asynchronous Testing
   - Handler message sequence verification
   - Canned message sequence playback

2. Synchronous Testing
   - Reactive function mounting
   - Effect state simulation

3. Integration Testing
   - Combined async/sync testing
   - Mock effect handler support
   - Deterministic behavior verification 
