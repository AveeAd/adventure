// Blurred brand-color blobs + topographic contour lines, pinned to the
// viewport (not the page) so the same background shows through every glass
// surface (header, cards, search bar) no matter how far the page has
// scrolled, instead of scrolling away with whatever section it was
// originally placed in. Purely decorative: aria-hidden, no interaction.
export function GradientMesh({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-primary-400/45 blur-3xl dark:bg-primary-500/20" />
      <div className="absolute -right-20 top-10 h-[26rem] w-[26rem] rounded-full bg-accent-400/40 blur-3xl dark:bg-accent-500/15" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-primary-300/35 blur-3xl dark:bg-primary-400/10" />
      <svg
        viewBox="0 0 800 420"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full text-primary-600/25 dark:text-primary-400/15"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)',
        }}
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M-20 60 C 120 20, 220 90, 340 55 S 560 10, 680 60 S 860 100, 900 70" />
          <path d="M-20 110 C 100 150, 240 60, 360 105 S 540 160, 660 110 S 840 60, 900 100" opacity="0.85" />
          <path d="M-20 170 C 140 130, 260 200, 400 165 S 600 120, 720 170 S 860 210, 900 175" opacity="0.7" />
          <path d="M-20 230 C 110 260, 250 190, 380 225 S 580 270, 700 225 S 850 190, 900 220" opacity="0.55" />
          <path d="M-20 290 C 130 250, 270 320, 410 285 S 610 240, 730 290 S 860 320, 900 280" opacity="0.4" />
          <path d="M-20 350 C 120 380, 260 310, 400 345 S 590 390, 710 345 S 850 310, 900 340" opacity="0.25" />
        </g>
        <g fill="currentColor" opacity="0.9">
          <circle cx="340" cy="55" r="4" />
          <circle cx="560" cy="34" r="3" />
        </g>
      </svg>
    </div>
  );
}
