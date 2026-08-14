import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateTripGroupDto {
  @IsString()
  @MinLength(1)
  title: string;

  // Markdown, rendered like TripReport.content - see schema.prisma.
  @IsString()
  @MinLength(1)
  description: string;

  @IsDateString()
  dateStart: string;

  @IsDateString()
  dateEnd: string;
}
