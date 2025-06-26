import type { ReactNode } from 'react';

import {
  DebuggingSection,
  LiveDataSection,
  ObservabilitySection,
} from '@/routes/landing/sections/intro/panels';

export function IntroSection(): ReactNode {
  return (
    <>
      <LiveDataSection />
      <ObservabilitySection />
      <DebuggingSection />
    </>
  );
}
