import type { ReactNode } from 'react';

export function PluginEcosystemSection(): ReactNode {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Batteries included</h2>
          <p className="text-xl text-gray-600 mb-4">
            ReactiveKit is built upon a highly pluggable architecture,
            <br />
            allowing you to extend its capabilities or integrate with your existing stack.
          </p>
          <p className="text-xl text-gray-600">
            Leverage a growing library of official plugins, or even write your own.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-green-600 mb-2">✅ Available Now</h3>
            <ul className="space-y-2 text-sm">
              <li>• ReactiveKit core bundle</li>
              <li>• HTTP Fetch</li>
              <li>• State Management</li>
              <li>• Timers</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-blue-600 mb-2">🚀 Coming Soon</h3>
            <ul className="space-y-2 text-sm">
              <li>• WebSocket transport</li>
              <li>• SSE transport</li>
              <li>• GraphQL (Client & Server)</li>
              <li>• gRPC (Client & Server)</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-purple-600 mb-2">🔮 Future</h3>
            <ul className="space-y-2 text-sm">
              <li>• SQL (Postgres, MySQL)</li>
              <li>• NoSQL (MongoDB, Redis)</li>
              <li>• NATS transport</li>
              <li>• Kafka transport</li>
              <li>• Kubernetes orchestration</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
