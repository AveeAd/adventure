import { IsBoolean, IsOptional } from 'class-validator';

// Separate from UpdateThreadDto: pin/lock is a moderator-tier action, not
// the author's own edit, so it gets its own DTO + endpoint rather than being
// folded into one update payload with two different authorization paths.
export class ModerateThreadDto {
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
