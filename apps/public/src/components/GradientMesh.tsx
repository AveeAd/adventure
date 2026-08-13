// Blurred brand-color blobs sitting behind hero content, giving the glass
// surfaces something with real texture and color to refract instead of a
// flat gradient fill. Purely decorative: aria-hidden, no interaction.
export function GradientMesh({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute -left-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-primary-400/35 blur-3xl dark:bg-primary-500/20" />
      <div className="absolute -right-16 top-1/4 h-[22rem] w-[22rem] rounded-full bg-accent-400/30 blur-3xl dark:bg-accent-500/15" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-primary-300/25 blur-3xl dark:bg-primary-400/10" />
    </div>
  );
}
