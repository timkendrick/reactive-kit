import type { ReactNode } from 'react';

export function CaseStudySection(): ReactNode {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Case Study: Building a Financial Platform with ReactiveKit
          </h2>
          <p className="text-xl opacity-90">
            See how ReactiveKit helps build powerful distributed systems, integrating with your
            existing infrastructure
          </p>
        </div>

        {/* System Architecture */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-8 mb-8">
          <figure className="text-center">
            <div className="bg-white/20 h-64 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-lg">🏗️ Financial Platform Architecture</span>
            </div>
            <figcaption className="text-sm opacity-75">
              System architecture overview illustrating the interactions between portfolio widgets,
              streaming gateways, and order execution workers
            </figcaption>
          </figure>
        </div>

        {/* Components */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-6">
            <h3 className="font-semibold mb-2">📊 Portfolio Overview Widget</h3>
            <p className="text-sm opacity-90">
              Reactive Component providing live, consolidated view of market exposure
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-6">
            <h3 className="font-semibold mb-2">🌊 Backend Streaming Gateway</h3>
            <p className="text-sm opacity-90">
              Processes and unifies multiple data feeds into clean real-time streams
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-6">
            <h3 className="font-semibold mb-2">⚙️ Automated Order Execution</h3>
            <p className="text-sm opacity-90">
              Scripted Worker handling complete trade lifecycle with full auditability
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
