import type { ReactNode } from 'react';

import { CaseStudySection } from '@/pages/landing/sections/CaseStudySection';
import { DeveloperExperienceSection } from '@/pages/landing/sections/DeveloperExperienceSection';
import { FeaturesSection } from '@/pages/landing/sections/FeaturesSection';
import { GetStartedSection } from '@/pages/landing/sections/GetStartedSection';
import { HeroSection } from '@/pages/landing/sections/HeroSection';
import { ParadigmSection } from '@/pages/landing/sections/ParadigmSection';
import { PluginSection } from '@/pages/landing/sections/PluginSection';
import { ReactiveComponentsSection } from '@/pages/landing/sections/ReactiveComponentsSection';
import { ScriptedWorkersSection } from '@/pages/landing/sections/ScriptedWorkersSection';
import { TransportLayerSection } from '@/pages/landing/sections/TransportLayerSection';
import { IntroSection } from '@/pages/landing/sections/intro/IntroSection';

const GITHUB_URL = 'https://github.com/timkendrick/reactive-kit';
const EXAMPLES_URL = 'https://github.com/timkendrick/reactive-kit/tree/main/packages/examples/src';
const INTRO_ID = 'intro';

export function LandingPage(): ReactNode {
  return (
    <div className="antialiased overflow-x-hidden">
      <HeroSection githubUrl={GITHUB_URL} learnMoreUrl={`#${INTRO_ID}`} />
      <div id={INTRO_ID} />
      <IntroSection />
      <ParadigmSection />
      <ReactiveComponentsSection />
      <ScriptedWorkersSection />
      <TransportLayerSection />
      <PluginSection />
      <FeaturesSection />
      {/* <CaseStudySection />
      <DeveloperExperienceSection /> */}
      <GetStartedSection githubUrl={GITHUB_URL} examplesUrl={EXAMPLES_URL} />
    </div>
  );
}
