import type { ReactNode } from 'react';

import { BuildingBlock } from '@/components/BuildingBlock';

export function ParadigmSection(): ReactNode {
  const reactiveComponentsIcon = (
    <svg width="74" height="70" viewBox="0 0 74 70" className="text-gray-400">
      {/* Top level: Multiple data sources */}
      <rect x="5" y="5" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="28" y="5" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="51" y="5" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />

      {/* Arrows pointing down and converging */}
      <path
        d="M14 20 L14 24 Q14 26 16 26 L23 26 Q25 26 25 28 L25 34 M22 31 L25 34 L28 31"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M37 20 L37 34 M34 31 L37 34 L40 31"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M60 20 L60 24 Q60 26 58 26 L51 26 Q49 26 49 28 L49 34 M46 31 L49 34 L52 31"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Bottom level: Single computed result (highlighted) */}
      <rect x="19" y="36" width="36" height="12" rx="3" fill="rgb(99, 102, 241)" opacity="0.8" />
    </svg>
  );

  const scriptedWorkersIcon = (
    <svg width="120" height="50" viewBox="0 0 120 50" className="text-gray-400">
      {/* Sequential chain of blocks */}
      <rect x="5" y="17" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="35" y="17" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="65" y="17" width="18" height="12" rx="2" fill="rgb(99, 102, 241)" opacity="0.8" />
      <rect x="95" y="17" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />

      {/* Right-pointing arrows */}
      <path
        d="M26 23 L32 23 M29 20 L32 23 L29 26"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M56 23 L62 23 M59 20 L62 23 L59 26"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M86 23 L92 23 M89 20 L92 23 L89 26"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );

  const transportLayerIcon = (
    <svg width="102" height="65" viewBox="0 0 102 65" className="text-gray-400">
      <defs>
        <linearGradient id="transportGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'rgb(99, 102, 241)', stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(99, 102, 241)', stopOpacity: 0.8 }} />
        </linearGradient>
      </defs>

      {/* Top row components (3 blocks) */}
      <rect x="15" y="5" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="42" y="5" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="69" y="5" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />

      {/* Bottom row components (2 blocks, positioned in gaps) */}
      <rect x="28" y="48" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="55" y="48" width="18" height="12" rx="2" fill="currentColor" opacity="0.5" />

      {/* Central pipeline */}
      <rect x="12" y="27" width="78" height="12" rx="2" fill="url(#transportGradient)" />

      {/* Arrows from top */}
      <path
        d="M24 17 L24 25 M21 22 L24 25 L27 22"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M51 17 L51 25 M48 22 L51 25 L54 22"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M78 17 L78 25 M75 22 L78 25 L81 22"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Arrows from bottom */}
      <path
        d="M37 48 L37 41 M34 44 L37 41 L40 44"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M64 48 L64 41 M61 44 L64 41 L67 44"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-6">A New Paradigm for Real-Time Systems</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            ReactiveKit offers a unified and simplified approach by combining three powerful
            building blocks:
          </p>
        </div>

        {/* Three Building Blocks */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <BuildingBlock
            emoji="⚡"
            title="Reactive Components"
            description="Define complex live computations anywhere on your stack"
            icon={reactiveComponentsIcon}
            useCases={[
              'Dynamic front-end UI widgets',
              'Back-end streaming API endpoints',
              'Real-time dashboard panels',
            ]}
          />
          <BuildingBlock
            emoji="🔄"
            title="Scripted Workers"
            description="Stateful, repeatable process orchestration"
            icon={scriptedWorkersIcon}
            useCases={[
              'Complex client-side form validation',
              'Data processing pipelines',
              'Alerting mechanisms',
            ]}
          />
        </div>

        <div className="mb-12">
          <div className="text-center bg-white rounded-lg shadow-lg p-6">
            <div className="text-3xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold mb-2">Intelligent Transport Layer</h3>
            <p className="text-gray-600 mb-4">Deterministic, observable system backbone</p>

            <div className="flex justify-center mb-4">{transportLayerIcon}</div>

            <div className="text-left border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Key features:</h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Ordered event bus synchronizes all interactions</li>
                <li>• All application communication flows through this layer</li>
                <li>• Single source of truth for deterministic system behavior</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mb-12">
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            The combination of these three building blocks ensures that your system is always in
            sync,
            <br />
            allowing you to focus on building your application with confidence.
          </p>
        </div>
      </div>
    </section>
  );
}
