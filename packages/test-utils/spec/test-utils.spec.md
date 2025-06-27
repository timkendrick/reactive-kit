## Overview

ReactiveKit Testing Utilities provides a flexible, type-safe system for testing ReactiveKit's actor-based message handling. It focuses on two primary testing scenarios:

1. Unit Testing: Verifying individual handler behavior by:
   - Asserting correct state transitions in response to messages
   - Confirming expected message emissions
   - Validating spawned task behavior

2. Integration Testing: Verifying interactions between multiple actors by:
   - Testing message flow through actor hierarchies
   - Validating complex message sequences
   - Testing end-to-end scenarios with multiple handlers

The framework is built around three core capabilities:

1. Pattern Matching: A composable system for describing and verifying message sequences, supporting both exact matches and flexible patterns with back-references.

2. Async Task Mocking: An escape hatch for mocking asynchronous operations, allowing precise control over timing and message sequences.

3. State Verification: Tools for validating handler state transitions while maintaining encapsulation of internal implementation details. 
