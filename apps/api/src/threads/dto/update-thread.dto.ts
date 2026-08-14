import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const THREAD_TAGS = ['DISCUSSION', 'TRIP_SHARE', 'QUESTION', 'ANNOUNCEMENT', 'RANDOM'] as const;

// Author-only edit: content/tag only, no attachment changes after creation -
// attachments are "as of posting", not a live-editable relation.
export class UpdateThreadDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsIn(THREAD_TAGS)
  tag?: (typeof THREAD_TAGS)[number];
}
