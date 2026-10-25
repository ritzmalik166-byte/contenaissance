export const ArrowUpRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3.5 10.5 10.5 3.5M5 3.5h5.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const ArrowRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Play = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const Close = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M3 3l12 12M15 3 3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const StageIcon = ({ name }) => {
  switch (name) {
    case 'camera':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect x="5" y="14" width="26" height="20" rx="3" />
          <path d="M31 21l11-6v18l-11-6" />
        </svg>
      );
    case 'play':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect x="13" y="5" width="22" height="38" rx="3" />
          <path d="M21 17v14l11-7-11-7Z" fill="currentColor" stroke="none" style={{ fill: 'var(--rocket-yellow)' }} />
        </svg>
      );
    case 'target':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="18" />
          <circle cx="24" cy="24" r="10" />
          <circle cx="24" cy="24" r="3" fill="currentColor" style={{ fill: 'var(--rocket-yellow)' }} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 5l5.6 12.2 13.4 1.5-10 9 2.8 13.2L24 34.2l-11.8 6.7L15 27.7l-10-9 13.4-1.5L24 5Z" strokeLinejoin="round" />
        </svg>
      );
  }
};

export const Mail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const Phone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const Pin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
