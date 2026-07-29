// Decorative topographic contour lines - the hero's signature visual, tying
// the page to the site's actual subject (trail/elevation data) rather than a
// generic gradient. Purely decorative: aria-hidden, no interaction, and the
// bottom mask keeps it from ever competing with foreground text.
export function TopoLines({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{ maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M-20 60 C 120 20, 220 90, 340 55 S 560 10, 680 60 S 860 100, 900 70" />
        <path d="M-20 110 C 100 150, 240 60, 360 105 S 540 160, 660 110 S 840 60, 900 100" opacity="0.85" />
        <path d="M-20 170 C 140 130, 260 200, 400 165 S 600 120, 720 170 S 860 210, 900 175" opacity="0.7" />
        <path d="M-20 230 C 110 260, 250 190, 380 225 S 580 270, 700 225 S 850 190, 900 220" opacity="0.55" />
        <path d="M-20 290 C 130 250, 270 320, 410 285 S 610 240, 730 290 S 860 320, 900 280" opacity="0.4" />
        <path d="M-20 350 C 120 380, 260 310, 400 345 S 590 390, 710 345 S 850 310, 900 340" opacity="0.25" />
      </g>
      {/* waypoint dots along one contour - echoes the nav's active-route marker */}
      <g fill="currentColor" opacity="0.9">
        <circle cx="340" cy="55" r="4" />
        <circle cx="560" cy="34" r="3" />
      </g>
    </svg>
  );
}
