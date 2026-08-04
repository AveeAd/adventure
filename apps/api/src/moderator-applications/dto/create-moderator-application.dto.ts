import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateModeratorApplicationDto {
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  statement: string;
}
