import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { LandingPage } from './pages/landing';

const root = createRoot(document.querySelector('main')!);
root.render(createElement(LandingPage));
