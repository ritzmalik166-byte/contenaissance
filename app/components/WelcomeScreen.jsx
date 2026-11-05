import React, { useEffect, useState } from 'react';
import Image from 'next/image';

// Simple splash screen that disappears after a short timeout
export default function WelcomeScreen({ duration = 2500 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      {/* Replace the src with your actual logo or illustration */}
      <Image
        src="/assets/fav-icon.png"
        alt="Welcome"
        width={120}
        height={120}
        priority
      />
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#0a0908', // matches themeColor
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
};

