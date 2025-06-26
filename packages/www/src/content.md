# ReactiveKit

## The Full-Stack Framework for [Deterministic | Debuggable | Testable | Replayable | Observable] Real-Time Distributed Systems

ReactiveKit is your all-in-one backbone for robust, real-time applications that are testable and debuggable by design – from interactive UIs to data-processing pipelines.

<!-- Primary CTA: GitHub Star Button (Embedded) - This would be actual HTML/JS in the final site -->
<!-- Secondary CTA: "Learn more" (Button that smoothly scrolls down to next section) -->

## Key Benefits at a Glance

*   ### Always Live Data, **All the Time**
    <figure>
        <figcaption>Visual mockup combining a code snippet for a reactive portfolio value component and a dynamic price field showing the portfolio value updating live.</figcaption>
    </figure>
    #### ReactiveKit **abstracts away the complexity** of subscriptions, callbacks and caches.
    ReactiveKit's core architecture makes stale data a thing of the past, ensuring your components throughout the stack always reflect the latest live updates, automatically and efficiently, with zero effort.

*   ### Build Systems That **Explain Themselves**
    <figure>
        <figcaption>Visual mockup displaying a "System Event Timeline" with interconnected events</figcaption>
    </figure>
    #### ReactiveKit generates a **complete causal history** of every action
    Understand precisely why your system is in its current state, with every change automatically traced and linked.

    1.  **Write declarative logic:** Define what should happen, not how
    2.  **Get automatic traceability:** Every state change is causally linked
    3.  **Debug with precision:** Replay exact conditions, trace root causes


*   ### Every Message. Every State Change. **Completely Deterministic.**
    <figure>
        <figcaption>Visual mockup showing a terminal with a "REPLAY_SESSION" command and output</figcaption>
    </figure>
    #### Isolate any bug and trace every decision with **perfect reproducibility.**
    Build with confidence, knowing your system's behavior is predictable and reproducible.
    ##### Debug with surgical precision
    *   Replay any system state from any point in time
    *   Trace exact causal chains across distributed components
    *   Test edge cases with perfect reproducibility

## A New Paradigm for Real-Time Systems

ReactiveKit offers a unified and simplified approach by combining three powerful building blocks:
*   **Reactive Components:** Define complex live computations anywhere on your stack
    **Use cases:**
    * Dynamic front-end UI widgets
    * Back-end streaming API endpoints
    * Real-time dashboard panels
*   **Scripted Workers:** Orchestrate stateful, repeatable procedural logic across your entire system
    **Use cases:**
    * Complex client-side form validation
    * Data processing pipelines
    * Alerting mechanisms
*   **Intelligent Transport Layer:** Ordered event bus that synchronizes all Reactive Components and Scripted Workers
    **Key Features:**
    * All application communication flows through this layer
    * Provides the backbone for deterministic system behavior

### Reactive Components
> Define complex live computations anywhere on the stack

Reactive Components express a **live computation**, written as an `async` function.

The output of a Reactive Component can be a UI element, a streaming value to be exposed via an API, or any other serializable data structure, allowing the same components to be used interchangeably on both front-end and back-end.

Unlike standard async functions in UI frameworks, Reactive Components are managed by ReactiveKit's runtime, enabling automatic dependency tracking, efficient incremental re-computation, and causal logging across the entire stack.

Just use `await` keywords wherever you read from a live data stream, and ReactiveKit ensures it's always up-to-date with the underlying data, automatically.

`await` calls can be chained to combine dependent data streams intuitively: ReactiveKit performs automatic live joining in the background, so nested dependencies stay synchronized without any manual coordination.

*   **Declarative & Composable:** Focus on the "what," not the "how." Build up arbitrarily complex component logic, while ReactiveKit keeps everything in sync.
*   **Efficient Updates:** Built-in intelligent dependency caching ensures only the outputs that have changed are re-evaluated, ensuring your application stays performant at scale.
*   **Truly Full-Stack:** Use the same familiar syntax to build both dynamic, real-time user interface elements on the front-end, and to define reactive data transformations and services on the backend with the same paradigm. The output of a Reactive Component can be a UI element, a streaming value to be exposed via an API, or any other data structure, allowing the same component to be moved back and forth between front-end and back-end.

#### Example: `PortfolioOverview.jsx`
*   **Description:** A component for a financial dashboard that displays a combined view of the user's current market exposure across asset classes and the status of their open orders.
*   **Conceptual Snippet:**
    ```typescript
    import { useMarketExposure, useOpenOrders } from '@reactive-kit/finance-hooks';

    async function PortfolioOverview() {
      const marketExposure = await useMarketExposure(); // Live data stream
      const openOrders = await useOpenOrders();       // Live data stream

      // Combine and format for display
      return {
        totalExposure: marketExposure.total,
        exposureByAsset: marketExposure.byAsset,
        activeOrders: openOrders.filter(order => order.status === 'ACTIVE').length,
        // ... other relevant overview data
      };
    }
    ```

#### Example: `PortfolioGateway.js`
*   **Description:** A backend Reactive Component that acts as a gateway, subscribing to an internal market data stream and an order management system stream. It processes and combines this data to provide the live feed required by the "Portfolio Overview Widget."
*   **Conceptual Snippet:**
    ```typescript
    import { useUpstreamMarketData, useOrderSystemEvents } from '@reactive-kit/internal-data-hooks';
    import { transformMarketData, correlateWithOrders } from './data-processors';

    async function PortfolioWidgetStream() {
      const rawMarketData = await useUpstreamMarketData();
      const orderEvents = await useOrderSystemEvents();

      const processedMarketData = transformMarketData(rawMarketData);
      const livePortfolioView = correlateWithOrders(processedMarketData, orderEvents);

      return livePortfolioView; // This stream directly feeds the PortfolioOverview widget
    }
    ```

### Scripted Workers
> Stateful, repeatable process orchestration

Scripted Workers are composable runners for <strong>deterministic procedural workflows</strong>, suitable for both short-lived one-off tasks and long-running event-driven services.

They provide a structured way to orchestrate multi-step operations, ensuring each step is executed predictably and reliably, making them ideal for anything from data processing pipelines to user interaction flows.

Build complex workflows using powerful control flow primitives for operation sequences, conditional branching, iterative loops, internal state management, and message-passing communication.

Every operation is based on clearly-defined state transitions and is recorded in the event log, making the execution of Scripted Workers perfectly reproducible for testing and debugging. All side effects are mediated through the Intelligent Transport Layer to ensure full replayability.

*   **Declarative & Composable:** The intuitive declarative API and powerful combinators make it simple to build up clear, testable, and maintainable logic.
*   **Deterministic Stateful Logic:** Similar to state machines or actors, define synchronous and asynchronous workflows step-by-step, ensuring predictable, testable behavior and state transitions.
*   **Message-Driven Communication:** Interact with Reactive Components or other Workers via a simple message-passing API that integrates deeply with ReactiveKit's intelligent transport layer to allow communication with the rest of the system.

#### Examples of Scripted Workers

Here are a few conceptual snippets in JavaScript, omitting imports for brevity:

##### 1. Ephemeral Worker: Fund Transfer
*   **Description:** Processes a one-time fund transfer request, interacts with a ledger, and notifies upon completion or failure.
*   **Conceptual Snippet:**
    ```javascript
    // FundTransferWorker.js
    act((self, { outbox, complete, fail }) =>
      sequence(() => [
        waitFor(
          (msg) => msg.type === 'INITIATE_TRANSFER',
          (requestHandle) => send(LedgerService, readState(requestHandle, (req) => ({ 
            type: 'EXECUTE_TRANSFER', 
            fromAccount: req.fromAccount, 
            toAccount: req.toAccount, 
            amount: req.amount 
          })))
        ),
        waitFor(
          (msg) => msg.type === 'TRANSFER_CONFIRMED' || msg.type === 'TRANSFER_FAILED',
          (confirmationHandle) => whenState(
            readState(confirmationHandle, (conf) => conf.type === 'TRANSFER_CONFIRMED'),
            send(NotificationService, readState(confirmationHandle, (conf) => ({ type: 'NOTIFY_SUCCESS', transactionId: conf.transactionId }))),
            send(NotificationService, readState(confirmationHandle, (conf) => ({ type: 'NOTIFY_FAILURE', reason: conf.reason })))
          )
        ),
        complete()
      ])
    );
    ```

##### 2. Daemon Worker: Real-time Fraud Monitor
*   **Description:** Continuously monitors incoming transactions, updating a risk score per user and alerting if a threshold is breached.
*   **Conceptual Snippet:**
    ```javascript
    // FraudDetectionMonitor.js
    act((self, { outbox }) =>
      withState(() => ({ userRiskScores: {} }), (scoreHandle) =>
        whileLoop((loop) =>
          sequence(() => [
            waitFor(
              (msg) => msg.type === 'NEW_TRANSACTION',
              (transactionHandle) => sequence(() => [
                modifyState(scoreHandle, readState(transactionHandle, (tx) => (scores) => {
                  const userId = tx.userId;
                  const currentScore = scores.userRiskScores[userId] || 0;
                  const transactionRisk = tx.amount > 10000 ? 5 : (tx.amount > 1000 ? 2 : 1);
                  const newScore = currentScore + transactionRisk;
                  return { userRiskScores: { ...scores.userRiskScores, [userId]: newScore } };
                })),
                whenState(
                  computeState([scoreHandle, transactionHandle], (s, t) => s.userRiskScores[t.userId] > 10), 
                  send(AlertService, computeState([scoreHandle, transactionHandle], (s, t) => ({ 
                    type: 'HIGH_FRAUD_RISK_ALERT', 
                    userId: t.userId, 
                    currentScore: s.userRiskScores[t.userId] 
                  })))
                )
              ])
            )
            // This loop runs indefinitely, processing transactions
          ])
        )
      )
    );
    ```

##### 3. Ephemeral Worker: Daily Report Generation
*   **Description:** A worker that can be triggered (e.g., by a scheduler) to generate and distribute a daily financial report.
*   **Conceptual Snippet:**
    ```javascript
    // DailyReportGenerator.js
    act((self, { outbox, complete }) =>
      sequence(() => [
        // Example: Worker might wait for a trigger message if not auto-started
        // waitFor((msg) => msg.type === 'GENERATE_DAILY_REPORT'),
        
        send(DataAggregatorService, { type: 'FETCH_DAILY_TRADES' }),
        waitFor(
          (msg) => msg.type === 'DAILY_TRADES_DATA',
          (dataHandle) => send(ReportFormattingService, readState(dataHandle, (data) => ({ type: 'FORMAT_AS_PDF', reportData: data.payload })))
        ),
        waitFor(
          (msg) => msg.type === 'REPORT_PDF_READY',
          (pdfHandle) => send(EmailDistributionService, readState(pdfHandle, (pdf) => ({ type: 'SEND_REPORT', recipients: ['manager@example.com'], attachmentUrl: pdf.url })))
        ),
        send(LoggingService, { type: 'INFO', message: 'Daily report generated and distributed.' }),
        complete()
      ])
    );
    ```

### Intelligent Transport Layer
> Deterministic, observable system backbone

All ReactiveKit interactions and data pass through a central event bus, producing an ordered event log with full causal traceability.

This layer is the fundamental backbone of your ReactiveKit application. More than just a record of events, the event bus effectively drives the system: new entries automatically trigger corresponding actions in Reactive Components and Scripted Workers.

ReactiveKit's transport layer correlates the event logs from distributed ReactiveKit instances, providing a unified view of system-wide operations even when services span different processes or machines.

This transport layer can be easily extended with middleware to provide complex logging, observability, recording, and more. This leads to a truly deterministic, observable, and debuggable system.

#### What's happening under the hood

All actions are recorded as serialized messages, forming a replayable log. Asynchronous actions that involve external systems are recorded as *side-effects*.

The event log tracks the point when a side-effect is triggered, and records any incoming results produced by the side-effect. This allows middleware to simulate the side-effect during debugging or replay sessions, accurately reproducing the original behavior.

Each service within a distributed ReactiveKit system maintains its own **local event log**. All interactions with other services are recorded in the event logs of both services, allowing actions to be traced across services.

When debugging interactions between services, the event logs of both services are automatically correlated,
allowing the causal history of an action to be traced across service boundaries.

This means that while there is no single universal event log for the distributed system as a whole,
the event log of a particular service can be chosen as the frame of reference for debugging and testing, ensuring a consistent view of events across all services.

*   **Guaranteed Determinism:** Perfectly reproducible behavior for a given sequence of external inputs
*   **Causal Event Log:** Every message, state change, and interaction forms an ordered, traceable history
*   **Precision Debugging & Testing:** Trace exact event sequences to diagnose issues or verify behavior
*   **Built-in Record/Replay:** The event log enables recording and replaying system interactions for in-depth debugging, regression testing, or scenario analysis
*   **Distributed Observability:** Gain insights into how different components of your distributed ReactiveKit system interact, even across service boundaries

<figure>
    <figcaption>Abstract diagram of messages and events flowing through a central point, emphasizing an ordered "stream" or "ledger" of these events. Visual cues could suggest a timeline or logical ordering, with links between related events to show causality. This also hints at the ability for different parts of a distributed system to communicate via this layer.</figcaption>
</figure>

### Rich Plugin Ecosystem
ReactiveKit is built upon a highly pluggable architecture, allowing you to extend its capabilities or integrate with your existing stack.

Leverage a growing library of official plugins, or even write your own.

*   ReactiveKit core bundle: State Management, Timers, etc
*   HTTP Fetch
*   [Coming soon] WebSocket transport
*   [Coming soon] GraphQL (Client & Server)
*   [Coming soon] gRPC (Client & Server)

*   [Coming soon] SQL (Postgres, MySQL)
*   [Coming soon] NoSQL (MongoDB, Redis)
*   [Coming soon] NATS transport
*   [Coming soon] Kafka transport
*   [Coming soon] Kubernetes orchestration

## Why Choose ReactiveKit?
*   **Deterministic by Design:** Build real-time systems you can trust to behave predictably and reproducibly.
*   **Radically Testable:** ReactiveKit test utilities make it easy to write comprehensive tests with confidence, from individual units to complex interactions.
*   **Deeply Debuggable:** Untangle complex edge cases with an unprecedented view into your system's causal history.
*   **Inherently Robust:** Architected for resilience and predictable error recovery.
*   **Simplified Development:** Drastically reduce boilerplate for state synchronization, concurrency, and async logic. Focus on building, not plumbing.

## Case study: Building a Financial Platform with ReactiveKit

See how ReactiveKit helps build powerful distributed systems, integrating with your existing infrastructure

<figure><figcaption>System architecture overview illustrating the interactions between the components described below</figcaption></figure>

### 📊 Portfolio Overview Widget
Reactive Component providing live, consolidated view of market exposure
*   <figure><figcaption>Clean mockup of the Portfolio Overview Widget UI, showing dynamic data fields for market exposure and order status.</figcaption></figure>
*   **Example:** `PortfolioOverview.jsx`
*   **Description:** Our platform features a client-facing dashboard. A key element is the 'Portfolio Overview Widget,' providing a live, consolidated view of market exposure and open order statuses.
*   **RK Role:** This is built as a Reactive Component, directly using the output of our backend Streaming Gateway.

### 🌊 Backend Streaming Gateway
Processes and unifies multiple data feeds into clean real-time streams
*   <figure><figcaption>Data flow diagram: Multiple upstream data feeds (e.g., stock tickers, news feeds, internal order events) flowing into the Reactive Component-based Streaming Gateway, which then outputs a unified, processed stream to the Portfolio Overview Widget and potentially other services.</figcaption></figure>
*   **Example:** `PortfolioGateway.js`
*   **Description:** To power the Portfolio Overview Widget and other internal services, a 'Streaming Gateway' Reactive Component subscribes to raw market data feeds and internal order system events.
*   **RK Role:** It processes, transforms, and unifies these into a clean, real-time data stream tailored for consumers like our UI widget.

### ⚙️ Automated Order Executio
Scripted Worker handling complete trade lifecycle with full auditabilityn
*   <figure><figcaption>Flowchart illustrating the steps of the Order Execution Worker: Receive Order -> Validate -> Send to Exchange -> Wait for Confirmation -> Update Portfolio -> Notify User.</figcaption></figure>
*   **Example:** `OrderExecutionWorker.js`
*   **Description:** When a user initiates a trade, or an algorithmic signal is generated, an 'Order Execution Worker' takes over.
*   **RK Role:** This Scripted Worker handles the entire lifecycle: validating the order, interacting with exchange APIs, awaiting confirmation, updating the portfolio state, and notifying the user. Its logic is deterministic and fully auditable through the Transport Layer.

### Coming soon: ReactiveKit Observability Suite:
We're committed to an unparalleled developer experience. Our upcoming suite of observability and debugging tools will provide deep insight and control over your ReactiveKit applications.

*   **Visual Debugger:**
    *   <figure><figcaption>Mockup 1: Time-travel debugging interface, showing a timeline of events. A slider allows dragging back and forth, with the application state updating to reflect the selected point in time. Event details are shown for a selected event.</figcaption></figure>
    *   <figure><figcaption>Mockup 2: A graph visualizing message flows between different Reactive Components and Scripted Workers. Lines connect components, indicating messages, and perhaps dependencies are highlighted.</figcaption></figure>
*   **Performance Profiler & System Visualization:**
    *   <figure><figcaption>Mockup 3: A dashboard UI displaying performance metrics. Charts show component/worker execution times, message latencies, and potential system bottlenecks are flagged.</figcaption></figure>
*   **Advanced Observability Hooks:**
    *   <figure><figcaption>Mockup 4: A settings screen or code snippet showing easy integration with OpenTelemetry. Another panel shows a conceptual view of how ReactiveKit data might appear in a Prometheus/Grafana dashboard, or an advanced error tracking service dashboard.</figcaption></figure>

## Get Started
*   [Star on GitHub:](https://github.com/timkendrick/reactive-kit) Get the code, explore the architecture, and contribute!
*   [Explore Code Examples:](https://github.com/timkendrick/reactive-kit/) Dive into our source code examples and see ReactiveKit's principles in action.
*   [Read the Docs:](./docs) Deep dive into concepts, APIs, and guides.
