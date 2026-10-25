'use client';

import { useRef } from 'react';
import { useVelocityMarquee } from './useVelocityMarquee';

export default function Banner({ title, sub, direction = -1 }) {
  const track = useRef(null);
  useVelocityMarquee(track, { speed: 0.7, direction });

  return (
    <div className="banner" aria-label={`${title} — ${sub}`}>
      <div ref={track} className="banner__track" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i}>
            {title}
            <em>{sub}</em>
          </span>
        ))}
      </div>
    </div>
  );
}
