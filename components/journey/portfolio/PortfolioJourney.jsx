'use client';

import InnerJourney from '../ui/InnerJourney';
import { HeroChapter, MissionChapter, FinaleChapter } from './Chapters';
import Archive from './Archive';
import { constellations, featured } from '@/lib/journey/portfolio-data';
import './missions.css';

/* =====================================================
   CONTENAISSANCE — PORTFOLIO: CHAPTER 03 · THE MISSIONS
   The story continues from the services page's closing
   orbits into deep space: a guiding star and constellations
   → three featured missions, each plotted as its own star →
   the mission archive → a launch beam rising for the next
   mission (yours). Engine: lib/journey/portfolio-engine.js
===================================================== */
const engine = (o) =>
  import('@/lib/journey/portfolio-engine').then((m) => m.createPortfolioJourney({ ...o, constellations, missionCodes: featured.map((f) => f.code) }));

export default function PortfolioJourney() {
  return (
    <InnerJourney
      className="ms"
      engine={engine}
      readyEvent="portfolio:ready"
      skip={{ href: '#archive', label: 'Skip to the archive' }}
      hud={{ chapter: '01', name: 'The missions', phase: 'Locating the archive' }}
    >
      <HeroChapter />
      {featured.map((m, k) => (
        <MissionChapter key={m.code} m={m} k={k} />
      ))}
      <Archive />
      <FinaleChapter />
    </InnerJourney>
  );
}
