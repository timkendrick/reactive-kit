# Scripted Workers Architecture

## Overview
Scripted Workers are stateful, repeatable procedural workflows that operate in the asynchronous actor world. They provide deterministic orchestration of multi-step operations, from short-lived tasks to long-running event-driven services, with full auditability and reproducibility.

## Core Concepts

### Deterministic Workflows
- Define step-by-step procedural logic using composable primitives
- Every operation is based on clearly-defined state transitions
- All execution is recorded in the event log for perfect reproducibility
- Suitable for both ephemeral tasks and daemon processes

### Actor-Based Execution
- Built on ReactiveKit's actor system with message-passing communication
- Isolated state management within each worker
- Controlled side effects through the intelligent transport layer
- Concurrent execution model with deterministic behavior

### Composable Control Flow
- Rich set of primitives for sequences, conditionals, loops, and communication
- Declarative API makes complex workflows clear and maintainable
- Powerful combinators for building reusable workflow patterns
- Built-in state management and message-passing capabilities

## Core Implementation

### VM Compiler and Runtime
- **packages/scripted-workers**: Core implementation and virtual machine
- **packages/actor**: Actor system primitives
- **packages/scheduler**: Message scheduling and coordination
- Compiles workflow definitions into executable operations

### Control Flow Primitives

#### Sequential Operations
```javascript
sequence(() => [
  send(ServiceA, { type: 'START_PROCESS' }),
  waitFor(msg => msg.type === 'PROCESS_READY'),
  send(ServiceB, { type: 'CONTINUE_PROCESS' }),
  complete()
])
```

#### Conditional Logic
```javascript
whenState(
  readState(handle, state => state.amount > 1000),
  send(HighValueService, { type: 'PROCESS_HIGH_VALUE' }),
  send(StandardService, { type: 'PROCESS_STANDARD' })
)
```

#### State Management
```javascript
withState(() => ({ counter: 0 }), stateHandle =>
  sequence(() => [
    modifyState(stateHandle, state => ({ counter: state.counter + 1 })),
    send(LoggerService, computeState(stateHandle, s => ({ count: s.counter })))
  ])
)
```

#### Iterative Processing
```javascript
whileLoop(loop =>
  sequence(() => [
    waitFor(msg => msg.type === 'WORK_ITEM'),
    // Process work item
    send(ProcessorService, readState(workHandle, work => work.data)),
    // Continue loop
    loop.continue()
  ])
)
```

## Worker Types and Examples

### Ephemeral Workers
Short-lived tasks that complete and terminate:

```javascript
// Fund Transfer Worker
act((self, { complete, fail }) =>
  sequence(() => [
    waitFor(msg => msg.type === 'INITIATE_TRANSFER'),
    send(LedgerService, { type: 'EXECUTE_TRANSFER' }),
    waitFor(msg => msg.type === 'TRANSFER_CONFIRMED' || msg.type === 'TRANSFER_FAILED'),
    whenState(
      readState(confirmationHandle, conf => conf.type === 'TRANSFER_CONFIRMED'),
      send(NotificationService, { type: 'NOTIFY_SUCCESS' }),
      send(NotificationService, { type: 'NOTIFY_FAILURE' })
    ),
    complete()
  ])
);
```

### Daemon Workers
Long-running services that process events indefinitely:

```javascript
// Real-time Fraud Monitor
act((self) =>
  withState(() => ({ userRiskScores: {} }), scoreHandle =>
    whileLoop(() =>
      sequence(() => [
        waitFor(msg => msg.type === 'NEW_TRANSACTION'),
        modifyState(scoreHandle, (transaction) => (scores) => {
          const newScore = scores.userRiskScores[transaction.userId] + calculateRisk(transaction);
          return { userRiskScores: { ...scores.userRiskScores, [transaction.userId]: newScore } };
        }),
        whenState(
          computeState([scoreHandle, transactionHandle], (s, t) => s.userRiskScores[t.userId] > 10),
          send(AlertService, { type: 'HIGH_FRAUD_RISK_ALERT' })
        )
      ])
    )
  )
);
```

### Task-Based Workers
Workers triggered by external events or schedules:

```javascript
// Daily Report Generator
act((self, { complete }) =>
  sequence(() => [
    send(DataAggregatorService, { type: 'FETCH_DAILY_TRADES' }),
    waitFor(msg => msg.type === 'DAILY_TRADES_DATA'),
    send(ReportFormattingService, { type: 'FORMAT_AS_PDF' }),
    waitFor(msg => msg.type === 'REPORT_PDF_READY'),
    send(EmailDistributionService, { type: 'SEND_REPORT' }),
    complete()
  ])
);
```

## State Management

### Internal State
```javascript
withState(() => initialState, stateHandle => {
  // Worker logic with access to stateHandle
  modifyState(stateHandle, updater);
  computeState(stateHandle, selector);
  readState(stateHandle, accessor);
})
```

### State Operations
- **modifyState**: Update state using pure functions
- **computeState**: Derive values from state
- **readState**: Access current state values
- All state operations are deterministic and logged

### State Persistence
- State changes recorded in event log
- Perfect reproducibility through replay
- State restoration for debugging and testing
- Cross-restart state continuity for daemon workers

## Message-Driven Communication

### Inter-Worker Communication
```javascript
// Send messages to other workers
send(TargetWorker, messageData);

// Wait for specific message types
waitFor(msg => msg.type === 'EXPECTED_RESPONSE');

// Conditional message handling
when(
  msg => msg.type === 'SUCCESS',
  handleSuccess,
  handleFailure
);
```

### External System Integration
- All external I/O mediated through the transport layer
- Side effects recorded for deterministic replay
- Automatic correlation with reactive functions
- Full causal traceability across system boundaries

## VM Architecture

### Compilation Process
- Declarative workflow definitions compiled to executable operations
- Block-based instruction set for control flow
- State machine representation for resumable execution
- Optimized for deterministic replay

### Operation Types
- **Control Flow**: sequence, conditional, loops
- **Communication**: send, waitFor, spawn, kill
- **State Management**: modify, compute, read
- **Lifecycle**: complete, fail, delay

### Execution Model
- Stack-based virtual machine
- Resumable execution at any operation
- Deterministic operation ordering
- Complete execution trace logging

## Integration with Transport Layer

### Event Logging
- All worker operations recorded as serialized messages
- State transitions captured with full context
- Message exchanges logged with timing information
- Enables perfect replay and debugging

### Causal Traceability
- Worker actions linked to triggering events
- Cross-worker message flows tracked
- Integration with reactive function dependencies
- Distributed system correlation

### Deterministic Replay
- Reproduce exact worker execution from event log
- Simulate external side effects during replay
- Debug complex distributed workflows
- Regression testing with recorded scenarios

## Testing Scripted Workers

### Message Sequence Testing
```javascript
test('fund transfer workflow', async () => {
  const worker = new FundTransferWorker();
  await worker.processMessages([
    { type: 'INITIATE_TRANSFER', amount: 1000 },
    { type: 'TRANSFER_CONFIRMED', transactionId: '123' }
  ]);
  
  expect(worker.emittedMessages).toEqual([
    { type: 'EXECUTE_TRANSFER', amount: 1000 },
    { type: 'NOTIFY_SUCCESS', transactionId: '123' }
  ]);
});
```

### State Verification
```javascript
test('fraud detection state', async () => {
  const worker = new FraudMonitorWorker();
  
  // Process transactions
  await worker.processMessage({ type: 'NEW_TRANSACTION', userId: 'user1', amount: 5000 });
  await worker.processMessage({ type: 'NEW_TRANSACTION', userId: 'user1', amount: 6000 });
  
  // Verify state changes
  expect(worker.getState().userRiskScores['user1']).toBeGreaterThan(10);
  expect(worker.emittedMessages).toContainMessage({ type: 'HIGH_FRAUD_RISK_ALERT' });
});
```

### Deterministic Scenarios
- Record real execution sequences
- Replay exact conditions for debugging
- Verify workflow behavior under various conditions
- Test error recovery and edge cases