import { IsIn } from 'class-validator';

// Organizer-only action, deliberately narrower than the full TripGroupStatus
// enum - there's no route back to ACTIVE from here (no "reopen" flow yet).
const SETTABLE_STATUSES = ['COMPLETED', 'CANCELLED'] as const;

export class UpdateTripGroupStatusDto {
  @IsIn(SETTABLE_STATUSES)
  status: (typeof SETTABLE_STATUSES)[number];
}
