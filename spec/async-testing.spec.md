# Async Testing Framework

See [@reactive-kit/test-utils](../packages/test-utils/SPEC.md) spec

### Related Specs

1. [Actor System](./actor-system.spec.md)
   - Testing framework builds on core actor system concepts:
     - Message passing patterns
     - Handler lifecycle management
     - Async task spawning
     - State management

2. [Dependency Tracking](./dependency-tracking.spec.md)
   - Testing framework must respect dependency tracking:
     - Message causality chains
     - Effect subscriptions
     - State dependencies
     - Cross-realm coordination

3. [Runtime Scheduler](./runtime-scheduler.spec.md)
   - Testing framework integrates with scheduler:
     - Message ordering guarantees
     - Actor spawning/killing
     - Task coordination

4. [Plugin Architecture](./plugin-architecture.spec.md)
   - Testing framework supports plugin testing:
     - Effect handler testing
     - Hook testing
     - Plugin message flow
     - Plugin state management
