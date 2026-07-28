import { IsInt, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @Length(2, 2)
  isoCode: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
