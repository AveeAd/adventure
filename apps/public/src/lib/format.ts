const RATE_UNIT_LABELS: Record<string, string> = {
  PER_DAY: 'per day',
  PER_TRIP: 'per trip',
  PER_HOUR: 'per hour',
};

export function formatRateUnit(rateUnit: string | null): string {
  if (!rateUnit) return '';
  return RATE_UNIT_LABELS[rateUnit] ?? rateUnit;
}
