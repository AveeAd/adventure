import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddMediaDto {
  // require_tld: false - local dev's PUBLIC_API_URL is http://localhost:3000,
  // which validator.js's isURL default (require_tld: true) would otherwise reject
  @IsUrl({ require_tld: false })
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
