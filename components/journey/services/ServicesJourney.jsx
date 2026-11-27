'use client';

import InnerJourney from '../ui/InnerJourney';
import { IntroChapter, WorldChapter, ProcessChapter, FinaleChapter } from './Chapters';
import { worlds } from '@/lib/journey/services-data';
import './services.css';

/* =====================================================
   CONTENAISSANCE — SERVICES: A UNIVERSE OF SIX WORLDS
   Real HTML chapters over one fixed WebGL solar system that
   the scroll flies through. Overview → dive → Mars, Neptune,
   Jupiter, Venus, Saturn, Earth (one world per service) →
   pull back for the mission plan → the orbits close around
   the call to action. Engine: lib/journey/services-engine.js
===================================================== */
const engine = (o) =>
  import('@/lib/journey/services-engine').then((m) => m.createServicesJourney({ ...o, names: worlds.map((w) => `${w.planet} · ${w.title}`) }));

export default function ServicesJourney() {
  return (
    <InnerJourney
      className="sv"
      engine={engine}
      readyEvent="services:ready"
      skip={{ href: '#worlds', label: 'Skip to services' }}
      hud={{ chapter: '01', name: 'The universe', phase: 'Overview' }}
    >
      <IntroChapter />
      <div id="worlds">
        {worlds.map((w) => (
          <WorldChapter key={w.code} w={w} />
        ))}
      </div>
      <ProcessChapter />
      <FinaleChapter />
    </InnerJourney>
  );
}
