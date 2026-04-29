import React from 'react';

/**
 * Industrial backdrop: a subtle solid dark grid texture.
 * Replaces the previous Holi color-splash particles with a minimal,
 * professional pattern fitting the Labour Day theme.
 */
const RosePetals: React.FC = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.06]"
      style={{
        backgroundImage:
          'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage:
          'radial-gradient(ellipse at center, black 40%, transparent 80%)',
        WebkitMaskImage:
          'radial-gradient(ellipse at center, black 40%, transparent 80%)',
      }}
    />
  );
};

export default RosePetals;
