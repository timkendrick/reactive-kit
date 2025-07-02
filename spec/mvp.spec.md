ReactiveKit Product Requirements Document

Complete Implementation Roadmap for Production-Ready Interactive Distributed Applications

---
Overview

ReactiveKit is an experimental, lightweight reactive runtime framework for building deterministic, real-time full-stack JavaScript/TypeScript applications. It extends the reactive paradigm beyond just UI to the entire application stack using a three-layer architecture that enables complex real-time systems to be built with the same ease and reliability as traditional CRUD applications.

Vision Statement

Transform ReactiveKit from its current experimental state into a production-ready platform for building interactive, distributed, reactive applications with complete determinism, observability, and debuggability.

---
Current Implementation Status: Comprehensive Analysis

✅ FULLY IMPLEMENTED: Core Three-Layer Architecture

Reactive Functions System (Production Ready)

- Compiler Transform: Complete Babel plugin system (babel-plugin-reactive-functions)
  - Async function transformation to resumable state machines via Regenerator transform
  - AST manipulation and hashing utilities with 200+ lines of transformation logic
  - Generator-based execution model with yield point optimization at await expressions
  - Synchronous 'basic blocks' separated by 'yield points' for granular reactivity
- Runtime Interpreter: Full implementation (packages/interpreter)
  - Evaluation engine with fiber-based execution (evaluate.ts - 400+ lines)
  - Sophisticated dependency tracking and cache management with effect invalidation
  - Garbage collection system (major/minor GC) for cache cleanup
  - Effect subscription management with complete lifecycle (subscribe/emit/unsubscribe)
  - Handles hashable values crossing await boundaries (JSON-serializable rule of thumb)
- Runtime Engine: Core runtime coordination (packages/runtime)
  - Runtime class with effect handler integration
  - Subscription management system with automatic recomputation
  - EvaluateHandler serves as bridge between reactive functions and actor system

Actor System (Production Ready)

- Core Actor Primitives: Complete implementation (packages/actor)
  - Actor handles, factories, and lifecycle management
  - Sync/Async actor creators with full message handling capability
  - Handler actions (Send, Spawn, Kill, Fail) with complete type safety
  - Parent/child relationship management with message-driven communication
- Message Scheduler: Full async scheduler (packages/scheduler)
  - Deterministic message ordering with strict FIFO guarantees
  - Actor state management and coordination (AsyncScheduler class - 491 lines)
  - Async task orchestration with controlled concurrency
  - Current Limitation: Middleware is read-only callback only - cannot influence behavior
  - Central coordination preventing race conditions through single message bus
  - Unified lifecycle management for actor spawning and termination

Scripted Workers (Production Ready)

- Virtual Machine: Comprehensive VM implementation (packages/scripted-workers)
  - Complete compilation system (compile.ts with 15+ command types)
  - Full execution engine (evaluate.ts with stack frame management)
  - 14 VM operations: blocks, loops, actors, tasks, state management
  - 7 VM commands: spawn, send, kill, delay, await, complete, fail
  - Resumable execution with pause/resume at any operation
  - Deterministic replay through event log replay
- Control Flow Primitives: All documented primitives implemented
  - Sequential Operations: sequence(), waitFor(), when(), whenState()
  - Concurrent Operations: whileLoop(), spawn(), send(), kill()
  - State Management: withState(), modifyState(), readState(), computeState()
  - Control Flow: complete(), fail(), done(), noop(), delay()
  - Loop Control: loopBreak(), loopContinue() for while loop management
- Main Interface: act() function fully implemented with 100+ lines of actor creation logic
- State Machines: All execution represented as deterministic state transitions

✅ PLUGIN ECOSYSTEM (3/4 Production Ready, 1 Incomplete)

Plugin-Evaluate (Production Ready)

- useEvaluate<T>(expression: Expression<T>): Promise<T> hook with expression evaluation
- Complete EvaluateHandler actor with sophisticated interpreter integration
- Full dependency tracking and subscription management
- Effect subscription/unsubscription management with interpreter coordination

Plugin-Fetch (Production Ready)

- `useFetch(request)` hook with full HTTP support
- Complete FetchHandler and FetchTask implementation using real fetch API
- Async task orchestration with abort controllers and proper error handling
- Working integration demonstrated in examples (03-external-data)

Plugin-Time (Production Ready)

- `useTime({ interval })` hook with interval-based updates
- Complete TimeHandler actor and TimeTask with message-driven time updates
- Working integration demonstrated in examples
- Proper cleanup and resource management for timers

Plugin-Pending (Complete Utility)

- `usePending()` hook that never resolves (for pending states)
- `useFallback(fallback, value)` hook
- Lightweight utility plugin leveraging core pending system from @reactive-kit/types

Plugin-State (Incomplete - Missing Critical Handler)

- ✅ `useState(uid)` hook
- ✅ `useGetState(uid)` and `useSetState(uid, value)` implemented
- ✅ Complete effect definitions (`GetStateEffect`, `SetStateEffect`, `StateEffect`) with proper types
- ❌ No `StateHandler` implementation - effects are created but won't be processed without corresponding handler
- Critical Gap: State management is non-functional until `StateHandler` is implemented

✅ UI/RENDERING SYSTEM (Read-Only Implementation)

- DOM Rendering: Complete virtual DOM system (`packages/dom`)
  - `render(root, container)`
function for mounting reactive components
  - Full VDOM implementation with diffing (`vdom.ts`)
  - JSX support with intrinsic elements and proper reconciliation
  - Child node rendering, DOM manipulation, and attribute management
- Component System: Basic component types (`packages/component`)
- Current Critical Limitation: Completely read-only, no interactivity
  - No `onClick`, `onSubmit`, `onChange`, or any event handling capabilities
  - Cannot trigger user-requested actions or build interactive applications
  - Purely reactive rendering without user interaction capability

✅ BUILD & COMPILATION PIPELINE (Production Ready)

- Babel Integration: Complete preset and plugins
  - `babel-preset-reactive` with full configuration for reactive function and JSX compilation
  - `babel-plugin-reactive-functions` with AST transformation and hashing
  - `babel-plugin-reactive-jsx` for JSX compilation with ReactiveKit semantics
  - Babel test utilities and type definitions for compilation testing
- CLI: Basic CLI implementation with module loader (`packages`/cli) for running ReactiveKit programs

✅ WORKING EXAMPLES (50% Functional)

- Basic Examples: 6 working examples demonstrating core capabilities
  - `01-hello-world`: JSX rendering with `<h1>Hello, world!</h1>`
  - `02-reactivity`: `useTime({ interval: 1000 })` integration showing live timestamp updates
  - `03-external-data`: `useFetch('https://jsonplaceholder.typicode.com/users/1')` integration
  - `04-pending-placeholders`: Demonstration of pending state handling
  - `05-exception-handling`: Error handling in reactive functions
  - `06-idempotency-tokens`: Advanced patterns for deterministic behavior
- Both CLI and Web: Examples work in both Node.js CLI and browser environments
- Ignored Examples: 6 "ignored" examples (07-12) planned but not working
  - `07-polling-and-retrying`
  - `08-stateful-variables`
  - `09-accumulating-values`
  - `10-batch-loaders`
  - `11-graphql-client`
  - `12-grpc-client`

✅ ADVANCED TESTING INFRASTRUCTURE (~85% Complete)

- Pattern Matching System: Implemented on test-utils branch (commits 16f9c5ca + 0cee1623)
  - ✅ Composable system for message sequence verification with back-references
  - ✅ Complex patterns: sequence, parallel, oneOf, oneOrMore, repeat, withRefs, zeroOrMore
  - ✅ Actor testing predicates: hasMessageType, sentFrom, sentTo, hasActionType,
hasMessagePayload
  - ✅ Generic predicates: and, or, not, equals, hasField, is, lazy, any
  - ✅ Sophisticated predicate system with pattern matching for async message flows
  - ❌ Missing: Async task mocking (blocked by scheduler middleware limitations)

✅ UTILITY PACKAGES (Complete)

- Support Libraries: Complete implementations across the ecosystem
  - Hash utilities for dependency tracking and value hashing
  - Cache system for evaluation results with invalidation
  - Actor utilities and handler utilities for actor system support
  - Reactive utilities and general utilities for framework operations
  - Type definitions across the entire system with proper TypeScript support

---

❌ CRITICAL MISSING COMPONENTS

Based on comprehensive analysis and user feedback, the following critical gaps prevent ReactiveKit from being production-ready:

Gap Analysis Summary:

- Interactive UI: 0% implemented - completely read-only rendering
- Component State: 0% implemented - only global state available
- Cross-Realm Integration: 10% implemented - reactive functions and scripted workers largely isolated
- Distributed Systems: 5% implemented - entirely conceptual, zero multi-instance coordination
- Advanced Testing: 25% implemented - sophisticated patterns exist but async mocking blocked
- State Management: 75% implemented - hooks exist but missing critical StateHandler

---
Implementation Roadmap: Four Strategic Themes

Theme 1: Interactive Application Foundation

Goal: Transform ReactiveKit from read-only reactive system to full interactive application platform

Theme 2: Cross-Realm Integration

Goal: Seamless communication between reactive functions and scripted workers

Theme 3: Distributed Systems Architecture

Goal: Enable peer-to-peer coordination between ReactiveKit instances with causal traceability

Theme 4: Advanced Testing & Debugging

Goal: Production-ready testing infrastructure with record/playback and visual debugging

---
Theme 1: Interactive Application Foundation

Problem Statement

Currently ReactiveKit can only render read-only UIs with no event handling capabilities. To build real applications, we need a complete event handling system, local component state management, and integration between user interactions and the reactive/scripted worker systems.

Core Features Required

1.1 Local Component State Management

Requirements:
- Component-scoped state that doesn't interfere between component instances
- React-like API: `useComponentState(uid)` returning `[value, setter]`
- Automatic state namespacing based on component hierarchy
- Component identity system for deterministic state isolation

Technical Specifications:
- Component Identity: `{component_id} = hash({client_id}, ...{component_tree_path})`
- State Namespacing: `useComponentState(uid) → useGetState(hash({component_id}, uid))`
- Component Tree Path: Hierarchical path from root to current component
- Component lifecycle hooks: `useComponentMount()` / `useComponentUnmount()`
- API Design:

    ```typescript
    // New component-scoped state hooks
    function useComponentState<T>(localStateId: Hash): [Promise<T>, (value: T) => Promise<null>];
    function useGetComponentState<T>(localStateId: Hash): Promise<T>;
    function useSetComponentState<T>(localStateId: Hash, value: T): Promise<null>;
    // New component lifecycle hooks
    function useComponentMount(callback: (eventId: Hash) => void): void;
    function useComponentUnmount(callback: (eventId: Hash) => void): void;
    ```

Implementation Components:
- Component Identity System: Track component hierarchy and generate UIDs
- State Namespacing Layer: Wrap existing state hooks with component prefixes
- Render Context Provider: Inject component UID into hook calls
- Stateful lifecycle hooks: Trigger reactive effects based on render state

1.2 UI Event Handling System

Requirements:
- Support standard DOM events: `onClick`, `onChange`, `onSubmit`, `onFocus`, `onBlur`, etc.
- Custom event support for application-specific interactions
- Unique Event IDs: Each interaction must have a unique identifier
- Event routing through the actor system scheduler for full observability
- Event payload serialization for replay and debugging

Technical Specifications:
- Event ID Generation: `hash({client_id}, {component_id}, {event_type}, {nonce})` where `nonce`
  is random UUID
- Event Handler Declaration: Must be declared via `useCallback((e) => ...)` pattern
- Event Message Format:

    ```typescript
    interface UIEventMessage {
      instanceId: Hash;
      clientId: Hash;
      componentId: Hash;
      type: string;
      payload: Hashable;
    }
    ```

- JSX Integration:

    ```typescript
    // Event handlers with useCallback requirement
    async function MyComponent() {
      const handleClick = useCallback(async (event) => {
        // Can trigger scripted workers or reactive updates
      });
      return <button onClick={handleClick}>Click me</button>;
    }
    ```

Implementation Components:
- Event Handler Registry: Map event types to handler functions
- Event ID Generator: Unique ID creation system with nonce
- DOM Event Bridge: Convert DOM events to ReactiveKit messages
- Event Router: Route events through scheduler to appropriate handlers

---
Theme 2: Cross-Realm Integration

Problem Statement

Currently ReactiveKit's two core systems - Reactive Functions (synchronous realm) and Scripted Workers (asynchronous realm) - operate largely in isolation. While both are built on the actor system foundation, there's no seamless way for reactive functions to spawn or control scripted workers, and the scheduler's middleware system is read-only, preventing sophisticated testing and behavior modification patterns.

Core Features Required

2.1 Plugin-Scripted-Workers Package

Requirements:
- Hooks interface to spawn and control scripted workers from reactive functions
- `useTask()` hook for worker lifecycle management
- Integration with existing scripted worker VM and control flow primitives
- Maintains determinism and observability through the transport layer

Technical Specifications:
- useTask Hook API:

    ```typescript
    // Spawn a worker and get a handle for control
    function useTask<T>(worker: ActorDefinition<T>): Promise<ActorHandle<T>>

    // Example usage in reactive functions
    async function MyComponent() {
      const userRegistration = useTask(registerUser({ userId: 123 }));
      const taskResult = await userRegistration;
      return <div>Registration Status: {taskResult.status}</div>;
    }
    ```

- Worker Definition Pattern:

    ```typescript
    // Define reusable workers using existing scripted worker primitives
    function registerUser(params: { userId: number }): ActorDefinition<T> {
      return act((self, { outbox }) =>
        sequence(() => [
          send(ValidationService, { type: 'VALIDATE_USER', userId: params.userId }),
          waitFor(msg => msg.type === 'VALIDATION_COMPLETE'),
          // ... rest of registration workflow using existing primitives
          complete({ status: 'registered', userId: params.userId })
        ])
      );
    }
    ```

- TaskHandle Interface:

    ```typescript
    interface TaskHandle<T> {
      status: Promise<TaskStatus>;                // Current status (running, completed, failed)
      kill(uid: Hash): Promise<void>;             // Terminate the worker
      send(message: T, uid: Hash): Promise<void>; // Send message to worker for communication
    }
    ```

Implementation Components:
- `useTask()` Hook: Core hook implementation with worker spawning
- Task Handle Manager: Track and control spawned workers
- Worker Registry: Map worker definitions to actor factories
- Result Bridging: Translate worker completion back to reactive realm

2.2 Scheduler Middleware System

Requirements:
- Middleware can intercept and modify messages before processing
- Support for message transformation, blocking, and injection
- Maintain deterministic behavior while allowing behavior influence
- Enable sophisticated testing patterns like async task mocking

Technical Specifications:
- Enhanced Middleware Interface:

    ```typescript
    interface SchedulerMiddleware<T> {
      // Can modify, block, or pass through messages
      process(command: AsyncSchedulerCommand<T>): AsyncSchedulerCommand<T> | null | AsyncSchedulerCommand<T>[];
      // Optional hooks for different phases
      onBeforeProcess?(command: AsyncSchedulerCommand<T>): void;
      onAfterProcess?(command: AsyncSchedulerCommand<T>, result: any): void;
    }
    ```

- Message Transformation Examples:

    ```typescript
    // Testing middleware that mocks async tasks
    const mockingMiddleware: SchedulerMiddleware<T> = {
      process(command) {
        if (command.type === 'SPAWN' && command.actor.type === 'FETCH_TASK') {
          // Replace with mock task that returns canned response
          return AsyncSchedulerCommand.Spawn({
            ...command,
            actor: mockFetchTaskFactory(cannedResponse)
          });
        }
        return command; // Pass through unchanged
      }
    };
    ```

- Multiple middlewares can be composed into a chain, to be applied in sequence:

    ```typescript
    class ChainedMiddleware<T> {
      constructor(left: SchedulerMiddleware<T>, right: SchedulerMiddleware<T>);
    }
    ```

Implementation Components:
- Middleware Pipeline: Chain multiple middleware with ordered execution
- Command Transformation: Modify commands before scheduler processing
- Message Interception: Block or redirect messages
- Testing Utilities: Built-in middleware for common testing patterns

2.3 Reactive Worker Lifecycle Management

Requirements:
- Reactive functions can observe worker lifecycle events
- Automatic cleanup when reactive functions are no longer needed
- Error propagation from workers to reactive functions
- Resource management and memory cleanup

Technical Specifications:
- Lifecycle Observation:

    ```typescript
    async function TaskMonitor() {
      const task = useTask(longRunningProcess());
      const status = await task.status; // { type: 'pending' | 'running' | 'completed' | 'failed' }
      if (status.type === 'failed') {
        const { error } = status;
        return <div>Task failed: {error.message}</div>;
      }
      return <div>Task status: {status.type}</div>;
    }
    ```

- Automatic Cleanup:

    ```typescript
    // Use component lifecycle hooks for cleanup
    async function MyComponent() {
      const task = useTask(backgroundProcess());

      await useComponentMount((eventId) => {
        // Component mounted
      });

      await useComponentUnmount((eventId) => {
        // Cleanup function called when component unmounts
        task.kill(eventId);
      });

      return <div>Task running...</div>;
    }
    ```

Implementation Components:
- Lifecycle Tracking: Monitor worker state transitions
- Cleanup Coordination: Automatic resource cleanup via useComponentUnmount
- Error Handling: Propagate worker errors to reactive realm
- Resource Management: Prevent memory leaks from abandoned workers

2.4 Communication Patterns

Requirements:
- Message-Based: Communication via `send(message, uid)` method on TaskHandle
- No Shared Mutable State: Avoid complex shared state coordination
- Deterministic: All communication flows through actor system for observability

Technical Specifications:
- TaskHandle Communication:

    ```typescript
    async function WorkerController() {
      const task = useTask(dataProcessor({ batchSize: 100 }));

      // Send commands to worker
      await useComponentMount((eventId) => {
        await task.send({ type: 'UPDATE_BATCH_SIZE', size: 200 }, eventId);
        await task.send({ type: 'PAUSE_PROCESSING' }, eventId);
      });

      const result = await task.result;
      return <div>Processing complete: {result}</div>;
    }
    ```

Implementation Components:
- Message Routing: Route messages from reactive functions to workers
- Message Dispatch Mechanism: Message dispatch performed via idempotent side-effects

Dependencies and Integration Points

Dependencies:

1. Complete Plugin-State Handler - required for any state management in workers
2. Enhanced DOM Event System (Theme 1) - workers often triggered by user interactions

Integration Points:

- Scheduler Package: Enhance middleware system with breaking changes
- Scripted-Workers Package: Expose worker definitions for reactive use
- Runtime Package: Coordinate cross-realm communication
- New Plugin-Scripted-Workers Package: Primary implementation package

Success Criteria

1. Developers can seamlessly spawn workers from reactive functions using `useTask()`
2. Middleware can influence scheduler behavior for testing and customization
3. Worker progress and lifecycle are observable from reactive functions
4. Communication flows cleanly through `TaskHandle.send()` method
5. Testing infrastructure supports mocking async operations through middleware
6. Resource cleanup happens automatically via useComponentUnmount

---
Theme 3: Distributed Systems Architecture

Problem Statement

Currently ReactiveKit operates as isolated, single-instance applications. The vision of the "Intelligent Transport Layer" is to enable multiple ReactiveKit instances to coordinate with peer-to-peer communication, causal traceability across service boundaries, and deterministic behavior within each instance. This is currently 0% implemented - everything is conceptual.

Architectural Philosophy

- Peer-to-peer coordination between instances
- Instance discovery: Instances can communicate if they know where each other are (no automatic service discovery)
- Determinism per instance: Single instance determinism for given external interactions
- No cross-boundary determinism: No requirement for determinism across communication boundaries

Core Features Required

3.1 Cross-Instance Communication Protocol

Requirements:
- Standardized, transport-agnostic protocol for instance-to-instance communication
- Support for multiple transport mechanisms (WebSocket, HTTP, GraphQL Subscriptions)
- Message routing and delivery between known instances
- Protocol versioning and compatibility

Technical Specifications:
- Federated Message Format:

    ```typescript
    interface FederatedMessage<T> {
      id: Hash;                   // Unique message identifier
      sourceInstanceId: Hash;     // Sending instance
      targetInstanceId: Hash;     // Receiving instance
      message: T;                 // Actor message
    }
    ```

- Transport Abstraction:

    ```typescript
    // Generic transport interface with configurable parameters
    interface Transport<ConnectParams, ListenParams> {
      connect(params: ConnectParams): Promise<Connection>;
      listen(params: ListenParams): Promise<Server>;
    }

    interface Connection<T> {
      send(message: T): Promise<FederatedMessage<T>>;
      onMessage(handler: (message: FederatedMessage<T>) => void): void;
      close(): Promise<void>;
    }
    ```

Implementation Components:
- Protocol Definition: Standardized message format and semantics
- Transport Layer: Pluggable transport implementations
- Connection Manager: Maintain connections to peer instances

3.2 Message Context and Correlation

Requirements:
- Basic causal context for each message automatically created by scheduler
- Enable distributed tracing through purpose-specific tooling
- Simple correlation without complex trace/span abstractions
- Foundation for future advanced correlation features

Technical Specifications:
- Message Context (automatically created by scheduler):

    ```typescript
    interface MessageContext {
      /** Scheduler instance that dispatched the message */
      instanceId: Hash;
      /** Actor that dispatched the message */
      actorId: ActorHandle<unknown> | null;
      /** Message that caused this span to be emitted */
      parentId: Hash | null;
      /** Previous sibling of this span (useful when single source emits stream of messages) */
      previousId: Hash | null;
    }
    ```
    
- Event Logging Infrastructure:

    ```typescript
    // Basic logging, for correlation via dedicated tooling
    interface EventLogger<T> {
      log(message: T, context: MessageContext): LogEntry<T>;
    }

    interface LogEntry<T> {
      loggerId: Hash;
      timestamp: Date;
      sequenceNumber: number;
      message: T;
      context: MessageContext;
    }
    ```

- Correlation Support:

Correlation is provided via analysis of `LogEntry` entries, with dedicated tooling to construct distributed trace graph from log entries

Implementation Components:
- Message Context Generator: Automatically create context for each message
- Basic Event Logger: Log message/context pairs for correlation
- Correlation Foundation: Rudimentary trace graph construction helpers

3.3 Network Transport Implementations

Requirements:
- WebSocket Transport: Real-time bidirectional communication
- HTTP Transport: Simple request-response communication
- GraphQL Subscription Transport: Subscription-based real-time communication
- Future Transports: gRPC, Kafka, NATS (noted for later implementation)

Technical Specifications:
- WebSocket Transport:

    ```typescript
    interface WebSocketConnectParams {
      url: string;
      protocols?: string[];
    }

    interface WebSocketListenParams {
      port: number;
      host?: string;
    }

    class WebSocketTransport implements Transport<WebSocketConnectParams, 
    WebSocketListenParams> {
      async connect(params: WebSocketConnectParams): Promise<WebSocketConnection>;
      async listen(params: WebSocketListenParams): Promise<WebSocketServer>;
    }
    ```

- HTTP Transport:

    ```typescript
    interface HttpConnectParams {
      baseUrl: string;
      headers?: Record<string, string>;
    }

    interface HttpListenParams {
      port: number;
      host?: string;
      routes?: RouteConfig[];
    }

    class HttpTransport implements Transport<HttpConnectParams, HttpListenParams> {
      async connect(params: HttpConnectParams): Promise<HttpConnection>;
      async listen(params: HttpListenParams): Promise<HttpServer>;
    }
    ```

- GraphQL Subscription Transport:

    ```typescript
    interface GraphQlConnectParams {
      endpoint: string;
      subscriptionEndpoint?: string;
    }

    interface GraphQlListenParams {
      port: number;
      schema: GraphQlSchema;
    }

    class GraphQlSubscriptionTransport implements Transport<GraphQlConnectParams, GraphQlListenParams> {
      async connect(params: GraphQlConnectParams): Promise<GraphQlConnection>;
      async listen(params: GraphQlListenParams): Promise<GraphQlServer>;
    }
    ```

Implementation Components:
- WebSocket Transport: Real-time bidirectional communication
- HTTP Transport: Simple request-response communication
- GraphQL Subscription Transport: Subscription-based real-time updates
- Transport Registry: Manage and configure multiple transports
- Future Transport Notes: gRPC, Kafka, NATS marked for later implementation

Dependencies and Integration Points

Dependencies:

1. Enhanced Scheduler Middleware (Theme 2) - needed for message context generation
2. Local Event Logging - extend current actor system logging

Integration Points:

- Scheduler Package: Extend with message context generation
- New Federation Package: Core distributed coordination
- New Transport Packages: Individual transport implementations (websocket, http, graphql)
- Runtime Package: Coordinate distributed runtime behavior

Success Criteria

1. Multiple ReactiveKit instances can communicate if they know each other's locations
2. Messages route correctly between instances with proper delivery
3. Basic causal context is preserved for future correlation tooling
4. Multiple transport mechanisms work interchangeably
5. System maintains deterministic behavior within each instance
6. Foundation exists for advanced distributed debugging tools

---
Theme 4: Advanced Testing & Debugging

Problem Statement

While ReactiveKit has solid core testing infrastructure and sophisticated pattern matching
capabilities (implemented on test-utils branch), critical testing features are missing due
to scheduler middleware limitations. The framework needs record/playback functionality as
the foundation for advanced debugging, plus integration of existing test utilities.

Core Features Required

4.1 Complete Test-Utils Integration

Requirements:
- Integrate advanced pattern matching and predicates from existing `test-utils` branch
- Enable async task mocking through enhanced scheduler middleware
- Provide comprehensive testing utilities for all ReactiveKit patterns
- Support testing of cross-realm interactions (reactive ↔ scripted workers)

Technical Specifications:
- Pattern Matching System (from test-utils branch):

    ```typescript
    // Already implemented - needs integration
    import {
      sequence, parallel, oneOf, oneOrMore, repeat, withRefs, zeroOrMore,
      hasMessageType, sentFrom, sentTo, hasActionType, hasMessagePayload,
      and, or, not, equals, hasField, is, lazy, any,
      match, predicate
    } from '@reactive-kit/test-utils';

    // Test complex message sequences
    test('user registration workflow', async () => {
      const recorder = new SpyMiddleware();
      const scheduler = new AsyncScheduler(factory, recorder);

      const pattern = sequence([
        hasMessageType('VALIDATE_USER'),
        hasMessageType('SEND_EMAIL'),
        hasMessageType('CREATE_ACCOUNT')
      ]);

      const events = await recorder.collect();
      expect(events).toMatchPattern(pattern);
    });
    ```

- Async Task Mocking (enabled by enhanced middleware from Theme 2):

    ```typescript
    // Mock external dependencies through middleware
    const mockFetchMiddleware: SchedulerMiddleware<T> = {
      process(command) {
        if (command.type === 'SPAWN' && command.actor.type === 'FETCH_TASK') {
          return AsyncSchedulerCommand.Spawn({
            ...command,
            actor: createMockFetchTask({
              'https://api.example.com/users': { users: [{ id: 1, name: 'Alice' }] }
            })
          });
        }
        return command;
      }
    };
    ```

- Cross-Realm Testing:

    ```typescript
    import { render } from '@reactive-kit/dom-test-utils';

    // Test reactive function → scripted worker interactions
    test('event triggers worker correctly', async () => {
      const root = render(<UserRegistrationForm />);
      const dom = await root.next();

      // Simulate user interaction
      const registerButton = dom.getByText('Register');
      await registerButton.click();

      const pendingDom = await root.next();
      expect(pendingDom.getByText('Submitting...')).toBeDefined();

      const updatedDom = await root.next();
      expect(updatedDom.getByText('Registered')).toBeDefined();

      // Verify worker was spawned and completed
      const workerPattern = sequence([
        hasActionType('SPAWN'),
        hasMessageType('USER_REGISTRATION_START'),
        hasMessageType('USER_REGISTRATION_COMPLETE')
      ]);

      expect(scheduler).toHaveExecuted(workerPattern);
    });
    ```


Implementation Components:
- Pattern Matching Integration: Merge test-utils branch functionality
- Mock Task Factory: Create mock implementations of async tasks
- Event Collection Utilities: Capture and analyze scheduler events
- Cross-Realm Test Helpers: Test reactive-worker interactions
- DOM Test Utilities: Testing utilities for interactive components

4.2 Record/Playback Infrastructure

Requirements:
- Foundation for all debugging tools: Record/playback enables time-travel debugging, system
  replay, and advanced analysis
- Record complete message logs to storage interface
- Playback recorded sequences with optional message pass-through
- Support for partial mocking during playback

Technical Specifications:
- Record Middleware:

    ```typescript
    interface RecordMiddleware<T> extends SchedulerMiddleware<T> {
      constructor(storage: StorageInterface<RecordedMessage<T>>, filter?: (value: T): boolean);
    }

    interface RecordedMessage<T> {
      message: T;
      context: MessageContext;
      timestamp: Date;
      sequenceNumber: number;
    }

    interface StorageInterface<K, V> {
      write(key: K, value: V): Promise<void>;
      read(key: K): Promise<V>;
      collect(): Promise<Array<V>>;
    }
    ```

- Playback Middleware:

    ```typescript
    interface PlaybackMiddleware<T> extends SchedulerMiddleware<T> {
      constructor(events: Promise<Array<V>>, filter?: (value: T): boolean);
    }
    ```

- Recording Storage Examples:

    ```typescript
    // In-memory storage for testing
    class InMemoryStorage implements StorageInterface {
      constructor();
      // Implementation for in-memory recording storage
    }

    // File-based storage
    class FileStorage implements StorageInterface {
      constructor(filePath: string);
    }

    // Adapters for production storage back-ends
    class KafkaStorage implements StorageInterface {
      // Implementation for persistent database storage
    }
    ```


Implementation Components:
- Record Middleware: Capture complete message sequences
- Playback Middleware: Replay recorded sequences with optional pass-through
- Storage Abstraction: Pluggable storage for recordings

4.3 Visual Debugging Tools (TBD)

Requirements:
- Time-travel debugging interface built on record/playback foundation
- System visualization showing actor relationships and message flows
- Performance profiling for identifying bottlenecks
- Interactive debugging console for live system inspection

High-Level Overview:
- Time-Travel Debugger: Step through recorded message sequences
- System Visualizer: Generate interactive diagrams of actor systems
- Performance Profiler: Collect and analyze performance metrics
- Debug Console: Web-based interface for system inspection

4.4 Development Tooling Enhancement (TBD)

Requirements:
- Enhanced CLI with debugging capabilities
- Development server with hot reload and inspection
- Logging and monitoring integration
- IDE integration for better developer experience

High-Level Overview:
- Enhanced CLI: Debugging commands, profiling, tracing capabilities
- Development Server: Hot reload, live inspection, mock services
- Monitoring Integration: OpenTelemetry, structured logging
- IDE Extensions: Language server, debugging support

Dependencies and Integration Points

Dependencies:

1. Enhanced Scheduler Middleware (Theme 2) - required for record/playback and async task
mocking
2. Cross-Realm Integration (Theme 2) - needed for testing reactive-worker interactions
3. Interactive UI (Theme 1) - needed for testing interactive components

Integration Points:

- Test-Utils Package: Merge from test-utils branch
- Scheduler Package: Integrate record/playback middleware
- New Debug Package: Core debugging infrastructure
- DOM Package: Add testing utilities for interactive components

Success Criteria

1. Developers can mock async tasks completely through enhanced middleware
2. Complex message patterns are easily testable with integrated pattern matching
3. Complete system behavior can be recorded and replayed for debugging
4. Cross-realm interactions are fully testable with proper utilities
5. Foundation exists for advanced debugging tools through record/playback
6. Interactive components are testable with DOM test utilities

---
Implementation Dependencies and Critical Path

Phase 1: Interactive Applications Foundation

Dependencies: None - can start immediately
Critical Components:
1. Complete Plugin-State Handler - Required for any state management
2. UI Event Handling System - Core interactive capability
3. Local Component State - Essential for React-like development
4. Enhanced Scheduler Middleware - Foundation for advanced features

Phase 2: Cross-Realm Integration

Dependencies: Phase 1 completion (scheduler middleware, state handler)
Critical Components:
1. Plugin-Scripted-Workers Package - useTask hook implementation
2. TaskHandle Communication - Reactive ↔ Worker messaging
3. Testing Infrastructure Integration - Cross-realm testing

Phase 3: Distributed Systems

Dependencies: Phase 2 completion (enhanced middleware)
Critical Components:
1. Cross-Instance Protocol - Basic federated messaging
2. Message Context System - Causal tracking foundation
3. WebSocket Transport - Primary transport implementation
4. HTTP Transport - Simple request-response transport

Phase 4: Advanced Testing & Debugging

Dependencies: All previous phases
Critical Components:
1. Test-Utils Integration - Pattern matching capabilities
2. Record/Playback Infrastructure - Foundation for debugging
3. Async Task Mocking - Complete testing capability
4. Visual Debugging (TBD) - Advanced tooling

Critical Path Analysis

Highest Priority:
1. Plugin-State Handler completion (blocks all state management)
2. Enhanced Scheduler Middleware (blocks testing and cross-realm features)
3. UI Event Handling (blocks interactive applications)

Medium Priority:
1. Local Component State (improves developer experience)
2. useTask Hook (enables worker integration)
3. Cross-Instance Protocol (enables distributed features)

Lower Priority:
1. Additional Transports (HTTP, GraphQL)
2. Advanced Debugging Tools
3. Visual Debugging Interface

---
Success Metrics

Theme 1 Success Criteria

- Interactive React-like components with event handling
- Component instances with isolated local state
- UI interactions triggering scripted workers via useTask
- Unique event identification for debugging
- Seamless integration with existing reactive system

Theme 2 Success Criteria

- useTask() hook spawning workers from reactive functions
- Middleware influencing scheduler behavior for testing
- Observable worker progress and lifecycle
- Clean communication via TaskHandle.send()
- Async task mocking through middleware
- Automatic resource cleanup

Theme 3 Success Criteria

- Multi-instance communication with known peers
- Correct message routing between instances
- Basic causal context preservation
- Multiple transport mechanisms working interchangeably
- Per-instance deterministic behavior
- Foundation for distributed debugging

Theme 4 Success Criteria

- Complete async task mocking capability
- Complex message pattern testing
- Record/playbook system behavior
- Cross-realm interaction testing
- Foundation for advanced debugging tools
- Interactive component testing utilities

---
Risk Assessment

High Risk Items

1. Component Identity System Complexity - May require compiler integration
2. Cross-Instance Protocol Reliability - Distributed systems complexity
3. DOM event system integration - Determinism requirements could lead to complex implementation

Medium Risk Items

1. Worker Lifecycle Management - Resource cleanup complexity and performance implications

Mitigation Strategies

1. Incremental Implementation - Build and test each component independently
2. Comprehensive Testing - Unit, integration, and system testing for each phase
3. Performance Monitoring - Track overhead of debugging and recording features
4. Backward Compatibility - Where possible, maintain existing API compatibility

---
Conclusion

This comprehensive PRD transforms ReactiveKit from an experimental reactive runtime into a
production-ready platform for building interactive, distributed, real-time applications.
The four-theme approach provides a clear roadmap from basic interactivity to advanced
distributed debugging capabilities.

Key Transformations:
- Read-only → Interactive: Complete event handling and component state
- Isolated → Integrated: Seamless reactive-worker communication
- Single-instance → Distributed: Peer-to-peer coordination with causal tracing
- Basic → Advanced: Sophisticated testing and debugging infrastructure

Critical Success Factors:
1. Plugin-State Handler completion - Unlocks all state management
2. Enhanced Scheduler Middleware - Enables testing and behavior modification
3. Component Identity System - Provides React-like developer experience
4. Cross-Instance Protocol - Realizes distributed vision
