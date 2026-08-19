// Renders a Media/TripReportMedia-backed image with a real `srcset` (built
// from apps/api's image-processing pipeline's small/medium/large WebP
// variants) plus native lazy loading. Images uploaded before that pipeline
// existed only have `url` - smallUrl/mediumUrl/largeUrl are all undefined,
// srcSet comes out empty, and the browser just uses `src` like always. No
// library needed: srcset/sizes/loading are plain HTML, this component only
// exists to avoid repeating the same "build the string, pick the src
// fallback" logic at every call site.
export interface MediaSizeUrls {
  smallUrl?: string | null;
  mediumUrl?: string | null;
  largeUrl?: string | null;
}

const WIDTHS: { key: keyof MediaSizeUrls; width: number }[] = [
  { key: 'smallUrl', width: 400 },
  { key: 'mediumUrl', width: 800 },
  { key: 'largeUrl', width: 1600 },
];

function buildSrcSet(media: MediaSizeUrls): string | undefined {
  const entries = WIDTHS.map(({ key, width }) => (media[key] ? `${media[key]} ${width}w` : null)).filter(
    (entry): entry is string => entry !== null,
  );
  return entries.length > 0 ? entries.join(', ') : undefined;
}

export function ResponsiveImage({
  url,
  smallUrl,
  mediumUrl,
  largeUrl,
  alt,
  sizes = '100vw',
  className,
  loading = 'lazy',
  onClick,
}: MediaSizeUrls & {
  url: string;
  alt: string;
  sizes?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  onClick?: (event: React.MouseEvent<HTMLImageElement>) => void;
}) {
  const srcSet = buildSrcSet({ smallUrl, mediumUrl, largeUrl });
  return (
    <img
      // Medium, not `url` (which is the large variant for pipeline
      // uploads) - a smaller sane default for the no-srcset-support
      // fallback path, since real browsers use srcset/sizes instead.
      src={mediumUrl ?? url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      onClick={onClick}
    />
  );
}
