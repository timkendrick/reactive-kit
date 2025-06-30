# Intelligent Transport Layer

## Overview
The Intelligent Transport Layer is ReactiveKit's deterministic, observable system backbone that coordinates all interactions between Reactive Functions and Scripted Workers. It provides an ordered event bus with complete causal traceability, enabling perfect reproducibility and unprecedented debugging capabilities.

## Core Architecture

### Central Event Bus
- All ReactiveKit interactions flow through a unified event bus
- Ordered event log with full causal traceability
- More than just recording - the event bus actively drives the system
- New entries automatically trigger corresponding actions

### Deterministic Coordination
- Synchronizes Reactive Functions and Scripted Workers
- Guarantees consistent ordering of events
- Enables reproducible behavior for any sequence of inputs
- Forms the foundation for time-travel debugging

### Distributed Correlation
- Correlates event logs from distributed ReactiveKit instances
- Provides unified view of system-wide operations
- Traces actions across service boundaries
- Maintains causality even across processes or machines

## Event Log Structure

### Message Types
```typescript
interface ReactiveEvent {
  id: string;
  timestamp: number;
  type: 'effect_subscribe' | 'effect_unsubscribe' | 'effect_update' | 'worker_message';
  source: ComponentId | WorkerId;
  target?: ComponentId | WorkerId;
  payload: unknown;
  causalChain: EventId[];
}
```

### Causal Chaining
- Every event references its triggering causes
- Complete dependency graph maintained automatically
- Cross-boundary causality preserved
- Enables precise root cause analysis

### Side Effect Recording
```typescript
interface SideEffect {
  id: string;
  type: 'http_request' | 'file_read' | 'timer' | 'external_api';
  trigger: EventId;
  request: unknown;
  response?: unknown;
  error?: Error;
  timestamp: number;
}
```

## Key Capabilities

### Guaranteed Determinism
- Perfectly reproducible behavior for given sequence of external inputs
- All non-deterministic operations (I/O, timers) recorded as side effects
- Replay produces identical results by simulating recorded side effects
- Enables confident testing and debugging

### Precision Debugging
```typescript
// Debug specific event sequence
const debugSession = createDebugSession({
  eventLog: systemEventLog,
  timeRange: { start: '2024-01-01T10:00:00Z', end: '2024-01-01T10:05:00Z' },
  focusComponent: 'PortfolioOverview'
});

// Trace exact causality
const causalChain = debugSession.traceCausality(problemEventId);
console.log('Root cause:', causalChain[0]);
console.log('Effect chain:', causalChain.map(e => e.type));
```

### Time-Travel Debugging
- Replay system state at any point in time
- Step through event sequences one by one
- Modify events and see alternative outcomes
- Perfect reproduction of production issues

### Record/Replay Testing
```typescript
// Record production session
const recordedSession = recordSession({
  duration: '1 hour',
  components: ['PortfolioWidget', 'OrderExecutor'],
  includeExternalApis: true
});

// Replay for testing
const testResult = replaySession(recordedSession, {
  modifications: {
    // Inject test conditions
    'api.market-data': mockMarketDataResponses
  }
});
```

## Implementation Packages

### Core Transport
- **packages/handlers**: Effect handlers managing transport layer
- **packages/cache**: Dependency tracking and cache invalidation
- **packages/hash**: Deterministic hashing for event correlation
- **packages/scheduler**: Message scheduling and ordering

### Event Processing
- **packages/runtime**: Central coordination and event routing
- **packages/actor**: Actor system integration for scripted workers
- **packages/interpreter**: Reactive function integration

### Logging and Replay
- Event serialization and storage
- Causal chain reconstruction
- Side effect simulation
- Distributed log correlation

## Reactive Function Integration

### Effect Subscription Tracking
```typescript
// Reactive function subscribes to effect
async function PortfolioOverview() {
  const exposure = await useMarketExposure(); // Logged: effect_subscribe
  return formatExposure(exposure);           // Logged: computation_result
}
// Automatic unsubscription logged when function cleanup occurs
```

### Dependency Change Propagation
1. External data changes (e.g., market price update)
2. Transport layer logs the change event
3. Affected reactive functions identified via dependency graph
4. Recomputation triggered and new results logged
5. Dependent components updated automatically

### Causal Linking
- Reactive function subscriptions linked to triggering events
- Computation results traced to input dependencies
- Cross-component dependencies tracked automatically
- Full audit trail of reactive updates

## Scripted Worker Integration

### Message Flow Logging
```typescript
// Worker sends message
send(LedgerService, { type: 'EXECUTE_TRANSFER', amount: 1000 });
// Logged: { type: 'worker_message', source: 'FundTransfer', target: 'LedgerService' }

// Worker waits for response
waitFor(msg => msg.type === 'TRANSFER_CONFIRMED');
// Logged: { type: 'worker_wait', source: 'FundTransfer', condition: 'TRANSFER_CONFIRMED' }
```

### State Transition Recording
```typescript
// State modification logged with full context
modifyState(accountHandle, account => ({ 
  ...account, 
  balance: account.balance - transferAmount 
}));
// Logged: { type: 'state_change', worker: 'FundTransfer', before: {...}, after: {...} }
```

### Cross-Worker Causality
- Message sends create causal links between workers
- Worker spawning relationships tracked
- Distributed workflow coordination logged
- End-to-end process traceability

## Distributed System Support

### Local Event Logs
- Each ReactiveKit service maintains its own local event log
- No single universal log required
- Autonomous operation with periodic correlation

### Cross-Service Correlation
```typescript
// Service A sends request to Service B
const response = await callService('portfolio-service', { userId: 'user123' });
// Logged in both services with correlation ID

// Later debugging correlates the logs
const distributedTrace = correlateServices(['trading-service', 'portfolio-service'], {
  timeWindow: '2024-01-01T10:00:00Z to 2024-01-01T10:05:00Z',
  correlationId: 'req-abc123'
});
```

### Service Boundary Tracing
- API calls logged with request/response pairs
- Message queue interactions recorded
- Database operations captured
- Complete distributed system visibility

## Middleware and Extensions

### Observability Hooks
```typescript
// Custom middleware for metrics collection
const metricsMiddleware = {
  onEvent: (event) => {
    prometheus.incrementCounter('reactivekit_events_total', { type: event.type });
    if (event.duration > 1000) {
      prometheus.observeHistogram('reactivekit_slow_events', event.duration);
    }
  }
};

registerMiddleware(metricsMiddleware);
```

### Custom Logging
```typescript
// Application-specific event enrichment
const auditMiddleware = {
  onEvent: (event) => {
    if (event.type === 'financial_transaction') {
      auditLog.record({
        userId: event.payload.userId,
        amount: event.payload.amount,
        timestamp: event.timestamp,
        causalChain: event.causalChain
      });
    }
  }
};
```

### Recording Strategies
- **Development**: Full event recording for debugging
- **Staging**: Selective recording for performance testing
- **Production**: Error-focused recording with sampling
- **Compliance**: Audit-trail recording for regulatory requirements

## Performance Considerations

### Event Log Management
- Configurable retention policies
- Automatic log rotation and archival
- Compression for long-term storage
- Efficient querying and correlation

### Real-Time Processing
- Streaming event processing for live debugging
- Minimal overhead for production systems
- Efficient serialization and networking
- Scalable distributed log correlation

### Storage Optimization
- Deduplication of similar events
- Compression of payload data
- Index optimization for fast queries
- Distributed storage for large deployments

## Development and Debugging Tools

### Event Log Inspector
- Visual timeline of system events
- Causal chain visualization
- Filter and search capabilities
- Real-time event streaming

### Replay Debugger
- Step-by-step execution replay
- State inspection at any point
- Side effect modification for testing
- Alternative scenario exploration

### Performance Profiler
- Component execution timing
- Message latency analysis
- Bottleneck identification
- Resource usage correlation