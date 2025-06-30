import type { ReactNode } from 'react';

import { Button } from '@/components/Button';

export function HeroSection(): ReactNode {
  return (
    <header className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white py-20">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">ReactiveKit</h1>
        <h2 className="text-2xl md:text-3xl font-light mb-8">
          The Full-Stack Framework for{' '}
          <span className="font-semibold">
            [Deterministic | Debuggable | Testable | Replayable | Observable]
          </span>{' '}
          Real-Time Distributed Systems
        </h2>
        <p className="text-xl mb-10 max-w-4xl mx-auto">
          ReactiveKit is your all-in-one backbone for robust, real-time applications that are
          testable and debuggable by design – from interactive UIs to data-processing pipelines.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" size="lg">
            ⭐ Star on GitHub
          </Button>
          <Button variant="outline" size="lg">
            Learn More ↓
          </Button>
        </div>
      </div>
    </header>
  );
}
