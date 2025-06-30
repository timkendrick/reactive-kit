import type { ReactNode } from 'react';

export function DeveloperExperienceSection(): ReactNode {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Coming soon: ReactiveKit Observability Suite</h2>
          <p className="text-xl text-gray-600">
            We're committed to an unparalleled developer experience. Our upcoming suite of
            observability and debugging tools will provide deep insight and control over your
            ReactiveKit applications.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Visual Debugger */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🔍 Visual Debugger</h3>
            <div className="space-y-4">
              <figure>
                <div className="bg-gray-100 h-32 rounded flex items-center justify-center mb-2">
                  <span className="text-gray-500">⏱️ Time-travel debugging interface</span>
                </div>
                <figcaption className="text-xs text-gray-600">
                  Mockup 1: Time-travel debugging interface, showing a timeline of events. A slider
                  allows dragging back and forth, with the application state updating to reflect the
                  selected point in time. Event details are shown for a selected event.
                </figcaption>
              </figure>

              <figure>
                <div className="bg-gray-100 h-32 rounded flex items-center justify-center mb-2">
                  <span className="text-gray-500">🕸️ Message flow visualization</span>
                </div>
                <figcaption className="text-xs text-gray-600">
                  Mockup 2: A graph visualizing message flows between different Reactive Components
                  and Scripted Workers. Lines connect components, indicating messages, and perhaps
                  dependencies are highlighted.
                </figcaption>
              </figure>
            </div>
          </div>

          {/* Performance Tools */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📊 Performance & Observability</h3>
            <div className="space-y-4">
              <figure>
                <div className="bg-gray-100 h-32 rounded flex items-center justify-center mb-2">
                  <span className="text-gray-500">📈 Performance dashboard</span>
                </div>
                <figcaption className="text-xs text-gray-600">
                  Mockup 3: A dashboard UI displaying performance metrics. Charts show
                  component/worker execution times, message latencies, and potential system
                  bottlenecks are flagged.
                </figcaption>
              </figure>

              <figure>
                <div className="bg-gray-100 h-32 rounded flex items-center justify-center mb-2">
                  <span className="text-gray-500">🔗 OpenTelemetry integration</span>
                </div>
                <figcaption className="text-xs text-gray-600">
                  Mockup 4: A settings screen or code snippet showing easy integration with
                  OpenTelemetry. Another panel shows a conceptual view of how ReactiveKit data might
                  appear in a Prometheus/Grafana dashboard, or an advanced error tracking service
                  dashboard.
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
