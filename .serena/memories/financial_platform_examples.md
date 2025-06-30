# Financial Platform Examples

Real-world examples from ReactiveKit demonstrating the integration of Reactive Functions, Scripted Workers, and the Intelligent Transport Layer in a financial trading platform.

## Portfolio Overview Widget (Reactive Function)

### Frontend Component
```typescript
// PortfolioOverview.jsx
import { useMarketExposure, useOpenOrders } from '@reactive-kit/finance-hooks';

async function PortfolioOverview() {
  const marketExposure = await useMarketExposure(); // Live data stream
  const openOrders = await useOpenOrders();       // Live data stream

  // Combine and format for display
  return {
    totalExposure: marketExposure.total,
    exposureByAsset: marketExposure.byAsset,
    activeOrders: openOrders.filter(order => order.status === 'ACTIVE').length,
    pendingValue: openOrders
      .filter(order => order.status === 'PENDING')
      .reduce((sum, order) => sum + order.estimatedValue, 0)
  };
}
```

### Key Features
- **Live Updates**: Automatically reflects changes in market data and order status
- **Dependency Tracking**: ReactiveKit tracks both data streams and recomputes efficiently
- **No Manual Subscriptions**: Framework handles all reactive updates automatically
- **Composable**: Can be used standalone or embedded in larger dashboard

## Backend Streaming Gateway (Reactive Function)

### Data Processing Service
```typescript
// PortfolioGateway.js
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

### Integration Pattern
- **Multi-Source Aggregation**: Combines multiple upstream data feeds
- **Real-Time Processing**: Transforms and correlates data as it arrives
- **Direct UI Feeding**: Output stream consumed directly by frontend components
- **Full-Stack Reactive**: Same reactive paradigm across backend and frontend

## Fund Transfer Worker (Scripted Worker)

### Ephemeral Transaction Handler
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
        send(NotificationService, readState(confirmationHandle, (conf) => ({ 
          type: 'NOTIFY_SUCCESS', 
          transactionId: conf.transactionId 
        }))),
        send(NotificationService, readState(confirmationHandle, (conf) => ({ 
          type: 'NOTIFY_FAILURE', 
          reason: conf.reason 
        })))
      )
    ),
    complete()
  ])
);
```

### Workflow Characteristics
- **Ephemeral Lifecycle**: Starts with transfer request, completes when done
- **Error Handling**: Explicit paths for success and failure scenarios
- **State Management**: Uses message state to pass data between steps
- **External Integration**: Communicates with ledger and notification services

## Fraud Detection Monitor (Scripted Worker)

### Continuous Monitoring Daemon
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

### Daemon Characteristics
- **Persistent State**: Maintains user risk scores across transactions
- **Infinite Loop**: Continuously processes incoming transaction events
- **Conditional Logic**: Only alerts when risk threshold exceeded
- **State Accumulation**: Builds up risk profile over time

## Order Execution Worker (Scripted Worker)

### Complete Trade Lifecycle Management
```javascript
// OrderExecutionWorker.js
act((self, { complete, fail }) =>
  sequence(() => [
    waitFor((msg) => msg.type === 'EXECUTE_ORDER'),
    
    // Validation phase
    send(ValidationService, readState(orderHandle, order => ({
      type: 'VALIDATE_ORDER',
      order: order
    }))),
    waitFor((msg) => msg.type === 'VALIDATION_RESULT'),
    whenState(
      readState(validationHandle, result => result.isValid),
      sequence(() => [
        // Execute trade
        send(ExchangeAPI, readState(orderHandle, order => ({
          type: 'PLACE_ORDER',
          symbol: order.symbol,
          quantity: order.quantity,
          price: order.price
        }))),
        waitFor((msg) => msg.type === 'ORDER_PLACED' || msg.type === 'ORDER_REJECTED'),
        
        // Handle execution result
        whenState(
          readState(executionHandle, result => result.status === 'FILLED'),
          sequence(() => [
            // Update portfolio
            send(PortfolioService, computeState([orderHandle, executionHandle], (order, exec) => ({
              type: 'UPDATE_POSITION',
              symbol: order.symbol,
              quantity: exec.filledQuantity,
              price: exec.averagePrice
            }))),
            
            // Notify user
            send(NotificationService, {
              type: 'ORDER_EXECUTED',
              orderId: order.id,
              status: 'success'
            }),
            
            complete()
          ]),
          // Order rejected or failed
          sequence(() => [
            send(NotificationService, {
              type: 'ORDER_FAILED',
              orderId: order.id,
              reason: exec.rejectionReason
            }),
            fail()
          ])
        )
      ]),
      // Validation failed
      sequence(() => [
        send(NotificationService, {
          type: 'ORDER_INVALID',
          orderId: order.id,
          errors: result.errors
        }),
        fail()
      ])
    )
  ])
);
```

### Enterprise Workflow Features
- **Multi-Phase Processing**: Validation, execution, portfolio update, notification
- **Complex Branching**: Multiple success/failure paths with appropriate handling
- **External System Integration**: Exchange APIs, portfolio service, notifications
- **Full Audit Trail**: Every step logged through transport layer

## Daily Report Generator (Scripted Worker)

### Scheduled Batch Processing
```javascript
// DailyReportGenerator.js
act((self, { complete }) =>
  sequence(() => [
    // Triggered by scheduler or manual request
    send(DataAggregatorService, { type: 'FETCH_DAILY_TRADES' }),
    waitFor(
      (msg) => msg.type === 'DAILY_TRADES_DATA',
      (dataHandle) => send(ReportFormattingService, readState(dataHandle, (data) => ({ 
        type: 'FORMAT_AS_PDF', 
        reportData: data.payload 
      })))
    ),
    waitFor(
      (msg) => msg.type === 'REPORT_PDF_READY',
      (pdfHandle) => send(EmailDistributionService, readState(pdfHandle, (pdf) => ({ 
        type: 'SEND_REPORT', 
        recipients: ['manager@example.com'], 
        attachmentUrl: pdf.url 
      })))
    ),
    send(LoggingService, { type: 'INFO', message: 'Daily report generated and distributed.' }),
    complete()
  ])
);
```

### Batch Processing Pattern
- **Linear Workflow**: Sequential steps with clear dependencies
- **Data Pipeline**: Fetch → Format → Distribute
- **Completion Tracking**: Explicit completion signal
- **Logging Integration**: Audit trail of report generation

## Integration Patterns

### Reactive Functions ↔ Scripted Workers
```typescript
// Reactive function displays order status
async function OrderStatus({ orderId }) {
  const orderState = await useOrderState(orderId);
  const executionProgress = await useExecutionProgress(orderId);
  
  return {
    status: orderState.status,
    progress: executionProgress.percentage,
    estimatedCompletion: executionProgress.eta
  };
}

// Scripted worker updates order state
act((self) =>
  sequence(() => [
    // ... order execution logic ...
    send(OrderStateService, { 
      type: 'UPDATE_ORDER_STATUS', 
      orderId: order.id, 
      status: 'EXECUTING',
      progress: 50
    })
    // ... continue execution ...
  ])
);
```

### Cross-Service Communication
```typescript
// Service A (Trading) → Service B (Portfolio)
// Both interactions logged and correlated by transport layer

// Trading service worker
send(PortfolioService, { 
  type: 'POSITION_CHANGE',
  userId: 'user123',
  symbol: 'AAPL',
  quantity: 100
});

// Portfolio service reactive function
async function UserPortfolio({ userId }) {
  const positions = await usePositions(userId); // Automatically updates
  const marketValues = await useMarketValues(positions.symbols);
  
  return calculatePortfolioValue(positions, marketValues);
}
```

## Debugging and Observability

### Event Log Analysis
```typescript
// Debug order execution failure
const orderDebugSession = createDebugSession({
  orderId: 'order-123',
  timeRange: { start: orderCreatedTime, end: orderFailedTime }
});

// Trace complete execution path
const executionTrace = orderDebugSession.traceWorker('OrderExecutionWorker');
console.log('Execution steps:', executionTrace.map(step => step.operation));
console.log('Failure point:', executionTrace.find(step => step.failed));

// Examine cross-service interactions
const crossServiceCalls = orderDebugSession.findCrossServiceMessages();
console.log('External API calls:', crossServiceCalls.filter(call => call.target.startsWith('ExchangeAPI')));
```

### Performance Monitoring
```typescript
// Monitor portfolio widget performance
const performanceMetrics = analyzeComponent('PortfolioOverview', {
  timeWindow: '1 hour',
  metrics: ['updateFrequency', 'renderTime', 'dependencyCount']
});

console.log('Average update time:', performanceMetrics.avgUpdateTime);
console.log('Dependency efficiency:', performanceMetrics.dependencyHitRatio);
```

These examples demonstrate the power of ReactiveKit's unified architecture, showing how Reactive Functions and Scripted Workers can work together to build robust, observable, and debuggable financial systems.