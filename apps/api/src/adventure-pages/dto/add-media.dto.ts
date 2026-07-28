import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddMediaDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
