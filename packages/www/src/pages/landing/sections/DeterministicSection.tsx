import type { ReactNode } from 'react';

export function DeterministicSection(): ReactNode {
  return (
    <section className="bg-white py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Every message.
            <br />
            Every state change.
            <br />
            <span className="text-indigo-600">Completely deterministic.</span>
          </h2>
          <h3 className="text-2xl text-gray-600 mb-4">
            Isolate any bug and trace every decision with <b>perfect reproducibility.</b>
          </h3>
          <p className="text-md text-gray-600 mb-8">
            Build with confidence, knowing your system's behavior is predictable and reproducible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="bg-gray-900 rounded-lg p-6 text-green-400 font-mono text-sm">
            <div className="text-gray-500 mb-2">// Your trading system, 6 months ago</div>
            <div className="text-yellow-400">REPLAY_SESSION</div>
            <div className="pl-2">
              <div>14:32:15.123 → Market data: AAPL $150.23</div>
              <div>14:32:15.145 → Algorithm triggered: BUY signal</div>
              <div>14:32:15.156 → Risk check: PASSED</div>
              <div>14:32:15.167 → Order placed: 100 shares</div>
              <div className="text-red-400">14:32:15.234 → ERROR: Insufficient funds</div>
            </div>
            <div className="text-gray-500 mt-2">// Exact reproduction, every time</div>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-4">Debug with surgical precision</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Replay any system state from any point in time</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Trace exact causal chains across distributed components</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Test edge cases with perfect reproducibility</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
