import type { ReactNode } from 'react';

import { CaseStudySection } from '@/routes/landing/sections/CaseStudySection';
import { DeveloperExperienceSection } from '@/routes/landing/sections/DeveloperExperienceSection';
import { FeaturesSection } from '@/routes/landing/sections/FeaturesSection';
import { GetStartedSection } from '@/routes/landing/sections/GetStartedSection';
import { HeroSection } from '@/routes/landing/sections/HeroSection';
import { ParadigmSection } from '@/routes/landing/sections/ParadigmSection';
import { PluginSection } from '@/routes/landing/sections/PluginSection';
import { ReactiveComponentsSection } from '@/routes/landing/sections/ReactiveComponentsSection';
import { ScriptedWorkersSection } from '@/routes/landing/sections/ScriptedWorkersSection';
import { TransportLayerSection } from '@/routes/landing/sections/TransportLayerSection';
import { IntroSection } from '@/routes/landing/sections/intro/IntroSection';

const GITHUB_URL = 'https://github.com/timkendrick/reactive-kit';
const EXAMPLES_URL = 'https://github.com/timkendrick/reactive-kit/tree/main/packages/examples/src';
const INTRO_ID = 'intro';

const SHOW_CASE_STUDY_SECTION = false;
const SHOW_DEVELOPER_EXPERIENCE_SECTION = false;

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
      {SHOW_CASE_STUDY_SECTION && <CaseStudySection />}
      {SHOW_DEVELOPER_EXPERIENCE_SECTION && <DeveloperExperienceSection />}
      <GetStartedSection githubUrl={GITHUB_URL} examplesUrl={EXAMPLES_URL} />
    </div>
  );
}
