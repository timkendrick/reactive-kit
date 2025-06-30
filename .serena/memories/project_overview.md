# ReactiveKit Project Overview

## Purpose
ReactiveKit is a full-stack framework for building deterministic, debuggable, testable, replayable, and observable real-time distributed systems. It provides a unified approach to building robust applications that are testable and debuggable by design – from interactive UIs to data-processing pipelines.

## Core Architecture: Three Building Blocks

### 1. Reactive Functions
**Live computations that automatically stay up-to-date**
- Define complex live computations anywhere on the stack using familiar `async`/`await` syntax
- Automatically recompute when dependencies change - no manual subscriptions or caching
- Use cases: Dynamic UI widgets, streaming API endpoints, real-time dashboards
- Example: `PortfolioOverview` component that combines live market data and order status

### 2. Scripted Workers  
**Stateful, repeatable procedural workflows**
- Orchestrate deterministic multi-step operations using composable control flow primitives
- Handle both short-lived tasks and long-running event-driven services
- Message-driven communication with full auditability through the transport layer
- Use cases: Form validation, data pipelines, alerting mechanisms, order execution
- Example: `FundTransferWorker` that handles complete transfer lifecycle

### 3. Intelligent Transport Layer
**Deterministic, observable system backbone**
- Ordered event bus that synchronizes all Reactive Functions and Scripted Workers
- Records all interactions as serialized messages forming a replayable log
- Provides causal traceability across distributed system boundaries
- Enables time-travel debugging, session recording, and perfect reproducibility

## Key Benefits

### Always Live Data
- Abstracts away complexity of subscriptions, callbacks and caches
- Components throughout the stack always reflect latest updates automatically
- Stale data becomes impossible by design

### Self-Explaining Systems
- Complete causal history of every action automatically generated
- Every state change is causally linked and traceable
- Debug with precision using exact replay capabilities

### Complete Determinism
- Every message and state change is perfectly reproducible
- Isolate any bug and trace every decision with surgical precision
- Build with confidence knowing system behavior is predictable

## Use Cases

### Frontend Applications
- Dynamic user interfaces with live data
- Real-time dashboards and monitoring
- Complex form validation and user workflows

### Backend Services  
- Streaming API endpoints
- Data processing pipelines
- Event-driven microservices
- Automated business workflows

### Full-Stack Integration
- Same paradigm works across entire stack
- Components can move between frontend and backend
- Unified debugging and testing across boundaries

## Plugin Ecosystem
Built on highly pluggable architecture with growing library of official plugins:
- **Core**: State management, timers, fetch
- **Transport**: WebSocket, GraphQL, gRPC (coming soon)
- **Data**: SQL, NoSQL, Kafka, NATS (coming soon)
- **Infrastructure**: Kubernetes orchestration (coming soon)

## Why ReactiveKit?
- **Deterministic by Design**: Predictable and reproducible behavior
- **Radically Testable**: Comprehensive testing with confidence
- **Deeply Debuggable**: Unprecedented view into causal history
- **Inherently Robust**: Architected for resilience and error recovery
- **Simplified Development**: Drastically reduced boilerplate for real-time systems