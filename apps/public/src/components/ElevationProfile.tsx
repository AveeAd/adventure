import { useMemo, useState } from 'react';

export interface ElevationSample {
  d: number; // metres along path
  e: number; // metres elevation
}

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };

// Inline SVG, no charting library - matches TopoLines.tsx already being
// hand-rolled SVG and the no-CDN/no-API-key ethos elsewhere in this app.
// Single series (distance -> elevation), so no legend is needed - the
// title/caption names it, per the dataviz skill's single-series rule.
export function ElevationProfile({
  samples,
  ascentMeters,
  descentMeters,
  height = 220,
}: {
  samples: ElevationSample[];
  ascentMeters?: number;
  descentMeters?: number;
  height?: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (samples.length < 2) return null;

    const maxD = samples[samples.length - 1].d;
    const minE = Math.min(...samples.map((s) => s.e));
    const maxE = Math.max(...samples.map((s) => s.e));
    const eRange = Math.max(maxE - minE, 10);
    const eLo = minE - eRange * 0.1;
    const eHi = maxE + eRange * 0.1;

    const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

    const x = (d: number) => PADDING.left + (maxD === 0 ? 0 : (d / maxD) * plotWidth);
    const y = (e: number) => PADDING.top + plotHeight - ((e - eLo) / (eHi - eLo)) * plotHeight;

    const points = samples.map((s) => [x(s.d), y(s.e)] as const);
    const linePath = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const baselineY = PADDING.top + plotHeight;
    const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${baselineY} L${points[0][0].toFixed(1)},${baselineY} Z`;

    return { maxD, minE: eLo, maxE: eHi, x, y, points, linePath, areaPath, baselineY, plotWidth };
  }, [samples]);

  if (!chart) {
    return null;
  }

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    chart!.points.forEach(([px], i) => {
      const dist = Math.abs(px - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? samples[hoverIndex] : null;
  const hoveredPoint = hoverIndex !== null ? chart.points[hoverIndex] : null;

  return (
    <div className="text-primary-600 dark:text-primary-400">
      {(ascentMeters !== undefined || descentMeters !== undefined) && (
        <div className="mb-2 flex gap-4 text-sm text-stone-600 dark:text-stone-300">
          {ascentMeters !== undefined && <span>↑ {ascentMeters} m ascent</span>}
          {descentMeters !== undefined && <span>↓ {descentMeters} m descent</span>}
        </div>
      )}
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        style={{ height, width: '100%' }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`Elevation profile from ${Math.round(chart.minE)}m to ${Math.round(chart.maxE)}m over ${(chart.maxD / 1000).toFixed(1)}km`}
      >
        {/* recessive gridlines */}
        <g stroke="currentColor" strokeOpacity="0.12" strokeWidth="1">
          {[0, 0.5, 1].map((frac) => (
            <line
              key={frac}
              x1={PADDING.left}
              x2={VIEW_WIDTH - PADDING.right}
              y1={PADDING.top + frac * (VIEW_HEIGHT - PADDING.top - PADDING.bottom)}
              y2={PADDING.top + frac * (VIEW_HEIGHT - PADDING.top - PADDING.bottom)}
            />
          ))}
        </g>

        {/* axis labels */}
        <g className="fill-stone-500 dark:fill-stone-400" fontSize="11">
          <text x={PADDING.left - 6} y={PADDING.top + 4} textAnchor="end">
            {Math.round(chart.maxE)}m
          </text>
          <text x={PADDING.left - 6} y={chart.baselineY} textAnchor="end">
            {Math.round(chart.minE)}m
          </text>
          <text x={PADDING.left} y={VIEW_HEIGHT - 6} textAnchor="start">
            0 km
          </text>
          <text x={VIEW_WIDTH - PADDING.right} y={VIEW_HEIGHT - 6} textAnchor="end">
            {(chart.maxD / 1000).toFixed(1)} km
          </text>
        </g>

        <path d={chart.areaPath} fill="currentColor" fillOpacity="0.15" stroke="none" />
        <path d={chart.linePath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint[0]}
              x2={hoveredPoint[0]}
              y1={PADDING.top}
              y2={chart.baselineY}
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <circle cx={hoveredPoint[0]} cy={hoveredPoint[1]} r="4" fill="currentColor" />
          </g>
        )}
      </svg>

      {hovered && (
        <div className="pointer-events-none -mt-1 text-center text-xs text-stone-600 dark:text-stone-300">
          {(hovered.d / 1000).toFixed(2)} km — {Math.round(hovered.e)} m
        </div>
      )}
    </div>
  );
}
