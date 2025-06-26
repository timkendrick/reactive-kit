import type { ReactNode } from 'react';

export function WhyChooseSection(): ReactNode {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-8">Why Choose ReactiveKit?</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Deterministic by Design</h3>
            <p className="text-muted-foreground">
              Build real-time systems you can trust to behave predictably and reproducibly.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🧪</div>
            <h3 className="text-xl font-semibold mb-2">Radically Testable</h3>
            <p className="text-muted-foreground">
              ReactiveKit test utilities make it easy to write comprehensive tests with confidence,
              from individual units to complex interactions.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Deeply Debuggable</h3>
            <p className="text-muted-foreground">
              Untangle complex edge cases with an unprecedented view into your system's causal
              history.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold mb-2">Inherently Robust</h3>
            <p className="text-muted-foreground">
              Architected for resilience and predictable error recovery.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Simplified Development</h3>
            <p className="text-muted-foreground">
              Drastically reduce boilerplate for state synchronization, concurrency, and async
              logic. Focus on building, not plumbing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
