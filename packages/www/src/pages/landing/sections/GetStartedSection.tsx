import type { ReactNode } from 'react';

import { Button } from '@/components/Button';

export function GetStartedSection(): ReactNode {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-8">Get Started</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2">Star on GitHub</h3>
            <p className="text-gray-400 mb-4">
              Get the code, explore the architecture, and contribute!
            </p>
            <Button variant="primary" className="bg-white text-gray-900 hover:bg-gray-100">
              View on GitHub
            </Button>
          </div>

          <div>
            <div className="text-4xl mb-4">💻</div>
            <h3 className="text-xl font-semibold mb-2">Explore Examples</h3>
            <p className="text-gray-400 mb-4">
              Dive into source code examples and see ReactiveKit in action
            </p>
            <Button variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">
              Browse Examples
            </Button>
          </div>

          <div>
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Read the Docs</h3>
            <p className="text-gray-400 mb-4">
              Deep dive into concepts, APIs, and comprehensive guides
            </p>
            <Button variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700">
              Read Documentation
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
