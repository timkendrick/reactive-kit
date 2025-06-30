import type { ReactNode } from 'react';

interface CodeBlockProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function CodeBlock({ title, children, className = '' }: CodeBlockProps): ReactNode {
  return (
    <div className={`bg-gray-900 rounded-lg p-6 text-sm font-mono ${className}`}>
      <div className="text-gray-500 mb-2">{title}</div>
      <div className="text-white">{children}</div>
    </div>
  );
}

interface CodeLineProps {
  children: ReactNode;
  indent?: number;
}

export function CodeLine({ children, indent = 0 }: CodeLineProps): ReactNode {
  const indentClass = indent > 0 ? `pl-${indent * 4}` : '';
  return <div className={indentClass}>{children}</div>;
}

interface CodeTokenProps {
  children: ReactNode;
  color?: 'blue' | 'yellow' | 'purple' | 'green' | 'orange' | 'gray' | 'white';
}

export function CodeToken({ children, color = 'white' }: CodeTokenProps): ReactNode {
  const colorClasses = {
    blue: 'text-blue-400',
    yellow: 'text-yellow-300',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    gray: 'text-gray-500',
    white: 'text-white',
  };

  return <span className={colorClasses[color]}>{children}</span>;
}
