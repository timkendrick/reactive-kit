import type { ReactNode } from 'react';

import { CaseStudySection } from '@/pages/landing/sections/CaseStudySection';
import { DeterministicSection } from '@/pages/landing/sections/DeterministicSection';
import { DeveloperExperienceSection } from '@/pages/landing/sections/DeveloperExperienceSection';
import { GetStartedSection } from '@/pages/landing/sections/GetStartedSection';
import { HeroSection } from '@/pages/landing/sections/HeroSection';
import { LiveDataSection } from '@/pages/landing/sections/LiveDataSection';
import { ObservabilitySection } from '@/pages/landing/sections/ObservabilitySection';
import { ParadigmSection } from '@/pages/landing/sections/ParadigmSection';
import { PluginEcosystemSection } from '@/pages/landing/sections/PluginEcosystemSection';
import { ReactiveComponentsSection } from '@/pages/landing/sections/ReactiveComponentsSection';
import { ScriptedWorkersSection } from '@/pages/landing/sections/ScriptedWorkersSection';
import { TransportLayerSection } from '@/pages/landing/sections/TransportLayerSection';
import { WhyChooseSection } from '@/pages/landing/sections/WhyChooseSection';

export function LandingPage(): ReactNode {
  return (
    <div className="bg-white">
      <HeroSection />
      <LiveDataSection />
      <ObservabilitySection />
      <DeterministicSection />
      <ParadigmSection />
      <ReactiveComponentsSection />
      <ScriptedWorkersSection />
      <TransportLayerSection />
      <PluginEcosystemSection />
      <WhyChooseSection />
      <CaseStudySection />
      <DeveloperExperienceSection />
      <GetStartedSection />
    </div>
  );
}
