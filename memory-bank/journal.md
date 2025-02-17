# Project Intelligence Journal

## Project Patterns

### Development Workflow
1. Package Creation
   - Use `pnpm generate package` for basic packages
   - Use `pnpm generate plugin` for plugin packages
   - Generated packages automatically integrate with workspace
   - Plugin packages auto-update hooks and handlers packages

2. Feature Development
   - Start with spec in appropriate `spec/` directory
   - Generate README with usage examples
   - Create high-level tests
   - Implement following spec
   - Review and refine

### Testing Patterns
1. Asynchronous Testing
   ```typescript
   test('handler behavior', async () => {
     const handler = new TestHandler();
     await handler.processMessages([
       Subscribe(effect),
       CustomMessage(data),
       Unsubscribe(effect)
     ]);
     expect(handler.emittedMessages).toEqual([/*...*/]);
   });
   ```

2. Synchronous Testing
   ```typescript
   test('reactive computation', async () => {
     const result = await mount(
       async () => {
         const value = await useEffect(effect);
         return transform(value);
       },
       {
         effects: {
           [effectType]: mockHandler
         }
       }
     );
     expect(result).toEqual(expected);
   });
   ```

### Plugin Development
1. Standard Structure
   ```
   packages/plugin-{name}/
   ├── src/
   │   ├── effects.ts    # Effect type definitions
   │   ├── handlers.ts   # Effect handler implementation
   │   ├── hooks.ts      # React-style hooks
   │   ├── messages.ts   # Internal message types
   │   ├── types.ts      # Shared type definitions
   │   └── index.ts      # Public API
   ```

2. Integration Points
   - Effects registered with runtime
   - Handlers added to handler chain
   - Hooks exported to hooks package
   - Messages handled internally

## Critical Paths

### Plugin System
1. Effect Registration
   - Plugin defines effect types
   - Runtime maintains effect registry
   - Handlers respond to subscriptions
   - Hooks provide sync interface

2. Message Flow
   - Subscribe/Unsubscribe messages
   - Effect-specific messages
   - Value update messages
   - Error messages

### Testing System
1. Asynchronous Testing
   - Message sequence definition
   - Handler state verification
   - Message flow validation
   - Error scenario testing

2. Synchronous Testing
   - Effect state setup
   - Hook behavior verification
   - Computation validation
   - Error handling testing

## Known Challenges

### Testing
1. Async Complexity
   - Message ordering
   - Timing dependencies
   - State verification
   - Error scenarios

2. Integration Testing
   - Cross-realm coordination
   - System boundaries
   - Mock fidelity
   - Determinism

### Plugin Development
1. Effect Coordination
   - Cross-plugin dependencies
   - Lifecycle management
   - Error boundaries
   - Resource cleanup

2. Testing Support
   - Mock implementations
   - State simulation
   - Error injection
   - Scenario generation

## Evolution Notes

### Architecture
- Strict realm separation for testability
- Message-based async for determinism
- Plugin system for extensibility
- Comprehensive dependency tracking

### Development Process
- Spec-driven for clarity
- Test-first for reliability
- Generated code for consistency
- Clear documentation requirements

### Testing Strategy
- Separate realm testing
- Integration testing
- Deterministic verification
- Scenario-based approach

## Tool Usage

### Package Generation
```bash
# Create basic package
pnpm generate package

# Create plugin package
pnpm generate plugin
```

### Development Commands
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Generate documentation
pnpm docs
```

### Common Patterns
1. Effect Creation
   ```typescript
   const effect = createEffect({
     type: EFFECT_TYPE,
     payload: config
   });
   ```

2. Handler Implementation
   ```typescript
   class CustomHandler extends EffectHandler {
     onSubscribe(effect: Effect) {
       // Setup subscription
     }
     
     onUnsubscribe(effect: Effect) {
       // Cleanup
     }
     
     onMessage(msg: Message) {
       // Handle internal messages
     }
   }
   ```

3. Hook Usage
   ```typescript
   async function useCustomEffect(config: Config) {
     const effect = createEffect(config);
     return await useEffect(effect);
   }
   ```

4. Higher-Order Effects
   ```typescript
   // Create a counting effect from a source effect
   const countEffect = createReducerEffect({
     source: sourceEffect,
     reducer: (count, _value) => count + 1,
     initial: 0
   });

   // Create an accumulating effect
   const sumEffect = createReducerEffect({
     source: numberEffect,
     reducer: (sum, value) => sum + value,
     initial: 0
   });
   ``` 
