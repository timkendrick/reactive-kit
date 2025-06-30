import type { ReactNode } from 'react';

export function ObservabilitySection(): ReactNode {
  return (
    <section className="bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Build systems that
              <br />
              <span className="text-indigo-600">explain themselves</span>
            </h2>
            <h3 className="text-2xl text-gray-600 mb-4">
              ReactiveKit generates a <b>complete causal history</b> of every action.
            </h3>
            <p className="text-md text-gray-600 mb-8">
              Understand precisely why your system is in its current state, with every change
              automatically traced and linked.
            </p>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-indigo-600 text-xs">1</span>
                </div>
                <div>
                  <div className="font-medium">Write declarative logic</div>
                  <div className="text-gray-600 text-sm">Define what should happen, not how</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-indigo-600 text-xs">2</span>
                </div>
                <div>
                  <div className="font-medium">Get automatic traceability</div>
                  <div className="text-gray-600 text-sm">Every state change is causally linked</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-indigo-600 text-xs">3</span>
                </div>
                <div>
                  <div className="font-medium">Debug with precision</div>
                  <div className="text-gray-600 text-sm">
                    Replay exact conditions, trace root causes
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">System Event Timeline</h3>
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">Paused</div>
                <div className="w-3 h-3 bg-gray-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-mono text-xs text-gray-500">14:32:15.102</span>
                <span>Market data updated: AAPL $147.89</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-green-50 rounded ml-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-mono text-xs text-gray-500">14:32:15.114</span>
                <span>Portfolio component recalculated</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-mono text-xs text-gray-500">14:32:15.125</span>
                <span>Market data updated: AAPL $150.23</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-orange-50 border-2 border-orange-400 rounded ml-4 shadow-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="font-mono text-xs text-gray-500">14:32:15.156</span>
                <span>Alert worker triggered: "High volatility"</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-purple-50 rounded ml-8">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="font-mono text-xs text-gray-500">14:32:15.167</span>
                <span>UI notification sent</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-green-50 rounded ml-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-mono text-xs text-gray-500">14:32:15.145</span>
                <span>Portfolio component recalculated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
