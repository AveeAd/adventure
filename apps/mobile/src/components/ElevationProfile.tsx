import { useMemo } from 'react';
import { Text as RNText, View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';

export interface ElevationSample {
  d: number; // metres along path
  e: number; // metres elevation
}

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };

// Ported from apps/public/src/components/ElevationProfile.tsx - same
// inline-SVG, no-charting-library approach (react-native-svg instead of a
// literal <svg>, already a dependency via GradientMesh/GlassSpecular), same
// geometry math. Static, not interactive - web's pointer-hover-to-inspect
// nearest sample isn't ported (no pointer equivalent worth building for a
// touch-only chart this small yet); the axis labels alone cover the "what
// range am I looking at" question a hover mainly answered.
export function ElevationProfile({
  samples,
  ascentMeters,
  descentMeters,
  height = 140,
}: {
  samples: ElevationSample[];
  ascentMeters?: number | null;
  descentMeters?: number | null;
  height?: number;
}) {
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

    return { maxD, minE: eLo, maxE: eHi, linePath, areaPath };
  }, [samples]);

  if (!chart) {
    return null;
  }

  return (
    <View>
      {ascentMeters != null || descentMeters != null ? (
        <View className="mb-2 flex-row gap-4">
          {ascentMeters != null ? (
            <RNText className="text-sm text-stone-600 dark:text-stone-300">↑ {ascentMeters} m ascent</RNText>
          ) : null}
          {descentMeters != null ? (
            <RNText className="text-sm text-stone-600 dark:text-stone-300">↓ {descentMeters} m descent</RNText>
          ) : null}
        </View>
      ) : null}
      <Svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width="100%" height={height}>
        <G stroke="#3d7d5b" strokeOpacity={0.12} strokeWidth={1}>
          {[0, 0.5, 1].map((frac) => (
            <Line
              key={frac}
              x1={PADDING.left}
              x2={VIEW_WIDTH - PADDING.right}
              y1={PADDING.top + frac * (VIEW_HEIGHT - PADDING.top - PADDING.bottom)}
              y2={PADDING.top + frac * (VIEW_HEIGHT - PADDING.top - PADDING.bottom)}
            />
          ))}
        </G>

        <SvgText x={PADDING.left - 6} y={PADDING.top + 4} textAnchor="end" fontSize={11} fill="#78716c">
          {Math.round(chart.maxE)}m
        </SvgText>
        <SvgText x={PADDING.left - 6} y={VIEW_HEIGHT - PADDING.bottom} textAnchor="end" fontSize={11} fill="#78716c">
          {Math.round(chart.minE)}m
        </SvgText>
        <SvgText x={PADDING.left} y={VIEW_HEIGHT - 6} textAnchor="start" fontSize={11} fill="#78716c">
          0 km
        </SvgText>
        <SvgText x={VIEW_WIDTH - PADDING.right} y={VIEW_HEIGHT - 6} textAnchor="end" fontSize={11} fill="#78716c">
          {(chart.maxD / 1000).toFixed(1)} km
        </SvgText>

        <Path d={chart.areaPath} fill="#3d7d5b" fillOpacity={0.15} stroke="none" />
        <Path d={chart.linePath} fill="none" stroke="#3d7d5b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
