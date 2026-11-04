'use client';

import './DiwaliStrip.css';

export default function DiwaliStrip() {
  return (
    <div className="diwali-strip">
      <div className="diwali-strip__inner">
        <span className="diwali-strip__diya">🪔</span>

        <p>
          Celebrate the Festival of Lights with
          <strong> Special Diwali Offers</strong>
        </p>

        <span className="diwali-strip__divider">✦</span>

        <span className="diwali-strip__message">
          Light Up Your Dreams This Diwali
        </span>

        <span className="diwali-strip__diya">🪔</span>
      </div>
    </div>
  );
}