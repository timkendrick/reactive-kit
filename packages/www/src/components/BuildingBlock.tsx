import type { ReactNode } from 'react';

interface BuildingBlockProps {
  emoji: string;
  title: string;
  description: string;
  icon: ReactNode;
  useCases: Array<string>;
  className?: string;
}

export function BuildingBlock({
  emoji,
  title,
  description,
  icon,
  useCases,
  className = '',
}: BuildingBlockProps): ReactNode {
  return (
    <div className={`text-center bg-white rounded-lg shadow-lg p-6 relative ${className}`}>
      <div className="text-3xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>

      <div className="flex justify-center mb-4">{icon}</div>

      <div className="text-left border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Use cases:</h4>
        <ul className="text-sm text-gray-500 space-y-1">
          {useCases.map((useCase, index) => (
            <li key={index}>• {useCase}</li>
          ))}
        </ul>
      </div>

      {/* Connection indicator */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8">
        <div className="text-gray-500 text-lg">⇅</div>
      </div>
    </div>
  );
}
