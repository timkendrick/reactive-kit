# Feature Specifications

## Core Features
- [Dual Realm Architecture](./spec/dual-realm-architecture.spec.md) - Core architecture combining synchronous reactive computation with asynchronous actor system
- [Dependency Tracking](./spec/dependency-tracking.spec.md) - Fine-grained dependency tracking system with complete causal chain preservation
- [Actor System](./spec/actor-system.spec.md) - Message-based actor system for controlled concurrency and side effects
- [Plugin Architecture](./spec/plugin-architecture.spec.md) - Extensible plugin system for framework features and integrations

## Runtime Features
- [Runtime Scheduler](./spec/runtime-scheduler.spec.md) - Core runtime coordination and scheduling system
- [Interpreter](./spec/interpreter.spec.md) - Runtime interpreter for reactive functions
- [Compiler](./spec/compiler.spec.md) - Standalone reactive function compiler
- [Babel Integration](./spec/babel-integration.spec.md) - Babel preset and plugins for reactive function compilation

## Testing Infrastructure
- [Test Utilities](./spec/test-utils.spec.md) [TBD] - Toolkit for writing declarative sync, async and e2e tests (see `test-utils` feature branch)

## Plugin Suite
- [State Management](./spec/state-management.spec.md) [TBD] - State management plugin with hooks and reducers
- [Retry System](./spec/retry-system.spec.md) [TBD] - Configurable retry policies with backoff strategies
- [Recording System](./spec/recording-system.spec.md) [TBD] - Effect subscription and message recording
- [Playback System](./spec/playback-system.spec.md) [TBD] - Deterministic replay of recorded sequences

## Runtime Environments
- [Web Platform](./spec/web-platform.spec.md) [TBD] - Web client and server runtime environments
- [API Platform](./spec/api-platform.spec.md) [TBD] - GraphQL and gRPC server implementations
- [CLI Platform](./spec/cli-platform.spec.md) [TBD] - Command-line runtime environment

## Transport & Database
- [Transport Clients](./spec/transport-clients.spec.md) [TBD] - WebSocket, gRPC, Kafka, and NATS clients
- [SQL Integration](./spec/sql-integration.spec.md) [TBD] - SQL database integration with query building

## Build & Development
- [Graph Traversal](./spec/graph-traversal.spec.md) [TBD] - Build graph construction and traversal
- [Test Execution](./spec/test-execution.spec.md) [TBD] - Test discovery and execution system
- [Compilation](./spec/compilation.spec.md) [TBD] - Build-time compilation pipeline
- [Bundling](./spec/bundling.spec.md) [TBD] - Asset bundling and optimization
- [Docker Integration](./spec/docker-integration.spec.md) [TBD] - Dockerfile generation and build optimization

## Observability & Deployment
- [Metrics Collection](./spec/metrics-collection.spec.md) [TBD] - OpenTelemetry integration and Prometheus export
- [Error Management](./spec/error-management.spec.md) [TBD] - Error tracking and management system
- [Kubernetes Integration](./spec/kubernetes-integration.spec.md) [TBD] - Kubernetes deployment and management
- [CI/CD Pipeline](./spec/ci-cd-pipeline.spec.md) [TBD] - Continuous integration and deployment system

## Developer Tools
- [Debugging Utilities](./spec/debugging-utilities.spec.md) [TBD] - Development and debugging tools
- [System Visualization](./spec/system-visualization.spec.md) [TBD] - System behavior visualization
- [Performance Monitoring](./spec/performance-monitoring.spec.md) [TBD] - Performance tracking and analysis
- [Development Environment](./spec/development-environment.spec.md) [TBD] - Development environment setup and configuration 
