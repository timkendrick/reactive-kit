# Reactive Functions Architecture

## Overview
Reactive Functions are live computations that automatically stay up-to-date with their dependencies. They use familiar `async`/`await` syntax but are compiled into resumable state machines that enable fine-grained reactivity and automatic recomputation.

## Core Concepts

### Live Computations
- Written as `async` functions using standard JavaScript/TypeScript syntax
- Automatically recompute when any dependency changes
- Abstract away subscriptions, callbacks, and manual caching
- Always reflect the latest state of underlying data

### Dependency Tracking
- Every `await` call creates a tracked dependency
- Runtime maintains complete dependency graph
- Changes propagate efficiently through the graph
- Only affected computations are re-evaluated

### Compilation Process
- Babel plugin transforms `async`/`await` into state machines
- Preserves resumable execution at any `await` point
- Enables fine-grained control over computation lifecycle
- Maintains deterministic behavior for replay

## Key Features

### Automatic Synchronization
```typescript
async function PortfolioOverview() {
  const marketExposure = await useMarketExposure(); // Auto-tracked dependency
  const openOrders = await useOpenOrders();       // Auto-tracked dependency
  
  // Automatically recomputes when either dependency changes
  return {
    totalExposure: marketExposure.total,
    activeOrders: openOrders.filter(order => order.status === 'ACTIVE').length
  };
}
```

### Declarative Composition
- Chain `await` calls to combine dependent data streams
- Nested dependencies stay synchronized automatically
- No manual coordination required
- Intuitive data flow composition

### Efficient Updates
- Built-in intelligent dependency caching
- Only changed outputs are re-evaluated
- Minimizes computational overhead
- Scales efficiently with system complexity

## Full-Stack Usage

### Frontend Applications
```typescript
// UI Component
async function StockTicker() {
  const price = await useStockPrice('AAPL');
  const trend = await usePriceTrend('AAPL', '1h');
  
  return (
    <div className={trend > 0 ? 'up' : 'down'}>
      AAPL: ${price.toFixed(2)}
    </div>
  );
}
```

### Backend Services
```typescript
// Streaming API Endpoint
async function PortfolioStream() {
  const rawMarketData = await useUpstreamMarketData();
  const orderEvents = await useOrderSystemEvents();
  
  const processedData = transformMarketData(rawMarketData);
  return correlateWithOrders(processedData, orderEvents);
}
```

### Cross-Stack Reusability
- Same component can work on frontend or backend
- Output can be UI elements, API responses, or data structures
- Move components between tiers without code changes
- Unified programming model across stack

## Runtime Architecture

### Interpreter System
- **packages/interpreter**: Core evaluation engine
- **packages/runtime**: Coordination and scheduling
- **packages/compiler**: Standalone compilation

### Effect System
- **Effects**: Declarative descriptions of reactive dependencies
- **Handlers**: Implement effect behavior in transport layer
- **Hooks**: Provide reactive function access to effects

### Dependency Management
- **packages/cache**: Dependency tracking and invalidation
- **packages/hash**: Deterministic hashing for cache keys
- Fine-grained invalidation of affected computations

## Integration with Transport Layer

### Effect Subscription
- Reactive functions subscribe to effects through `await` calls
- Transport layer manages effect lifecycles
- Automatic cleanup when functions are no longer needed

### Causal Tracking
- All effect subscriptions recorded in event log
- Dependency changes traced through causal chain
- Full history available for debugging and replay

### Deterministic Behavior
- Same sequence of effect values produces same output
- Perfect reproducibility for testing and debugging
- Enables time-travel debugging capabilities

## Development Patterns

### Hook Usage
```typescript
// Custom reactive hook
async function useUserPortfolio(userId: string) {
  const user = await useUser(userId);
  const positions = await usePositions(user.accountId);
  const prices = await useMarketPrices(positions.map(p => p.symbol));
  
  return calculatePortfolioValue(positions, prices);
}
```

### Error Handling
```typescript
async function SafePortfolioView() {
  try {
    const portfolio = await useUserPortfolio('user123');
    return { status: 'success', data: portfolio };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

### Conditional Dependencies
```typescript
async function ConditionalData() {
  const user = await useCurrentUser();
  
  if (user.role === 'admin') {
    const adminData = await useAdminDashboard();
    return { type: 'admin', data: adminData };
  } else {
    const userData = await useUserDashboard(user.id);
    return { type: 'user', data: userData };
  }
}
```

## Testing Reactive Functions

### Mount Testing
```typescript
test('portfolio calculation', async () => {
  const result = await mount(
    () => useUserPortfolio('test-user'),
    {
      effects: {
        [USER_EFFECT]: mockUserHandler,
        [POSITIONS_EFFECT]: mockPositionsHandler,
        [PRICES_EFFECT]: mockPricesHandler
      }
    }
  );
  
  expect(result).toEqual(expectedPortfolioValue);
});
```

### Dependency Isolation
- Mock specific effects while keeping others real
- Test reactive function logic independently
- Verify dependency tracking behavior
- Ensure proper cleanup and subscription management