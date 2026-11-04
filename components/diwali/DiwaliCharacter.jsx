
'use client';

import { useEffect, useState } from 'react';
import './DiwaliCharacter.css';

export default function DiwaliCharacter() {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (!visible || closed) return null;

  return (
    <aside className="diwali-character">
      <button
        className="diwali-character__close"
        onClick={() => setClosed(true)}
        aria-label="Close Diwali greeting"
      >
        ×
      </button>

      <img
        src="/diwali-girl.webp"
        alt="Happy Diwali. A girl lighting a traditional clay diya."
        className="diwali-character__image"
      />
    </aside>
  );
}
