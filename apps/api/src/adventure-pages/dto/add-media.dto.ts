import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddMediaDto {
  // require_tld: false - local dev's PUBLIC_API_URL is http://localhost:3000,
  // which validator.js's isURL default (require_tld: true) would otherwise reject
  @IsUrl({ require_tld: false })
  url: string;

  // Populated from POST /uploads/images' response when the client just
  // uploaded through the image-processing pipeline; absent for an older
  // client or a pasted external URL, in which case the row's size columns
  // just stay null (see Media.smallUrl's schema comment).
  @IsOptional()
  @IsUrl({ require_tld: false })
  smallUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  mediumUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  largeUrl?: string;

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
